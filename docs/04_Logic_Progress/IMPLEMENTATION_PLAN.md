# [구현 계획] Phase 0 초기 세팅 및 개발 순서

- **작성일**: 2026-04-01
- **최종 수정일**: 2026-04-01
- **레이어**: 04_Logic_Progress
- **상태**: Draft v1.0

---

## 0. 목표

**해커톤 데드라인**: 2026-04-20 (잔여 19일)

**Phase 0 완성 기준 (DoD)**
- 5단계 UI가 브라우저에서 막힘 없이 흐름대로 동작한다.
- NEAR Testnet 지갑 연결 및 더미 트랜잭션 서명이 작동한다.
- Mock TEE 분석 → Memory Purge 애니메이션 → 추천 대시보드 → 더미 결제까지 End-to-End 시연 가능하다.

---

## 1. 초기 세팅 (Step 0)

모든 기능 구현에 앞서 완료해야 하는 환경 구성.

### 1-1. 프로젝트 생성

```bash
npx create-next-app@latest . \
  --typescript --tailwind --eslint --app \
  --src-dir --import-alias "@/*"
```

### 1-2. Shadcn/ui 초기화

```bash
npx shadcn@latest init
npx shadcn@latest add button card dialog progress alert badge table tabs toast sonner
```

### 1-3. 패키지 설치

```bash
# 애니메이션
npm i framer-motion

# 날짜/시간
npm i luxon
npm i -D @types/luxon

# 국제화
npm i next-intl

# DB
npm i drizzle-orm @libsql/client
npm i -D drizzle-kit dotenv

# Web3
npm i near-api-js @nearai/client
npm i @near-wallet-selector/core \
      @near-wallet-selector/my-near-wallet \
      @near-wallet-selector/modal-ui

# 폼 검증
npm i zod react-hook-form @hookform/resolvers

# UUID 생성
npm i uuid
npm i -D @types/uuid
```

### 1-4. 폰트 설정

```bash
# Pretendard (한국어)
npm i @fontsource/pretendard
```

`src/app/layout.tsx`에 `Inter` (next/font/google) + Pretendard 로드.

### 1-5. Turso DB 초기화

```bash
brew install tursodatabase/tap/turso
turso auth login
turso db create mydna-local --type embedded-replicas
turso db show mydna-local   # TURSO_DATABASE_URL 확인
turso db tokens create mydna-local  # TURSO_AUTH_TOKEN 확인
```

### 1-6. 환경 변수 설정 (`.env.local`)

```
TURSO_DATABASE_URL="file:./local.db"
TURSO_AUTH_TOKEN=""
NEAR_WALLET_NETWORK="testnet"
NEARAI_API_KEY=""
```

### 1-7. Drizzle 설정 파일 생성

`drizzle.config.ts`:
```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
});
```

### 1-8. DB 스키마 생성 및 마이그레이션

`src/lib/db/schema.ts` — `DB_SCHEMA.md`의 6개 테이블 코드 그대로 적용.

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 1-9. 시드 데이터 주입

`src/lib/db/seed.ts` — `DB_SCHEMA.md`의 `SEED_PRODUCTS` 5종 주입.

```bash
npx tsx src/lib/db/seed.ts
```

### 1-10. 전역 다크 테마 적용

`src/app/globals.css`에 Shadcn CSS Variables를 `DESIGN_SYSTEM_SHADCN.md` 기준으로 설정.
- Background: `bg-zinc-950`
- Primary: Electric Blue (`blue-600`)
- Destructive: `red-600`
- Success/Purge: `emerald-500`
- Border radius: `0.5rem`

### 1-11. 디렉토리 구조 생성

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx          # Step 1 랜딩 (루트)
│   └── dashboard/
│       └── page.tsx      # Step 4 대시보드
├── components/
│   ├── ui/               # Shadcn 자동 생성
│   └── modules/
│       ├── WalletConnect.tsx
│       ├── FileUploadZone.tsx
│       ├── TeeAnalysisProgress.tsx
│       ├── RiskProfileCard.tsx
│       ├── InsuranceProductCard.tsx
│       └── ConfidentialCheckout.tsx
├── lib/
│   ├── db/
│   │   ├── schema.ts
│   │   ├── index.ts      # Turso 연결
│   │   └── seed.ts
│   ├── near/
│   │   └── wallet.ts     # NEAR Wallet Selector 초기화
│   └── tee/
│       ├── normalizer.ts # Stage 1: 파일 파싱 및 정규화
│       └── mock-tee.ts   # Stage 2: Mock TEE 실행
├── actions/
│   ├── runAnalysis.ts    # 전체 파이프라인 Server Action
│   └── matchProducts.ts  # DB 상품 매칭
├── types/
│   ├── tee-output.ts     # TeeAnalysisOutput + Zod 스키마
│   └── genetic.ts        # NormalizedGeneticProfile
└── messages/
    ├── ko.json
    └── en.json
```

### 1-12. 초기 세팅 완료 검증

아래 두 가지가 동작하면 초기 세팅 완료.

1. `npm run dev` 실행 후 `localhost:3000`에서 다크 테마 랜딩 화면이 표시됨.
2. `npx drizzle-kit studio` 실행 후 5종 시드 상품이 DB에 확인됨.

---

## 2. 구현 순서 (Step 1 ~ Step 5)

초기 세팅 완료 후 아래 순서로 구현한다. 각 Step은 이전 Step의 UI가 정상 동작한 후 착수한다.

| 순서 | 대상 | 핵심 구현 항목 | 의존 문서 |
|---|---|---|---|
| Step 1 | 랜딩 + 지갑 연결 | NEAR Wallet Selector 연동, 지갑 주소 표시, user_profiles upsert | USER_FLOW.md |
| Step 2 | 파일 업로드 | 드래그앤드롭 UI, 파일 형식 검증, 자물쇠 애니메이션 | USER_FLOW.md, DESIGN_SYSTEM_SHADCN.md |
| Step 3 | TEE 분석 + Purge | Mock TEE 실행, Progress 애니메이션, Memory Purge 파티클 | AI_MATCHING_PIPELINE.md |
| Step 4 | 추천 대시보드 | RiskProfile 카드, 보험 상품 카드, 장바구니 | DB_SCHEMA.md, AI_MATCHING_PIPELINE.md |
| Step 5 | 기밀 결제 | Confidential Intents 더미 트랜잭션, Dialog 모달, 완료 화면 | USER_FLOW.md, NEAR_PRIVACY_STACK_ARCH.md |

---

## 3. Mock 데이터 파일 배치

```
public/
└── mock/
    └── mock_genome_gentok.txt   # DEMO_SCENARIO.md 기준 데모 입력 파일
```

내용은 `AI_MATCHING_PIPELINE.md` 7절의 Mock 입력 파일 스펙 그대로 사용.

---

## 관련 문서

- [DB 스키마](../03_Technical_Specs/DB_SCHEMA.md)
- [AI 매칭 파이프라인](./AI_MATCHING_PIPELINE.md)
- [사용자 플로우](../02_UI_Screens/USER_FLOW.md)
- [디자인 시스템](../02_UI_Screens/DESIGN_SYSTEM_SHADCN.md)
- [프로젝트 셋업 가이드](../03_Technical_Specs/PROJECT_SETUP_GUIDE.md)
