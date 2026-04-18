# MyDNA Insurance Agent

**Privacy-first genetic insurance DApp powered by NEAR Protocol**

The only way to get better insurance because of your genes — without exposing them.

[![NEAR Protocol Track 1st Place](https://img.shields.io/badge/NEAR_Protocol_Track-1st_Place-gold?style=for-the-badge)](https://www.ludium.world/dashboard/hackathon/builder/f8a6bb25-671a-44c3-a8c3-293a5d048e51?tab=my-buidls)
[![Live Demo](https://img.shields.io/badge/Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://buidl-2026-near.vercel.app/en)
[![Demo Video](https://img.shields.io/badge/Demo_Video-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/zt8yo6XRHNI)
[![Pitch Deck](https://img.shields.io/badge/Pitch_Deck-4A154B?style=for-the-badge&logo=slides&logoColor=white)](https://buidl-2026-near.vercel.app/en/pitch)

**NEAR Testnet Contract**: `zkp.rogulus.testnet`

> **NEAR Buidl 2026 Hackathon — NEAR Protocol Track 1st Place**
> Currently in Phase 2: ZKP-in-TEE production implementation

---

## What It Does

Upload your DTC (Direct-to-Consumer) genetic data and receive personalized insurance recommendations — without exposing your genetic information to anyone.

1. **IronClaw TEE** (NEAR AI Cloud) analyzes your genome in hardware isolation — raw data is purged immediately after analysis
2. **Intel TDX Attestation** cryptographically verifies the enclave is genuine hardware-isolated
3. **Noir ZKP** proof verifies insurance eligibility without revealing any numeric values
4. **NEAR Confidential Intents** settles your premium privately — insurers never see your genetic data
5. **AI Concierge** (The Secret Keeper) answers health and insurance questions using only risk labels — no raw data retained

---

## Why This Matters

The global genetic testing market is projected to reach $35B by 2030. Yet today, submitting your genetic data for insurance means surrendering it permanently. MyDNA Insurance Agent solves this with a three-layer privacy architecture that makes better insurance possible without data exposure.

**The core insight**: insurers need to know you qualify — not your actual risk score. ZKP makes this distinction technically enforceable.

---

## NEAR Technology Stack

| Technology | Role | Status |
|---|---|---|
| **IronClaw TEE** | Isolated genetic analysis + memory purge (NEAR AI Cloud) | Live |
| **Intel TDX Attestation** | Hardware enclave verification via `/v1/attestation/report` | Live |
| **Noir ZKP** | Zero-knowledge eligibility proof (`circuits/insurance_eligibility/`) | Live |
| **ZKP-in-TEE** | WASM prover (`zkp-prover-wasm`) running inside IronClaw enclave | Phase 2 |
| **Confidential Intents** | Private premium settlement | Live (testnet) |
| **Chain Signatures** | Multi-chain payment via MPC signing | Live (testnet) |

---

## Architecture: 3-Layer Privacy Model

```
User Browser
  └─ File upload (SHA-256 hash only — raw file never leaves browser)
      └─ NEAR AI Cloud (IronClaw TEE — Intel TDX)
          ├─ NormalizedGeneticProfile → TeeAnalysisOutput (purged after analysis)
          └─ ZKP-in-TEE: zkp-prover WASM generates proof (risk_score never leaves enclave)
              └─ proof_bytes + public_inputs
                  └─ Insurance product matching → recommendation cart
                      └─ NEAR Confidential Intents payment
```

| Layer | Technology | Privacy Guarantee |
|---|---|---|
| Layer 1 | IronClaw TEE (Intel TDX) | Operator cannot access data; hardware attestation verifiable |
| Layer 2 | Turso Edge DB | Metadata only — no raw genetic data ever stored |
| Layer 3 | Confidential Intents + ZKP | Insurer sees eligibility proof only, never risk score |

---

## Phase 2 Progress (Post-Hackathon)

| Item | Status |
|---|---|
| `zkp-prover-wasm` — HMAC-SHA256 commitment circuit (wasm32-wasip2, 137KB) | Done |
| `prover.ts` — IronClaw Tool Call API integration | Done |
| `verifier.ts` — SHA-256 proof hash + on-chain registration | Done |
| IronClaw WASM tool registration on `cloud.near.ai` | Pending (NEAR AI team) |
| Barretenberg ultraplonk (Phase 3) | Roadmap |

---

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Shadcn/ui, Framer Motion
- **Backend**: Next.js Server Actions, Drizzle ORM, Turso (Edge SQLite)
- **AI/TEE**: NEAR AI Cloud (IronClaw) — OpenAI-compatible `/v1/chat/completions`
- **Web3**: NEAR Wallet Selector, near-api-js v7, Chain Signatures
- **ZKP**: Noir circuit + `zkp-prover-wasm` (Rust, wasm32-wasip2)

---

## Getting Started

### Prerequisites

- Node.js 20+
- Turso account ([turso.tech](https://turso.tech))
- NEAR AI Cloud API key ([cloud.near.ai](https://cloud.near.ai))

### Setup

```bash
git clone https://github.com/azerckid/BUIDL-2026-NEAR
cd BUIDL-2026-NEAR
npm install
cp .env.example .env.local
# Fill in TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, IRONCLAW_API_KEY
```

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
npx tsx src/lib/db/seed.ts
npm run dev
# http://localhost:3000
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TURSO_DATABASE_URL` | Yes | Turso DB URL |
| `TURSO_AUTH_TOKEN` | Yes | Turso auth token |
| `IRONCLAW_API_KEY` | Yes | NEAR AI Cloud API key |
| `USE_REAL_TEE` | No | `true` = IronClaw analysis (default: Mock) |
| `USE_REAL_ZKP` | No | `true` = IronClaw WASM tool proof (default: local HMAC) |

---

## Demo Flow

1. Connect NEAR Testnet wallet
2. Click "Try with sample file" — DTC genetic data sample loads automatically
3. IronClaw TEE analysis (5–15s) → Intel TDX Attestation badge → memory purge animation
4. Insurance recommendation dashboard → select products → AI Concierge Q&A
5. NEAR Confidential Intents payment → insurance certificate issued

---

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
├── components/modules/     # Domain components (TEE progress, dashboard, concierge)
├── lib/
│   ├── db/                 # Drizzle schema + Turso client
│   ├── near/               # Wallet, Chain Signatures, MPC
│   ├── tee/                # IronClaw + Mock TEE + Attestation
│   └── zkp/                # ZKP prover + verifier
├── actions/                # Server Actions
└── types/                  # Zod schemas + TypeScript types
circuits/
└── insurance_eligibility/  # Noir ZKP circuit (assert risk_score >= threshold)
zkp-prover-wasm/
└── src/main.rs             # Rust WASM prover (wasm32-wasip2, 137KB)
```

---

## Team

- **azerckid** — Founder & Full-Stack E2E

---

## Contact

For investment inquiries or partnership discussions: **azerckid@gmail.com**

---

Built at **NEAR Buidl 2026 Hackathon** · NEAR Protocol Track 1st Place · Powered by NEAR Protocol

---
---

# MyDNA Insurance Agent (한국어)

**NEAR Protocol 기반 프라이버시 우선 유전자 보험 DApp**

유전자를 노출하지 않고, 유전자 덕분에 더 나은 보험에 가입하는 유일한 방법.

[![NEAR Protocol 트랙 1위](https://img.shields.io/badge/NEAR_Protocol_트랙-1위_수상-gold?style=for-the-badge)](https://buidl.near.org)
[![라이브 데모](https://img.shields.io/badge/라이브_데모-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://buidl-2026-near.vercel.app/en)
[![데모 영상](https://img.shields.io/badge/데모_영상-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://youtu.be/zt8yo6XRHNI)
[![피치 덱](https://img.shields.io/badge/피치_덱-4A154B?style=for-the-badge&logo=slides&logoColor=white)](https://buidl-2026-near.vercel.app/en/pitch)

**NEAR 테스트넷 컨트랙트**: `zkp.rogulus.testnet`

> **NEAR Buidl 2026 해커톤 — NEAR Protocol 트랙 1위 수상**
> 현재 Phase 2 진행 중: ZKP-in-TEE 프로덕션 구현

---

## 무엇을 하는가

DTC(소비자 직접 검사) 유전자 데이터를 업로드하면 맞춤 보험 추천을 받습니다 — 유전자 정보는 누구에게도 노출되지 않습니다.

1. **IronClaw TEE** (NEAR AI Cloud)에서 하드웨어 격리 유전자 분석 — 원본 데이터 분석 즉시 소각
2. **Intel TDX Attestation**으로 인클레이브가 실제 하드웨어 격리 환경임을 암호학적으로 검증
3. **Noir ZKP** 증명으로 수치 없이 보험 자격 충족 여부만 증명
4. **NEAR Confidential Intents**로 기밀 보험료 결제 — 보험사에 유전자 수치 전달 없음
5. **AI 상담 레이어** (The Secret Keeper) — 위험 레이블만 사용, 원본 데이터 미보관

---

## 왜 중요한가

글로벌 유전자 검사 시장은 2030년 350억 달러 규모로 성장 예상. 현재는 유전자 데이터를 보험사에 제출하면 영구적으로 넘겨야 합니다. MyDNA Insurance Agent는 3계층 프라이버시 아키텍처로 데이터 노출 없이 더 나은 보험을 가능하게 합니다.

---

## Phase 2 진행 현황 (해커톤 이후)

| 항목 | 상태 |
|---|---|
| `zkp-prover-wasm` — HMAC-SHA256 커밋먼트 회로 (wasm32-wasip2, 137KB) | 완료 |
| `prover.ts` — IronClaw Tool Call API 연동 | 완료 |
| `verifier.ts` — SHA-256 proof hash + 온체인 등록 | 완료 |
| IronClaw WASM 툴 등록 (`cloud.near.ai`) | 진행 중 (NEAR AI 팀 협의) |
| Barretenberg ultraplonk (Phase 3) | 로드맵 |

---

## 투자 문의

**azerckid@gmail.com**

---

**NEAR Buidl 2026 해커톤** 출품작 · NEAR Protocol 트랙 1위 · Powered by NEAR Protocol
