# [명세] Phase 3 구현 블로커 및 NEAR AI 팀 문의

- **작성일**: 2026-04-23
- **최종 수정일**: 2026-04-23
- **레이어**: 03_Technical_Specs
- **상태**: 문의 대기 중
- **관련 단계**: Stage 17 (ROADMAP.md), ZKP_IN_TEE_WASM_IMPL_SPEC.md

---

## 1. 배경

OHmyDNA Insurance Agent는 유전자 데이터를 IronClaw TEE 내부에서만 처리하고
외부로 단 한 바이트도 노출하지 않는 완전 격리 파이프라인을 목표로 합니다.

Stage 17(2026-04-23) 기준으로 LLM 분석(Qwen3-30B)만 TEE 내부에서 실행되며,
유전자 파일 파싱, ZKP proof 생성, risk_score 도출은 여전히 Next.js 서버에서 실행됩니다.

Phase 3 완성을 위해 아래 5가지 블로커를 확인했으며, 일부는 NEAR AI 팀의
인프라 지원 없이 코드만으로 해결이 불가능합니다.

---

## 2. 블로커 상세

### 문제 1 — TEE 개인키 접근 불가 [심각도: 매우 높음]

**목표 동작**
```
브라우저: 파일 → ECIES 암호화(signing_public_key 사용) → 서버 전달
TEE 내부: 암호화된 파일 수신 → 개인키로 복호화 → 파싱 → 분석
```

**현재 상황**
- `signing_public_key` (secp256k1, 64바이트) 조회는 완료 (`/v1/attestation/report`)
- `eciesjs` 기반 암호화 모듈(`encryption.ts`) 구현 완료
- **블로커**: 복호화에 필요한 대응 개인키가 Intel TDX 하드웨어 sealing key로 관리됨
- LLM, WASM 툴, 외부 API 어디에서도 이 개인키에 접근하는 방법이 공식 문서에 없음
- IronClaw가 "암호화된 바이트를 받아 내부적으로 복호화하는" 전용 엔드포인트가 필요함

**해결을 위해 필요한 것**
- IronClaw Cloud TEE의 암호화 데이터 수신 및 내부 복호화 API 엔드포인트
- 또는 `signing_public_key`에 대응하는 개인키를 WASM 툴이 접근할 수 있는 방법

**담당**: NEAR AI 팀 인프라 지원 필요

---

### 문제 2 — cloud.near.ai WASM 툴 등록 경로 미확인 [심각도: 높음]

**목표 동작**
- 파일 파싱, ZKP proof 생성 WASM 툴을 IronClaw Cloud TEE에 등록
- LLM 분석 세션 내에서 WASM 툴 호출 → 결과 반환

**현재 상황**
- `ironclaw tool install` : 로컬 `~/.ironclaw/tools/`에만 설치 (Cloud TEE 미반영)
- `zkp-prover.wasm` (137KB, wasm32-wasip2) 로컬 빌드 및 동작 검증 완료
- `nearai registry` CLI : 2025-10-31 폐기 (410 Gone)
- **블로커**: `cloud.near.ai` 사용자 정의 WASM 툴 등록 API가 공식 문서에 없음
- REGISTER.md에 "cloud.near.ai 웹 인터페이스 또는 새 API 통해 진행" 언급만 있음

**등록 대상 WASM 툴**

| 툴 이름 | 파일 | 크기 | 역할 |
|---|---|---|---|
| `zkp-prover` | `zkp-prover-wasm/dist/zkp-prover.wasm` | 137KB | HMAC-SHA256 ZKP commitment 생성 |
| (Phase 3) `file-parser` | 미구현 | — | 유전자 파일 복호화 및 파싱 |

**담당**: NEAR AI 팀 — cloud.near.ai WASM 툴 등록 API 또는 절차 안내 필요

---

### 문제 3 — IronClaw Chat API는 WASM 실행 결과를 반환하지 않음 [심각도: 높음]

