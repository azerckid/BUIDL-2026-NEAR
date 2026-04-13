# OHmyDNA Insurance Agent

**Privacy-first genetic insurance DApp powered by NEAR Protocol**

The only way to get better insurance because of your genes — without exposing them.

> NEAR Buidl 2026 Hackathon submission

[![Live Demo](https://img.shields.io/badge/Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://buidl-2026-near.vercel.app/en)
[![Pitch Deck](https://img.shields.io/badge/Pitch_Deck-4A154B?style=for-the-badge&logo=slides&logoColor=white)](https://buidl-2026-near.vercel.app/en/pitch)
[![Demo Video](https://img.shields.io/badge/Demo_Video-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=FAVronsj7cA)

**NEAR Testnet Contract**: `zkp.rogulus.testnet`

---

## What It Does

Upload your DTC (Direct-to-Consumer) genetic data and:

1. **IronClaw TEE** analyzes your genome in isolation — raw data is purged immediately after analysis
2. **Intel TDX Attestation** cryptographically verifies the enclave is a genuine hardware-isolated environment
3. **Noir ZKP** proof verifies insurance eligibility without revealing any numeric values
4. **NEAR Confidential Intents** settles your premium privately — insurers never see your genetic data

---

## NEAR Technology Stack

| Technology | Role |
|---|---|
| **IronClaw TEE** | Isolated genetic analysis + memory purge (NEAR AI Cloud) |
| **Intel TDX Attestation** | Hardware enclave verification via `GET /v1/attestation/report` (no API key required) |
| **Confidential Intents** | Private premium settlement (encrypted transaction payload) |
| **Chain Signatures** | Multi-chain insurance product payments (MPC signing) |
| **Noir ZKP** | Zero-knowledge eligibility proof without exposing risk scores (`circuits/insurance_eligibility/`) |

---

## Architecture

```
User Browser
  └─ File upload (only SHA-256 hash persisted)
      └─ NEAR AI Cloud (IronClaw TEE)
          └─ NormalizedGeneticProfile → TeeAnalysisOutput (purged after analysis)
              └─ Noir ZKP proof generation
                  └─ Insurance product matching → recommendation cart
                      └─ NEAR Confidential Intents payment
```

**3-Layer Privacy Model**
- Layer 1: TEE isolated analysis (IronClaw Runtime)
- Layer 2: Edge DB stores metadata only (Turso — no raw genetic data)
- Layer 3: Web3 trust layer (Confidential Intents + Chain Signatures + ZKP)

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

Create `.env.local`:

```bash
cp .env.example .env.local
# Fill in the values below
```

```
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-auth-token

NEXT_PUBLIC_NEAR_WALLET_NETWORK=testnet

IRONCLAW_BASE_URL=https://cloud-api.near.ai/v1
IRONCLAW_API_KEY=your-nearai-api-key

# Enable real IronClaw analysis (uses Mock TEE if unset)
# USE_REAL_TEE=true
```

### Database Setup

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
npx tsx src/lib/db/seed.ts
```

### Run

```bash
npm run dev
# http://localhost:3000
```

---

## Demo Flow

1. `http://localhost:3000` — Connect NEAR Testnet wallet
2. Click "Try with sample file" → analysis starts
3. IronClaw TEE analysis (5–15s) → Intel TDX Attestation badge → data purge confirmed
4. Insurance recommendation dashboard → select products
5. NEAR Confidential Intents payment completed

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

- **azerckid** — Founder & Full-Stack E2E Delivery

---

Built for **NEAR Buidl 2026 Hackathon** · Powered by NEAR Protocol

---
---

# OHmyDNA Insurance Agent (한국어)

**NEAR Protocol 기반 프라이버시 우선 유전자 보험 DApp**

유전자를 노출하지 않고, 유전자 덕분에 더 나은 보험에 가입하는 유일한 방법.

> NEAR Buidl 2026 Hackathon 제출작

[![라이브 데모](https://img.shields.io/badge/라이브_데모-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://buidl-2026-near.vercel.app/en)
[![피치 덱](https://img.shields.io/badge/피치_덱-4A154B?style=for-the-badge&logo=slides&logoColor=white)](https://buidl-2026-near.vercel.app/en/pitch)
[![데모 영상](https://img.shields.io/badge/데모_영상-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=FAVronsj7cA)

**NEAR 테스트넷 컨트랙트**: `zkp.rogulus.testnet`

---

## 무엇을 하는가

DTC(소비자 직접 검사) 유전자 데이터를 업로드하면:

1. **IronClaw TEE** 안에서 유전자 분석 — 원본 데이터는 분석 즉시 소각
2. **Intel TDX Attestation** 으로 인클레이브가 실제 하드웨어 격리 환경임을 암호학적으로 검증
3. **Noir ZKP** 증명으로 수치 없이 보험 자격 충족 여부만 증명
4. **NEAR Confidential Intents** 로 기밀 보험료 결제 — 보험사에 유전자 수치 전달 없음

---

## NEAR 기술 스택

| 기술 | 역할 |
|---|---|
| **IronClaw TEE** | 유전자 데이터 격리 분석 + 메모리 소각 (NEAR AI Cloud) |
| **Intel TDX Attestation** | 하드웨어 인클레이브 검증 — `GET /v1/attestation/report` (API 키 불필요) |
| **Confidential Intents** | 기밀 보험료 결제 (거래 내용 암호화) |
| **Chain Signatures** | 멀티체인 보험 상품 결제 (MPC 서명) |
| **Noir ZKP** | 유전자 수치 비공개 자격 증명 (`circuits/insurance_eligibility/`) |

---

## 아키텍처

```
사용자 브라우저
  └─ 파일 업로드 (SHA-256 해시만 저장)
      └─ NEAR AI Cloud (IronClaw TEE)
          └─ NormalizedGeneticProfile → TeeAnalysisOutput (분석 후 소각)
              └─ Noir ZKP proof 생성
                  └─ 보험 상품 매칭 → 추천 카트
                      └─ NEAR Confidential Intents 결제
```

**3계층 프라이버시 모델**
- Layer 1: TEE 격리 분석 (IronClaw Runtime)
- Layer 2: Edge DB 메타데이터만 저장 (Turso — 유전자 원본 미저장)
- Layer 3: Web3 신뢰 레이어 (Confidential Intents + Chain Signatures + ZKP)

---

## 기술 스택

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Shadcn/ui, Framer Motion
- **Backend**: Next.js Server Actions, Drizzle ORM, Turso (Edge SQLite)
- **AI/TEE**: NEAR AI Cloud (IronClaw) — OpenAI-compatible `/v1/chat/completions`
- **Web3**: NEAR Wallet Selector, near-api-js, @defuse-protocol/intents-sdk
- **ZKP**: Noir (`nargo`) — `circuits/insurance_eligibility/src/main.nr`

---

## 시작하기

### 사전 요구사항

- Node.js 20+
- Turso 계정 ([turso.tech](https://turso.tech))
- NEAR AI Cloud API 키 ([cloud.near.ai](https://cloud.near.ai))

### 설치

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

## 데모 흐름

1. `http://localhost:3000` — NEAR Testnet 지갑 연결
2. "샘플 파일로 체험하기" 클릭 → 분석 시작
3. IronClaw TEE 분석 (5~15초) → Intel TDX Attestation 배지 → 데이터 소각 확인
4. 보험 추천 대시보드 → 상품 선택
5. NEAR Confidential Intents 결제 완료

---

## 프로젝트 구조

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

## 명령어

```bash
npm run dev        # 개발 서버
npm run build      # 프로덕션 빌드
npm run lint       # ESLint

npx drizzle-kit studio     # DB 브라우저
npx tsx src/lib/db/seed.ts # 보험 상품 시드
```

---

## 팀

- **azerckid** — Founder & Full-Stack E2E Delivery

---

**NEAR Buidl 2026 Hackathon** 출품작 · Powered by NEAR Protocol
