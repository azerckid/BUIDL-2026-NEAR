# [QA] Test Pilot Flag Off 회귀 검증
> Created: 2026-05-30 23:58
> Last Updated: 2026-05-30 23:58

- **레이어**: 05_QA_Validation
- **상태**: Completed for automated regression
- **범위**: Test Pilot feature flag를 모두 끈 상태에서 기존 운영 진입, 업로드 가드, checkout route, build/typecheck가 유지되는지 확인
- **결론**: Local flag off 환경에서 공개 E2E 21개가 통과했고, 홈 화면의 `테스트로 시작` CTA는 실제 visible button 기준 0개였다. 지갑 미연결 사용자는 기존처럼 지갑 연결 안내를 보고 `/upload` 접근 시 홈으로 돌아간다. 실제 NEAR/ETH 지갑 서명 결제는 브라우저 지갑과 testnet 잔액이 필요한 수동 검증 항목으로 계속 남긴다.

---

## 1. 실행 환경

| 항목 | 값 |
|---|---|
| 실행 시각 | 2026-05-30 23:58 KST |
| Git branch | `main` |
| Git 상태 | clean |
| Local URL | `http://127.0.0.1:3100` |
| Production flag | 테스트 기간 운영 배포에서는 Test Pilot flag가 켜져 있음 |
| Local regression flag | 모두 false |

검증에 사용한 flag:

```env
TEST_PILOT_ENABLED=false
NEXT_PUBLIC_TEST_PILOT_ENABLED=false
TEST_PILOT_SKIP_WALLET=false
TEST_PILOT_SKIP_PAYMENT=false
```

---

## 2. 실행 명령

```bash
CI=1 TEST_PILOT_ENABLED=false NEXT_PUBLIC_TEST_PILOT_ENABLED=false TEST_PILOT_SKIP_WALLET=false TEST_PILOT_SKIP_PAYMENT=false npx playwright test
TEST_PILOT_ENABLED=false NEXT_PUBLIC_TEST_PILOT_ENABLED=false TEST_PILOT_SKIP_WALLET=false TEST_PILOT_SKIP_PAYMENT=false npm run build
TEST_PILOT_ENABLED=false NEXT_PUBLIC_TEST_PILOT_ENABLED=false TEST_PILOT_SKIP_WALLET=false TEST_PILOT_SKIP_PAYMENT=false npx tsc --noEmit --incremental false
```

화면 CTA 확인은 flag off build 산출물을 `localhost:3100`에서 띄운 뒤 Playwright locator로 확인했다.

---

## 3. 결과

| 항목 | 결과 | 의미 |
|---|---|---|
| Playwright E2E | 21/21 통과 | 기존 공개 페이지, 업로드 가드, checkout invalid route가 유지됨 |
| Build | 통과 | flag off 환경에서도 production build 가능 |
| Typecheck | 통과 | `.next/types` 생성 후 `npx tsc --noEmit --incremental false` 통과 |
| 홈 Test Pilot CTA | visible button 0개 | `NEXT_PUBLIC_TEST_PILOT_ENABLED=false`일 때 테스트 시작 CTA 미노출 |
| 지갑 안내 | visible text 1개 | 기존 지갑 연결 안내 유지 |
| 업로드 input | 0개 | 지갑 미연결 상태에서 upload form 미노출 |

Typecheck를 build와 동시에 실행했을 때는 `.next/types` 생성 타이밍 때문에 missing file 오류가 났다. build 완료 후 같은 명령을 재실행해 통과했으므로 앱 타입 오류가 아니라 실행 순서 이슈로 판단한다.

---

## 4. 한계

| 항목 | 상태 | 이유 |
|---|---|---|
| 실제 NEAR checkout 서명 | 수동 잔여 | 브라우저 지갑 연결과 testnet 잔액 필요 |
| 실제 ETH Sepolia checkout | 수동 잔여 | 파생 ETH 주소 funding과 브라우저 지갑 플로우 필요 |
| Production flag off | 미수행 | 테스트 기간에는 Production에서 Test Pilot을 의도적으로 활성화 중 |

이번 검증은 flag off 자동 회귀다. 실제 온체인 서명 결제 회귀는 기존 ROADMAP의 수동 E2E 항목에서 이어서 관리한다.

---

## 5. 365 Rubric 영향

| Rubric | 영향 |
|---|---|
| Functionality | Test Pilot flag가 꺼져도 기존 지갑 중심 진입 가드와 checkout route가 유지됨 |
| Potential Impact | 테스트 기간 종료 후 GA 모드로 되돌릴 수 있는 운영 안전성 확보 |
| Novelty | Web3 결제 경로와 무결제 테스트 경로를 feature flag로 분리 |
| UX | 테스트 CTA가 flag off 상태에서 사라져 일반 사용자의 혼선을 줄임 |
| Open-source | flag on/off 검증을 독립 QA 문서로 분리해 재사용 가능 |
| Business Plan | 테스트 신청 funnel과 실제 결제 funnel을 운영 단계별로 분리 가능 |

---

## 6. Related Documents

- **Technical_Specs**: [Test Pilot Mode Spec](../03_Technical_Specs/04_TEST_PILOT_MODE_SPEC_2026_05_30.md) - feature flag와 no-payment checkout 정책
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Test Pilot 회귀 검증 이후 작업 순서
- **QA_Validation**: [Test Pilot Mode QA Checklist](./36_TEST_PILOT_MODE_QA_2026_05_30.md) - Test Pilot 전체 DoD 체크리스트
- **QA_Validation**: [Test Pilot E2E](./39_TEST_PILOT_E2E_2026_05_30.md) - flag on happy path E2E 검증
