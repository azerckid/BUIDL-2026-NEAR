# [신청서] NEAR Agentic Accelerator Application — OHmyDNA

- **작성일**: 2026-04-20
- **최종 수정일**: 2026-04-20
- **레이어**: 01_Concept_Design
- **상태**: Draft v2.1 (실제 폼 항목 기반, 구조 정비)
- **신청 대상**: 2025 NEAR Agentic Accelerator
- **신청 폼**: https://airtable.com/appc0ZVhbKj8hMLvH/pagVX3hSxzIj4Y680/form

> **중요 발견**: 이 프로그램은 단순 펀딩이 아닌 **Cohort 기반 교육 + 멘토십 + 기술 지원 + 토큰 설계** 액셀러레이터입니다.
> **Shade Agents Framework** 통합 여부를 필수 항목으로 묻고 있으며, 이는 OHmyDNA의 IronClaw TEE 아키텍처와 직접 연결됩니다.

---

## 프로그램 제공 내용 (확인됨)

- Personalized cohort-based programming (Education, product iteration, storytelling, token design)
- Dedicated Support: Technical support, token launch assistance, personalized roadmaps
- Founder-Friendly Terms: building and shipping에 집중할 수 있는 조건

---

## 섹션 1. Applicant / Founder Information

| 항목 | 답변 |
|---|---|
| First Name | Nam |
| Last Name | Hyeong-seog |
| Email | azerckid@gmail.com |
| Personal LinkedIn Profile | **[TODO: LinkedIn URL 입력 필요]** |
| Telegram Handle | @azerckid |
| Personal Twitter Profile | **[TODO: Twitter/X 핸들 입력 필요]** |
| NEAR Wallet Address | rogulus.testnet |

---

## 섹션 2. Tell us more about yourself and your journey to date.

---

### Q1. Can you please provide the roles of each team member and a brief (1 paragraph) background of each team member?

> I am Nam Hyeong-seog (azerckid), Founder and Full-Stack Engineer of MyDNA Insurance Agent. I designed and built the entire product solo — from product vision and Next.js frontend to IronClaw TEE integration, Noir ZKP circuits, NEAR smart contract deployment, and Chain Signatures MPC. I have a background spanning full-stack web development and Web3 infrastructure, with a particular focus on privacy-preserving computation. I am based in South Korea, targeting the Asia-Pacific market where DTC genetic testing adoption is highest. Phase 1 team expansion is planned for a Product Designer and Web3/Backend Engineer following accelerator onboarding.

---

### Q2. Please include the most impressive things that each of you have built or achieved.

> **1st Place — NEAR Protocol Track, NEAR Buidl 2026 Hackathon (April 2026)**
> During this hackathon, I built a fully working end-to-end privacy pipeline completely solo:
> - IronClaw TEE integration with real Qwen model inference on NEAR AI Cloud
> - Intel TDX hardware attestation verification via the NEAR AI public endpoint
> - Noir ZKP circuit (`insurance_eligibility`) compiled and deployed to NEAR testnet (`zkp.rogulus.testnet`)
> - `zkp-prover-wasm` — a custom Rust WASM prover (137KB, wasm32-wasip2) running inside the IronClaw enclave
> - Confidential Intents testnet payment flow with ZKP proof hash attached
> - Chain Signatures MPC integration via `v1.signer-prod.testnet`
> - Stateless AI concierge ("The Secret Keeper") — context purged on session end
> - 21/21 Playwright E2E tests passing on production (Vercel)
> - Full multilingual support (EN/KO), Framer Motion animation system
>
> Live app: https://buidl-2026-near.vercel.app/en
> Demo video: https://youtu.be/zt8yo6XRHNI

---

### Q3. Outside of work, is there an example of something you got deep into, spent a lot of time on, and became good at? (e.g. video game, sport, music, etc)

