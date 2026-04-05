# MyDNA Insurance Agent

**Privacy-first genetic insurance DApp powered by NEAR Protocol**

유전자를 노출하지 않고, 유전자 덕분에 더 나은 보험에 가입하는 유일한 방법.

> NEAR Buidl 2026 Hackathon submission

---

## What It Does

DTC(소비자 직접 검사) 유전자 데이터를 업로드하면:

1. **IronClaw TEE** 안에서 유전자 분석 — 원본 데이터는 분석 즉시 소각
2. **Noir ZKP** 증명으로 수치 없이 보험 자격 충족 여부만 증명
3. **NEAR Confidential Intents** 로 기밀 보험료 결제 — 보험사에 유전자 수치 전달 없음

---

## NEAR Technology Stack

| 기술 | 역할 |
|---|---|
| **IronClaw TEE** | 유전자 데이터 격리 분석 + 메모리 소각 (NEAR AI Cloud) |
| **Confidential Intents** | 기밀 보험료 결제 (거래 내용 암호화) |
| **Chain Signatures** | 멀티체인 보험 상품 결제 (MPC 서명) |
| **Noir ZKP** | 유전자 수치 비공개 자격 증명 (`circuits/insurance_eligibility/`) |

---

## Architecture

```
사용자 브라우저
  └─ 파일 업로드 (SHA-256 해시만 저장)
      └─ NEAR AI Cloud (IronClaw TEE)
          └─ NormalizedGeneticProfile → TeeAnalysisOutput (분석 후 소각)
              └─ Noir ZKP proof 생성
                  └─ 보험 상품 매칭 → 추천 카트
                      └─ NEAR Confidential Intents 결제
```

**3-Layer Privacy Model**
- Layer 1: TEE 격리 분석 (IronClaw Runtime)
- Layer 2: Edge DB 메타데이터만 저장 (Turso — 유전자 원본 미저장)
- Layer 3: Web3 신뢰 레이어 (Confidential Intents + Chain Signatures + ZKP)

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Shadcn/ui, Framer Motion
- **Backend**: Next.js Server Actions, Drizzle ORM, Turso (Edge SQLite)
- **AI/TEE**: NEAR AI Cloud (IronClaw) — OpenAI-compatible `/v1/chat/completions`
- **Web3**: NEAR Wallet Selector, near-api-js, @defuse-protocol/intents-sdk
- **ZKP**: Noir (`nargo`) — `circuits/insurance_eligibility/src/main.nr`

---

## Getting Started

### Prerequisites

- Node.js 20+
- Turso account ([turso.tech](https://turso.tech))
- NEAR AI Cloud API key ([cloud.near.ai](https://cloud.near.ai))

### Setup

```bash
git clone https://github.com/azerckid/BUIDL-2026_NEAR
cd BUIDL-2026_NEAR
npm install
```

`.env.local` 생성:

```bash
cp .env.example .env.local
# 아래 값을 채워주세요
```

```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token

NEXT_PUBLIC_NEAR_WALLET_NETWORK=testnet

IRONCLAW_BASE_URL=https://cloud-api.near.ai/v1
IRONCLAW_API_KEY=your-nearai-api-key

# IronClaw 실제 분석 활성화 (미설정 시 Mock 사용)
# USE_REAL_TEE=true
```

### DB 초기화

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
npx tsx src/lib/db/seed.ts
```

### 실행

```bash
npm run dev
# http://localhost:3000
```

---

## Demo Flow

1. `http://localhost:3000` — NEAR Testnet 지갑 연결
2. "샘플 파일로 체험하기" 클릭 → 분석 시작
3. IronClaw TEE 분석 (5~15초) → 데이터 소각 확인
4. 보험 추천 대시보드 → 상품 선택
5. NEAR Confidential Intents 결제 완료

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/modules/     # Domain components
├── lib/
│   ├── db/                 # Drizzle schema + Turso client
│   ├── near/               # Wallet, Chain Signatures
│   ├── tee/                # IronClaw + Mock TEE
│   └── zkp/                # Noir ZKP prover
├── actions/                # Server Actions
└── types/                  # Zod schemas + TypeScript types
circuits/
└── insurance_eligibility/  # Noir ZKP circuit
```

---

## Commands

```bash
npm run dev        # Dev server
npm run build      # Production build
npm run lint       # ESLint

npx drizzle-kit studio     # DB browser
npx tsx src/lib/db/seed.ts # Seed insurance products
```

---

## Team

- **azerckid** — Full-stack + NEAR Protocol integration

---

Built for **NEAR Buidl 2026 Hackathon** · Powered by NEAR Protocol
