# How to Run OpenClaw & IronClaw with NEAR AI 요약 문서

해당 문서는 Ludium Portal에 게재된 Pham Nim의 "How to Run OpenClaw & IronClaw with NEAR AI" 아티클을 정리한 내용입니다. BUIDL-2026 NEAR 해커톤 프로젝트의 에이전트 인프라스트럭처를 결정하고 설계하는 데 핵심적인 가이드를 제공합니다.

## 1. 프레임워크 개요

NEAR AI를 기반으로 에이전트를 실행할 수 있는 두 가지 주요 프레임워크입니다.
- **OpenClaw**: 가볍고 유연한 Node.js 기반 프레임워크.
- **IronClaw**: 강력한 보안과 격리 환경을 지원하는 Rust 기반 프로덕션 런타임.

## 2. OpenClaw (개인 및 프로토타이핑 타겟)

빠른 시작과 개념 검증(Proof of Concept) 빌드에 최적화된 프레임워크입니다. 해커톤 환경에서 빠르게 아이디어를 구현하는 데 유리합니다.

### 2.1 사전 요구 사항 (Prerequisites)
- `Node.js v22+`
- Anthropic, OpenAI 또는 OpenRouter API 키
- (선택 사항) Telegram 봇 토큰 등 연결 채널

### 2.2 핵심 설치 및 설정 단계
1. **패키지 설치:** `npm install -g openclaw@latest`
2. **초기 설정 (Onboarding):** `openclaw onboard --install-daemon`
   - LLM 제공자 선택 및 API 키 입력
   - 메신저 채널 연결 (Telegram, Slack, WhatsApp 등)
   - `SOUL.md`(성격 프롬프트) 및 `USER.md`(사용자 컨텍스트) 설정
3. **NEAR 지갑 및 에이전트 마켓 연결:**
   - 토큰 스왑 및 인텐트 기능: `openclaw skills install near-intents`
   - 지갑 통합 제어: `openclaw skills install near-wallet`
   - `.env`에 `NEAR_ACCOUNT_ID` 및 `NEAR_PRIVATE_KEY` 등록
4. **실행:** `openclaw start`

## 3. IronClaw (엔터프라이즈 및 보안 중심 타겟)

격리된 실행 환경(WASM Sandbox), 데이터 주권 보장, 강력한 보안을 요구하는 엔터프라이즈 수준의 런타임입니다.

### 3.1 사전 요구 사항 (Prerequisites)
- Rust Toolchain (`rustup`, `cargo`)
- PostgreSQL (로컬 또는 도커)
- NEAR 계정 지갑 정보
- 로컬 모델 지원(Ollama 등) 또는 기존 LLM API

### 3.2 핵심 아키텍처 및 보안 특성
- **다층 방어 아키텍처:** 도구(Skills) 실행을 WASM 샌드박스로 격리시켜 시스템으로의 무단 액세스를 차단합니다.
- **동적 자격 증명 주입:** LLM의 컨텍스트 창에 API 키나 개인키를 절대 노출하지 않고, 도구가 실행되는 시점에 안전하게 주입합니다.

### 3.3 핵심 구동 단계
1. **리포지토리 클론 및 빌드:** 
   `git clone https://github.com/nearai/ironclaw`
   `cargo build --release`
2. **초기 설정 (Onboard):** 
   `./target/release/ironclaw onboard` (DB 연결 및 NEAR OAuth 인증 과정)
3. **실행 환경:** 
   `./target/release/ironclaw start` (localhost:7070 포트를 통한 웹 게이트웨이 제공)
4. **루틴(Routine) 엔진:** 특정 시간에 백그라운드 작업을 실행하는 스케줄링 및 자동화 로직 구현 가능.

## 4. 아키텍처 채택 권장 사항

* **단기 해커톤 및 컨슈머 앱 프로토타입:** **OpenClaw** 활용 권장 (빠른 이터레이션, Telegram 등 친숙한 채널 연동).
* **B2B 프로덕션, 자산 다량 핸들링, TEE(신뢰 실행 환경) 필요 시:** **IronClaw** 채택 필수 (크로스체인 Confidential Intents 연결 확장성 확보).