> Swimming. I started at 53 — not a typical age to take up a new sport — and I didn't do it casually. Within five years, I mastered all four strokes (freestyle, backstroke, breaststroke, butterfly) and can now swim 3 kilometers without stopping.
>
> The reason I started was straightforward: I was getting older and I wanted to stay functional, not just alive. But once I got into the water, something else took over. I became obsessed with technique — understanding why one stroke is efficient and another wastes energy, why breathing rhythm matters more than arm power, how small adjustments compound over 3,000 meters.
>
> I think this is the same pattern that made me able to learn Noir ZKP circuits and Rust WASM compilation from scratch during a hackathon. Once I decide something is worth understanding, I don't stop at "good enough." I go until it actually works — at 3km, or at 21/21 tests passing.
>
> And the health angle matters in another way: it's part of why I believe deeply in what I'm building. Genetic data is one of the most important inputs to long-term health decisions. The fact that people can't use their own genetic information safely — because they don't trust the system — is a problem I take personally.

---

### Q4. What's an example of a situation which seemed like a dead end, and where others would have given up, but you found a way to turn it around?

> During Phase 2 implementation of ZKP-in-TEE, I hit what seemed like an insurmountable wall: the `@defuse-protocol/intents-sdk` required `near-api-js v5`, but our production stack used `v7`. Downgrading would have broken the entire wallet signing flow we had already verified — the most critical part of the product.
>
> Instead of downgrading or abandoning Confidential Intents, I manually reconstructed the intent data structure from the protocol specification and built a custom implementation that preserved our `near-api-js v7` stack. The result: Confidential Intents payment works on testnet today without any SDK at all — and we can migrate cleanly when the SDK catches up.
>
> This is the same approach I took with the ZKP prover: rather than wait for Noir to support WASM-in-TEE natively, I built `zkp-prover-wasm` in Rust from scratch (137KB) so the proof generation runs entirely inside the IronClaw enclave.

---

## 섹션 3. Getting to know your interest and experience in crypto and/or AI

---

### Q5. Why are you in crypto/AI? This answer should be as personal and honest as possible.

> I'm 58 years old. My vision isn't what it used to be. And for the past decade, every time I had to review an insurance policy, a financial product, or any legal document, I had to pick up a magnifying glass — literally — and spend hours reading dense fine print that was designed to be difficult to navigate even for a younger, sharper reader.
>
> That's not a theoretical problem. That's my life.
>
> When AI became capable enough to read those documents for me, summarize the key clauses, and find what actually matters for my specific situation — I didn't think of it as a technology product. I thought of it as a tool that gave me back something I had been quietly losing: the ability to make informed decisions about my own health and finances without having to rely on someone else to translate the complexity for me.
>
> That's why I'm building MyDNA Insurance Agent. I am my own target user. A person who has a genetic test result sitting in a drawer, who is aging, who cannot easily parse hundred-page insurance policy documents, and who needs an AI that is not just intelligent — but provably trustworthy. One that doesn't keep my data. One that doesn't sell my profile. One that I can verify never saw my raw information.
>
> That last part — "provably trustworthy" — is why crypto matters here. Any AI can claim to protect your data. Only a system built on ZKP and TEE can prove it.

---

### Q6. What's the project in crypto/AI you're most bullish on and why? What's a project other people are bullish on that you're bearish on, and why?

> **Most Bullish**: NEAR Protocol — specifically the convergence of IronClaw TEE, Confidential Intents, and Chain Signatures happening simultaneously in 2026. This is the first time a full trustless privacy stack is technically feasible. Most ecosystems have one layer; NEAR has all three working together. The market hasn't priced this in yet.
>
> **Bearish on**: Worldcoin / World ID. The idea of scanning everyone's iris to create a "proof of humanity" solves a real problem, but it creates a permanent, irrevocable biometric identifier in a centralized database. It's solving privacy with surveillance. The irony is that ZKP exists precisely to avoid this — you can prove you're human without surrendering your iris. I believe any project that requires harvesting biometric data at scale will face a regulatory wall and a trust collapse, regardless of how many users it signs up today.

