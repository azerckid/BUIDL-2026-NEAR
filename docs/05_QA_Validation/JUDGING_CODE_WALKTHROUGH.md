# [Guide] 심사위원용 코드 시연 가이드 (Judging Code Walkthrough)

- **등록일**: 2026-04-17
- **레이어**: 05_QA_Validation
- **대상**: BUIDL-2026_NEAR 1차 테이블 심사 (Seed Round)
- **목적**: 심사위원의 기술적 질문에 대해 실제 소스 코드를 짚어가며 답변하여 'Technical Excellence' 점수 극대화

---

## 전체 데이터 워크플로우 (End-to-End Data Flow)

유저 데이터 입력부터 온체인 기록까지의 6단계 흐름과 기술적 핵심 질의응답입니다.

### 1단계: 데이터 입력 및 해시 검증 (Input & Hashing)
- **흐름**: 유저가 파일을 선택하면 브라우저에서 **SHA-256 해시만** 계산되어 서버로 전송됩니다. 파일 원본은 서버로 전송되지 않습니다.
- **코드**: `src/components/modules/FileUploadZone.tsx` L43-48 (`computeSHA256`)
- **Q**: 파일 원본이 서버로 전송되지 않으면 어떻게 분석하나요?
- **A (Phase 0)**: "현재 MVP 단계에서는 동일한 형식의 합성 샘플 데이터를 서버 상수로 관리합니다(`src/lib/tee/mock-data.ts`). 파일 해시는 세션 무결성 검증용으로만 사용되며, 실제 파일 내용은 서버에 도달하지 않습니다. Phase 2에서는 클라이언트가 ECIES + AES-256-GCM으로 파일을 암호화한 뒤 TEE 공개키로 봉인하여 전송하는 방식으로 전환합니다."

### 2단계: 프라이버시 분석 (Private Analysis)
- **흐름**: 파일이 아닌 **정규화된 위험 프로파일 JSON**이 TEE LLM에 전달됩니다. 원본 유전자 시퀀스는 LLM에 도달하지 않습니다.
- **코드**: `src/lib/tee/normalizer.ts` → `src/lib/tee/ironclaw-tee.ts` L42-64 (`buildUserPrompt`)
- **Q**: 분석 엔진은 파일인가요, LLM인가요?
- **A**: `src/lib/tee/ironclaw-tee.ts`에 정의된 로직을 따라, TEE 내부에서 구동되는 **LLM(Qwen/Qwen3-30B)**이 엔진 역할을 수행합니다. LLM이 받는 것은 `{ oncology: { overallLevel: "high", detectedFlags: [...] } }` 형태의 추상화된 위험 레이블이며, 원본 염기서열은 포함되지 않습니다.

### 3단계: 영지식 증명 생성 (ZKP Proving)
- **흐름**: 분석된 위험 점수가 보험 가입 기준을 넘는지 수학적으로 증명합니다.
- **Q**: 외부로 나가는 데이터가 '기준 통과 여부'에 대한 증명인가요?
- **A**: 네, 실제 점수는 숨겨지고 오직 기준 만족 여부를 입증하는 수학적 결과물인 **`proof bytes`**만 외부(온체인)로 나갑니다.

### 4단계: AI 상담 및 결과 확인 (AI Concierge)
- **흐름**: 분석 레이블 정보를 바탕으로 'The Secret Keeper'가 상담을 진행합니다.
- **Q**: 상담용 LLM은 어디에 있나요?
- **A**: 별도의 외부 API가 아닌, **NEAR AI Cloud의 TEE(IronClaw) 내부**에 독립적으로 호스팅된 모델을 사용하여 상담 과정의 데이터 보안을 보장합니다.

### 5단계: 지갑 서명 및 기록 (Signing & Recording)
- **흐름**: 유저가 NEAR 지갑으로 서명하여 증명 해시를 온체인에 제출합니다.
- **기술**: NEAR 스마트 컨트랙트(`submit_proof`)에 정당한 가입 사실이 영구 기록됩니다.

### 6단계: 온체인 검증 및 확정 (Confirmation)
- **흐름**: 앱 UI가 NEAR RPC를 통해 기록을 확인하고 가입 완료를 승인합니다.
- **기술**: `is_proof_registered` 조회를 통해 중앙 서버 없이 무결성을 최종 확정합니다.

---

---

## 심사위원 대응 킬링 포인트 (Killing Points)

심사위원이 "기술적인 실체가 무엇인가요?" 또는 "어떻게 구현했나요?"라고 물을 때 다음 순서대로 노트북 화면을 보여주며 답변하십시오.

