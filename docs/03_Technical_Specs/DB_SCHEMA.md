# [기술 명세] 데이터 모델 및 DB 스키마 상세 명세

- **작성일**: 2026-04-01
- **최종 수정일**: 2026-04-01
- **레이어**: 03_Technical_Specs
- **상태**: Draft v1.0

---

## 0. 설계 원칙

1. **유전자 원본 데이터는 Turso에 절대 저장하지 않는다.** 유전자 파일 자체는 NEAR Private Cloud에만 존재하며, Turso에는 분석 결과로부터 파생된 카테고리 레벨(위험군 분류)만 저장한다.
2. **식별자는 지갑 주소만 사용한다.** 이메일, 이름, 전화번호 등 PII(개인식별정보)는 일절 저장하지 않는다.
3. **수치(Score)는 저장하지 않는다.** 유전자 위험 점수 원본 수치는 TEE 분석 완료 즉시 소각된다. Turso에는 `high / moderate / normal` 수준의 카테고리 레벨만 기록한다.
4. **상태 전이(Status Transition)는 단방향이다.** 각 엔티티의 상태는 아래 명세한 방향으로만 이동하며, 역방향 전이는 코드 레벨에서 차단한다.

---

## 1. 엔티티 관계 다이어그램 (ERD)

```
user_profiles (1)
    │
    ├──< analysis_sessions (N)
    │        │
    │        └──< analysis_results (1)
    │
    ├──< recommendation_carts (N)
    │        │
    │        └──< transactions (1)
    │
insurance_products (N) >──< recommendation_carts (N:M, via cart_items JSON)
```

---

## 2. 테이블 정의

---

### 2-1. `user_profiles`

사용자의 구독 상태 및 최근 분석 이력을 관리하는 기준 테이블.

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `wallet_address` | TEXT | PK | NEAR 지갑 주소 (`alice.near` 또는 암묵적 주소 형식) |
| `subscription_tier` | TEXT | NOT NULL, DEFAULT `'free'` | `'free'` \| `'pro'` |
| `subscription_expires_at` | INTEGER | NULLABLE | Unix timestamp. NULL이면 무기한(free tier) |
| `last_analysis_at` | INTEGER | NULLABLE | 마지막 TEE 분석 완료 시각 |
| `created_at` | INTEGER | NOT NULL | 최초 지갑 연결 시각 |
| `updated_at` | INTEGER | NOT NULL | 마지막 업데이트 시각 |

**상태 전이**: `subscription_tier`
```
free → pro (구독 결제 완료)
pro  → free (구독 만료: subscription_expires_at < now())
```

**Drizzle 스키마**
```typescript
export const userProfiles = sqliteTable("user_profiles", {
  walletAddress: text("wallet_address").primaryKey(),
  subscriptionTier: text("subscription_tier", { enum: ["free", "pro"] })
    .notNull()
    .default("free"),
  subscriptionExpiresAt: integer("subscription_expires_at", { mode: "timestamp" }),
  lastAnalysisAt: integer("last_analysis_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

**Zod 밸리데이션**
```typescript
export const userProfileInsertSchema = z.object({
  walletAddress: z.string().min(2).max(64).regex(/^[a-z0-9_\-\.]+\.near$|^[a-f0-9]{64}$/),
  subscriptionTier: z.enum(["free", "pro"]).default("free"),
  subscriptionExpiresAt: z.number().int().positive().nullable().default(null),
  lastAnalysisAt: z.number().int().positive().nullable().default(null),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});