---

### Q7. What's the thing you've done in crypto/AI that you're most proud of?

> Building the entire ZKP-in-TEE pipeline solo during a hackathon — and winning 1st place.
>
> Specifically: writing `zkp-prover-wasm` in Rust, compiling it to wasm32-wasip2, and integrating it as an IronClaw Tool Call so that `risk_score` (the private genetic risk variable) never leaves the TEE enclave — not even to our own server. The proof generation, the private input, and the purge all happen inside the hardware-isolated black box.
>
> This is not a theoretical design. It runs today. And it took approximately 3 weeks of solo engineering to ship, starting from zero knowledge of Noir ZKP internals.

---

## 섹션 4. Project Information

---

### Q8. What is the name of your project?

> **MyDNA Insurance Agent** (also referred to as OHmyDNA)

---

### Q9. What stage is your project in?

> **Live-no-users**
>
> 근거: 프로덕션 배포 완료 (Vercel), E2E 파이프라인 실작동, 21/21 테스트 통과. 실제 보험 사용자는 아직 없음 (testnet 단계).

---

### Q10. Please add a link to your project's website.

> https://buidl-2026-near.vercel.app/en

---

### Q11. What are you currently building (or exploring)?

> **MyDNA Insurance Agent** is a privacy-first genetic insurance DApp on NEAR Protocol. We let users upload their DTC (Direct-to-Consumer) genetic test results and receive personalized insurance recommendations — without exposing their genetic data to anyone, including us.
>
> **How it works (technical stack):**
> 1. User uploads genetic file → SHA-256 hash only leaves the browser
> 2. **IronClaw TEE** (NEAR AI Cloud, Intel TDX): Qwen model parses the genetic report inside a hardware-isolated enclave → raw data purged immediately
> 3. **Noir ZKP** (`insurance_eligibility` circuit on `zkp.rogulus.testnet`): TEE generates proof that risk_score >= eligibility threshold — without revealing the score
> 4. **ZKP-in-TEE** (`zkp-prover-wasm`, 137KB Rust WASM): proof generation runs inside the enclave, so private_input never leaves the TEE
> 5. **The Secret Keeper** (NEAR AI stateless agent): answers health and insurance questions using only risk labels — DNA sequence never referenced, context purged on session end
> 6. **NEAR Confidential Intents**: private insurance premium payment, ZKP proof hash attached to transaction
> 7. **Chain Signatures** (`v1.signer-prod.testnet`): multi-chain premium payment from a single NEAR wallet (ETH Sepolia verified)
>
> The insurer receives only: "Eligibility: Confirmed." — no risk score, no raw data.
>
> **Links:**
> - Live App: https://buidl-2026-near.vercel.app/en
> - GitHub: https://github.com/azerckid/BUIDL-2026-NEAR
> - Demo Video: https://youtu.be/zt8yo6XRHNI
> - NEAR Testnet Contract: `zkp.rogulus.testnet`

---

### Q12. Why doesn't this idea exist yet? Is there some unique insight or new technological innovation that enables this to succeed where it couldn't have previously?

> **This product was technically impossible until Q1 2026.**
>
> Three technologies had to converge simultaneously for it to work:
> 1. **IronClaw TEE (NEAR AI Cloud)** — only went production-ready in early 2026. Before this, there was no hardware-isolated AI inference environment with on-chain attestation in Web3.
> 2. **NEAR Confidential Intents** — mainnet launched February 2026. Before this, there was no trustless private payment settlement without a centralized intermediary.
> 3. **Noir ZKP + WASM runtime** — wasm32-wasip2 target support matured in 2025-2026. Before this, running a ZKP prover inside a WASM sandbox (required for TEE execution) was not reliably achievable.
>
> The unique insight is not the idea itself — "genetic data + privacy + insurance" is obvious in hindsight. The insight is that **the only entity that can analyze genetic data ethically is one that provably cannot retain it**. And for the first time, NEAR's stack makes "provably cannot retain it" technically enforceable, not just a policy claim.
>
> No other ecosystem (Ethereum, Solana, AWS Nitro) combines TEE + ZKP + private settlement + chain-native MPC signing in one place. NEAR is uniquely positioned for this, and MyDNA is the first product to prove the full stack works.

