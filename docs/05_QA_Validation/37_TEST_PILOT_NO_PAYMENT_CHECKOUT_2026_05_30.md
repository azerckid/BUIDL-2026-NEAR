# [QA] Test Pilot Mode No-Payment Checkout 구현 검증
> Created: 2026-05-30 18:20
> Last Updated: 2026-05-30 18:50

- **레이어**: 05_QA_Validation
- **상태**: Draft
- **범위**: `test_pilot_checkouts` schema/migration, no-payment checkout 서버 액션, Checkout UI 테스트 모드 분기
- **결론**: Test Pilot checkout은 실제 `transactions` row를 만들지 않고, `guest-*.testnet` cart만 별도 `test_pilot_checkouts` row로 완료 처리한다. 운영 DB에는 `drizzle/0007_silky_magma.sql` 적용까지 완료됐고, 남은 작업은 Test Pilot E2E다.

---

## 1. 변경 요약

| 영역 | 변경 |
|---|---|
| DB schema | `test_pilot_checkouts` table 추가 |
| Migration | `drizzle/0007_silky_magma.sql` 생성 |
| Server action | `completeTestPilotCheckout` 추가 |
| Checkout UI | guest session이면 네트워크 선택과 결제 패널을 숨기고 no-payment 완료 경로 사용 |
| i18n | checkout test pilot 문구 ko/en 동기화 |

---

## 2. 서버 가드

| 가드 | 기대 동작 | 상태 |
|---|---|---|
| `TEST_PILOT_ENABLED=true` | 테스트 모드가 꺼져 있으면 서버 액션 거부 | 구현 |
| `TEST_PILOT_SKIP_PAYMENT=true` | 결제 우회 flag가 꺼져 있으면 서버 액션 거부 | 구현 |
| cart wallet 검증 | 요청 wallet과 DB cart wallet이 다르면 거부 | 구현 |
| guest identity 검증 | `guest-*.testnet` cart가 아니면 거부 | 구현 |
| cart status 검증 | `active` cart만 완료 허용 | 구현 |

---

## 3. DB 분리 검증

| 항목 | 기대 동작 | 상태 |
|---|---|---|
| test row 저장 | `test_pilot_checkouts`에 1 cart당 1 row 저장 | DB 적용 완료, E2E 필요 |
| cart 종료 | 성공 시 `recommendation_carts.status=checked_out` | DB 적용 완료, E2E 필요 |
| 실결제 오염 방지 | no-payment 경로에서 `transactions` insert 없음 | 코드 검토 완료, DB E2E 필요 |
| 중복 방지 | `test_pilot_checkouts.cart_id` unique index로 동일 cart 중복 완료 차단 | migration 생성 완료 |

---

## 4. UI 검증

| 항목 | 기대 동작 | 상태 |
|---|---|---|
| 테스트 배지 | checkout 화면과 완료 화면에서 테스트 모드임을 표시 | 구현 |
| 결제 네트워크 선택 | test pilot cart에서는 NEAR/ETH 선택 UI를 숨김 | 구현 |
| 결제 패널 | Confidential Intent 결제 preview 대신 no-payment 안내 표시 | 구현 |
| 완료 버튼 | `결제 없이 테스트 신청 완료` 문구 표시 | 구현 |
| 완료 화면 | tx hash/explorer link 대신 Test Checkout ID 표시 | 구현 |
| 법무 고지 | 실제 보험 가입, 청약, 결제가 아님을 표시 | 구현 |

---

## 5. 남은 검증

1. `TEST_PILOT_ENABLED=true`, `NEXT_PUBLIC_TEST_PILOT_ENABLED=true`, `TEST_PILOT_SKIP_WALLET=true`, `TEST_PILOT_SKIP_PAYMENT=true` 환경에서 업로드 -> 분석 -> 추천 -> no-payment checkout E2E 수행.
2. E2E 후 `test_pilot_checkouts` row 생성, `recommendation_carts.status=checked_out`, `transactions` row 미생성을 확인.
3. flag off 상태에서 기존 NEAR/ETH checkout UI와 서버 액션이 유지되는지 회귀 검증.

---

## 6. 365 Rubric 영향

| Rubric | 영향 |
|---|---|
| Functionality | 테스트 사용자가 지갑과 결제 없이 전체 플로우를 완료할 수 있다 |
| Potential Impact | 테스트 참여 장벽을 낮춰 실제 사용자 피드백 수집 가능성을 높인다 |
| Novelty | 프라이버시 분석과 Web3 결제 구조를 유지하면서 Web2형 체험 모드를 제공한다 |
| UX | 결제 네트워크 선택과 지갑 서명 단계를 제거해 초기 체험 마찰을 낮춘다 |
| Open-source | feature flag 기반 test/production checkout 분리 패턴을 문서화한다 |
| Business Plan | 실제 결제 전환 전 추천 품질과 보험료 이해도를 검증할 수 있다 |

---

## 7. Related Documents

- **Technical_Specs**: [Test Pilot Mode Spec](../03_Technical_Specs/04_TEST_PILOT_MODE_SPEC_2026_05_30.md) - 무로그인·무결제 테스트 플로우 정책
- **Technical_Specs**: [DB Schema](../03_Technical_Specs/DB_SCHEMA.md) - `test_pilot_checkouts` schema와 migration 상태
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Test Pilot Mode 진행 위치와 다음 작업
- **QA_Validation**: [Test Pilot Mode QA Checklist](./36_TEST_PILOT_MODE_QA_2026_05_30.md) - 전체 Test Pilot Mode DoD
- **QA_Validation**: [Test Pilot 0007 DB Apply](./38_TEST_PILOT_0007_DB_APPLY_2026_05_30.md) - 운영 DB migration 적용 검증
