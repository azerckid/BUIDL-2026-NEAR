# [초안] HZN AI Incubation Program Application — OHmyDNA

- **작성일**: 2026-04-20
- **최종 수정일**: 2026-04-20
- **레이어**: 01_Concept_Design
- **상태**: Draft v1.0 (일반 질문 기반 초안 — 실제 폼 확인 전)
- **신청 대상**: NEAR Horizon AI Incubation Program
- **신청 폼**: https://www.hzn.xyz/

> **주의**: 이 파일은 HZN_APPLICATION_STRATEGY.md (Agentic Accelerator v2.1)와 별개입니다.
> 실제 HZN AI Incubation 폼 항목 확인 후 내용을 조정하세요.

---

## 1. 프로그램 개요 및 우리 프로젝트의 적합성

### HZN AI Incubation Program이란

NEAR Horizon은 탈중앙화 AI 애플리케이션을 구축하는 파운더를 위한 인큐베이션 프로그램입니다.

제공 내용:
- Compute Credits (컴퓨트 크레딧) — NEAR AI Cloud IronClaw 실험 비용 절감
- 멘토십 및 전략적 파트너십
- Top-tier founder 네트워크 접근
- $500,000 이상 Builder Perks (툴링, 인프라 할인)
- 생태계 공개 노출 (Featured AI Projects 등재)

### OHmyDNA의 적합성 평가

| HZN 요구 조건 | OHmyDNA 현황 | 적합도 |
|---|---|---|
| 탈중앙화 AI 애플리케이션 | IronClaw TEE + NEAR AI Cloud 기반 유전자 분석 AI | 완전 부합 |
| NEAR 생태계 빌더 | NEAR Buidl 2026 Protocol Track 1위 수상 | 최고 수준 |
| 실작동 코드 보유 | E2E 파이프라인 Live (Vercel), 21/21 E2E 통과 | 검증 완료 |
| User-Owned AI 비전 | 유전자 데이터의 완전한 사용자 주권 + ZKP 증명 | 핵심 일치 |
| Privacy-first 설계 | 3계층 프라이버시 (TEE + ZKP + Confidential Intents) | 차별화 강점 |

---

## 2. 핵심 메시지 전략

### 한 문장 요약 (Tagline)

> "The only AI that can analyze your most sensitive data — without ever seeing it."

### 왜 HZN이 지금 OHmyDNA를 선택해야 하는가

1. **증명된 기술**: 해커톤 1위 수상 + 실작동 파이프라인 = 리스크 없는 투자
2. **NEAR 생태계 최초**: IronClaw TEE + Confidential Intents + Chain Signatures를 실제 헬스케어 유스케이스에 통합한 최초 프로젝트
3. **글로벌 TAM**: $4.5조 보험 시장 + $35B 유전자 검사 시장의 교차점
4. **오픈소스 기여**: TEE-App 보일러플레이트 + Noir ZKP 템플릿을 생태계 공개 계획

---

## 3. 신청서 질문별 답변 초안

> 실제 폼 항목은 JavaScript 렌더링으로 직접 확인 필요. 아래는 HZN 신청 폼의 일반적인 질문 유형에 기반한 답변 초안입니다.

---

### Q1. Project Name / One-line Description

> MyDNA Insurance Agent — Privacy-first genetic insurance DApp powered by NEAR AI Cloud (IronClaw TEE + Noir ZKP + Confidential Intents).

---

### Q2. What problem are you solving?

Tens of millions of people have taken DTC (Direct-to-Consumer) genetic tests — from 23andMe, AncestryDNA, and local providers — but their results sit unused in drawers.

The reason: **genetic discrimination and permanent data exposure risk**.

- Insurers today demand raw genetic data submission, which means surrendering it permanently.
- Once leaked (e.g., the 2023 23andMe breach exposing 6.9M profiles), DNA cannot be reset — ever.
- There is no existing product that enables personalized insurance underwriting **without data exposure**.

This is healthcare insurance's biggest unsolved problem, sitting at the intersection of a $4.5T global insurance market and a $35B genetic testing market projected by 2030.

---

### Q3. What is your solution?

MyDNA Insurance Agent implements a three-layer privacy architecture that makes better insurance possible without data exposure:

