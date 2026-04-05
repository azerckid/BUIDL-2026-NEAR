# [기술 명세] 배포 전략 및 Phase 2 전환 계획

- **작성일**: 2026-04-05
- **최종 수정일**: 2026-04-05
- **레이어**: 03_Technical_Specs
- **상태**: Draft v1.0

---

## 1. 배포 플랫폼 전환 결정 (Vercel → Docker)

### 1-1. 전환 배경

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
| Noir ZKP proof bytes 실생성 | nargo CLI 불가, WASM 50MB 초과 | Docker + nargo 설치 | Docker 배포 전환 |
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

## 4. 선행 확인 항목 (Stage 7 착수 전 필수)

Stage 7 코드 작업 전에 아래 두 가지를 반드시 확인해야 한다. 이 항목이 불확실한 상태에서 구현을 진행하면 다시 막히게 된다.

### 4-1. `@nearai/client` 패키지 문제

Stage 1에서 npm 미등록으로 확인된 패키지. IronClaw 실연동(Stage 7-2)에 필요하다.

**확인 및 해결 방법 (택1)**:

| 방법 | 설명 |
|------|------|
| A. REST API 직접 호출 | `@nearai/client` 없이 `near-api-js` + `fetch`로 NEAR AI API 직접 호출 |
| B. git 의존성 설치 | `"@nearai/client": "github:near/nearai"` 형식으로 package.json 지정 |
| C. NEAR AI 팀 문의 | npm 공개 패키지 또는 대체 SDK 제공 요청 |

**권장**: A안(REST 직접 호출) — 외부 의존성 최소화, Docker 이미지 크기 감소.

### 4-2. Confidential Intents 엔드포인트 가용성

NEAR Private Shards testnet이 실제로 외부 접근 가능한 상태인지 확인이 필요하다.

**확인 방법**:
- NEAR 공식 문서 / Discord에서 Private Shards testnet 엔드포인트 URL 확인
- 접근 권한(API 키, 화이트리스트) 필요 여부 확인
- 가용하지 않을 경우: Confidential Intents 항목은 Phase 2 이후로 이전

---

## 5. Phase별 구현 완성도 목표

| Phase | 배포 환경 | ZKP | Chain Signatures | Confidential Intents |
|-------|----------|-----|-----------------|---------------------|
| Phase 0 (현재) | Vercel | proof hash (더미) | Mock 2초 지연 | Mock |
| Phase 2 (Stage 7) | Docker (GCP/AWS) | proof bytes (nargo) | v1.signer MPC 실연동 | 가용성 확인 후 결정 |
| Phase 3 | Docker | proof bytes | MPC + 멀티체인 | 메인넷 |

---

## 관련 문서

- [기술 아키텍처 명세](./NEAR_PRIVACY_STACK_ARCH.md)
- [프로젝트 세팅 가이드](./PROJECT_SETUP_GUIDE.md)
- [구현 로드맵](../04_Logic_Progress/ROADMAP.md)
