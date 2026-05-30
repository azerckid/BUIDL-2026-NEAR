# [QA] 보험료 개인화 선택 로직 검증
> Created: 2026-05-31 00:17
> Last Updated: 2026-05-31 00:17

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: Dashboard 추천 카드에서 사용자 나이/성별 선택값과 `insurance_premium_quotes.review_status=approved` quote matrix를 연결
- **결론**: 사용자는 추천 화면에서 approved quote matrix에 존재하는 나이/성별 조건을 선택할 수 있고, 각 추천 카드에는 선택 조건과 정확히 일치하는 approved quote가 `내 조건 예상 보험료`로 강조 표시된다. 대표 보험료와 checkout 합계는 아직 snapshot 대표가를 유지한다.

---

## 1. 변경 대상

| 파일 | 변경 |
|---|---|
| `src/actions/getDashboardData.ts` | `DashboardQuoteCondition` 타입 추가 |
| `src/components/modules/DashboardClient.tsx` | approved quote row에서 가능한 나이/성별 조건을 추출하고 dashboard 선택 UI 추가 |
| `src/components/modules/InsuranceProductCard.tsx` | 선택 조건과 일치하는 quote row를 카드 상단의 조건별 quote 영역에서 강조 |
| `messages/ko.json` | 보험료 조건 선택과 내 조건 예상 보험료 문구 추가 |
| `messages/en.json` | 영어 문구 동기화 |
| `docs/04_Logic_Progress/ROADMAP.md` | 남은 구현 순서 3번 완료 상태 기록 |
| `docs/04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md` | quote matrix 개인화 정책 갱신 |
| `docs/05_QA_Validation/35_PREMIUM_QUOTE_MATRIX_UI_2026_05_30.md` | 기존 남은 작업 항목 갱신 |

---

## 2. 동작 정책

| 항목 | 정책 |
|---|---|
| 조건 추출 | 현재 추천 상품들의 `approvedQuotes`에서 `age`, `sex`가 존재하는 row만 사용 |
| 기본 선택 | 34세가 있으면 34세, 여성 조건이 있으면 여성으로 시작 |
| 노출 quote | `getDashboardData`에서 이미 `review_status='approved'`로 필터링된 quote만 사용 |
| 카드 강조 | 선택한 나이/성별과 정확히 일치하는 quote를 `내 조건 예상 보험료`로 표시 |
| 미일치 처리 | 선택 조건의 approved quote가 없는 상품은 미확보 안내 문구 표시 |
| checkout 금액 | 이번 PR에서는 변경하지 않음. 장바구니 합계는 기존 대표 `monthly_premium_usdc` 유지 |

현재 운영 DB 기준 첫 snapshot 상품 3개는 모두 34세/44세 남성/여성 approved quote를 가지고 있으므로, 기본 조건과 선택 조건 모두 카드별 quote를 표시할 수 있다.

---

## 3. 검증 명령

```bash
npx tsc --noEmit
npx eslint src/actions/getDashboardData.ts src/components/modules/DashboardClient.tsx src/components/modules/InsuranceProductCard.tsx --quiet
node -e 'JSON.parse(require("fs").readFileSync("messages/ko.json","utf8")); JSON.parse(require("fs").readFileSync("messages/en.json","utf8")); console.log("messages ok")'
git diff --check
npm run build
CI=1 npx playwright test
```

| 검증 | 결과 |
|---|---|
| TypeScript | PASS |
| ESLint 변경 코드 | PASS |
| i18n JSON parse | PASS |
| whitespace diff check | PASS |
| production build | PASS. `next build --webpack` |
| Playwright E2E | PASS. 21/21 |

---

## 4. 범위 밖

| 항목 | 이유 |
|---|---|
| DB schema 변경 | 이미 `insurance_premium_quotes`가 age/sex quote row를 담고 있음 |
| 사용자 profile age/sex 저장 | 테스트/추천 화면의 1차 선택 UI가 먼저 필요함 |
| checkout 금액 개인화 | 대표 보험료와 실제 결제 금액 정책을 함께 바꾸면 회귀 범위가 커짐 |
| 한화생명 0원 quote | 데이터 품질 blocker로 별도 트랙에서 해소 |
| 신한라이프 일반형 문서 | 공식 문서 endpoint 미확보 상태라 추천 후보 차단 유지 |

---

## 5. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 사용자가 자신의 나이/성별 조건에 맞는 approved quote를 확인할 수 있다 |
| Potential Impact | 실제 보험 비교 서비스에 필요한 개인 조건별 가격 비교 UX가 시작됐다 |
| Novelty | DNA risk 추천, 공식 source-backed 상품, 조건별 quote matrix를 한 흐름에서 연결한다 |
| UX | 대표 가격과 내 조건 예상 가격을 구분해 가격 오해를 줄인다 |
| Open-source | 승인 quote만 선택 UI에 연결하는 재사용 가능한 안전 패턴을 남긴다 |
| Business Plan | 테스트 사용자에게 실제 상품 비교 서비스의 구매 전 단계 가치를 보여준다 |

---

## 6. Related Documents

- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준과 approved quote 조건
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 대표 보험료와 조건별 quote matrix 관리 정책
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 2026-05-30 남은 구현 순서 3번 완료 기록
- **QA_Validation**: [Premium Quote Matrix UI](./35_PREMIUM_QUOTE_MATRIX_UI_2026_05_30.md) - 대표 보험료와 조건별 quote UI 분리 표시 검증
- **QA_Validation**: [First Recommendation Snapshot DB Apply](./32_FIRST_RECOMMENDATION_SNAPSHOT_DB_APPLY_2026_05_30.md) - active source-backed 추천 3건과 approved quote 12건 적용 검증