**Layer 1 — IronClaw TEE (NEAR AI Cloud)**
Your genetic file is analyzed inside a hardware-isolated Intel TDX enclave. The raw data is permanently purged immediately after analysis. The operator (us) cannot access the data either.

**Layer 2 — Noir Zero-Knowledge Proof**
A ZKP circuit (`insurance_eligibility`) generates cryptographic proof that you meet eligibility thresholds — without revealing any numeric risk scores. The insurer receives only: "Eligibility: Confirmed."

**Layer 3 — NEAR Confidential Intents**
Premium payment is settled through Confidential Intents, ensuring even the on-chain transaction reveals no sensitive information.

The result: users receive personalized, optimized insurance coverage while their genetic data never leaves the TEE enclave.

**Live demo:** https://buidl-2026-near.vercel.app/en

---

### Q4. What have you built so far? (Technical Traction)

We shipped a fully working end-to-end pipeline during the NEAR Buidl 2026 hackathon — **winning 1st place in the NEAR Protocol Track**.

| Layer | What We Built | Status |
|---|---|---|
| IronClaw TEE | Real Qwen model inference on NEAR AI Cloud, genetic data parsing inside enclave | Live |
| Intel TDX Attestation | Hardware trust verification via `/v1/attestation/report` endpoint, nonce binding, DB recording, UI badge | Live |
| Noir ZKP Circuit | `insurance_eligibility` circuit compiled and deployed to NEAR testnet (`zkp.rogulus.testnet`) | Live |
| ZKP-in-TEE (Phase 2) | `zkp-prover-wasm` (Rust, 137KB, wasm32-wasip2) — HMAC-SHA256 commitment circuit built | Phase 2 |
| Confidential Intents | Testnet payment flow with ZKP proof hash attached, UI panel displaying intent structure | Live |
| Chain Signatures | `v1.signer-prod.testnet` MPC integration, ETH Sepolia derived address + broadcast | Live |
| Frontend | Next.js 16 + React 19, 5-step user flow, multilingual (EN/KO), Framer Motion animations | Live |
| AI Concierge | "The Secret Keeper" — stateless NEAR AI powered agent, conversation context purged on session end | Live |

**Test Coverage**: 21/21 Playwright E2E tests passing on production (Vercel).

**GitHub**: https://github.com/azerckid/BUIDL-2026-NEAR
**Live App**: https://buidl-2026-near.vercel.app/en
**Demo Video**: https://youtu.be/zt8yo6XRHNI

---

### Q5. Why NEAR? Why now?

NEAR is the **only ecosystem** where IronClaw TEE, Confidential Intents, and Chain Signatures exist together under one roof.

- AWS Nitro is powerful — but it's still a "trust-me" model. You're trusting Amazon.
- With NEAR: every step is cryptographically verifiable on-chain. We don't ask anyone to trust us.

The timing is critical:
- IronClaw TEE went production-ready on NEAR AI Cloud in early 2026
- Confidential Intents mainnet launched February 2026
- Chain Signatures MPC is production-stable

This is the first moment in Web3 history where a full trustless privacy stack for sensitive data applications is technically feasible. MyDNA is the first product to prove it works — on a $35B market.

---

### Q6. Business Model

**Primary Revenue**: Platform commission replacing the traditional 15% broker fee on every insurance policy purchased through MyDNA.
- Traditional brokers charge 15% of annual premium for policy sales
- MyDNA replaces this with a smart contract at lower cost, capturing 5-8% as platform fee
- This is a direct, high-margin revenue stream requiring no inventory or credit risk

**Secondary Revenue**: AI Private Membership
- Anti-aging and health management AI subscription, using continuously updated risk labels
- Recurring revenue with high retention (health data evolves over time)

**Target Market (Beachhead)**:
- Asia-Pacific MZ generation (age 25-40) with DTC genetic test experience
- South Korea, Japan, Singapore — markets with high DTC adoption and digital-native insurance behavior
- TAM: $4.5T global health/digital insurance market
- SAM: $80B Asia-Pacific digital insurance market

---

### Q7. What do you need from HZN? (Ask)

We are seeking to join HZN AI Incubation Program for three specific needs:

**1. Compute Credits**
NEAR AI Cloud IronClaw API costs accumulate rapidly at scale. Compute credits would allow us to run production-level load testing and serve actual beta users without burning runway.

