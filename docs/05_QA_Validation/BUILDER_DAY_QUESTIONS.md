# Builder Day -- Questions & Talking Points
# Builder Day -- 질문 및 대화 준비 문서

- **Created**: 2026-04-13
- **Last Updated**: 2026-04-14
- **Layer**: 05_QA_Validation
- **Status**: Final v1.0
- **Event**: BuidlHack Builder Day | April 14, 2026 | DSRV (B1) | 18:00-21:30

---

## How to Use This Document / 이 문서 사용법

- English is the primary language. Korean is added below each section for reference.
- Speak slowly. Use simple words. Be specific.
- Print this or keep it on your phone.

> 영어가 기본입니다. 각 섹션 아래에 한국어를 병기했습니다.
> 천천히 말하세요. 쉬운 단어를 쓰세요. 구체적으로 질문하세요.
> 이 문서를 인쇄하거나 폰에 저장해 두세요.

---

## 1. Your 2-3 Minute Intro / 2-3분 자기소개

> When a sponsor asks "What are you building?" -- say these three things.
>
> 스폰서가 "뭘 만들고 있나요?"라고 물으면 -- 이 세 가지를 말하세요.

### What it is / 무엇인가

**English:**
"OHmyDNA is a privacy-first insurance DApp on NEAR. Users upload their genetic data, we analyze it inside IronClaw TEE -- a hardware-level secure box -- and we burn the raw data right after. The insurer only gets a zero-knowledge proof that says 'this person qualifies.' No raw data is ever shared."

**Korean (참고용):**
"OHmyDNA는 NEAR 기반의 프라이버시 우선 보험 DApp입니다. 사용자가 유전자 데이터를 업로드하면, IronClaw TEE라는 하드웨어 수준의 보안 격리 공간에서 분석하고, 분석 즉시 원본 데이터를 소각합니다. 보험사에는 '이 사람은 자격이 됩니다'라는 영지식 증명만 전달됩니다. 원본 데이터는 절대 공유되지 않습니다."

---

### How it works / 어떻게 동작하나

**English:**
"We use three NEAR technologies together: IronClaw TEE for secure analysis, Confidential Intents for private payments, and Chain Signatures for multi-chain settlement. The full pipeline is working code, not just slides."

**Korean (참고용):**
"세 가지 NEAR 기술을 함께 사용합니다. 보안 분석을 위한 IronClaw TEE, 기밀 결제를 위한 Confidential Intents, 멀티체인 정산을 위한 Chain Signatures. 전체 파이프라인이 슬라이드가 아니라 동작하는 코드입니다."

---

### Why now / 왜 지금인가

**English:**
"These three technologies became available at the same time only in 2026, and only on NEAR. No other chain offers TEE, confidential transactions, and multi-chain signatures together. That's why this project exists now."

**Korean (참고용):**
"이 세 기술이 동시에 가용해진 것은 2026년 NEAR가 처음입니다. TEE, 기밀 트랜잭션, 멀티체인 서명을 동시에 제공하는 체인은 없습니다. 이 프로젝트가 지금 존재하는 이유입니다."

---

---

## 2. Questions -- Category 1: Track Fit / 트랙 적합성

> Ask these to the **NEAR AI track owner**. You need to know if your project matches what they want.
>
> **NEAR AI 트랙 오너**에게 질문하세요. 프로젝트가 그들이 원하는 방향에 맞는지 확인해야 합니다.

---

### Q1. Wide vs Deep / 넓은 활용 vs 깊은 활용

**English:**
"OHmyDNA uses three NEAR privacy technologies -- IronClaw TEE, Confidential Intents, and Chain Signatures. For the NEAR AI track, do you want to see **wide usage of many tools**, or **deep usage of one tool**? Which scores higher?"

**Korean (참고용):**
"OHmyDNA는 IronClaw TEE, Confidential Intents, Chain Signatures 세 가지를 모두 활용합니다. NEAR AI 트랙 심사에서 **여러 도구의 폭넓은 활용**과 **한 도구의 깊은 구현** 중 어느 쪽에 더 높은 점수를 줍니까?"

---

### Q2. How to Show Deeper TEE Usage / TEE를 더 깊게 보여주려면