```

---

### 2-2. `insurance_products`

플랫폼이 취급하는 보험 상품 카탈로그. 보험사로부터 수집하거나 수동 등록한 상품 목록.

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | TEXT | PK | UUID v4 |
| `name` | TEXT | NOT NULL | 상품명 (예: "췌장·간 집중 보장 특약") |
| `provider` | TEXT | NOT NULL | 보험사명 (예: "삼성생명", "KB손해보험") |
| `chain_network` | TEXT | NOT NULL | `'near'` \| `'ethereum'` \| `'solana'` |
| `contract_address` | TEXT | NULLABLE | 온체인 스마트 컨트랙트 주소. 오프체인 상품은 NULL |
| `monthly_premium_usdc` | REAL | NOT NULL | 월 보험료 (USDC 기준) |
| `coverage_category` | TEXT | NOT NULL | `'oncology'` \| `'cardiovascular'` \| `'metabolic'` \| `'neurological'` |
| `risk_targets` | TEXT | NOT NULL | JSON 배열. 이 상품이 커버하는 위험 유전자 카테고리 목록 |
| `discount_eligible` | INTEGER | NOT NULL, DEFAULT `0` | 건강체 특약 할인 적용 가능 여부 (0/1 Boolean) |
| `original_premium_usdc` | REAL | NULLABLE | 할인 전 원가. NULL이면 할인 없음 |
| `is_active` | INTEGER | NOT NULL, DEFAULT `1` | 판매 중 여부 (0/1 Boolean) |
| `created_at` | INTEGER | NOT NULL | 등록 시각 |

**`risk_targets` JSON 배열 예시**
```json
["pancreatic_cancer", "liver_cancer", "type2_diabetes"]
```

**`coverage_category` 열거값 정의**
- `oncology`: 암·종양 관련 (췌장암, 간암, 폐암 등)
- `cardiovascular`: 심혈관 관련 (심근경색, 뇌졸중, 부정맥 등)
- `metabolic`: 대사 관련 (당뇨병, 고지혈증, 갑상선 등)
- `neurological`: 신경계 관련 (치매, 파킨슨, 뇌전증 등)

**Drizzle 스키마**
```typescript
export const insuranceProducts = sqliteTable("insurance_products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  chainNetwork: text("chain_network", { enum: ["near", "ethereum", "solana"] }).notNull(),
  contractAddress: text("contract_address"),
  monthlyPremiumUsdc: real("monthly_premium_usdc").notNull(),
  coverageCategory: text("coverage_category", {
    enum: ["oncology", "cardiovascular", "metabolic", "neurological"],
  }).notNull(),
  riskTargets: text("risk_targets").notNull(), // JSON string
  discountEligible: integer("discount_eligible").notNull().default(0),
  originalPremiumUsdc: real("original_premium_usdc"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
```

**Zod 밸리데이션**
```typescript
const riskTargetEnum = z.enum([
  "pancreatic_cancer", "liver_cancer", "lung_cancer", "breast_cancer", "colon_cancer",
  "myocardial_infarction", "stroke", "arrhythmia",
  "type2_diabetes", "hyperlipidemia", "thyroid_disorder",
  "alzheimers", "parkinsons",
]);

export const insuranceProductInsertSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(100),
  provider: z.string().min(1).max(50),
  chainNetwork: z.enum(["near", "ethereum", "solana"]),
  contractAddress: z.string().nullable().default(null),
  monthlyPremiumUsdc: z.number().positive().max(10000),
  coverageCategory: z.enum(["oncology", "cardiovascular", "metabolic", "neurological"]),
  riskTargets: z.array(riskTargetEnum).min(1),
  discountEligible: z.boolean().default(false),
  originalPremiumUsdc: z.number().positive().nullable().default(null),
  isActive: z.boolean().default(true),
  createdAt: z.number().int().positive(),
});
```

---

### 2-3. `analysis_sessions`

TEE 분석 요청의 라이프사이클을 추적하는 감사 로그 테이블. 유전자 원본 내용은 절대 포함하지 않는다.

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | TEXT | PK | UUID v4 |
| `wallet_address` | TEXT | FK → user_profiles | 요청한 사용자 |
| `file_hash` | TEXT | NOT NULL | 업로드된 파일의 SHA-256 해시 (원본이 아닌 식별자용) |
| `file_type` | TEXT | NOT NULL | `'vcf'` \| `'pdf'` \| `'txt'` \| `'csv'` |
| `status` | TEXT | NOT NULL | 아래 상태 전이 참조 |
| `error_code` | TEXT | NULLABLE | 실패 시 에러 코드 |
| `started_at` | INTEGER | NOT NULL | 분석 요청 시각 |
| `tee_entered_at` | INTEGER | NULLABLE | TEE 진입 시각 |
| `completed_at` | INTEGER | NULLABLE | 분석 완료 시각 |
| `purged_at` | INTEGER | NULLABLE | 메모리 소각 확인 시각 |

**상태 전이 (단방향 강제)**
```
pending
  → uploading       (NPC 파일 업로드 시작)
    → tee_processing  (TEE 진입 및 분석 시작)
      → zkp_generating  (ZKP 증명 생성 중)
        → completed       (분석 및 증명 생성 완료)
          → purged          (메모리 소각 확인 완료) ✓ 최종 성공 상태

  → failed          (어느 단계에서든 에러 발생)
  → timeout         (60초 이내 completed 미도달)
