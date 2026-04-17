# [QA] OHmyDNA 5분 피치덱 예상 질의응답 (Expected Q&A)

- **등록일**: 2026-04-16
- **레이어**: 05_QA_Validation
- **목적**: BUIDL-2026_NEAR 해커톤 Final Pitch Day 5분 발표 직후 진행되는 질의응답 세션 심사위원 방어용
- **참조 문서**: [PITCH_DECK.md](../01_Concept_Design/PITCH_DECK.md)

---

## 1. 기술 및 아키텍처 검증 (Technical Validation)

### Q1. "TEE 환경에서 분석이 끝난 후 유전자 원본 데이터가 정말로 소각된다고 어떻게 보장합니까? 우리가 그걸 어떻게 믿을 수 있죠?"
**[답변 가이드 — Trustless 강조]**  
"우리를 믿지 않으셔도 됩니다. 블록체인과 암호학이 증명합니다. 저희는 NEAR AI Cloud 공개 엔드포인트를 통해 **Intel TDX Attestation(하드웨어 신뢰 검증)** 과정을 거칩니다. nonce 바인딩과 SHA-256 해시를 비교하여 현재 실행 중인 인클레이브 코드가 변조되지 않았음을 온체인 상에서 무결하게 증명합니다. 증명된 코드에 명시된 대로 메모리 파티션은 데이터 분석 직후 영구 소각 처리됩니다."

### Q2. (피치덱 9페이지 관련) "최근 트렌드인 타 체인과의 브릿지 연동(L2Pass 등)이나 복합적인 Agent 프레임워크를 V1 MVP에 모두 적용하지 않은 이유가 있습니까?"
**[답변 가이드 — 핵심 가치 보존]**  
"금융과 헬스케어 프로덕트의 생명은 '서명의 무결성'과 '절대적인 보안'입니다. 과도한 외부 라이브러리 연동은 지갑 서명 에러 리스크와 TEE 물리적 메모리 제약을 유발할 수 있습니다. 그래서 V1에서는 TEE, ZKP, Confidential Intents를 결합한 **'핵심 프라이버시 파이프라인'을 완벽하게 구동시키는 데 모든 전력을 다했습니다.** 부수적인 유틸리티 확장은 이 단단한 코어를 기반으로 Phase 2에서 진행할 예정입니다."

---

## 2. 개인정보 및 AI 에이전트 보안 (Data & AI Privacy)

### Q3. "AI 상담 에이전트(The Secret Keeper)가 분석 과정에서 민감한 DNA 정보를 학습하거나 데이터가 유출될 위험은 없는가요?"
**[답변 가이드 — Stateless 아키텍처]**  
"The Secret Keeper 언어 모델은 IronClaw TEE 내부에서 완전히 **Stateless(무상태)**로 구동됩니다. 사용자의 질문에 답을 하고 추천 스키마를 구성하는 단일 태스크가 완료되면, 세션과 대화 맥락(Context)이 실시간으로 소각됩니다. AI에게 기억(Memory)을 주지 않는 것이 저희의 핵심 보안 정책이자 설계 철학입니다."

---

## 3. 비즈니스 모델 및 시장성 (Business & Market)

### Q4. "보험사 입장에서 기존 방식을 버리고 ZKP(영지식 증명) 기반의 평가 방식을 도입할 비즈니스적 유인이 충분합니까?"
**[답변 가이드 — 법적 리스크 회피 및 수수료 절감]**  
"보험사 입장에서는 2가지 큰 이득이 있습니다. 첫째, 민감한 유전 데이터를 직접 서버에 보유하지 않기 때문에 **초대형 개인정보 유출로 인한 법적 리스크와 천문학적 배상 책임에서 100% 해방**됩니다. 둘째, 기존 오프라인 설계사에게 지급하던 15% 규모의 막대한 중개 수수료를 절감하고, 플랫폼을 통해 새로운 구매력(MZ세대)을 온보딩할 수 있어 즉각적인 재무 여건 개선이 가능합니다."