**English:**
"Right now, I use IronClaw TEE through the NEAR AI Cloud REST API. I send the genetic report to the Qwen model inside the TEE, it parses the data and returns a risk profile. If you want to see **deeper TEE usage**, what should I add? What pattern would impress the judges?"

**Korean (참고용):**
"현재 NEAR AI Cloud의 REST API를 통해 IronClaw TEE를 사용합니다. 유전자 리포트를 TEE 내부의 Qwen 모델로 보내면 파싱하여 리스크 프로파일을 반환합니다. **더 깊은 TEE 활용**을 보여주려면 무엇을 추가해야 합니까? 어떤 패턴이 심사위원에게 인상적입니까?"

---

### Q3. Confidential Intents SDK Conflict / Confidential Intents SDK 충돌

**English:**
"The Defuse Protocol SDK needs `near-api-js` version 5, but my project uses version 7. They conflict. So I built the intent data structure by hand and showed it in the UI -- the user can see the full intent payload before signing. Is this enough to count as **Confidential Intents usage**, or do you need the actual SDK running?"

**Korean (참고용):**
"Defuse Protocol SDK는 `near-api-js` v5를 요구하지만 현재 프로젝트는 v7을 사용하여 충돌합니다. 그래서 인텐트 데이터 구조를 수동으로 구성하여 UI에서 서명 전 전체 payload를 보여줍니다. 이것만으로 **Confidential Intents 활용**으로 인정됩니까, 아니면 실제 SDK 구동이 필요합니까?"

---

---

## 3. Questions -- Category 2: Pitch Direction / 피치 방향

> Ask these when you get **pitch feedback**. You need to know what to cut and what to keep.
>
> **피치 피드백**을 받을 때 질문하세요. 무엇을 줄이고 무엇을 유지할지 알아야 합니다.

---

### Q4. Where to Spend Time / 시간을 어디에 할애할 것인가

**English:**
"My pitch has two main stories: (A) the privacy technology -- TEE, ZKP, no raw data shared, and (B) the business model -- we take the 15% broker fee that traditional agents used to take. In a 5-minute pitch, **which story should get more time?** Technology or business?"

**Korean (참고용):**
"피치의 핵심이 두 가지입니다: (A) 프라이버시 기술 -- TEE, ZKP, 원본 비공유, (B) 비즈니스 모델 -- 기존 설계사의 15% 수수료를 플랫폼이 흡수. 5분 피치에서 **어느 쪽에 더 시간을 할애해야** 심사위원이 반응합니까? 기술 쪽입니까, 비즈니스 쪽입니까?"

---

### Q5. Is the Message Clear? / 메시지가 선명한가

**English:**
"My pitch goes: Problem, Solution, Product Journey, What We Built, Why NEAR, Business Model, Roadmap, Closing. That's 8 sections in 5 minutes. The event page says a common late-stage problem is 'too many features, unclear core.' **Is my pitch too wide? Or is the core message clear?** I want honest feedback, not encouragement."

**Korean (참고용):**
"피치 순서가 Problem -> Solution -> Product Journey -> What We Built -> Why NEAR -> Business Model -> Roadmap -> Closing, 5분에 8개 섹션입니다. 이벤트 페이지에 적힌 '기능은 많은데 핵심이 흐려짐' 문제에 해당하는지, 메시지가 선명한 편인지 **솔직한 의견**을 듣고 싶습니다."

---

---

## 4. Questions -- Category 3: Technical Blockers / 기술적 막힌 지점

> Ask these to **NEAR technical mentors**. These are your actual stuck points.
>
> **NEAR 기술 멘토**에게 질문하세요. 실제로 막혀있는 지점입니다.

---

### Q6. How to Best Showcase Attestation (CRITICAL -- 심사 기준 직결) / Attestation을 어떻게 보여줄 것인가 (최우선)

**English:**
"The judging criteria says 'proper use of attestation' under Technical Excellence (20%). I'm implementing TEE attestation verification using the `GET /v1/attestation/report` endpoint from NEAR AI Cloud. My plan is: (1) fetch the attestation report with nonce before sending genetic data, (2) verify the report signature to confirm the server is a real TEE, and (3) show the verification result to the user in the UI. **For the judges, is this level of attestation usage sufficient? Or do they expect something more -- like on-chain attestation registration, or TLS fingerprint verification? What does 'proper use of attestation' look like in a winning project?**"