### 1단계: 하드웨어 보안 증명 (Attestation)
> **질문**: "TEE 환경임을 어떻게 보장하고 관리합니까?"

- **열어야 할 파일**: `src/lib/tee/attestation.ts`
- **짚어줄 라인**:
  - **L28-31**: NEAR AI Cloud의 `/v1/attestation/report` 엔드포인트 호출부
  - **L73-78**: 수신된 `signing_key`와 우리가 생성한 `nonce`를 결합하여 **SHA-256 해시**를 직접 검증하는 로직
- **핵심 멘트**:
  > "단순히 TEE 위에 올린 것이 아니라, 매 분석 요청마다 고유한 Nonce를 사용해 하드웨어 증명서를 온체인/클라이언트 사이드에서 직접 검증(Nonce Binding)합니다. 이를 통해 리플레이 공격과 중간자 공격을 원천 차단했습니다."

### 2단계: 통제된 AI 분석 (Secure Analysis)
> **질문**: "AI가 데이터를 학습하거나 유출할 위험은 없나요?"

- **열어야 할 파일**: `src/lib/tee/ironclaw-tee.ts`
- **짚어줄 라인**:
  - **L82-83**: `temperature: 0` 및 `json_object` 모드 강제 설정
  - **L31, L39**: 시스템 프롬프트에 명시된 `purgeConfirmed: true` 규약
- **핵심 멘트**:
  > "저희의 분석 엔진인 IronClaw TEE는 AI의 환각을 막기 위해 결정론적(Temperature 0)으로 구동됩니다. 또한 시스템 프롬프트 자체에 분석 후 데이터 즉시 소각 규약을 프로토콜로 포함시켜 데이터 생명주기를 엄격히 제어합니다."

### 3단계: 프라이버시 상담 원칙 (Ethical Guardrails)
> **질문**: "상담 에이전트가 개인정보를 실수로 노출하면 어떡하죠?"

- **열어야 할 파일**: `src/lib/tee/concierge-system-prompt.ts`
- **짚어줄 라인**:
  - **L21**: 원본 유전자 시퀀스 언급 금지 가드레일
  - **L25**: 기억을 남기지 않는(Stateless) AI 성격 정의
- **핵심 멘트**:
  > "상담을 진행하는 'The Secret Keeper'는 원본 데이터에 접근조차 할 수 없도록 가드레일이 설정되어 있습니다. 또한, 사용자에게 '나는 당신의 프라이버시를 위해 기억을 남기지 않는다'고 명확히 설명하도록 설계하여 철저한 신뢰를 구축합니다."

### 4단계: 영지식 증명 회로 (ZKP Circuits)
> **질문**: "데이터를 안 보여주는데 어떻게 가입 자격을 판별하죠?"

- **열어야 할 파일**: `circuits/insurance_eligibility/src/main.nr`
- **짚어줄 라인**:
  - **L12-14**: `main` 함수와 `assert(risk_score >= threshold)` 조건문
- **핵심 멘트**:
  > "이 Noir 회로가 프라이버시의 심장입니다. 사용자의 실제 점수(Private Input)는 마스킹된 채로 유지되지만, 보험사의 자격 기준(Threshold)을 만족하는지는 수학적 제약 조건을 통해 증명됩니다. **'데이터를 주지 않고 결과만 증명한다'**는 Web3의 핵심 가치를 구현한 코드입니다."

> **추가 질문**: "TEE가 이미 데이터를 소각하는데, ZKP가 왜 필요합니까?"

- **핵심 멘트**:
  > "TEE와 ZKP는 역할이 다릅니다. TEE는 '데이터를 보이지 않게' 하고, ZKP는 '결과가 올바름을 수학적으로 증명'합니다. TEE만 있을 때는 결국 'NEAR AI Cloud를 믿어라'는 중앙화된 신뢰가 남습니다. 운영자가 결과를 조작했는지 제3자가 검증할 방법이 없기 때문입니다. ZKP proof가 추가되면 보험사는 어떤 서버도 신뢰하지 않고 proof bytes 하나만으로 자격을 검증할 수 있습니다. **TEE는 프라이버시를, ZKP는 Trustless 검증을 담당하는 상호 보완 구조입니다.**"

### 5단계: 온체인 레지스트리 (Smart Contract)
> **질문**: "컨트랙트 호출은 어디서 하며, 데이터가 진짜 등록되었는지 어떻게 확인합니까?"