**현재 구현 (Stage 16, 오류 있음)**
```typescript
// prover.ts — OpenAI function calling 방식
tool_choice: { type: "function", function: { name: "zkp_prove" } }
// → LLM이 반환하는 것: 도구의 입력 인자 (risk_score, threshold, nonce)
// → 코드가 기대하는 것: 도구의 출력 결과 (proof_bytes, assertion_passed)
// → 결과: 항상 assertion_passed === undefined → ZKP 실패
```

**블로커**
- OpenAI 호환 Chat Completions API의 `tool_calls[0].function.arguments`는
  LLM이 "이 인자로 함수를 호출하고 싶다"는 의도를 반환하는 것
- 실제 WASM이 실행되어 출력 결과를 돌려주는 경로가 현재 NEAR AI Cloud API에 없음
- Stage 17에서 `wasmtime` 서브프로세스로 교체하여 로컬 동작은 해결했으나,
  Cloud TEE에서의 WASM 실행 → 결과 반환 경로가 필요

**필요한 것**
- IronClaw Cloud TEE에서 등록된 WASM 툴을 실행하고 결과를 받는 전용 API 엔드포인트
- 또는 Chat Completions API에서 tool_result를 반환하는 방식의 공식 문서

**담당**: NEAR AI 팀 — WASM Tool Execution API 문서 또는 엔드포인트 안내 필요

---

### 문제 4 — 무상태 Chat API로 순차 파이프라인 처리 불가 [심각도: 중간]

**목표 파이프라인 (5단계)**
```
① 암호화 파일 수신
② TEE 내부 복호화
③ 유전자 데이터 파싱
④ LLM 분석 → riskProfile
⑤ ZKP proof 생성
```

**블로커**
- IronClaw Chat Completions API는 무상태(stateless) 호출
- 각 단계가 이전 단계의 결과(메모리 내 데이터)를 필요로 하는 순차 흐름
- 특히 ②에서 복호화된 원본 데이터가 ③, ④, ⑤까지 TEE 메모리 내에서 유지되어야 함
- 단일 API 호출로 5단계를 처리하거나, 상태를 유지하는 세션 API가 필요

**가능한 해결 방향**
- IronClaw v0.26.0의 `engine-v2` Mission/Job API 활용 (상태 유지 가능성)
- 단일 LLM 시스템 프롬프트로 5단계를 한 번의 호출에서 처리하는 방식

**담당**: IronClaw Mission API 문서 확인 후 자체 구현 가능성 있음

---

### 문제 5 — Barretenberg WASM 크기 제한 미확인 [심각도: 중간]

**배경**
- Phase 3 업그레이드 경로: HMAC-SHA256 커밋먼트 → Barretenberg ultraplonk ZKP
- Barretenberg WASM 바이너리: **~50MB+** (`wasm32-wasip2` 빌드 기준)
- Vercel Serverless: 50MB 한도 초과로 배포 불가 (확인된 제약)

**블로커**
- IronClaw Cloud TEE WASM 툴 크기 제한이 공식 문서에 명시되지 않음
- 로컬 `ironclaw tool install`로는 크기 제한을 확인할 수 없음
- 크기 초과 시 cloud.near.ai 등록 자체가 불가능

**확인 필요 사항**
- IronClaw Cloud TEE WASM 툴 최대 크기
- 크기 초과 시 분할 등록(chunked upload) 또는 원격 참조 방식 지원 여부

**담당**: NEAR AI 팀 확인 필요 / Barretenberg 빌드 후 자체 실측 가능

---

## 3. 블로커 요약

| # | 문제 | 심각도 | 해결 주체 | 자체 해결 가능 |
|---|---|---|---|---|
| 1 | TEE 개인키 접근 불가 | 매우 높음 | NEAR AI 팀 | 불가 |
| 2 | cloud.near.ai WASM 등록 경로 미확인 | 높음 | NEAR AI 팀 | 불가 |
| 3 | WASM 실행 결과 반환 경로 없음 | 높음 | NEAR AI 팀 | 불가 |
| 4 | 무상태 API 파이프라인 제약 | 중간 | 자체 + NEAR AI | 부분 가능 |
| 5 | Barretenberg 크기 제한 미확인 | 중간 | NEAR AI 팀 확인 | 실측 가능 |

---

## 4. NEAR AI 팀 문의 메일 초안