**Korean (참고용):**
"심사 기준의 Technical Excellence(20%)에 'proper use of attestation'이 명시되어 있습니다. NEAR AI Cloud의 `GET /v1/attestation/report` 엔드포인트를 사용하여 TEE attestation 검증을 구현 중입니다. 계획: (1) 유전자 데이터 전송 전 nonce와 함께 attestation report 조회, (2) report 서명 검증으로 서버가 진짜 TEE임을 확인, (3) 검증 결과를 UI에서 사용자에게 표시. **심사위원에게 이 수준의 attestation 활용이 충분합니까? 아니면 온체인 attestation 등록이나 TLS fingerprint 검증까지 기대합니까? 수상 프로젝트에서 'proper use of attestation'은 어떤 모습입니까?**"

---

### Q7. ZKP On-Chain Verification / ZKP 온체인 검증

**English:**
"I wrote a Noir ZKP circuit that proves insurance eligibility without showing the risk score. The problem is: NEAR has no official library to verify Noir proofs on-chain. The ultraplonk pairing check needs a Rust FFI binding or pure Rust implementation, and neither exists in the NEAR ecosystem. Right now, I register the proof hash on-chain at `zkp.rogulus.testnet` as a 'declaration' -- not a mathematical verification. **Does NEAR plan to support ZKP verifiers officially? Or is there a recommended workaround?**"

**Korean (참고용):**
"리스크 점수를 보여주지 않고 보험 가입 자격을 증명하는 Noir ZKP 회로를 작성했습니다. 문제는 NEAR에 Noir proof를 온체인 검증할 공식 라이브러리가 없다는 것입니다. ultraplonk pairing check에 Rust FFI 바인딩이나 순수 Rust 구현이 필요하지만 NEAR 생태계에 없습니다. 현재는 `zkp.rogulus.testnet`에 proof hash를 등록하는 '선언적 증명'을 사용합니다. **NEAR에서 ZKP verifier를 공식 지원할 계획이 있습니까? 추천하는 우회 방법이 있습니까?**"

---

### Q8. Chain Signatures E2E Demo / Chain Signatures E2E 데모

**English:**
"I implemented `deriveEthAddress` using `v1.signer-prod.testnet` MPC -- it generates an ETH address from a NEAR account. I also implemented `requestMpcSignature` with redirect mode (`callbackUrl`) so that BrowserWallet signs without triggering a popup block. The MPC signing flow itself is working. The remaining gap is funding the derived ETH address on Sepolia to broadcast the final transaction. **For the demo, does showing the full MPC signing flow up to the broadcast step matter a lot? Or is showing the derived address, the signed payload, and explaining the broadcast architecture enough?**"

**Korean (참고용):**
"`v1.signer-prod.testnet` MPC를 통해 NEAR 계정에서 ETH 주소를 파생하는 `deriveEthAddress`를 구현했습니다. `requestMpcSignature`는 `callbackUrl`을 통한 리다이렉트 모드로 동작하여 BrowserWallet(MyNearWallet)의 팝업 차단 문제도 해결되었습니다. MPC 서명 흐름 자체는 작동합니다. 남은 부분은 파생 ETH 주소에 Sepolia faucet 잔액을 확보하여 최종 트랜잭션을 브로드캐스트하는 것입니다. **데모에서 브로드캐스트 직전까지의 MPC 서명 전체 흐름을 보여주는 것이 결정적 차이를 만듭니까, 아니면 파생 주소 + 서명된 payload 표시 + 브로드캐스트 아키텍처 설명으로 충분합니까?**"

---

---

## 5. Questions -- Category 4: After the Hackathon / 해커톤 이후

> Ask these during **networking time**. Build relationships for after the event.
>
> **네트워킹 시간**에 질문하세요. 이벤트 이후의 관계를 만드세요.

---

### Q9. Grants and Support / 그랜트 및 지원

**English:**
"I plan to open-source two things: a TEE app wrapper for IronClaw -- so other developers can build privacy apps easily -- and a Noir ZKP template for healthcare data verification. **Does NEAR have a grant program or support track for this kind of ecosystem infrastructure?**"