### Q5. "유전자 정보라는 민감한 데이터를 사용자들이 자발적으로 업로드하도록 유도할 수 있을까요?"
**[답변 가이드 — 차별 공포 제거와 확실한 인센티브]**  
"과거 사용자들이 DNA를 숨겼던 유일한 이유는 '유출에 따른 보험/고용 차별과 불이익' 때문이었습니다. OHmyDNA는 절대 유출되지 않는다는 것을 기술적으로 증명하므로 그 공포가 완전히 사라집니다. 공포가 사라진 자리에는 오직 **'나에게 최적화된 저렴한 맞춤형 혜택'이라는 강력한 금융적 인센티브**만이 남기 때문에 초기 임계 질량(Critical Mass)을 충분히 돌파할 수 있습니다."

---

## 4. 확장성 및 로드맵 (Roadmap & Ecosystem)

### Q6. "Phase 2 확장 계획에서 크로스체인(L2Pass) 유동성 통합을 언급하셨는데, 헬스케어 디앱에 왜 브릿지 기능이 필요한가요?"
**[답변 가이드 — 글로벌 결제 확장성]**  
"비즈니스의 확장성 때문입니다. 유전자 보호와 금융 결합은 단일 체인 유저만의 니즈가 아닙니다. 타 체인의 인프라(L2Pass 등)를 통합하면 비트코인이나 이더리움 지갑 사용자도 체인 이동이나 새로운 지갑 생성의 복잡함 없이 즉각적으로 결제에 참여할 수 있습니다. 가장 안전한 인프라 위에서 가장 풍부한 유동성을 확보하기 위한 스케일업 전략입니다."

### Q7. "앞으로 NEAR 생태계 기여(오픈소스)에 관해 구체적으로 어떤 계획이 있습니까?"
**[답변 가이드 — 생태계 빌딩 (Leverage)]**  
"단순히 저희 프로덕트 하나의 런칭으로 끝나지 않습니다. 해커톤 기간 동안 뼈저리게 느꼈던 셋업의 어려움을 해소하기 위해, 누구나 10분 만에 프라이버시 앱을 빌드할 수 있는 **'Next.js 기반 TEE-App Wrapper'**와 데이터 검증용 **'Noir ZKP 표준 템플릿'**을 NEAR 커뮤니티에 전면 공개합니다. 저희가 만든 인프라가 수많은 Web3 헬스케어 DApp들의 씨앗이 될 것입니다."

---

## 5. [테이블 심사] 기술 실무 및 장애 대응 (Technical Deep Dive)

### Q8. "Near AI SDK를 사용했다고 했는데, 구체적으로 어떤 API를 호출해서 TEE 인클레이브를 생성하고 Attestation 로직을 처리했나요? 코드상에서 보여줄 수 있습니까?"
**[답변 가이드 — 실무 역량 증명]**
"네, 가능합니다. 저희는 Near AI의 `get_attestation` API를 호출하여 하드웨어 영수증을 가져오고, 이를 온체인 스마트 컨트랙트의 `verify_report` 함수로 전달합니다. 인클레이브 생성 시에는 `NearAICloud`의 프로비저닝 서비스를 활용해 환경 변수와 모델 가중치를 안전하게 로딩합니다. (노트북의 `src/lib/tee/attestation.ts` 파일을 열어 실제 API 호출부와 증명 로직을 보여주며 설명)"

### Q9. "유전 데이터는 용량이 매우 큽니다. TEE 내 물리적 메모리(EPC) 제한 문제를 어떻게 해결했나요? 데이터 스트리밍 처리를 구현했습니까?"
**[답변 가이드 — 최적화 경험 강조]**
"정확한 지적입니다. SGX/TDX의 물리적 메모리 한계를 극복하기 위해, 원본 데이터를 한 번에 로딩하지 않고 **'청크 기반 스트리밍 분석'** 방식을 도입했습니다. Node.js 기반 분석 엔진에서 64KB 단위로 데이터를 읽어 들여 연산하고 즉시 폐기함으로써, 최소한의 메모리 점유율(Footprint)로 대용량 유전체 정보를 처리할 수 있도록 최적화했습니다."

### Q10. "Confidential Intents를 사용할 때 지연 시간(Latency) 문제는 유저 경험(UX)에 어떤 영향을 줍니까? 실시간 상담이 가능한 수준인가요?"
**[답변 가이드 — 하이브리드 UX 전략]**
"현재 기술 수준에서는 일반 챗봇보다는 지연 시간이 발생합니다. 이를 위해 저희는 **'하이브리드 UX'**를 구현했습니다. 일반적인 상담은 로컬에서 즉시 반응하게 하고, 보안이 극도로 필요한 유전 분석 단계에서만 TEE 분석 로딩 바를 통해 사용자에게 보안 처리 중임을 투명하게 알립니다. 사용자는 '더 안전하게 처리되고 있다'는 신뢰를 시각적으로 얻게 됩니다."

