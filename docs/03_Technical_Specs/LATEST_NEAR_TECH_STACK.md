# [기술 명세] 2026 NEAR Tech Stack: 프라이버시 매핑 가이드

- **작성일**: 2026-03-31
- **최종 수정일**: 2026-04-03
- **레이어**: 03_Technical_Specs
- **상태**: Draft v2.0 (완전 개편)

---

## 1. 개요: "왜 NEAR Protocol 이어야만 하는가?"
유전자 데이터는 단순한 금융 정보를 넘어, 개인이 절대 변경할 수 없는 궁극의 생체 정보입니다. 이를 블록체인 상에서 분석하고 보험사의 상품과 연결하기 위해서는 **일반적인 퍼블릭 블록체인의 투명성이 오히려 독(Poison)**이 됩니다.

본 프로젝트인 **"MyDNA Insurance Agent"**는 2026년 NEAR 생태계가 제시하는 **'프라이버시 중심의 User-Owned AI'** 기술을 100% 한계치까지 활용하여 기존 블록체인이 풀지 못했던 "데이터 밀실 연산"과 "파편화된 유동성 통합"을 동시에 해결합니다. 

아래는 NEAR의 3대 핵심 기술이 우리 DApp의 각 단계(Step)에서 어떻게 '신의 한 수'로 작동하는지 매핑한 내역입니다.

---

## 2. 핵심 기술 매핑 (Core Tech to User Flow Mapping)

### 1. IronClaw (보안 중심 에이전틱 하네스 / Agentic Harness)
- **NEAR의 기술**: 2026년 2월 23일 NEARCON 2026에서 Illia Polosukhin이 발표한 IronClaw는 **"보안을 위해 설계된 에이전틱 하네스(Agentic Harness)"**로 정의되는 오픈소스 검증 가능 AI 에이전트 런타임이다. TypeScript 기반의 OpenClaw 비전을 이어받아 **Rust 1.85+로 완전 재구현**되었으며, NEAR AI Cloud의 암호화된 TEE(신뢰 실행 환경) 내에 배포된다.
- **4대 핵심 보안 메커니즘**
  1. **TEE 하드웨어 격리**: 격리된 인클레이브(Enclave) 내에서 실행되며, 검증 가능한 증명(Attestation)을 통해 운영자 신뢰에 의존하지 않는 암호화 보증을 제공한다.
  2. **WASM 샌드박싱**: 모든 서드파티 도구는 능력 기반(capability-based) 권한 모델이 적용된 **WebAssembly 컨테이너** 내에서 격리 실행된다. 네트워크 요청은 승인된 엔드포인트 화이트리스트로만 제한된다.
  3. **자격증명 런타임 주입**: API 키 등 민감 자격증명은 AES-256-GCM 암호화 금고에 보관되며, 외부 도구에 직접 노출되지 않고 런타임 시점에만 안전하게 주입된다.
  4. **프롬프트 인젝션 방어**: 패턴 감지, 콘텐츠 살균, 정책 규칙(차단/경고/검토) 레이어가 런타임에 내장되어 있다.
- **Trust Shift**: 불투명한 중앙화 AI 플랫폼을 맹목적으로 신뢰하던 모델에서, 모든 실행을 검증 가능한 인프라 위에서 구동하는 모델로의 패러다임 전환을 목표로 한다.
- **우리 프로젝트에서의 적용 지점 (User Flow Step 3: 투명한 격리 분석)**
  - **작동 원리**: 사용자가 업로드한 유전자 Raw Data(VCF 등)를 이 서버 시스템(노드 운영자 포함)의 그 누구도 들여다볼 수 없습니다. 데이터는 IronClaw의 TEE 인클레이브에 암호화된 상태로 투입되어 닫힌 블랙박스 안에서만 복호화되어 분석된 후 즉시 소각(Purge)됩니다.
  - **해결하는 문제**: 기존 중앙화된 AI 기업들(OpenAI 등)에게 내 유전 정보가 학습 데이터로 빨려 들어가거나 중앙 서버가 해킹되어 유전자 정보가 털리는 공포를 원천 차단합니다.

### 2. Confidential Intents (기밀 인텐트 - 프라이빗 샤드 연동)
- **NEAR의 기술**: 멤풀(Mempool)에 트랜잭션의 상세 내용을 노출하지 않고 퍼블릭 체인 위에서 프라이빗하게 거래 내역을 확정(Settlement) 짓는 기능.
- **현재 가용 상태 (2026-04-01 기준)**:
  - Private Shards 테스트넷(Shards Testnet): **가용**. 개발 및 통합 테스트 진행 가능.
  - 메인넷 정식 출시: 2026년 상반기 예정. MVP 해커톤 단계에서는 테스트넷 기준으로 구현하고, 메인넷 전환 시 엔드포인트 변경만으로 대응 가능하도록 설계.
  - **해커톤 리스크**: 메인넷 미출시 상태이므로, 심사 시 "테스트넷 데모 + 메인넷 출시 후 즉시 적용 가능한 아키텍처"임을 명시적으로 어필할 것.
