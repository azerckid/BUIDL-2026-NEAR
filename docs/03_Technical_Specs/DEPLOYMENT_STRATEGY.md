# [기술 명세] 배포 전략 및 Phase 2 전환 계획

- **작성일**: 2026-04-05
- **최종 수정일**: 2026-04-06 (아키텍처 정합성 교정 — ZKP 생성 위치 TEE 내부 확정)
- **레이어**: 03_Technical_Specs
- **상태**: Draft v1.1

---

## 1. 배포 플랫폼 전환 결정 (Vercel → Docker)

### 1-1. 전환 배경

> **[교정 2026-04-06]** 아래 표의 nargo CLI / `@noir-lang` WASM 항목은 `NEAR_PRIVACY_STACK_ARCH.md` 6-1절과 불일치하여 교정한다.
> ZKP proof 생성은 **IronClaw TEE 내부**에서 수행되므로, 우리 웹 서버에 nargo CLI나 `@noir-lang` WASM을 설치할 필요가 없다.
> Vercel의 50MB 함수 크기 제한 및 CLI 실행 불가 제약은 Phase 2에서도 장애가 되지 않는다.
> Docker 전환이 필요한 유일한 잠재적 사유는 **TEE API 응답 시간이 Vercel의 60초 타임아웃을 초과하는 경우**이며, 이는 Phase 2 성능 테스트 후 판단한다.

Phase 0(해커톤 데모)는 Vercel 서버리스 환경을 사용했으나, Phase 2 실연동을 위해 아래 두 가지 기술적 제약이 확인되어 Docker 기반 컨테이너 배포로 전환한다.

| 제약 | Vercel 한계 | Docker 해결 여부 |
|------|------------|-----------------|
| nargo CLI 실행 | 서버리스 환경 CLI 실행 불가 | 해결 — Docker 이미지에 nargo 설치 가능 |
| `@noir-lang` WASM 번들 크기 | 50MB 함수 크기 제한 초과 | 해결 — 컨테이너는 크기 제한 없음 |
| 함수 실행 시간 | 최대 60초 | 해결 — Cloud Run 최대 60분, EC2 무제한 |
| Next.js Server Actions | 지원 | 지원 (Node.js 서버로 동일 동작) |

### 1-2. 권장 배포 서비스

| 서비스 | 특징 | 적합도 |
|--------|------|--------|
| **GCP Cloud Run** | Dockerfile 기반, 자동 스케일, 콜드스타트 있음 | 높음 (권장) |
| **AWS App Runner** | Dockerfile 기반, 간단한 설정 | 높음 |
| **AWS EC2** | 완전한 제어권, nargo 직접 설치 | 높음 (관리 부담 있음) |
| AWS Lambda | 250MB 제한, 15분 타임아웃 | 낮음 — 부적합 |
| Vercel | 50MB 제한, 서버리스 | Phase 0 전용 — 실연동 불가 |

### 1-3. Dockerfile 구성 방향

```dockerfile
FROM node:20-slim

# nargo CLI 설치 (Noir ZKP proof 생성용)
RUN curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
RUN noirup

# Next.js 빌드
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

---

## 2. Stage 6 미체크 항목 해결 계획

Stage 6 구현 시 Phase 0 제약으로 체크되지 않은 항목들의 해결 경로를 정리한다.

### 2-1. 항목별 해결 상태

| 항목 | Phase 0 미구현 이유 | 해결 방법 | 선행 조건 |
|------|-------------------|----------|----------|
| Noir ZKP proof bytes 실생성 | ~~nargo CLI 불가, WASM 50MB 초과~~ (교정: TEE 내부 생성) | IronClaw TEE API 호출로 proof bytes 수신 | IronClaw TEE 연동 |
| ZKP proof bytes calldata 첨부 | proof bytes 자체가 없었음 | proof 생성 후 코드 연결 | 위 항목 완료 |
| ZKP proof 첨부 실패 안내 | proof bytes 없어서 에러 경로 미존재 | proof bytes 생성 후 에러 케이스 처리 | 위 항목 완료 |
| Chain Signatures MPC 실연동 | Server Action 구조 — 브라우저 서명 불가 | `completeCheckout.ts` 재설계 | 재설계 완료 |
| 트랜잭션 서명 → 브로드캐스트 Progress UI | 위와 동일 | 재설계 후 단계별 클라이언트 상태 표시 | 재설계 완료 |
| NEAR Explorer 링크 | mock txHash는 실제 탐색 불가 | real txHash 생성 후 한 줄 추가 | Chain Signatures 실연동 |
| Confidential Intents 실 엔드포인트 | NEAR Private Shards 베타 상태 | NEAR 팀 확인 필요 | 인프라 가용성 확인 |
| ETH/SOL 파생 주소 설계 | Phase 3 범위 | Phase 3에서 구현 | 해커톤 이후 |

---

## 3. `completeCheckout.ts` 재설계 계획

### 3-1. 현재 구조 (Phase 0)

결제 흐름 전체가 Server Action 내부에서 처리된다. Mock txHash를 서버에서 직접 생성하므로 브라우저 지갑 서명이 없다.

```
브라우저
  └─ completeCheckout() Server Action 호출
       ├─ cart 상태 → pending_checkout
       ├─ transactions INSERT (pending)
       ├─ submitConfidentialIntent() — Mock 2초 지연
       └─ txHash 생성 → DB 저장 → 반환