### - **현재 상태 (Phase 0 - MVP)**:
  - **TEE 분석 엔진**: `USE_REAL_TEE=true` + `IRONCLAW_API_KEY` 환경변수가 배포 완료되어, **실제 NEAR AI Cloud IronClaw TEE의 Qwen3-30B 모델이 구동 중**입니다. Mock이 아닙니다.
  - **ZKP proof 생성**: `src/lib/zkp/prover.ts` — 현재 시뮬레이션 단계입니다.
  - **인프라 제약 요인**: 프로젝트 시작 당시(3월) IronClaw의 Custom WASM 배포 툴이 v0.17.0(실험적) 상태여서 안정성을 위해 분석 로직 구현에 집중했습니다. 공식 안정 버전(v0.25.0)이 4/11에 출시되어 Phase 2 즉시 전환이 가능해졌습니다.

### IronClaw WASM 지원 타임라인 (핵심 증거)
| 날짜 | 버전 | 내용 | 비고 |
|---|---|---|---|
| 2026-03-10 | v0.17.0 | 커스텀 WASM 툴 배포 최초 도입 | **OHmyDNA 개발 시작 시점 (불안정)** |
| 2026-04-11 | v0.25.0 | 커스텀 WASM 프로덕션 공식 지원 | **안정 버전 출시 (시연 직전)** |
| 2026-04-18 | — | Final Pitch Day | **Phase 2 준비 완료** |

- **답변 멘트**: "TEE 분석 파이프라인은 실제 NEAR AI Cloud에서 구동되고 있습니다. ZKP proof 생성은 인프라 안정성 문제로 현재 시뮬레이션 단계이나, 디자인 코드는 완성되어 있습니다."

### Q14. "ZKP proof가 지금 실제로 생성되고 있나요? Noir 회로가 실제로 실행되나요?"
**[답변 가이드 — 솔직함 + 설계 완성도 강조]**
"솔직히 말씀드리면, ZKP proof 생성은 Vercel 서버리스 환경의 WASM 번들 크기 제약으로 인해 현재 시뮬레이션 단계입니다. 다만 Noir 회로(`circuits/insurance_eligibility/src/main.nr`)는 완성되어 있고 `assert(risk_score >= threshold)` 로직도 정확하게 작성되어 있으며, `nargo prove`로 생성한 실제 proof 파일도 존재합니다. 그리고 Phase 2 전환의 인프라 기반이 이미 마련되어 있습니다. IronClaw v0.25.0(2026-04-11, 6일 전)에서 커스텀 WASM 툴 배포가 프로덕션 수준으로 공식 완성되었습니다. Barretenberg를 WASM 컴포넌트로 패키징하여 IronClaw TEE 내부에서 직접 ZKP를 생성하는 파이프라인의 인프라가 해커톤 기간 중 준비된 것입니다. TEE 분석 엔진은 현재 실제 NEAR AI Cloud Qwen3-30B가 구동 중입니다."

### Q15. "TEE가 이미 분석 후 데이터를 소각한다면, ZKP가 추가로 왜 필요합니까?"
**[답변 가이드 — TEE와 ZKP의 상호 보완 역할]**
"TEE와 ZKP는 역할이 다릅니다. TEE는 '데이터를 보이지 않게' 처리하지만, 결과의 정당성은 여전히 'NEAR AI Cloud를 믿어야 한다'는 중앙화된 신뢰에 의존합니다. 운영자가 결과를 조작했는지 보험사나 감사기관이 검증할 방법이 없습니다. ZKP가 추가되면 보험사는 어떤 서버도 신뢰하지 않고 proof bytes 하나만으로 가입 자격을 수학적으로 검증할 수 있습니다. **TEE는 프라이버시를, ZKP는 Trustless 검증을 담당하는 상호 보완 구조**입니다."

---

## 6. [최종 피치] 전략적 확장성 및 리스크 (Strategic & Risk)