---

### Q13. Who do you think of as competitors for this idea?

> **Direct competitors (none fully overlap):**
>
> - **Humanity Protocol / World ID** (Worldcoin): Biometric identity proof, not genetic insurance. They harvest irises; we avoid data collection entirely. Opposite philosophy.
> - **Nebula Genomics / LunaDNA**: Blockchain-based genetic data marketplaces — but these require users to submit raw data and "trust" encryption. No ZKP. No TEE. No trustless model.
> - **Traditional Insurtech (Oscar Health, Lemonade)**: AI-powered underwriting, but requires raw health data submission. Centralized. No privacy guarantees.
> - **Secret Network (SCRT Labs)**: Privacy-preserving computation using SGX enclaves, with a health data use case explored. However, they lack chain-native ZKP circuits, Confidential Intents settlement, and MPC-based multi-chain signing — the three layers that make MyDNA's privacy model fully verifiable end-to-end.
> - **Oasis Protocol (Sapphire)**: Confidential EVM runtime with TEE support. Strong infrastructure, but no application-layer genetic insurance product, no ZKP eligibility circuit, and no AI inference layer. They provide a primitive; we provide the complete product.
>
> **Why none of them are real threats right now:**
> The ZKP-in-TEE layer creates a technical moat that requires simultaneous expertise in Noir circuits, Rust WASM compilation, NEAR AI Cloud API, and hardware attestation verification. No competitor has shipped this stack.
>
> **The real competitor is inertia** — the 50 million people who took DTC genetic tests and currently do nothing with the results because they don't trust the system.

---

### Q14. What does success look like for the project?

> **12-month success definition:**
> - 10,000 users complete the full insurance eligibility proof flow (TEE → ZKP → recommendation)
> - 3 DTC genetic testing providers (e.g., GeneToCare, 23andMe API) integrated as data input sources
> - 1 licensed insurance product live on the platform (parametric or supplemental coverage)
> - ZKP-in-TEE running on NEAR mainnet with `barretenberg ultraplonk` on-chain verification
> - Confidential Intents mainnet payment flow live
>
> **Long-term (3-year) success definition:**
> - The privacy-first genetic insurance model becomes the industry standard in Asia-Pacific
> - NEAR's TEE + ZKP stack is validated as production-grade infrastructure for regulated healthcare data
> - MyDNA is the data infrastructure layer that other health-adjacent DeFi protocols build on top of

---

## 섹션 5. Program-specific Questions

---

### Q15. What are your top goals that you believe the NEAR Agentic Accelerator can help with?

> **OKR 1: ZKP-in-TEE Production Completion**
> IronClaw WASM tool registration on `cloud.near.ai` is pending the NEAR AI team. We need technical guidance to unblock this and deploy `zkp-prover-wasm` to production. This is our top blocker for Phase 2.
>
> **OKR 2: Shade Agents Framework Integration**
> We want to rebuild "The Secret Keeper" AI concierge as a proper Shade Agent — with on-chain verification of the agent's behavior and TEE-attested conversation purge. This requires deep understanding of the Shade Agents architecture that mentorship can accelerate significantly.
>
> **OKR 3: Go-to-Market for Privacy-Sensitive Healthcare**
> Selling a privacy product in healthcare requires a different approach than standard Web3 GTM. We need help with regulatory sandbox entry strategy (South Korea, Singapore) and partnership introductions to DTC genetic testing providers.
>
> **OKR 4: Token Design**
> Phase 3 includes a data reward model — users who contribute anonymized risk profiles earn tokens. We need guidance on tokenomics that aligns user incentives without creating a data monetization liability.
>
> **Funding Ask: $150,000 ~ $250,000 USD**
> - 40%: Engineering (ZKP-in-TEE production completion, Confidential Intents SDK integration)
> - 25%: External Security Audit (Q3 2026) — mandatory before mainnet launch with real health data
> - 20%: Team Expansion (Product Designer + Backend Engineer)
> - 15%: NEAR AI Cloud compute credits + infrastructure

