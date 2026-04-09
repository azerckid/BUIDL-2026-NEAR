# BuidlHack 2026: NEAR AI Workshop Slides Analysis

**작성 배경:**
BuidlHack 2026 심사위원들이 지향하는 기술적 한계 돌파점과 출제 의도를 완벽히 파악하기 위해, 워크숍 발표 슬라이드의 핵심 기술 아키텍처와 비전을 추출 및 문서화합니다.

---

## 1. TEE 기반 프라이버시 격리 아키텍처 (Trusted Execution Environment)

**작동 방식 및 데이터 주권 통제**
*   **격리된 블랙박스**: 클라이언트의 데이터(Data)와 이를 처리하는 AI 모델 연산 전체가 하드웨어적으로 철저히 격리된 TEE(Trusted Execution Environment) 내부에서만 수행됩니다.
*   **통신 제한**: 외부의 Application 환경(서비스 측)과는 오직 암호화된 통신이나 허용된 추론 결과값(Output)만 주고받으며, 연산 과정에서의 메모리 덤프나 데이터 유출을 원천적으로 차단합니다.

## 2. TEE 증명 프로세스 (Summary of TEE Attestation)

**"No one, even NEAR AI, cannot access data or model weights"** (NEAR AI조차 유저 데이터나 모델 가중치에 접근 불가)

*   **스텝 1**: 클라이언트가 하드웨어 격리 노드(TEE-enabled node)로 **암호화된 연산 요청**을 전송.
*   **스텝 2**: Intel TDX(CPU 상의 Confidential VM)와 NVIDIA TEE(GPU 상의 기밀 연산)를 통합 활용하여 LLM 엔진 구동 및 추론.
*   **스텝 3**: 응답 생성 시 하드웨어 플랫폼이 보증하는 **암호학적 서명(Cryptographic signature)**을 데이터에 첨부.
*   **스텝 4**: 클라이언트는 AI 결과물뿐만 아니라 해당 결과가 안전하게 처리되었음을 수학적으로 검증할 수 있는 **'프라이버시 증명(Mathematical proof of privacy)'**을 함께 수신.
*   *Verification Point*: CPU 부트로더, GPU 펌웨어, 도커 이미지 서명 등 전방위적 검증 지원.

## 3. 사용자 소유 AI의 비전 (Vision for User-owned AI)

프로젝트가 해커톤에서 제안해야 할 **비즈니스적 핵심 포지셔닝**입니다.

*   **Private Inference (개인 추론의 완성)**
    *   개인 데이터는 클라우드 중앙 서버로 이전되지 않고 **"유저의 곁(데이터가 존재하는 물리/논리적 위치)"**에 머뭅니다.
    *   AI가 개인 데이터를 향해 이동하여 연산을 수행하는 User-Owned Ecosystem.
*   **Open Innovation Ecosystem**
    *   커뮤니티와 오픈소스 생태계가 인프라를 구축하고, 네트워크 효과를 통한 수익 창출을 분배하는 차세대 오픈 생태계 모델 지향.

## 4. 실전 개발 도구 및 권장 리소스

**초기 셋업 스크립트**
```bash
# NEAR 기반 앱 스캐폴딩 생성
npx create-near-app@latest

# NEAR AI 에이전트 스킬 추가 (Cloud 연동 모듈)
npx skills add near/agent-skills --skill near-ai-cloud
```

**공식 레퍼런스**
*   개발 통합 사이트: `docs.near.org`
*   AI 전용 명세서: `docs.near.ai`

---

## 5. 해커톤 실전 공략 가이드 (The Challenge & Judging Criteria)

**The Challenge: "데이터 주권에 대한 암호학적 보증"**
*   **문제 의식**: 기존의 AI 플랫폼들은 단순히 "우리를 믿어라, 데이터는 안전하다"라고만 구두로 보장합니다.
*   **해결 과제**: 주최측은 이러한 신뢰(Trust-Me) 모델을 깨고, **암호학적 증명(Cryptographically Verified)**을 통해 프라이버시 걱정 때문에 과거에는 불가능했던 새로운 종류의 애플리케이션을 창조하기를 요구합니다.

**What we're looking for (주최측 타겟 프로젝트)**
가장 강력하게 우대받는 프로젝트 특성은 다음과 같습니다:
1.  **민감한 기밀 데이터**를 다루는 사용자 또는 엔터프라이즈 AI 앱.
2.  의료(Healthcare), 금융(Finance) 등 **상호 신뢰와 프라이버시가 생명인 분야**.
3.  유저 소유 데이터를 활용하고, 그 실행 과정을 증명(Verifiable execution)할 수 있는 서비스.

**How projects will be judged (평가 항목 및 배점)**
*   `30%` **Innovation (혁신성)**: TEE 기반 프라이버시 기능의 참신한 용례 (기존 한계 돌파).
*   `25%` **Impact (파급력)**: Private AI가 반드시 필요한 진짜 현실의 문제를 해결하는가.
*   `20%` **Technical Excellence (기술적 우수성)**: TEE Attestation(증명)의 올바른 활용 및 클린 코드 작성.
*   `15%` **Privacy Design (프라이버시 설계)**: 유저 데이터 보호에 대한 철학적인 접근과 아키텍처.
*   `10%` **Presentation (발표력)**: 명확한 데모 시연 및 설득력.

*참고: 해커톤 참가자는 OpenAI 호환 SDK 형태로 NEAR AI Cloud $5.00 크레딧을 지원받을 수 있습니다.*

---

## 💡 우리 프로젝트(Genetic Insurance Demo)에의 완벽한 핏(Alignment)

1. **킬러 유스케이스 적중**: 주최측이 대놓고 요구하는 "헬스케어/프라이버시(What we're looking for)" 영역에, 가장 민감한 **유전자(DNA) 데이터 검은상자 교환 모델**을 제시함으로써 "Innovation(30%)"과 "Impact(25%)" 점수판을 전면 공략합니다.
2. **"Trustless" 메시지 강조**: 피치덱과 심사위원 발표 시 위 워크숍의 주요 키워드인 **"What if you could verify it cryptographically?" (암호학적으로 검증 가능하잖아요?)**를 대본에 적극 치환해 넣어, NEAR 생태계에 대한 우리의 이해도를 증명합니다.
3. **아키텍처 점수 획득 전략**: 피치덱 6번 슬라이드의 IronClaw TEE 설계와 ZKP 파이프라인은 "Technical Excellence(20%)" 항목의 증명(Attestation) 사용 요건을 정교하게 충족시키는 가장 무거운 무기입니다.
