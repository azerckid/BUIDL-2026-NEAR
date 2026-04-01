# [기술 명세] 프로젝트 셋업 가이드 및 하이브리드 아키텍처

- **작성일**: 2026-03-31
- **최종 수정일**: 2026-04-01
- **레이어**: 03_Technical_Specs
- **상태**: Draft v1.0

---

## 1. 코어 기술 스택 (Tech Stack Summary)

"프라이버시는 TEE와 On-chain에서 담보하고, 빠른 사용자 경험은 Edge DB에서 담보한다"는 **하이브리드 분리 원칙**에 따라 아래의 스택을 융합합니다.

### [Web] 프론트엔드 (UI/UX 레이어)
- **프레임워크**: Next.js 15 (App Router, Server Actions 적극 활용)
- **스타일링**: Tailwind CSS v4 + Shadcn/ui (접근성 및 다크모드 지원)
- **상태 관리 및 밸리데이션**: Zod (폼 검증), React Hook Form, Luxon (날짜 제어)

### [DB] 백엔드 연산 및 데이터베이스 (초고속 메타데이터 서빙)
- **Database**: Turso (Edge SQLite, 글로벌 밀리초 응답 속도)
- **ORM**: Drizzle ORM (Type-Safe 쿼리 및 Zod와의 완벽한 통합)
- **역할**: 보험 상품 카탈로그, 사용자 설정(프로필/구독 상태), 화면 렌더링용 트랜잭션 기록 저장. (유전자 데이터는 **절대** 저장 금지)

### [Web3] 웹3 트러스트 레이어 (프라이버시 & 무신뢰 스마트 계약)
- **AI 런타임**: NEAR AI Cloud & IronClaw TEE (물리적으로 격리된 메모리 환경에서 유전자 DNA 복호화 및 분석 후 즉시 영구 소각)
- **온체인 결제**: NEAR Protocol의 Confidential Intents (결제 과정에서의 개인 병력 노출 차단) 및 Chain Abstraction (타 체인 보험 구매)

---

## 2. 로컬 셋업 명령어 흐름 (Installation Flow)

프로젝트 초기화 시 다음 명령어를 순차적으로 실행하여 통일된 환경을 구축합니다.

### 2.1 Next.js 15 및 초기 환경 설정
```bash
npx create-next-app@latest . \
  --typescript --tailwind --eslint --app \
  --src-dir --import-alias "@/*"
```

### 2.2 Shadcn/ui 초기화 
```bash
npx shadcn@latest init
# 필수 컴포넌트 사전 설치:
npx shadcn@latest add button card dialog progress alert badge table
```

### 2.3 데이터베이스 통합 (Drizzle & Turso)
```bash
npm i drizzle-orm @libsql/client
npm i -D drizzle-kit dotenv
```

Turso CLI 초기화 (최초 1회):
```bash
# Turso CLI 설치 및 로그인
brew install tursodatabase/tap/turso
turso auth login

# 로컬 개발용 DB 생성
turso db create mydna-local --type embedded-replicas
turso db show mydna-local   # URL 확인 후 .env.local에 기입
```

### 2.4 NEAR 웹3 통합 (near-api-js & Wallet Selector)
```bash
# NEAR 핵심 SDK
npm i near-api-js

# 공식 멀티 지갑 셀렉터 (MyNearWallet, Meteor Wallet 등 지원)
npm i @near-wallet-selector/core \
      @near-wallet-selector/my-near-wallet \
      @near-wallet-selector/modal-ui

# NEAR AI / IronClaw TEE 클라이언트 (NEAR AI Cloud SDK)
npm i @nearai/client
```

---

## 3. 디렉토리 아키텍처 (Directory Structure)

