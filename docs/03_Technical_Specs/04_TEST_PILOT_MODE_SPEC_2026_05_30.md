# [기술 명세] Test Pilot Mode: 무로그인·무결제 서비스 테스트 플로우
> Created: 2026-05-30 17:18
> Last Updated: 2026-05-30 18:50

- **레이어**: 03_Technical_Specs
- **상태**: Draft v1.2
- **범위**: 테스트 기간 동안 회원가입·로그인·지갑 연결·실결제 없이 업로드부터 추천 완료까지 진행하는 별도 플로우
- **결론**: 테스트 기간에는 `Test Pilot Mode`를 feature flag로 켜고, 임시 guest identity와 no-payment checkout을 사용한다. 운영 결제·지갑 플로우는 삭제하지 않고, 테스트 모드의 모든 데이터와 화면은 실제 보험 가입/결제가 아님을 명확히 표시한다.

---

## 1. 배경

현재 서비스 플로우는 NEAR 지갑 연결을 사용자 식별자와 결제 수단으로 사용한다. 이는 프라이버시·온체인 결제 데모에는 적합하지만, 일반 테스트 사용자에게는 진입 장벽이 된다.

테스트 기간의 목적은 사용자가 다음 흐름을 끝까지 경험하게 하는 것이다.

```text
서비스 진입
  -> 유전자 검사 결과 업로드
  -> TEE 분석
  -> 보험 추천 확인
  -> 상품 선택
  -> 테스트 신청 완료
```

따라서 테스트 기간에는 아래 두 장벽을 제거한다.

| 장벽 | 현재 상태 | 테스트 기간 목표 |
|---|---|---|
| 사인업/로그인/지갑 연결 | NEAR wallet address 필요 | 클릭 없이 guest session 생성 |
| 결제 | NEAR/ETH 결제 서명 필요 | 결제 없이 테스트 신청 완료 |

---

## 2. 비목표

Test Pilot Mode는 실제 판매·계약 플로우가 아니다.

- 보험료를 실제로 청구하지 않는다.
- NEAR, ETH, USDC 등 어떤 자산도 이동하지 않는다.
- 보험사 또는 GA로 가입 정보를 전송하지 않는다.
- 실제 보험 계약, 청약, 고지, 심사, 보장 개시를 의미하지 않는다.
- 유전자 원본 저장 금지 원칙은 완화하지 않는다.

---

## 3. Feature Flag

테스트 모드는 명시적 환경변수로만 활성화한다.

| 변수 | 값 | 의미 |
|---|---|---|
| `TEST_PILOT_ENABLED` | `true`/`false` | 서버 액션에서 테스트 모드 허용 |
| `NEXT_PUBLIC_TEST_PILOT_ENABLED` | `true`/`false` | 클라이언트 UI에서 테스트 모드 CTA 표시 |
| `TEST_PILOT_SKIP_WALLET` | `true`/`false` | 지갑 연결 없이 guest identity 발급 |
| `TEST_PILOT_SKIP_PAYMENT` | `true`/`false` | 실제 결제 없이 checkout 완료 |

권장 기본값:

| 환경 | 기본값 |
|---|---|
| local | `true` 허용 |
| preview | `true` 허용 가능 |
| production closed beta | 명시 승인 시 `true` |
| production GA | `false` |

운영 production에서 켤 경우 화면 상단과 checkout 완료 화면에 `테스트 모드` 배지를 항상 표시한다.

---

## 4. Guest Identity 정책

현재 DB의 `analysis_sessions`, `analysis_results`, `recommendation_carts`, `transactions`는 `wallet_address`를 기준으로 연결된다. 따라서 테스트 모드도 DB 모델을 무너뜨리지 않기 위해 지갑 주소 형식과 호환되는 guest identity를 사용한다.

권장 형식:

```text
guest-<12-char-random>.testnet
```

예:

```text
guest-a1b2c3d4e5f6.testnet
```

이 형식은 현재 `analysisSessionInsertSchema`의 wallet regex와 호환된다.

```typescript
/^[a-z0-9_\-\.]+\.(near|testnet)$|^[a-f0-9]{64}$/
```

### 4-1. 생성 시점