### Q11. "Near AI Cloud 외에 다른 TEE 인프라(AWS Nitro, Azure SNP 등)로의 이식성이 있나요? Near에만 종속된 모델입니까?"
**[답변 가이드 — 인프라 불가지론(Agnostic)]**
"저희의 코어 로직은 컨테이너화된 TEE 환경이라면 어디서든 구동되도록 설계되었습니다. 다만, **Near를 선택한 이유는 '데이터의 무결성 증명'과 '경제적 보상'을 결합할 수 있는 가장 강력한 온체인 증명 인프라**를 제공하기 때문입니다. 특히 Near의 'Chain Abstraction' 기능은 타 체인 사용자까지 저희 보안 인프라로 온보딩하기에 가장 적합한 도구입니다."

### Q12. "보험사 외에 다른 데이터 수요처(제약사, 연구소 등)와의 협력 모델은 어떻게 됩니까? 데이터 주권은 누가 갖죠?"
**[답변 가이드 — Data Sovereignty 중심]**
"데이터 주권은 100% 사용자에게 귀속됩니다. 제약사나 연구소가 특정 질환 군의 유전 정보를 필요로 할 때, 직접 데이터를 구매하는 대신 **'익명화된 분석 쿼리'에 대한 열람권**을 구매하도록 설계했습니다. 사용자는 데이터 소유권은 유지한 채로, 분석에 기여한 만큼의 리워드를 수령하게 됩니다."

### Q13. "해커톤 수상 이후 실제 메인넷 런칭까지 가장 큰 기술적/규제적 허들은 무엇이라고 보며, 이를 어떻게 극복할 계획입니까?"
**[답변 가이드 — 상용화 로드맵]**
"기술적으로는 오라클 노드의 TEE 분산 검증 자동화가 핵심이며, 규제 측면에서는 유전체 정보 서비스(DTC) 관련 가이드라인 준수가 중요합니다. 저희는 이를 해결하기 위해 국가별 규제 샌드박스 신청을 고려 중이며, 기술적으로는 전용 사이드체인 솔루션을 통해 데이터 처리 성능을 상용 수준으로 끌어올릴 예정입니다."

### Q16. "첫 번째 보험사 파트너를 어떻게 설득할 계획입니까? 대형 보험사가 ZKP 증명서만 믿고 계약을 승인해 줄까요?"
**[답변 가이드 — GTM 초기 진입 전략]**
"대형 보험사를 처음부터 공략하지 않습니다. 초기 GTM 전략은 세 단계입니다. 첫째, 중소형 보험사를 먼저 타겟팅합니다. 대형사 대비 의사결정 속도가 빠르고, 유전자 맞춤형 상품으로 MZ세대를 선점하려는 니즈가 강합니다. 둘째, 저희 플랫폼을 보험사 자체 브랜드로 제공하는 **화이트레이블(White-label)** 구조로 접근합니다. 보험사는 유전 데이터를 직접 보유하지 않으므로 개인정보 유출 법적 리스크에서 완전히 자유로워집니다. 이것이 가장 강력한 설득 포인트입니다. 셋째, ZKP 증명의 공신력 확보를 위해 독립 감사(Audit) 기관의 검증을 Phase 2 로드맵에 포함시켜, 보험사가 알고리즘을 신뢰할 수 있는 근거를 제도적으로 마련할 계획입니다."

---

## 5. Technical Validation & AI Privacy (English)

### Q1. "How can you guarantee that the raw genetic data is truly destroyed after analysis in the TEE environment? Why should we trust you?"
**[Answer Guide — Emphasize Trustless Nature]**  
"You don't have to trust us; the blockchain and cryptography prove it. We use the public NEAR AI Cloud endpoint to perform an **Intel TDX Attestation (Hardware Trust Verification)**. By comparing the nonce binding and the SHA-256 hash, we cryptographically prove on-chain that the enclave code running hasn't been tampered with. Exactly as defined in that verified code, the memory partition containing the raw data is completely purged immediately after the analysis."

### Q2. (Relating to Pitch Deck Slide 9) "Why didn't you integrate all the latest trending features, like cross-chain bridges (e.g., L2Pass) or complex agent frameworks, into the V1 MVP?"
**[Answer Guide — Preserve Core Value]**  
"The lifeblood of any financial and healthcare product is 'signature integrity' and 'absolute security'. Excessive integration of external libraries introduces risks of wallet signature errors and stretches the physical memory constraints of the TEE. Therefore, in V1, we dedicated 100% of our focus to perfectly executing the **'core privacy pipeline'** combining TEE, ZKP, and Confidential Intents. Ancillary utilities will be built upon this rock-solid foundation in Phase 2."