```

**문제**: 실제 Chain Signatures MPC 서명은 사용자 지갑(브라우저)이 직접 온체인 트랜잭션에 서명해야 하므로 Server Action에서 처리 불가.

### 3-2. 재설계 후 구조 (Phase 2)

Server Action을 두 개로 분리한다.

```
브라우저 (CheckoutClient)
  ├─ 1단계: prepareCheckout() Server Action
  │         └─ cart → pending_checkout 선점
  │         └─ transactions INSERT (pending)
  │
  ├─ 2단계: WalletSelector.signAndSendTransaction()
  │         └─ NEAR MPC v1.signer 컨트랙트 호출
  │         └─ ZKP proof bytes calldata 첨부
  │         └─ txHash 반환
  │
  └─ 3단계: confirmCheckout() Server Action
            └─ txHash 전달
            └─ transactions → confirmed + txHash 저장
            └─ cart → checked_out
```

### 3-3. 파일 변경 범위

| 파일 | 변경 내용 |
|------|----------|
| `src/actions/completeCheckout.ts` | `prepareCheckout` + `confirmCheckout` 두 함수로 분리 |
| `src/components/modules/CheckoutClient.tsx` | 중간에 `signAndSendTransaction` 호출 단계 추가 |
| `src/lib/near/chain-signatures.ts` | Mock 제거, 실제 v1.signer MPC 호출 함수 구현 |

---

## 4. Stage 7 착수 전 전체 체크리스트

Stage 7 코드 작업 전에 아래 4가지를 완료해야 한다. 항목 성격에 따라 **외부 확인(조사)** 과 **코드/인프라 작업** 으로 구분한다.

| # | 항목 | 성격 | 완료 여부 |
|---|------|------|----------|
| 4-1 | `@nearai/client` 대안 결정 | 외부 조사 → 결정 | [ ] |
| 4-2 | Confidential Intents 엔드포인트 가용성 확인 | 외부 조사 | [ ] |
| 4-3 | Docker 환경 구성 | 인프라 작업 | [ ] |
| 4-4 | `completeCheckout.ts` 재설계 | 코드 작업 | [ ] |

---

### 4-1. `@nearai/client` 패키지 문제 → 확정: A안 (openai npm 패키지) ✓

**조사 결과 (2026-04-05)**:
IronClaw는 **OpenAI 호환 REST API**(`/v1/chat/completions`)를 공개하고 있다.
`@nearai/client` npm 패키지 없이 `openai` npm 패키지의 baseURL만 IronClaw 엔드포인트로 변경하면 바로 사용 가능하다.

**확정된 구현 방식**:

```typescript
import OpenAI from "openai";

const ironclaw = new OpenAI({
  baseURL: process.env.IRONCLAW_BASE_URL, // IronClaw 엔드포인트
  apiKey: process.env.IRONCLAW_API_KEY,
});