Vercel Best Practice와 365 통치 규칙에 부합하는 `src/` 폴더 스트럭처입니다.
```text
src/
 ├── app/                  # Next.js 앱 라우터 (페이지, 레이아웃)
 ├── components/           # UI 컴포넌트
 │    ├── ui/              # Shadcn/ui 컴포넌트
 │    └── modules/         # DNA 업로드 박스, 보험 추천 카드 등 도메인 조립 컴포넌트
 ├── lib/                  # 유틸리티 함수
 │    ├── db/              # Drizzle ORM 스키마 (schema.ts) 및 연결(index.ts)
 │    └── near/            # NEAR 지갑 초기화, Chain Signatures 유틸
 ├── actions/              # Server Actions (DB 조회 프록시, 유전자 소각 로그 트리거)
 └── types/                # Zod 스키마, Typescript 글로벌 타입
```

### Drizzle 스키마 최소 예시 (`src/lib/db/schema.ts`)
```typescript
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// 보험 상품 카탈로그 (유전자 데이터 절대 저장 금지)
export const insuranceProducts = sqliteTable("insurance_products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  chainNetwork: text("chain_network").notNull(), // "near" | "ethereum" | "solana"
  contractAddress: text("contract_address"),
  monthlyPremiumUsdc: real("monthly_premium_usdc").notNull(),
  coverageCategory: text("coverage_category").notNull(), // "cardiovascular" | "oncology" | "metabolic"
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

// 사용자 세션/구독 상태 (지갑 주소만 식별자로 사용, PII 최소화)
export const userProfiles = sqliteTable("user_profiles", {
  walletAddress: text("wallet_address").primaryKey(),
  subscriptionTier: text("subscription_tier").default("free"), // "free" | "pro"
  subscriptionExpiresAt: integer("subscription_expires_at", { mode: "timestamp" }),
  lastAnalysisAt: integer("last_analysis_at", { mode: "timestamp" }),
});
```

---

## 4. 환경 변수 보안 수칙 (Global Rule 8 적용)

**절대 `.env*` 파일들을 Git 플랫폼(GitHub 등)에 커밋하지 않으며, 사전에 `.gitignore`를 점검합니다.**

### `.gitignore` 필수 항목
```
# 환경 변수 (절대 커밋 금지)
.env
.env.local
.env.development
.env.production
.env*.local

# 로컬 DB
*.db
*.sqlite

# 빌드 산출물
.next/
out/
```

1. **로컬 개발용 (`.env.local`)**
   - 로컬 구동 시에만 참조.
   ```
   TURSO_DATABASE_URL="file:./local.db"
   TURSO_AUTH_TOKEN=""
   NEAR_WALLET_NETWORK="testnet"
   NEARAI_API_KEY="your_nearai_key_here"
   ```
2. **배포 운영용 (Vercel 대시보드 환경 변수 직접 주입)**
   - 절대 파일 형태로 저장/전송 금지.
   ```
   TURSO_DATABASE_URL="libsql://production-my-dna.turso.io"
   TURSO_AUTH_TOKEN="<turso_prod_token>"
   NEAR_WALLET_NETWORK="mainnet"
   NEARAI_API_KEY="<prod_nearai_key>"
   ```

---

## 5. 단계별 검증 절차 (DoD)
이 셋업 이후, "실제로 회원가입 UX 창이 뜨는지", "Turso DB의 더미 보험 카탈로그를 프론트 화면으로 가져올 수 있는지(End-to-End)" 작동 확인 후 다음 Phase의 개발로 넘어가야 합니다.

---

## 관련 문서
- [기술 아키텍처 명세](./NEAR_PRIVACY_STACK_ARCH.md)
- [NEAR Tech Stack 매핑](./LATEST_NEAR_TECH_STACK.md)
- [비즈니스 기획안](../01_Concept_Design/GENETIC_AI_INSURANCE_AGENT.md)
- [DB 스키마 상세 명세](./DB_SCHEMA.md)
- [구현 계획 (초기 세팅)](../04_Logic_Progress/IMPLEMENTATION_PLAN.md)