**2. Strategic Introductions**
- Introduction to DTC genetic testing providers (GeneToCare, 23andMe API partners) for data pipeline integration
- Introduction to Asia-Pacific insurtech / parametric insurance players for B2B channel partnerships
- Introduction to NEAR ecosystem lawyers for regulatory sandbox applications (genetic data regulation is jurisdiction-specific)

**3. Mentorship**
- Go-to-market strategy for a privacy-sensitive healthcare product
- Tokenomics design for Phase 3 (data reward model for users who contribute anonymized risk profiles)
- Guidance on NEAR Foundation grant application timing and positioning

**Funding Ask**: $150,000 ~ $250,000 USD
- 40%: Engineering (ZKP-in-TEE production completion, Confidential Intents SDK integration)
- 25%: External Security Audit (Q3 2026)
- 20%: Team Expansion (Product Designer + Backend Engineer)
- 15%: NEAR AI Cloud credits + infrastructure

---

### Q8. Team

**Nam Hyeong-seog (azerckid) — Founder & Full-Stack Engineer**
- Built the entire pipeline solo: product design, Next.js frontend, Drizzle/Turso DB, IronClaw TEE integration, Noir ZKP circuits, NEAR smart contract deployment, Chain Signatures MPC
- 1st Place — NEAR Protocol Track, NEAR Buidl 2026 Hackathon
- Contact: azerckid@gmail.com

**Planned Phase 1 Hires**:
- Product Designer (UX/UI for medical-grade data sensitivity)
- Web3/Backend Engineer (ZKP circuit optimization, Confidential Intents SDK)

---

### Q9. Links / Proof of Work

| Resource | URL |
|---|---|
| Live Application | https://buidl-2026-near.vercel.app/en |
| Demo Video (3 min) | https://youtu.be/zt8yo6XRHNI |
| GitHub Repository | https://github.com/azerckid/BUIDL-2026-NEAR |
| Pitch Deck (in-app) | https://buidl-2026-near.vercel.app/en/pitch |
| Hackathon Result | https://www.ludium.world/dashboard/hackathon/builder/f8a6bb25-671a-44c3-a8c3-293a5d048e51?tab=my-buidls |
| NEAR Testnet Contract | zkp.rogulus.testnet |

---

## 4. 신청 전 체크리스트

- [ ] 실제 HZN 폼 접속하여 질문 항목 확인 후 위 답변 조정
- [ ] GitHub 레포지토리 public 상태 확인
- [ ] Demo 영상 URL 유효성 확인
- [ ] Live App URL 정상 작동 확인
- [ ] azerckid@gmail.com 이메일 준비 (폼 제출 시 연락처)
- [ ] LinkedIn 또는 개인 소개 페이지 준비 (팀 소개용)

---

## 5. 병행 전략: Protocol Rewards

HZN 신청과 동시에 **NEAR Protocol Rewards** (https://www.nearprotocolrewards.com/)도 신청합니다.

Protocol Rewards는 개발 활동 지표(GitHub commits, on-chain transactions, user adoption)에 기반한 **월 최대 $10,000 USD** 지급 프로그램입니다.

Phase 2 구현이 활발한 현재 시점이 신청 최적기입니다.

---

## 6. 타임라인 권고

| 일정 | 행동 |
|---|---|
| **즉시 (2026-04-20)** | HZN 신청 폼 접속 → 실제 질문 확인 → 위 초안 조정 후 제출 |
| **2026-04-21** | Protocol Rewards 신청 |
| **2026-04-25까지** | HZN 심사팀 응답 대기 (통상 1-2주) |
| **Q2 2026** | HZN 온보딩 후 Compute Credits 활용, ZKP-in-TEE Phase 2 완성 |

---

## X. Related Documents

- [HZN_APPLICATION_STRATEGY.md](./HZN_APPLICATION_STRATEGY.md) — Agentic Accelerator 신청서 (v2.1, 메인)
- [PITCH_DECK.md](./PITCH_DECK.md) — 5분 발표 대본 및 슬라이드 내용
- [ROADMAP.md](../04_Logic_Progress/ROADMAP.md) — Phase별 마일스톤 및 현황
- [README.md](../../README.md) — 프로젝트 기술 스택 전체 요약