const response = await ironclaw.chat.completions.create({
  model: "ironclaw",
  messages: [{ role: "user", content: geneticDataPrompt }],
});
```

- 인증: Bearer 토큰 (`IRONCLAW_API_KEY`)
- 스트리밍: SSE 지원
- 추가 패키지: `openai` npm (이미 많은 프로젝트에서 사용 중)
- 참고: [IronClaw GitHub](https://github.com/nearai/ironclaw), [API 문서](https://deepwiki.com/nearai/ironclaw/4.3-http-webhooks-and-openai-compatible-api)

---

### 4-2. Confidential Intents 엔드포인트 가용성 → 확정: 메인넷 출시 완료 ✓

**조사 결과 (2026-04-05)**:
Confidential Intents는 **2026년 2월 25일 메인넷 정식 출시** 완료 상태다.
Testnet 단계가 아니며 개발자 통합용 npm SDK도 공개되어 있다.

| 항목 | 내용 |
|------|------|
| 상태 | 메인넷 라이브 (30일 거래량 $2.7B) |
| 통합 SDK | `@defuse-protocol/intents-sdk` (npm 공개) |
| 구조 | Private Shard → NEAR 메인넷 TEE 브릿지 |
| 지원 체인 | 35개 체인 |

**확정된 구현 방식**:
```typescript
import { ... } from "@defuse-protocol/intents-sdk";
// Confidential Account 전환 + Intent 제출
```

- 참고: [@defuse-protocol/intents-sdk](https://www.npmjs.com/package/@defuse-protocol/intents-sdk)

---

### 4-3. Docker 환경 구성 (인프라 작업)

> **[교정 2026-04-06]** nargo CLI는 IronClaw TEE 내부에서 실행되므로 Docker에 설치할 필요 없음. 아래 Dockerfile의 nargo 설치 단계는 제거 대상.

배포 플랫폼 전환 여부를 검토한다. TEE API 응답 시간 측정 후 Docker 전환 필요성을 최종 판단한다.

**작업 목록**:

```
[ ] Dockerfile 작성
    - node:20-slim 베이스 이미지
    - noirup 설치 스크립트 실행 (nargo CLI)
    - npm ci + next build
    - EXPOSE 3000 + CMD ["npm", "start"]

[ ] .dockerignore 작성
    - node_modules, .next, .env.local 제외

[ ] 로컬 Docker 빌드 + 실행 검증
    - docker build -t mydna-app .
    - docker run -p 3000:3000 --env-file .env.local mydna-app
    - nargo --version 컨테이너 내 실행 확인

[ ] GCP Cloud Run 또는 AWS App Runner 배포 테스트
    - 환경 변수 (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN) 클라우드 Secret 등록
    - 배포 후 /upload 페이지 정상 접근 확인
```

**예상 Dockerfile**:

```dockerfile
FROM node:20-slim