**Korean (참고용):**
"두 가지를 오픈소스로 공개할 계획입니다: 다른 개발자가 프라이버시 앱을 쉽게 만들 수 있는 IronClaw TEE 앱 래퍼, 그리고 헬스케어 데이터 검증을 위한 Noir ZKP 템플릿. **NEAR에 이런 종류의 생태계 인프라에 대한 그랜트 프로그램이나 지원 트랙이 있습니까?**"

---

### Q10. Insurance Industry Connections / 보험 업계 연결

**English:**
"The hardest part of this project is not the code -- it's connecting with real insurance companies to get their API access. **Does anyone in the NEAR ecosystem have experience partnering with traditional finance or insurance companies?** I would appreciate any introductions."

**Korean (참고용):**
"이 프로젝트에서 가장 어려운 부분은 코드가 아니라 실제 보험사와 연결하여 API 접근권을 확보하는 것입니다. **NEAR 생태계 내에서 전통 금융이나 보험 업계와의 파트너십 경험이 있는 팀이나 멘토**를 연결받을 수 있습니까?"

---

---

## 6. When to Ask Which Question / 상황별 질문 사용 가이드

| Situation / 상황 | Questions / 질문 |
|---|---|
| 1:1 with NEAR AI track owner / NEAR AI 트랙 오너와 1:1 | **Q6 (attestation -- FIRST PRIORITY)**, Q1, Q2 |
| Pitch feedback session / 피치 피드백 세션 | Q4, Q5 |
| Talking to Ludium / BuidlHack staff / 운영진 대화 | Q3, Q8 |
| NEAR technical mentors / NEAR 기술 멘토 | Q6, Q7 |
| Networking time / 네트워킹 시간 | Q9, Q10 |

---

## 7. Key Words -- Simple Explanations / 핵심 용어 쉬운 설명

> If you get stuck explaining a technical term, use these short phrases.
>
> 기술 용어를 설명하다 막히면 이 짧은 문장을 사용하세요.

| Term / 용어 | Simple English / 쉬운 영어 | 한국어 |
|---|---|---|
| **TEE** | "A hardware-level secure box -- like a black room that nobody can see into." | "하드웨어 수준의 보안 상자 -- 아무도 들여다볼 수 없는 암실 같은 것" |
| **Attestation** | "A certificate signed by the hardware itself, proving that the secure box is real and the code inside hasn't been changed." | "하드웨어 자체가 서명한 증명서 -- 보안 상자가 진짜이고 내부 코드가 변조되지 않았음을 증명" |
| **ZKP** | "A math proof that says 'yes, this person qualifies' without showing any numbers." | "'네, 이 사람은 자격이 됩니다'라고 수치를 보여주지 않고 수학적으로 증명하는 것" |
| **Data Purge** | "We burn the raw data right after analysis -- it never leaves the secure box." | "분석 직후 원본 데이터를 소각합니다 -- 보안 상자를 절대 벗어나지 않습니다" |
| **Confidential Intents** | "Private payments -- even on a public blockchain, nobody sees the details." | "기밀 결제 -- 퍼블릭 블록체인에서도 아무도 상세 내역을 볼 수 없습니다" |
| **Chain Signatures** | "One NEAR wallet can sign transactions on Ethereum, Solana, and more." | "NEAR 지갑 하나로 이더리움, 솔라나 등에서 트랜잭션에 서명할 수 있습니다" |
| **Trustless** | "You don't need to trust us. The code proves everything." | "우리를 믿을 필요가 없습니다. 코드가 모든 것을 증명합니다" |
| **DTC Genetic Test** | "A DNA test you can order online -- like 23andMe." | "온라인으로 주문할 수 있는 유전자 검사 -- 23andMe 같은 것" |

---

## 8. Quick Responses for Common Questions / 자주 받는 질문 짧은 답변

---

### "What's your demo status?" / "데모 상태는?"

**English:**
"The full flow is working. Wallet connect, file upload, TEE analysis, data purge animation, AI insurance recommendation, AI concierge consultation (The Secret Keeper), and payment on NEAR testnet. MPC signing uses redirect mode -- no popup block. Lighthouse score is 87, accessibility is 100. E2E tests pass 21 out of 21."