---

**수신**: team@near.ai (또는 Discord #developer-support)
**제목**: IronClaw Cloud TEE — Phase 3 완전 격리 파이프라인 구현을 위한 기술 문의

---

안녕하세요, NEAR AI 팀

저는 NEAR Buidl Asia 2026 해커톤 NEAR Protocol 트랙 1위를 수상한
**OHmyDNA Insurance Agent** 프로젝트의 개발자입니다.

현재 IronClaw TEE와 Intel TDX Attestation을 활용한 유전자 기반 프라이버시 보험 DApp을
개발 중이며, Phase 3 완전 격리 파이프라인 구현을 위해 아래 사항을 문의드립니다.

---

### 문의 1. 암호화된 사용자 데이터의 TEE 내부 복호화

`GET /v1/attestation/report`에서 `signing_public_key` (secp256k1)를 조회하여
브라우저에서 ECIES 암호화까지는 구현했습니다.

복호화 단계에서 질문드립니다:

- IronClaw Cloud TEE 내부에서 이 개인키로 암호화된 데이터를 복호화하는
  공식 API 엔드포인트 또는 방법이 있나요?
- 암호화된 파일을 Chat Completions API 메시지로 전달할 경우,
  TEE 내부에서 복호화가 이루어지는 메커니즘이 있나요?

---

### 문의 2. cloud.near.ai 사용자 정의 WASM 툴 등록

저희가 개발한 `zkp-prover.wasm` (137KB, wasm32-wasip2)을
IronClaw Cloud TEE에 등록하고 싶습니다.

- `nearai registry` CLI가 폐기(410 Gone)된 이후,
  `cloud.near.ai`에서 사용자 정의 WASM 툴을 등록하는 방법이 있나요?
- 등록 API 엔드포인트 또는 웹 UI 접근 방법을 안내해 주실 수 있나요?

---

### 문의 3. WASM 툴 실행 결과 반환 API

현재 Chat Completions API의 `tool_choice`를 사용할 경우,
`tool_calls[0].function.arguments`에 LLM의 입력 인자만 반환되고
실제 WASM이 실행되어 결과를 돌려주지 않는 것을 확인했습니다.

- 등록된 WASM 툴을 IronClaw Cloud TEE에서 실행하고
  실제 출력 결과를 받는 전용 API 엔드포인트가 있나요?
- v0.26.0에서 추가된 `engine-v2` Mission API를 통해
  WASM 툴 실행 결과를 외부에서 받을 수 있나요?

---

### 문의 4. WASM 툴 크기 제한

- IronClaw Cloud TEE에 등록 가능한 WASM 툴의 최대 크기 제한이 있나요?
- Barretenberg ultraplonk (~50MB+)과 같은 대형 WASM 바이너리를
  등록하기 위한 방법(분할 업로드, 원격 참조 등)이 있나요?

---

저희 프로젝트는 NEAR 생태계에서 유전자 데이터 프라이버시를 실현하는
실제 서비스를 목표로 하고 있으며, IronClaw TEE가 이 아키텍처의 핵심입니다.

위 사항에 대한 안내 또는 관련 문서를 공유해 주시면 감사하겠습니다.
Phase 3 구현 과정에서 발견되는 이슈들을 지속적으로 공유하며
생태계 발전에 기여하고 싶습니다.

감사합니다.

**azerckid | OHmyDNA Insurance Agent**
GitHub: https://github.com/azerckid/BUIDL-2026-NEAR
Live Demo: https://buidl-2026-near.vercel.app/en
NEAR Buidl Asia 2026 — NEAR Protocol Track 1st Place

---

## 관련 문서

- [ROADMAP.md](../04_Logic_Progress/ROADMAP.md) — Stage 17
- [ZKP_IN_TEE_WASM_IMPL_SPEC.md](./ZKP_IN_TEE_WASM_IMPL_SPEC.md)
- [PHASE2_IMPLEMENTATION_SPEC.md](./PHASE2_IMPLEMENTATION_SPEC.md)
- [TEE_ATTESTATION_SPEC.md](./TEE_ATTESTATION_SPEC.md)