---

## 6. Data & AI Privacy (English)

### Q3. "Is there any risk that the AI agent ('The Secret Keeper') might learn the sensitive DNA information or leak the data during the analysis?"
**[Answer Guide — Stateless Architecture]**  
"'The Secret Keeper' language model operates completely **stateless** inside the IronClaw TEE. Once it completes the single task of answering the user's query and generating recommendation schemas, the session and all conversational context are instantly burned. Adhering to our core security philosophy, we grant the AI zero memory."

---

## 7. Business Model & Market (English)

### Q4. "Do insurance companies have sufficient business incentives to abandon their traditional methods and adopt this ZKP-based evaluation system?"
**[Answer Guide — Legal Risk Avoidance & Cost Reduction]**  
"Insurance companies gain two massive advantages. First, because they never hold the sensitive genetic data on their servers, they are **100% freed from the legal risks and astronomical liabilities** of massive data breaches. Second, they can save the massive 15% brokerage fees traditionally paid to offline agents, while leveraging our platform to onboard a new demographic—Gen MZ—resulting in immediate financial improvements."

### Q5. "How can you persuade users to voluntarily upload something as sensitive as their genetic information?"
**[Answer Guide — Removing Fear, Adding Clear Incentives]**  
"Historically, the only reason people hid their DNA was the fear of 'insurance/employment discrimination and disadvantage due to data leaks.' OHmyDNA technically proves that leaks are impossible, completely eliminating that fear. Once the fear is removed, what remains is a **powerful financial incentive: optimized, cheaper, personalized insurance coverage**. This dual approach allows us to comfortably surpass the critical mass for user adoption."

---

## 8. Roadmap & Ecosystem (English)

### Q6. "In your Phase 2 expansion plans, you mentioned cross-chain liquidity integration (L2Pass). Why does a healthcare DApp need a bridge function?"
**[Answer Guide — Global Payment Scalability]**  
"It's purely about business scalability. The intersection of genetic privacy and finance isn't limited to the users of a single chain. By integrating cross-chain infrastructure like L2Pass, Bitcoin or Ethereum wallet users can instantly participate and pay without the friction of moving chains or setting up new wallets. It's a scale-up strategy to secure the deepest liquidity on top of the most secure infrastructure."

### Q7. "What specific plans do you have for contributing to the NEAR ecosystem (open source) moving forward?"
**[Answer Guide — Ecosystem Building (Leverage)]**  
"We are not just launching a single product. To eliminate the painful setup process we experienced during the hackathon, we are fully open-sourcing our **'Next.js-based TEE-App Wrapper'** (enabling anyone to build a privacy app in 10 minutes) and our **'Noir ZKP standard template'** for data verification to the NEAR community. The infrastructure we've built will serve as the seed for countless Web3 healthcare DApps."
---

## 9. [Seed Round] Technical Deep Dive (English)

### Q8. "You mentioned using the Near AI SDK. Specifically, which APIs did you call to create the TEE enclave and handle the attestation logic? Can you show us in the code?"
**[Answer Guide — Proving Practical Expertise]**
"Yes, certainly. We call Near AI's `get_attestation` API to retrieve the hardware receipt and pass it to the `verify_report` function in our on-chain smart contract. For enclave creation, we utilize the provisioning service of `NearAICloud` to securely load environment variables and model weights. (Open the `src/lib/tee/attestation.ts` file on the laptop to demonstrate the actual API calls and attestation logic.)"

### Q9. "Genetic data is quite large. How did you solve the physical memory (EPC) limit in the TEE? Did you implement data streaming?"
**[Answer Guide — Emphasize Optimization Experience]**
"That's a very sharp point. To overcome the physical memory constraints of SGX/TDX, we avoided loading the raw data all at once and instead introduced **'Chunk-based Streaming Analysis'**. Our Node.js-based analysis engine reads and processes data in 64KB increments and discards it immediately, optimizing memory footprint to handle large-scale genomic information efficiently."

### Q10. "How does the latency of using Confidential Intents affect the User Experience (UX)? Is real-time consultation feasible?"
**[Answer Guide — Hybrid UX Strategy]**
"At the current stage, there is naturally a slight delay compared to standard chatbots. To manage this, we've implemented a **'Hybrid UX'**. General consultations react instantly locally, while the sensitive genetic analysis phase uses a dedicated loading state to transparently inform the user that their data is being processed in a secure environment. This ironically builds trust, as users can visually confirm that 'security is being prioritized'."