- **우리 프로젝트에서의 적용 지점 (User Flow Step 5: 무자각 기밀 체결 & Money Flow 1)**
  - **작동 원리**: 추천된 치매 보험이나 간암 보험료를 결제할 때 트랜잭션에는 "사용자 A가 B보험에 승인(Attestation)되었다"라는 사실만 기록됩니다. 내 유전자에 '간암 변이가 몇 프로 더 높은 단백질 유전자'가 포함되어 있는지 따위의 파라미터는 블록체인상에 영구히 가려집니다(Obfuscated).
  - **해결하는 문제**: 온체인 스나이핑 및 보험 정보 노출의 폭력을 막아내고, 스마트 컨트랙트로 중개 수수료를 투명하게 수취하는 핵심 캐시카우의 엔진 역할을 합니다.

### 3. Chain Signatures (멀티체인 통합 결제 서명)
- **NEAR의 기술**: 사용자가 NEAR 계정 하나만으로 이더리움(Ethereum), 솔라나(Solana) 등 다른 파편화된 L1 네트워크의 자산과 스마트 컨트랙트를 직접 서명하고 구동할 수 있는 MPC(Multi-Party Computation) 기반 서명 기술. `v1.signer` MPC 컨트랙트(`multichain-testnet.near`)를 통해 구현.
- **아키텍처 3단계**:
  1. NEAR의 `v1.signer` MPC 컨트랙트를 통해 대상 체인용 파생 키쌍(Derived Key) 생성.
  2. 대상 체인에 서명된 트랜잭션을 브로드캐스트할 **릴레이어(Relayer) 서비스** 운영 또는 외부 API(Bitte Protocol 등) 사용.
  3. 대상 체인의 가스 비용 처리 (NEAR 계정에서 지불하거나, 스폰서드 트랜잭션 사용).
- **우리 프로젝트에서의 적용 지점**
  - **Phase 0 (해커톤)**: NEAR → NEAR testnet 내에서 MPC 서명 플로우를 시연. `deriveAddress` + `requestSignature` 함수를 `lib/near/chain-signatures.ts`에 구현하고, 결제 트랜잭션 서명에 적용.
  - **Phase 3 (확장)**: 스위스 보험사가 Solana 네트워크에 출시한 RWA 보험 상품을 NEAR 계정 서명 한 번으로 결제. 타 체인 브로드캐스트는 Relayer가 처리.
  - **해결하는 문제**: 지갑 파편화 없이 전 세계 체인의 보험 유동성을 단일 UX에서 접근.

### 4. Noir ZKP (영지식 증명 — 수치 미노출 자격 증명)
- **NEAR의 기술**: [Noir](https://noir-lang.org/) (Aztec 개발, Rust 기반 ZK DSL)로 작성된 ZKP 회로를 NEAR 스마트 컨트랙트에서 온체인 검증. "사실 증명은 하되 수치는 노출하지 않는" 영지식 증명을 NEAR 생태계에서 네이티브하게 지원.
- **회로 로직 (우리 프로젝트)**:
  ```noir
  // circuits/insurance_eligibility/src/main.nr
  fn main(risk_score: u8, pub threshold: u8) {
      assert(risk_score >= threshold);
      // risk_score: private input — TEE 내부에만 존재, 외부 절대 미노출
      // threshold: public input — 보험사가 공개 설정한 기준값
      // 출력: 자격 충족 여부(bool)만 보험사에 전달
  }
  ```
- **증명 생성 위치**: IronClaw TEE 내부. `prover.ts`가 TEE 안에서 Noir proof를 생성하고, proof bytes만 외부로 반환. 원본 risk_score 수치는 TEE 외부로 절대 유출되지 않음.
- **우리 프로젝트에서의 적용 지점 (User Flow Step 3 → Step 5)**
  - **Step 3 (TEE 분석 직후)**: IronClaw가 유전자 위험 수치 분석 → 즉시 Noir proof 생성 → proof bytes만 사용자 지갑으로 반환.
  - **Step 5 (Confidential Intents 결제)**: Noir proof bytes를 트랜잭션 calldata에 첨부. 보험사는 proof의 유효성만 검증하고, 실제 유전자 수치는 알 수 없음.
  - **Phase 0**: 로컬 Noir proof 생성 + 로컬 검증 (`nargo prove` / `nargo verify`).
  - **Phase 2**: NEAR 스마트 컨트랙트 verifier 온체인 검증 전환.
  - **해결하는 문제**: "보험사에 유전자 수치를 줘야 가입할 수 있다"는 기존 구조를 파괴. "자격이 되는지 여부(true/false)"만 전달.

---

## 3. 요약 (Conclusion for Hackathon/Investors)
> **"우리는 단순히 NEAR를 스마트 컨트랙트 기록용으로 쓰지 않습니다. NEAR의 IronClaw(Agentic Harness)를 통해 가장 민감한 개인 데이터를 WASM 샌드박스 + TEE 인클레이브 이중 격리 환경에서 밀실 분석(Privacy Compute)하고, Noir ZKP로 유전자 수치를 단 한 글자도 노출하지 않은 채 자격을 증명하며, Confidential Intents + Chain Signatures로 전 세계 모든 체인의 보험 유동성에 기밀 접근합니다. NEAR의 4대 프라이버시 기술을 모두 관통하는 유일한 DApp입니다."**

---

## 관련 문서
- [자금 흐름 (Money Flow 전략)](../01_Concept_Design/MONEY_FLOW.md)
- [비즈니스 기획 (Pain Points)](../01_Concept_Design/GENETIC_AI_INSURANCE_AGENT.md)