```

**`error_code` 열거값**
- `NPC_UPLOAD_FAILED`: NEAR Private Cloud 업로드 실패
- `TEE_ENCLAVE_ERROR`: IronClaw Runtime 내부 오류
- `ZKP_CIRCUIT_ERROR`: Noir 회로 증명 생성 실패
- `ANALYSIS_TIMEOUT`: 60초 타임아웃
- `UNSUPPORTED_FORMAT`: 파일 형식 미지원

**Drizzle 스키마**
```typescript
export const analysisSessions = sqliteTable("analysis_sessions", {
  id: text("id").primaryKey(),
  walletAddress: text("wallet_address")
    .notNull()
    .references(() => userProfiles.walletAddress),
  fileHash: text("file_hash").notNull(),
  fileType: text("file_type", { enum: ["vcf", "pdf", "txt", "csv"] }).notNull(),
  status: text("status", {
    enum: ["pending", "uploading", "tee_processing", "zkp_generating", "completed", "purged", "failed", "timeout"],
  }).notNull().default("pending"),
  errorCode: text("error_code"),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  teeEnteredAt: integer("tee_entered_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  purgedAt: integer("purged_at", { mode: "timestamp" }),
});
```

---

### 2-4. `analysis_results`

TEE 분석이 완료된 후 사용자에게 제공되는 위험 프로파일. **수치 없음, 카테고리 레벨만 저장**.

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | TEXT | PK | UUID v4 |
| `session_id` | TEXT | FK → analysis_sessions, UNIQUE | 1 session = 1 result |
| `wallet_address` | TEXT | FK → user_profiles | 소유 사용자 |
| `risk_profile` | TEXT | NOT NULL | JSON 객체. 위험 카테고리별 레벨 (수치 없음) |
| `recommended_product_ids` | TEXT | NOT NULL | JSON 배열. AI가 추천한 상품 ID 목록 (우선순위 순) |
| `zkp_proof_hash` | TEXT | NULLABLE | ZKP 증명의 해시값 (온체인 검증용) |
| `generated_at` | INTEGER | NOT NULL | 결과 생성 시각 |
| `expires_at` | INTEGER | NOT NULL | 결과 만료 시각 (생성 후 30일) |

**`risk_profile` JSON 구조 (수치 절대 포함 금지)**
```json
{
  "oncology": {
    "level": "high",
    "flags": ["pancreatic_cancer", "liver_cancer"]
  },
  "cardiovascular": {
    "level": "normal",
    "flags": []
  },
  "metabolic": {
    "level": "moderate",
    "flags": ["type2_diabetes"]
  },
  "neurological": {
    "level": "normal",
    "flags": []
  }
}
```

**`level` 열거값**: `"high"` | `"moderate"` | `"normal"`

**Drizzle 스키마**
```typescript
export const analysisResults = sqliteTable("analysis_results", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .unique()
    .references(() => analysisSessions.id),
  walletAddress: text("wallet_address")
    .notNull()
    .references(() => userProfiles.walletAddress),
  riskProfile: text("risk_profile").notNull(), // JSON string
  recommendedProductIds: text("recommended_product_ids").notNull(), // JSON string
  zkpProofHash: text("zkp_proof_hash"),
  generatedAt: integer("generated_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});
```

**Zod 밸리데이션**
```typescript
const riskLevelSchema = z.enum(["high", "moderate", "normal"]);

const categoryRiskSchema = z.object({
  level: riskLevelSchema,
  flags: z.array(z.string()),
});

export const riskProfileSchema = z.object({
  oncology: categoryRiskSchema,
  cardiovascular: categoryRiskSchema,
  metabolic: categoryRiskSchema,
  neurological: categoryRiskSchema,
});
```

---

### 2-5. `recommendation_carts`

사용자가 추천 대시보드에서 선택한 보험 상품 장바구니.

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | TEXT | PK | UUID v4 |
| `wallet_address` | TEXT | FK → user_profiles | 소유 사용자 |
| `session_id` | TEXT | FK → analysis_sessions | 이 추천의 근거 세션 |
| `selected_product_ids` | TEXT | NOT NULL | JSON 배열. 사용자가 선택한 상품 ID 목록 |
| `total_monthly_usdc` | REAL | NOT NULL | 선택 상품 합산 월 보험료 |
| `discount_applied_usdc` | REAL | NOT NULL, DEFAULT `0` | 건강체 할인 적용 금액 |
| `status` | TEXT | NOT NULL | 아래 상태 전이 참조 |
| `created_at` | INTEGER | NOT NULL | 장바구니 생성 시각 |
| `updated_at` | INTEGER | NOT NULL | 마지막 수정 시각 |

**상태 전이**
```
active → pending_checkout → checked_out  ✓ 최종 성공 상태
active →                    abandoned    ✓ 최종 종료 상태
```

**Drizzle 스키마**
```typescript
export const recommendationCarts = sqliteTable("recommendation_carts", {
  id: text("id").primaryKey(),
  walletAddress: text("wallet_address")
    .notNull()
    .references(() => userProfiles.walletAddress),
  sessionId: text("session_id")
    .notNull()
    .references(() => analysisSessions.id),
  selectedProductIds: text("selected_product_ids").notNull(), // JSON string
  totalMonthlyUsdc: real("total_monthly_usdc").notNull(),
  discountAppliedUsdc: real("discount_applied_usdc").notNull().default(0),
  status: text("status", {
    enum: ["active", "pending_checkout", "checked_out", "abandoned"],
  }).notNull().default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});
```

---

### 2-6. `transactions`

Confidential Intents를 통한 결제 트랜잭션 기록.

| 컬럼명 | 타입 | 제약 | 설명 |
|---|---|---|---|
| `id` | TEXT | PK | UUID v4 |
| `wallet_address` | TEXT | FK → user_profiles | 결제 주체 |
| `cart_id` | TEXT | FK → recommendation_carts, UNIQUE | 결제된 장바구니 |
| `tx_hash` | TEXT | NULLABLE | 온체인 트랜잭션 해시. 확정 전 NULL |
| `network` | TEXT | NOT NULL | `'near_testnet'` \| `'near_mainnet'` |
| `amount_usdc` | REAL | NOT NULL | 결제 금액 |
| `confidential_intents_used` | INTEGER | NOT NULL, DEFAULT `1` | Confidential Intents 사용 여부 |
| `status` | TEXT | NOT NULL | 아래 상태 전이 참조 |
| `failure_reason` | TEXT | NULLABLE | 실패 시 사유 |
| `created_at` | INTEGER | NOT NULL | 결제 요청 시각 |
| `confirmed_at` | INTEGER | NULLABLE | 온체인 확정 시각 |

**상태 전이**
```
pending → broadcasting → confirmed  ✓ 최종 성공 상태
pending → broadcasting → failed     ✓ 최종 실패 상태
pending →               reverted    ✓ 환불 완료 상태
```

**Drizzle 스키마**
```typescript
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  walletAddress: text("wallet_address")
    .notNull()
    .references(() => userProfiles.walletAddress),
  cartId: text("cart_id")
    .notNull()
    .unique()
    .references(() => recommendationCarts.id),
  txHash: text("tx_hash"),
  network: text("network", { enum: ["near_testnet", "near_mainnet"] }).notNull(),
  amountUsdc: real("amount_usdc").notNull(),
  confidentialIntentsUsed: integer("confidential_intents_used").notNull().default(1),
  status: text("status", {
    enum: ["pending", "broadcasting", "confirmed", "failed", "reverted"],
  }).notNull().default("pending"),
  failureReason: text("failure_reason"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  confirmedAt: integer("confirmed_at", { mode: "timestamp" }),
});
```

---

## 3. 전체 상태 전이 요약

```
analysis_sessions.status:
  pending → uploading → tee_processing → zkp_generating → completed → purged
                    ↘ failed | timeout (어느 단계에서든)

recommendation_carts.status:
  active → pending_checkout → checked_out
  active →                    abandoned

transactions.status:
  pending → broadcasting → confirmed
                         → failed
                         → reverted
```

---

## 4. 인덱스 전략

```typescript
// 자주 조회되는 패턴 기준 인덱스
export const analysisSessionsIdx = index("analysis_sessions_wallet_idx")
  .on(analysisSessions.walletAddress);

export const analysisResultsWalletIdx = index("analysis_results_wallet_idx")
  .on(analysisResults.walletAddress);

export const cartsWalletStatusIdx = index("carts_wallet_status_idx")
  .on(recommendationCarts.walletAddress, recommendationCarts.status);

export const productsActiveCategoryIdx = index("products_active_category_idx")
  .on(insuranceProducts.isActive, insuranceProducts.coverageCategory);
```

---

## 5. 시드 데이터 (Mock 보험 상품)

해커톤 데모용 최소 시드 데이터. `src/lib/db/seed.ts`에 위치.

```typescript
export const SEED_PRODUCTS = [
  {
    id: "prod_001",
    name: "췌장·간 집중 보장 특약",
    provider: "KB손해보험",
    chainNetwork: "near",
    contractAddress: null,
    monthlyPremiumUsdc: 32.0,
    originalPremiumUsdc: 45.0,
    coverageCategory: "oncology",
    riskTargets: JSON.stringify(["pancreatic_cancer", "liver_cancer"]),
    discountEligible: 1,
    isActive: 1,
  },
  {
    id: "prod_002",
    name: "암 진단비 강화 특약",
    provider: "삼성생명",
    chainNetwork: "near",
    contractAddress: null,
    monthlyPremiumUsdc: 47.0,
    originalPremiumUsdc: 60.0,
    coverageCategory: "oncology",
    riskTargets: JSON.stringify(["pancreatic_cancer", "lung_cancer", "colon_cancer"]),
    discountEligible: 1,
    isActive: 1,
  },
  {
    id: "prod_003",
    name: "당뇨·대사 관리 특약",
    provider: "한화생명",
    chainNetwork: "near",
    contractAddress: null,
    monthlyPremiumUsdc: 18.5,
    originalPremiumUsdc: null,
    coverageCategory: "metabolic",
    riskTargets: JSON.stringify(["type2_diabetes", "hyperlipidemia"]),
    discountEligible: 0,
    isActive: 1,
  },
  {
    id: "prod_004",
    name: "심혈관 정밀 보장 특약",
    provider: "신한라이프",
    chainNetwork: "near",
    contractAddress: null,
    monthlyPremiumUsdc: 29.0,
    originalPremiumUsdc: 38.0,
    coverageCategory: "cardiovascular",
    riskTargets: JSON.stringify(["myocardial_infarction", "stroke", "arrhythmia"]),
    discountEligible: 1,
    isActive: 1,
  },
  {
    id: "prod_005",
    name: "치매 조기 진단 특약",
    provider: "교보생명",
    chainNetwork: "near",
    contractAddress: null,
    monthlyPremiumUsdc: 22.0,
    originalPremiumUsdc: null,
    coverageCategory: "neurological",
    riskTargets: JSON.stringify(["alzheimers", "parkinsons"]),
    discountEligible: 0,
    isActive: 1,
  },
];
```

---

## 관련 문서

- [프로젝트 셋업 가이드](./PROJECT_SETUP_GUIDE.md)
- [AI 매칭 파이프라인](../04_Logic_Progress/AI_MATCHING_PIPELINE.md)
- [NEAR 프라이버시 아키텍처](./NEAR_PRIVACY_STACK_ARCH.md)