| 단계 | 동작 |
|---|---|
| 사용자가 `테스트로 시작` 클릭 | 브라우저 sessionStorage에 guest identity 생성 |
| 업로드 시작 | `upsertUserProfile(guestId)` 실행 후 `createSession(guestId, fileHash, fileType)` 호출 |
| 같은 브라우저 탭에서 재시도 | 같은 guest identity 재사용 |
| 브라우저 세션 종료 | guest identity 폐기 가능 |

### 4-2. 저장 금지

guest identity에는 이메일, 이름, 전화번호, IP 주소, 브라우저 fingerprint를 포함하지 않는다.

---

## 5. 무로그인 분석 플로우

현재 `runAnalysis`는 NEAR 서명 검증을 요구한다.

테스트 모드에서는 별도 서버 액션을 추가하는 방식을 권장한다.

```text
runTestPilotAnalysis(sessionId, fileContent)
```

이 서버 액션은 다음 조건을 모두 만족할 때만 실행된다.

| 조건 | 설명 |
|---|---|
| `TEST_PILOT_ENABLED=true` | 서버 feature flag |
| session wallet이 `guest-*.testnet` | 일반 wallet session과 분리 |
| session status가 `uploading` 또는 `pending` | 재실행/중복 방지 |
| fileContent가 브라우저 sessionStorage에서 전달 | DB 저장 금지 |

### 5-1. 유지해야 할 보안 원칙

- 유전자 원본은 DB에 저장하지 않는다.
- 분석 완료 후 기존처럼 `completed -> purged`로 전환한다.
- `analysis_results`에는 risk level, flags, 추천 상품 ID만 저장한다.
- 테스트 모드라도 TEE 분석과 source-backed 상품 매칭은 실제 경로를 사용한다.
- NEAR 서명 검증만 생략한다.

---

## 6. No-Payment Checkout 정책

테스트 기간의 checkout CTA는 실제 결제 버튼이 아니다.

| 현재 문구 | 테스트 모드 문구 |
|---|---|
| 결제하기 | 테스트 신청 완료 |
| NEAR로 결제하기 | 결제 없이 완료 |
| 결제 확인 | 테스트 신청 확인 |
| 결제가 완료되었습니다 | 테스트 신청이 완료되었습니다 |

### 6-1. 상태 처리 선택지

구현 시 두 가지 방식 중 하나를 선택한다.

| 방식 | 장점 | 단점 | 권장 |
|---|---|---|---|
| A. `transactions`에 test row 기록 | 기존 성공 화면 재사용 쉬움 | 실제 결제 row와 혼동 위험 | 비권장 |
| B. 별도 `test_pilot_checkouts` 테이블 사용 | 실결제와 명확히 분리 | schema/migration 필요 | 권장 |

권장 schema:

```text
test_pilot_checkouts
  id TEXT PK
  cart_id TEXT FK -> recommendation_carts.id
  wallet_address TEXT FK -> user_profiles.wallet_address
  selected_product_ids TEXT
  total_monthly_usdc REAL
  status TEXT ('completed')
  disclaimer_accepted INTEGER
  created_at INTEGER
```

`recommendation_carts.status`는 기존 최종 상태인 `checked_out`으로 전환할 수 있다. 단, 실제 결제와 구분하기 위해 checkout 결과 화면과 DB 기록은 `test_pilot_checkouts`를 기준으로 표시한다.

---

## 7. UI 분기

테스트 모드 UI는 “숨겨진 개발자 옵션”이 아니라 테스트 사용자에게 명확히 보이는 별도 플로우여야 한다.

### 7-1. 홈

| 위치 | 문구 |
|---|---|
| Primary CTA | 테스트로 시작 |
| Secondary CTA | 지갑 연결 후 시작 |
| 배지 | 테스트 모드: 가입·결제 없이 체험 |

### 7-2. 업로드

| 항목 | 정책 |
|---|---|
| 지갑 미연결 상태 | 업로드 허용 |
| 식별자 표시 | `guest-****.testnet` 또는 `테스트 세션` |
| 고지 | “유전자 원본은 저장하지 않으며 분석 후 폐기됩니다.” |

### 7-3. 추천 대시보드