---

### Q16. Why do you think the Shade Agents Framework is beneficial to your product or use case?

> Shade Agents is the natural infrastructure layer for MyDNA — our entire privacy model is built on the same foundational principle: **an AI agent that runs inside a TEE, with its behavior cryptographically verifiable on-chain**.
>
> Specifically, Shade Agents solves our three hardest trust problems:
>
> **Trust Problem 1: Did the TEE actually purge the data?**
> Currently, we claim data purge via UI animation and attestation badge. With Shade Agents, the agent's execution environment is on-chain verifiable — the purge is cryptographically provable, not just claimed.
>
> **Trust Problem 2: Is "The Secret Keeper" actually stateless?**
> Our AI concierge is designed to forget everything after each session. With Shade Agents, the stateless property becomes a verifiable constraint enforced by the framework — users don't have to trust our policy.
>
> **Trust Problem 3: Did the ZKP proof actually run inside the enclave?**
> Today, we attest via Intel TDX `/v1/attestation/report`. With Shade Agents, the agent's code hash and execution context are registered on-chain — any deviation from the expected behavior is detectable.
>
> In short: Shade Agents turns our "trust our privacy claims" model into a "verify our privacy claims" model — which is exactly the Trustless standard we claim to uphold.

---

### Q17. How are you (or do you plan to) integrate the Shade Agents Framework into your project?

> **Phase 2 (Q2-Q3 2026): The Secret Keeper as Shade Agent**
>
> The most natural integration point is our AI concierge, "The Secret Keeper." Currently it runs as a standard NEAR AI Cloud API call with system prompt injection. We plan to:
>
> 1. Register "The Secret Keeper" as a Shade Agent on NEAR — with its system prompt hash and allowed tool set committed on-chain
> 2. Each conversation session generates an on-chain record confirming: agent code hash, session start/end timestamps, and explicit "no context retention" assertion
> 3. Risk profile labels (the only input to the agent) are passed as verifiable commitments — not raw values
>
> **Phase 3 (Q4 2026): Full ZKP-in-TEE Shade Agent**
>
> The genetic analysis pipeline itself becomes a Shade Agent:
> - `zkp-prover-wasm` runs as an on-chain verifiable tool within the Shade Agent
> - Attestation report from Intel TDX is cross-validated against the agent's registered code hash
> - The entire pipeline (upload → parse → ZKP generate → purge) becomes a single auditable on-chain transaction trace
>
> This is the strongest possible technical proof of our core value proposition: "We provably cannot see your data."

---

### Q18. Do you have any active partnerships?

> **Current partnerships**: None formalized yet.
>
> **Partnerships we are actively pursuing:**
> - **GeneToCare (Korea)**: DTC genetic testing provider — for raw data format standardization and user referral pipeline
> - **NEAR AI Team**: Active collaboration on IronClaw WASM tool registration (in progress)
> - **Aztec Protocol**: Exploring Barretenberg ultraplonk NEAR compatibility for Phase 3 on-chain ZKP verification
>
> **Partnerships we would love HZN to introduce us to:**
> - Asia-Pacific insurtech / parametric insurance players (looking for first B2B insurance partner)
> - Korean / Singaporean legal counsel specializing in genetic data regulation and regulatory sandbox applications
> - DTC genetic testing providers with API access (23andMe, AncestryDNA, or Asian equivalents)

