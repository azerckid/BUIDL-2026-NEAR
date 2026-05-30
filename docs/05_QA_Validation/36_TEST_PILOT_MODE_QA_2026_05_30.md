# [QA] Test Pilot Mode 무로그인·무결제 플로우 검증 체크리스트
> Created: 2026-05-30 17:18
> Last Updated: 2026-05-30 23:42

- **레이어**: 05_QA_Validation
- **상태**: Completed for Test Pilot happy-path E2E
- **범위**: 테스트 기간 동안 사인업·로그인·지갑 연결·실결제 없이 전체 플로우를 완료하는 기능의 DoD
- **결론**: Test Pilot Mode는 운영 DB 기준 happy-path E2E를 완료했다. 테스트 사용자는 지갑 연결과 실제 결제 없이 업로드, TEE 분석, source-backed 추천, no-payment checkout까지 완료할 수 있다. 실제 보험 가입/청약/결제가 아니며, 운영 결제 플로우와 데이터가 혼동되지 않아야 한다.

---

## 1. 검증 대상 플로우

```text
/ko
  -> 테스트로 시작
  -> 업로드
  -> TEE 분석
  -> 추천 카드 확인
  -> 상품 선택
  -> 결제 없이 테스트 신청 완료
  -> 테스트 신청 완료 화면
```

---

## 1-A. 구현 체크포인트

| 단계 | 구현 상태 | 검증 기준 |
|---|---|---|
| Guest identity + 지갑 없는 upload/session | 구현됨 | `guest-*.testnet` 생성, guest profile upsert, `analysis_sessions.wallet_address` 연결 |
| `runTestPilotAnalysis` | 구현됨 | guest session만 허용, 서버 feature flag guard, NEAR 서명 팝업 없이 운영 TEE 분석 공통 경로 실행 |
| No-payment checkout | 검증 완료 | `test_pilot_checkouts` row 1건 생성, cart `checked_out`, `transactions` 증가 없음 |
| E2E | 완료 | 업로드 -> 분석 -> 추천 -> 테스트 신청 완료 전체 플로우 |

---

## 2. Feature Flag 검증

| ID | 항목 | 기대 결과 | 상태 |
|---|---|---|---|
| F1 | `NEXT_PUBLIC_TEST_PILOT_ENABLED=false` | 홈에 `테스트로 시작` CTA가 보이지 않는다 | 대기 |
| F2 | `TEST_PILOT_ENABLED=false` | 서버 액션이 테스트 분석/checkout 요청을 거부한다 | 대기 |
| F3 | `TEST_PILOT_SKIP_WALLET=true` | 지갑 미연결 상태에서도 업로드 화면 진입 가능 | 통과 |
| F4 | `TEST_PILOT_SKIP_PAYMENT=true` | checkout에서 실제 지갑 서명 없이 완료 가능 | 통과 |
| F5 | production GA 환경 | 모든 테스트 플래그가 기본 false | 대기 |

---

## 3. 무로그인 검증

| ID | 항목 | 기대 결과 | 상태 |
|---|---|---|---|
| A1 | 지갑 미연결 상태에서 테스트 시작 | `guest-*.testnet` identity 생성 | 통과 |
| A2 | guest identity 형식 | `analysisSessionInsertSchema` regex 통과 | 통과 |
| A3 | user profile | guest identity로 `user_profiles` row 생성 또는 업데이트 | 통과 |
| A4 | session 생성 | `analysis_sessions.wallet_address`가 guest identity와 일치 | 통과 |
| A5 | PII 저장 금지 | 이메일, 이름, 전화번호, IP, fingerprint 저장 없음 | 코드 정책 유지, 추가 DB 샘플링 권장 |
| A6 | 테스트 세션 종료 | 새 브라우저 세션에서는 기존 guest identity를 강제 재사용하지 않음 | 대기 |

---

## 4. 분석 플로우 검증

| ID | 항목 | 기대 결과 | 상태 |
|---|---|---|---|
| B1 | 테스트 분석 시작 | NEAR 서명 팝업이 뜨지 않음 | 통과 |
| B2 | TEE 분석 | 운영 TEE 분석 경로 또는 명시된 테스트 분석 경로 사용 | 통과 |
| B3 | 원본 데이터 | 유전자 원본 DB 저장 없음 | 코드 정책 유지, 추가 DB 샘플링 권장 |
| B4 | session status | `uploading -> tee_processing -> zkp_generating -> completed -> purged` 또는 문서화된 테스트 전이 | 통과 |
| B5 | result 저장 | `analysis_results`에 risk profile과 추천 상품 ID 저장 | 통과 |
| B6 | stale demo ID 방지 | 새 분석 결과가 archived demo product ID를 추천하지 않음 | 통과 |

---

## 5. 추천 화면 검증