| 항목 | 정책 |
|---|---|
| 추천 카드 | 실제 source-backed 상품만 표시 |
| 보험료 | 대표 보험료와 조건별 예상 보험료 분리 유지 |
| CTA | 테스트 신청하기 |
| 고지 | “실제 보험 가입 또는 청약이 아닙니다.” |

### 7-4. Checkout

| 항목 | 정책 |
|---|---|
| 결제 네트워크 선택 | 숨김 또는 disabled |
| Confidential Intent panel | “운영 전환 시 사용될 결제 구조”로 preview 표시 가능 |
| 완료 버튼 | 결제 없이 테스트 신청 완료 |
| 성공 화면 | 트랜잭션 해시 대신 테스트 신청 ID 표시 |

---

## 8. 데이터 안전 및 법무 고지

모든 테스트 모드 화면에는 아래 의미가 전달되어야 한다.

1. 이 테스트는 보험 가입, 청약, 계약 체결이 아니다.
2. 표시 보험료는 공식 비교 조건 기준 예상 보험료이며 실제 가입 보험료와 다를 수 있다.
3. 테스트 신청은 보험사로 전송되지 않는다.
4. 유전자 원본은 DB에 저장하지 않는다.
5. 테스트 데이터는 운영 정책에 따라 삭제될 수 있다.

---

## 9. 구현 순서

| 순서 | 작업 | PR 성격 |
|---:|---|---|
| 1 | Test Pilot Mode 정책 문서화 | 현재 PR |
| 2 | `guest-*.testnet` identity 생성 및 user profile upsert | 구현 완료 |
| 3 | 지갑 없이 upload/session 생성 가능하도록 UI 분기 | 구현 완료 |
| 4 | `runTestPilotAnalysis` 또는 인증 우회 서버 액션 구현 | 구현 완료 |
| 5 | `test_pilot_checkouts` schema/migration 설계 | 구현 완료: `drizzle/0007_silky_magma.sql`, 운영 DB 적용 완료 |
| 6 | no-payment checkout 완료 화면 구현 | 구현 완료: test 전용 서버 액션과 완료 화면 |
| 7 | 테스트 모드 E2E 작성: 업로드 -> 분석 -> 추천 -> 신청 완료 | QA PR |

---

## 10. 365 Rubric 영향

| Rubric | 영향 |
|---|---|
| Functionality | 테스트 사용자가 지갑과 결제 없이 전체 플로우를 완료할 수 있다 |
| Potential Impact | 일반 사용자의 초기 체험 장벽을 낮춰 테스트 참여율을 높인다 |
| Novelty | 프라이버시 분석과 Web3 결제 구조를 유지하면서도 Web2형 테스트 진입로를 제공한다 |
| UX | “설치·가입·결제” 없이 제품 가치를 먼저 체험하게 한다 |
| Open-source | feature flag 기반 pilot/production 분리 패턴을 재사용할 수 있다 |
| Business Plan | 실제 결제 전환 전 사용자 반응, 상품 추천 품질, 보험료 이해도를 검증할 수 있다 |

---

## 11. Related Documents

- **UI_Screens**: [User Flow](../02_UI_Screens/USER_FLOW.md) - 테스트 기간용 무로그인·무결제 사용자 흐름
- **Technical_Specs**: [DB Schema](./DB_SCHEMA.md) - 현재 wallet/cart/transaction 상태 모델
- **Technical_Specs**: [Deployment Strategy](./DEPLOYMENT_STRATEGY.md) - 결제 플로우와 환경 분리 전략
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Test Pilot Mode 후속 구현 순서
- **QA_Validation**: [Test Pilot Mode QA Checklist](../05_QA_Validation/36_TEST_PILOT_MODE_QA_2026_05_30.md) - 테스트 모드 완료 조건과 검증 항목
- **QA_Validation**: [No-payment Checkout Implementation QA](../05_QA_Validation/37_TEST_PILOT_NO_PAYMENT_CHECKOUT_2026_05_30.md) - 서버 가드, DB 분리, UI 분기 검증 기록
- **QA_Validation**: [Test Pilot 0007 DB Apply](../05_QA_Validation/38_TEST_PILOT_0007_DB_APPLY_2026_05_30.md) - 운영 DB migration 적용 검증