- **기록 로직 (Submit)**:
  - **호출 위치**: 프론트엔드 (사용자 지갑 서명 필수)
  - **설명**: "TEE 분석과 ZKP 증명 생성이 완료되면, 유저의 브라우저에서 `submit_proof` 함수를 호출합니다. 이때 NEAR 지갑의 보안 서명을 거쳐 증명 해시가 온체인에 기록됩니다."
- **검증 로직 (Query)**:
  - **열어야 할 파일**: `src/lib/zkp/verifier.ts`
  - **짚어줄 라인**: **L37-60 (`isProofRegisteredOnChain`)**
  - **핵심 멘트**: 
    > "보시는 것처럼 우리는 NEAR RPC 로직을 통해 컨트랙트의 `is_proof_registered` 함수를 직접 호출(View Call)합니다. 중앙 서버의 DB를 의존하지 않고도 블록체인에서 증명의 정당성을 즉시 확인할 수 있는 **'Trustless Verification'** 구조입니다."

---

## 기술적 구현 단계 및 로드맵 (Phase & Roadmap)

심사위원이 "현재 TEE 내부에서 실제로 ZKP가 구동되고 있나요?"라고 날카로운 질문을 던질 때의 대응 전략입니다.

### [방어 전략] 솔직함 + 전문적 로드맵 제시
현실적인 인프라 제약(WASM 번들 크기, 클라우드 TEE 가용성 등)을 인정하면서도, **기술적 설계는 이미 상용화 수준(Phase 2)까지 준비**되어 있음을 강조하십시오.

- **현재 상태 (Phase 0 - MVP)**:
  - **TEE 분석 엔진**: `USE_REAL_TEE=true` + `IRONCLAW_API_KEY` 환경변수가 배포 완료되어, **실제 NEAR AI Cloud IronClaw TEE의 Qwen3-30B 모델이 구동 중**입니다. Mock이 아닙니다.
  - **ZKP proof 생성**: `src/lib/zkp/prover.ts` (주석 L27-31 참조) — Vercel 환경의 WASM 번들 크기 제약(50MB 한계)으로 인해 Noir 회로는 실행되지 않으며, 더미 proof 문자열을 반환합니다. 회로 코드(`circuits/insurance_eligibility/src/main.nr`)는 완성되어 있습니다.
  - **답변 멘트**: "TEE 분석 파이프라인은 실제 NEAR AI Cloud에서 구동되고 있습니다. ZKP proof 생성은 Vercel 환경 제약으로 현재 시뮬레이션 단계이며, 회로 설계와 온체인 검증 컨트랙트는 상용 버전과 동일하게 준비되어 있습니다."

- **향후 계획 (Phase 2 - Mainnet)**:
  - **코드**: `src/lib/zkp/prover.ts` (구현 명세 주석 L32-43 참조)
  - **설명**: "메인넷 배포 단계에서는 **Noir WASM 모듈을 NEAR AI Cloud(Intel TDX) 인클레이브 내부로 번들링**할 것입니다. 이를 통해 유저의 민감한 원본 데이터가 분석 서버의 메모리를 벗어나기 전에 TEE 내부에서 즉시 영지식 증명을 발급받는 **'완전 격리형 프라이버시 파이프라인'**을 완성할 계획입니다."
  - **인프라 근거 (심사위원 질문 대응)**: IronClaw v0.25.0(2026-04-11)에서 커스텀 WASM 툴 배포가 프로덕션 수준으로 공식 지원됩니다. v0.17.0(2026-03-10)에 최초 도입된 이후 5주간 빠르게 발전하여 현재 프로덕션 수준에 도달했습니다. Barretenberg를 WASI Preview 2 컴포넌트 모델로 패키징하면 IronClaw TEE 내부에서 직접 실행 가능합니다. **"Phase 2 인프라가 해커톤 기간 중 준비 완료된 것"**이라는 점을 강조하십시오.

---

## 시연 팁 (Demo Tips)

1. **파일 미리 열어두기**: VS Code나 에디터에 위 3개 파일을 미리 탭으로 열어두세요.
2. **코드 하이라이트**: 핵심 라인(SHA-256 연산부 등)은 심사위원이 보기 편하게 마우스로 드래그하여 강조하세요.
3. **용어 사용**: "Trustless", "Attestation", "Stateless", "Nonce Binding", "In-Enclave Proving" 같은 Web3 핵심 키워드를 답변에 섞어주세요.
4. **결과 대조**: 로그창이나 콘솔에 찍히는 `hashHex === report.report_data` 결과값을 보여주면 더 강력합니다.

---
**관련 문서**:
- [PITCH_DECK_EXPECTED_QA.md](./PITCH_DECK_EXPECTED_QA.md)
- [README.md](../../README.md)