# noirup 의존성
RUN apt-get update && apt-get install -y curl bash git && rm -rf /var/lib/apt/lists/*

# nargo 설치 (Noir ZKP proof 생성용)
RUN curl -L https://raw.githubusercontent.com/noir-lang/noirup/main/install | bash
ENV PATH="/root/.nargo/bin:$PATH"
RUN noirup

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]
```

---

### 4-4. `completeCheckout.ts` 재설계 (코드 작업)

Chain Signatures MPC 실연동을 위해 Server Action 구조를 변경한다.
현재 서버에서 전체 결제 흐름을 처리하는 방식을 브라우저 지갑 서명 중심으로 재설계한다.

**변경 전 (Phase 0)**:
```
브라우저 → completeCheckout() Server Action
               └─ Mock txHash 생성 → DB 저장 → 반환
```

**변경 후 (Phase 2)**:
```
브라우저
  ├─ 1단계: prepareCheckout() Server Action
  │         └─ cart → pending_checkout (이중 결제 방지 선점)
  │         └─ transactions INSERT (status: pending)
  │
  ├─ 2단계: WalletSelector.signAndSendTransaction() [브라우저]
  │         └─ ZKP proof bytes calldata 첨부
  │         └─ NEAR v1.signer MPC 컨트랙트 호출
  │         └─ txHash 반환
  │
  └─ 3단계: confirmCheckout(txId, txHash) Server Action
            └─ transactions → confirmed + txHash + confirmedAt 저장
            └─ cart → checked_out
```

**변경 파일**:

| 파일 | 변경 내용 |
|------|----------|
| `src/actions/completeCheckout.ts` | `prepareCheckout` + `confirmCheckout` 두 함수로 분리 |
| `src/components/modules/CheckoutClient.tsx` | 2단계 `signAndSendTransaction` 호출 + 단계별 Progress 상태 추가 |
| `src/lib/near/chain-signatures.ts` | Mock 제거, 실제 v1.signer MPC 호출 구현 |

**주의**: 이 재설계는 4-1(`@nearai/client` 대안 결정)과 4-2(Confidential Intents 가용성 확인) 결과에 따라 구현 범위가 달라진다. 두 항목 확인 후 착수할 것.

---

## 5. Phase별 구현 완성도 목표

| Phase | 배포 환경 | ZKP | Chain Signatures | Confidential Intents |
|-------|----------|-----|-----------------|---------------------|
| Phase 0 (현재) | Vercel | proof hash (더미) | Mock 2초 지연 | Mock |
| Phase 2 (Stage 7) | Vercel 유지 또는 Docker (성능 테스트 후 결정) | proof bytes (IronClaw TEE 내부 생성) | v1.signer MPC 실연동 | 메인넷 출시 완료 |
| Phase 3 | Docker | proof bytes | MPC + 멀티체인 | 메인넷 |

---

---

## 6. NEAR AI Cloud 계정 설정 절차 (완료 기준)

Stage 7 IronClaw 실연동에 필요한 외부 계정 및 자격증명 설정 절차.

### 6-1. 계정 생성

- `cloud.near.ai` 접속 → Register 클릭
- 이메일/비밀번호 입력 후 이메일 인증 완료

### 6-2. 크레딧 충전

NEAR AI Cloud는 API 호출 시 토큰당 과금하는 **유료 종량제** 방식이다.
잔액이 $0.00이면 API 호출이 차단되므로 사전 충전이 필요하다.

- Dashboard → Credits → 결제 수단 등록 후 충전
- 해커톤 데모 수준(수십 회 호출): 소액으로 충분

### 6-3. API Key 발급

- Dashboard → Keys → `Create new key` 클릭
- Key Name: `mydna-dev` (식별용)
- Limit: 비워두면 잔액 한도 내 무제한

**발급 키 형식**: `sk-...`

### 6-4. .env.local 등록

```bash
IRONCLAW_BASE_URL=https://cloud-api.near.ai/v1
IRONCLAW_API_KEY=sk-발급받은_키_값
```

> 주의: `IRONCLAW_API_KEY`는 서버 사이드 전용 환경 변수다. `NEXT_PUBLIC_` 접두사 절대 사용 금지.

### 6-5. IronClaw Agent 인스턴스 생성 (선택)

IronClaw Agent 배포는 에이전트 런타임을 NEAR AI Cloud 인프라 위에서 실행하는 옵션이다.
단순 LLM API 호출만 필요한 경우 생략 가능하며, 우리 프로젝트는 **API 호출 방식**을 사용한다.

- Dashboard → Deploy → `Deploy Secure Agent` 클릭 (필요 시)
- Starter 티어: 에이전트 1개 무료 포함
- 생성 완료 후 Agent ID 메모 → 추후 `.env.local`의 `IRONCLAW_AGENT_ID`에 등록

### 6-6. cloud.near.ai vs IronClaw 관계 정리

| | cloud.near.ai | IronClaw |
|---|---|---|
| 정체 | NEAR AI 관리형 클라우드 서비스 | NEAR AI 오픈소스 TEE 에이전트 런타임 |
| 역할 | LLM 모델 추론 API 제공 (OpenAI 호환) | 에이전트를 TEE 안에서 실행하는 Rust 런타임 |
| 크레딧 소비 | API 호출 시 토큰당 과금 | 자체 호스팅 — 별도 과금 없음 |
| 우리 프로젝트 사용 | `ironclaw-tee.ts`에서 직접 호출 | cloud.near.ai 인프라 위에서 동작 |

**크레딧 소비 흐름**:
```
MyDNA 앱 → ironclaw-tee.ts → cloud.near.ai API 호출 (토큰 소비)
                               → TEE 안에서 LLM 유전자 분석
                               → riskProfile 반환
```

### 6-7. 완료 체크리스트

- [x] cloud.near.ai 계정 생성
- [x] 크레딧 충전
- [x] API Key 발급 (`mydna-dev`)
- [x] `.env.local`에 `IRONCLAW_BASE_URL`, `IRONCLAW_API_KEY` 등록
- [x] IronClaw Agent 인스턴스 생성 (필요 시)
- [x] `IRONCLAW_AGENT_ID` `.env.local` 등록 (Agent 생성 시)

---

## 관련 문서

- [기술 아키텍처 명세](./NEAR_PRIVACY_STACK_ARCH.md)
- [프로젝트 세팅 가이드](./PROJECT_SETUP_GUIDE.md)
- [구현 로드맵](../04_Logic_Progress/ROADMAP.md)