---

### Q19. Have you raised funding? If so, from who and how much have you raised?

> No external funding raised to date.
>
> **Hackathon Recognition:**
> - 1st Place — NEAR Protocol Track, NEAR Buidl 2026 Hackathon (April 2026, Ludium platform)
> - Prize award: **[TODO: 수상금 금액 확인 후 기재]**
>
> This is a bootstrapped project built entirely by the founder. The NEAR Agentic Accelerator would be our first institutional support.

---

### Q20. Please upload anything that you believe would be helpful to your application.

**업로드 준비 자료 목록:**

- [x] 데모 영상 링크: https://youtu.be/zt8yo6XRHNI
- [x] 피치덱 PDF 또는 링크: https://buidl-2026-near.vercel.app/en/pitch
- [x] GitHub 레포지토리: https://github.com/azerckid/BUIDL-2026-NEAR
- [ ] 해커톤 수상 증빙 스크린샷 (Ludium 포털) — **[TODO: 캡처 후 첨부]**

---

## 섹션 6. Other

---

### Q21. How did you hear about NEAR Agentic Accelerator?

> **HZN Event** 또는 **Nearcon** 선택
> (NEAR Buidl 2026 해커톤을 통해 알게 된 경우)

---

### Q22. Let us know who referred you to the NEAR Agentic Accelerator!

> Discovered through the NEAR Buidl 2026 Hackathon (NEAR Protocol Track 1st Place winner). NEAR Foundation team members at the event mentioned the HZN Agentic Accelerator as the next step for hackathon winners building with NEAR AI stack.

---

### Q23. What else should we know?

> Three things I want to make sure the review team knows:
>
> **1. This is not a prototype — it runs today.**
> Every technology claim in this application is backed by working production code. The live app is accessible without login at https://buidl-2026-near.vercel.app/en and processes real IronClaw TEE calls.
>
> **2. The timing advantage is real but temporary.**
> The convergence of IronClaw TEE + Confidential Intents + Chain Signatures happened in early 2026. Other teams will realize this opportunity within 6-12 months. MyDNA has a 1-year head start with a working implementation — but only if we can accelerate Phase 2 and 3.
>
> **3. We are open-sourcing the TEE wrapper and ZKP templates.**
> As committed in our pitch, the IronClaw integration boilerplate (Next.js + TEE) and the `insurance_eligibility` Noir circuit template will be released to the NEAR ecosystem. This is not just a product — it is public infrastructure for every privacy DApp that comes after us.

---

## 신청 전 최종 체크리스트

- [x] Q3 (수영 — 53세에 시작, 3km 완주, 모든 영법) — 완료
- [x] Q5 (시력 저하, 보험 문서, "I am my own target user") — 완료
- [x] Q13 경쟁사 (Secret Network, Oasis Protocol 추가) — 완료
- [x] Q15 펀딩 요청 금액 ($150K~$250K + 배분) — 완료
- [ ] **LinkedIn URL 입력** (섹션 1)
- [ ] **Twitter/X 핸들 입력** (섹션 1)
- [ ] **해커톤 수상금 금액 확인** (Q19)
- [ ] **수상 증빙 스크린샷 첨부** (Q20)
- [ ] GitHub 레포지토리 public 접근 확인
- [ ] Live App 정상 작동 확인
- [ ] Privacy Policy 동의 체크박스

---

## X. Related Documents

- [PITCH_DECK.md](./PITCH_DECK.md) — 5분 발표 대본 및 슬라이드 내용
- [HZN_INCUBATION_DRAFT.md](./HZN_INCUBATION_DRAFT.md) — HZN AI Incubation Program 별도 초안 (v1.0)
- [ROADMAP.md](../04_Logic_Progress/ROADMAP.md) — Phase별 마일스톤 및 현황
- [README.md](../../README.md) — 프로젝트 기술 스택 전체 요약