| ID | 항목 | 기대 결과 | 상태 |
|---|---|---|---|
| C1 | 추천 상품 | source-backed active product만 표시 | 통과 |
| C2 | 보험료 | 대표 보험료와 조건별 예상 보험료 분리 표시 | 통과 |
| C3 | quote 상태 | `approved` quote만 UI 노출 | 통과 |
| C4 | 테스트 고지 | "실제 보험 가입/청약이 아님" 문구 표시 | 통과 |
| C5 | CTA | `결제하기` 대신 `테스트 신청하기` 또는 동등 문구 표시 | 통과 |

---

## 6. No-Payment Checkout 검증

| ID | 항목 | 기대 결과 | 상태 |
|---|---|---|---|
| D1 | checkout 진입 | 지갑 서명 없이 checkout 화면 진입 | 통과 |
| D2 | 결제 네트워크 선택 | 숨김 또는 disabled | 통과 |
| D3 | 완료 버튼 | `결제 없이 테스트 신청 완료` 동작 | 통과 |
| D4 | 실제 결제 호출 | `prepareCheckout`의 실결제 transaction 생성 경로 미호출 또는 test 전용 경로 사용 | 통과 |
| D5 | DB 기록 | `test_pilot_checkouts` 또는 승인된 test 전용 기록에 저장 | 통과 |
| D6 | cart 상태 | selected cart가 종료 상태로 전환되어 중복 신청 방지 | 통과 |
| D7 | transaction 오염 방지 | 실제 결제 `transactions` row와 test completion row가 혼동되지 않음 | 통과 |
| D8 | 성공 화면 | txHash 대신 test checkout ID 표시 | 통과 |

---

## 7. 보안·법무 고지 검증

| ID | 항목 | 기대 결과 | 상태 |
|---|---|---|---|
| E1 | 테스트 배지 | 테스트 플로우 모든 주요 화면에 표시 | 통과 |
| E2 | 보험 계약 고지 | "실제 보험 가입/계약/청약이 아님" 표시 | 통과 |
| E3 | 보험료 고지 | "공식 비교 조건 기준 예상 보험료" 표시 | 통과 |
| E4 | 보험사 전송 | 테스트 신청 데이터가 보험사/GA로 전송되지 않음 | 코드 정책 유지 |
| E5 | 개인정보 | 테스트 완료 화면에 민감한 유전자 내용 표시 없음 | 통과 |

---

## 8. 회귀 검증

| ID | 항목 | 기대 결과 | 상태 |
|---|---|---|---|
| R1 | 운영 지갑 플로우 | 테스트 flag off 상태에서 기존 지갑 연결 플로우 유지 | 대기 |
| R2 | 운영 checkout | 테스트 flag off 상태에서 기존 NEAR/ETH checkout 유지 | 대기 |
| R3 | source-backed 추천 | 운영 추천 필터 유지 | 통과 |
| R4 | build | `npm run build` 통과 | 대기 |
| R5 | typecheck | `npx tsc --noEmit --incremental false` 통과 | 대기 |

---

## 9. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 테스트 사용자가 끝까지 완료 가능한 실제 플로우인지 확인 |
| Potential Impact | 테스트 참여율을 높여 서비스 검증 데이터를 확보 |
| Novelty | Web3 보험 결제 구조를 보존하면서 Web2형 체험 입구 제공 |
| UX | 가입, 지갑, 결제 장벽 제거로 첫 체험 마찰 감소 |
| Open-source | feature flag 기반 테스트 플로우 검증 체크리스트로 재사용 가능 |
| Business Plan | 실제 결제 전환 전 추천 품질과 사용자 반응을 검증 |

---

## 10. Related Documents

- **UI_Screens**: [User Flow](../02_UI_Screens/USER_FLOW.md) - 테스트 기간용 사용자 흐름
- **Technical_Specs**: [Test Pilot Mode Spec](../03_Technical_Specs/04_TEST_PILOT_MODE_SPEC_2026_05_30.md) - 기술 정책과 구현 순서
- **Technical_Specs**: [DB Schema](../03_Technical_Specs/DB_SCHEMA.md) - wallet/cart/transaction 현재 상태 모델
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 후속 구현 일정
- **QA_Validation**: [Premium Quote Matrix UI](./35_PREMIUM_QUOTE_MATRIX_UI_2026_05_30.md) - 직전 추천 카드 UI 검증
- **QA_Validation**: [Test Pilot 0007 DB Apply](./38_TEST_PILOT_0007_DB_APPLY_2026_05_30.md) - 운영 DB migration 적용 검증
- **QA_Validation**: [Test Pilot E2E](./39_TEST_PILOT_E2E_2026_05_30.md) - 업로드부터 no-payment checkout 완료까지 E2E 검증