**Korean:**
"전체 플로우가 동작합니다. 지갑 연결, 파일 업로드, TEE 분석, 데이터 소각 애니메이션, AI 보험 추천, AI 상담 레이어(The Secret Keeper), NEAR 테스트넷 결제. MPC 서명은 리다이렉트 모드로 동작하여 팝업 차단 없음. Lighthouse 87점, 접근성 100점. E2E 테스트 21/21 통과."

---

### "Why insurance?" / "왜 보험인가?"

**English:**
"Because genetic data is the most sensitive data a person has. If it leaks, you can never change it. Current insurance companies ask you to trust them with your data. We remove that trust requirement entirely."

**Korean:**
"유전자 데이터는 사람이 가진 가장 민감한 데이터이기 때문입니다. 유출되면 평생 바꿀 수 없습니다. 현재 보험사는 당신의 데이터를 믿고 달라고 합니다. 우리는 그 신뢰 요구 자체를 제거합니다."

---

### "How big is your team?" / "팀이 몇 명인가?"

**English:**
"Right now it's a small team. But NEAR's privacy stack is mature enough to build a full pipeline efficiently. After this hackathon, we're bringing on a product designer and a systems engineer to scale."

**Korean:**
"현재는 소규모 팀입니다. 하지만 NEAR의 프라이버시 스택이 충분히 성숙해서 전체 파이프라인을 효율적으로 구축할 수 있었습니다. 해커톤 이후 프로덕트 디자이너와 시스템 엔지니어를 충원하여 확장할 계획입니다."

---

### "What's next after the hackathon?" / "해커톤 이후는?"

**English:**
"Phase 1: Stabilize the off-chain API and partner with DTC genetic testing companies. Phase 2: Add an autonomous Agent OS that monitors your health data and renegotiates your coverage automatically. Phase 3: Full mainnet launch with cross-chain financial infrastructure."

**Korean:**
"Phase 1: 오프체인 API 안정화 및 DTC 유전자 검사 업체 제휴. Phase 2: 건강 데이터를 모니터링하고 보장을 자동 재협상하는 자율 Agent OS 추가. Phase 3: 크로스체인 금융 인프라와 함께 메인넷 정식 출시."

---

### "Is this legal?" / "이거 합법인가?"

**English:**
"We start as a health information guide, not a licensed broker. The key point: our architecture actually benefits from stricter regulation -- because we never store raw data, we become the only compliant option."

**Korean:**
"면허된 중개사가 아닌 건강 정보 가이드로 시작합니다. 핵심 포인트: 우리 아키텍처는 규제가 강화될수록 오히려 유리합니다 -- 원본 데이터를 절대 보관하지 않으므로 유일한 합법적 대안이 됩니다."

---

---

## 9. Event Schedule Quick Reference / 이벤트 일정 빠른 참조

| Time / 시간 | Activity / 활동 |
|---|---|
| 18:00 - 18:30 | Check-in / 체크인 |
| 18:30 - 18:45 | Opening / 오프닝 |
| 18:45 - 20:00 | Sponsor Pitches / 스폰서 피치 |
| 19:05 - 21:05 | 1:1 Meetings / 1:1 미팅 |
| 21:05 - Late | Networking / 네트워킹 |

> Sponsor pitches and 1:1 meetings happen at the same time. When a sponsor finishes their pitch, interested teams move to the meeting room immediately. Go to the NEAR AI sponsor meeting as soon as their pitch ends.
>
> 스폰서 피치와 1:1 미팅은 동시 진행됩니다. 스폰서 피치가 끝나면 관심 있는 팀이 바로 미팅룸으로 이동합니다. NEAR AI 스폰서 피치가 끝나자마자 곧바로 미팅으로 이동하세요.

---

## Related Documents / 관련 문서

- **Concept_Design**: [Pitch Deck](../01_Concept_Design/PITCH_DECK.md) -- Full 5-min and 3-min scripts
- **Concept_Design**: [Vision & Leverage](../01_Concept_Design/VISION_CORE_LEVERAGE.md) -- Ecosystem flywheel analysis
- **Concept_Design**: [Competitive Analysis](../01_Concept_Design/COMPETITIVE_ANALYSIS.md) -- Differentiation matrix
- **Technical_Specs**: [System Architecture](../03_Technical_Specs/00_SYSTEM_ARCHITECTURE.md) -- 3-Layer Privacy Architecture
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) -- Phase 0-3 implementation status