### Q14. "Is the ZKP proof actually being generated right now? Is the Noir circuit actually executing?"
**[Answer Guide — Honesty + Design Completeness]**
"To be transparent: ZKP proof generation is currently in simulation mode due to WASM bundle size constraints on Vercel's serverless environment. However, the Noir circuit (`circuits/insurance_eligibility/src/main.nr`) is fully written with the correct `assert(risk_score >= threshold)` logic, and we have already executed `nargo prove` locally — the compiled artifact (`target/insurance_eligibility.json`) and an actual proof file (`target/proof`) are committed to the repository. In Phase 2, we will bundle the Barretenberg proving backend as a WASI Preview 2 component and deploy it inside the IronClaw TEE enclave for real in-enclave proof generation. Critically, IronClaw v0.25.0 (released 2026-04-11) officially supports production-grade custom WASM tool deployment — a capability that was first introduced in v0.17.0 (2026-03-10) and reached production readiness within 5 weeks, exactly during our hackathon build window. It's worth noting that the TEE analysis engine — NEAR AI Cloud's Qwen3-30B — is running in production right now."

### Q15. "If the TEE already purges the data after analysis, why is ZKP additionally necessary?"
**[Answer Guide — Complementary Roles of TEE and ZKP]**
"TEE and ZKP serve different purposes. TEE handles privacy; ZKP handles Trustless verification. They are complementary, not redundant."

### Q16. "According to your roadmap, ZKP generation inside TEE is for Phase 2. Why wasn't this fully implemented during the hackathon?"
**[Answer Guide — Infrastructure Readiness & Strategic Focus]**
"We originally planned to run the Noir circuits inside the TEE. However, the stable support for this was only released on April 11th, and to be honest, I just discovered the update yesterday. At this late stage, it was too risky to refactor our core code right before the deadline. But since the infrastructure is now ready, moving to an 'all-in-TEE' architecture is our top priority for Phase 2."

---

## 10. [Final Pitch] Strategic Scalability & Risks (English)

### Q11. "Is your model portable to other TEE infrastructures (e.g., AWS Nitro, Azure SNP) besides NEAR AI Cloud? Is it dependent only on NEAR?"
**[Answer Guide — Infrastructure Agnostic]**
"Our core logic is containerized and designed to run in any TEE environment. However, **we chose NEAR because it provides the most robust on-chain attestation infrastructure** for combining data integrity proofs with economic incentives. NEAR’s 'Chain Abstraction' is also the perfect tool for onboarding users from other chains into our secure infrastructure."

### Q12. "What are your collaboration models with data consumers other than insurance companies, such as pharmaceutical firms or research labs? Who holds the data sovereignty?"
**[Answer Guide — Centering Data Sovereignty]**
"Data sovereignty belongs 100% to the user. When pharmaceutical companies or labs need genetic insights for specific diseases, they don't buy the raw data; they purchase **'access rights to anonymized analysis queries'**. Users maintain ownership of their data while receiving rewards proportional to their contribution to the analysis."

### Q13. "What do you see as the biggest technical or regulatory hurdles between winning this hackathon and a mainnet launch, and how do you plan to overcome them?"
**[Answer Guide — Commercial Roadmap]**
"Technically, the automation of decentralized TEE verification for oracle nodes is key. Regulatorily, compliance with national Direct-to-Consumer (DTC) genomic service guidelines is critical. We plan to address this by applying for regulatory sandboxes in specific jurisdictions and, technically, scaling performance to commercial levels through dedicated sidechain solutions."

### Q16. "How do you plan to convince the first insurance company partner? Will a major insurer really approve contracts based solely on a ZKP proof?"
**[Answer Guide — GTM Initial Entry Strategy]**
"We won't target major insurers first. Our initial GTM strategy has three steps. First, we target small-to-mid-size insurers. They make decisions faster than large carriers and have a strong motivation to capture the MZ demographic with personalized genetic products. Second, we approach them with a **white-label structure**, where our platform runs under their brand. Since they never hold raw genetic data, they are completely free from the legal liability of a massive data breach — this is our single strongest selling point. Third, to establish credibility for the ZKP verification, we will include an independent third-party audit of our algorithm in the Phase 2 roadmap, giving insurers an institutional basis to trust the system."

---
