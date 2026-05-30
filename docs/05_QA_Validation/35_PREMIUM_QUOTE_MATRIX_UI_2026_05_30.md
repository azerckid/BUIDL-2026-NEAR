# [QA] 조건별 보험료 Matrix UI 분리 표시 검증
> Created: 2026-05-30 16:40
> Last Updated: 2026-05-31 00:17

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: source-backed 추천 카드에서 대표 보험료와 `insurance_premium_quotes.review_status=approved` 조건별 보험료 matrix를 분리 표시
- **결론**: 추천 카드의 상단 가격은 `insurance_products`의 대표 보험료 snapshot으로 유지하고, 승인된 조건별 quote row는 별도 "조건별 예상 보험료" 영역으로 표시한다. 2026-05-31 1차 개인화 구현으로 dashboard 나이/성별 선택값과 approved quote matrix를 연결했다. `needs_review` quote 72건은 UI에 노출하지 않는다.

---

## 1. 변경 대상

| 파일 | 변경 |
|---|---|
| `src/actions/getDashboardData.ts` | active source-backed 상품의 `product_source_id` 기준으로 approved quote row를 조회해 `DashboardProduct.approvedQuotes`에 연결 |
| `src/components/modules/InsuranceProductCard.tsx` | 대표 보험료와 조건별 예상 보험료를 별도 섹션으로 렌더링 |
| `src/app/layout.tsx` | root layout에 `<html>`/`<body>` 복구, 공통 provider와 로컬 폰트 import 배치 |
| `src/app/[locale]/layout.tsx` | locale layout은 `NextIntlClientProvider`만 담당하도록 정리 |
| `src/app/globals.css` | `--font-manrope` 미정의 시 Pretendard fallback 사용 |
| `package.json` | `npm run build`가 검증된 webpack build 경로를 사용하도록 `next build --webpack` 적용 |
| `messages/ko.json` | 한국어 UI 문구 추가 |
| `messages/en.json` | 영어 UI 문구 추가 |

---

## 2. 데이터 조회 정책

| 항목 | 정책 |
|---|---|
| 상품 조회 | `activeSourceBackedProductFilter()` 유지 |
| quote 조회 | `insurance_premium_quotes.product_source_id IN (...)`와 `review_status='approved'` 조건 |
| 정렬 | 나이 오름차순, 성별 남성/여성/source_unknown 순, ID 순 |
| 노출 개수 | 카드별 최대 4건 |
| 미승인 quote | `needs_review`, `raw`, `rejected`는 조회 결과에서 제외 |

현재 운영 DB 기준 approved quote는 첫 snapshot 대상 3개 source의 12건이다. 따라서 추천 카드 3개는 각각 34세/44세 남성/여성 조건 4건을 표시할 수 있다.

---

## 3. UI 표시 정책

| 구역 | 의미 | 데이터 |
|---|---|---|
| 대표 보험료 | 추천 snapshot 발행 때 승인한 대표 가격 | `insurance_products.monthly_premium_krw`, `monthly_premium_usdc` |
| USDC 환산 | checkout/demo 정산 경로 유지용 고정 환산값 | `insurance_products.monthly_premium_usdc` |
| 조건별 예상 보험료 | 보험다모아 공식 비교 조건별 승인 quote | `insurance_premium_quotes.monthly_premium_krw` |
| quote caveat | 실제 가입 보험료가 아니라 비교 조건 기준 예상 보험료임을 고지 | i18n 문구 |

대표 보험료와 조건별 예상 보험료를 같은 금액처럼 보이지 않도록 상단 가격 영역과 quote matrix 영역을 분리했다.

---

## 4. 검증 명령

```bash
npx tsc --noEmit --incremental false
npx eslint src/actions/getDashboardData.ts src/components/modules/InsuranceProductCard.tsx src/app/layout.tsx 'src/app/[locale]/layout.tsx' --quiet
node -e 'JSON.parse(require("fs").readFileSync("messages/ko.json","utf8")); JSON.parse(require("fs").readFileSync("messages/en.json","utf8")); console.log("messages ok")'
git diff --check
npm run build
```

현재 결과:

| 검증 | 결과 |
|---|---|
| TypeScript | PASS |
| ESLint 변경 코드 | PASS |
| i18n JSON parse | PASS |
| whitespace diff check | PASS |
| production build | PASS. `next build --webpack` |

---

## 5. 브라우저 확인

로컬 dev server는 `http://localhost:3001`에서 확인했다. 최초 확인 시 root layout이 `<html>`/`<body>`를 반환하지 않아 `/ko`와 `/ko/dashboard`가 404로 보였고, Next.js가 `Missing <html> and <body> tags in the root layout` 오류를 보고했다.

수정 후 `/ko`와 `/ko/dashboard`는 정상 로드된다. 다만 기존 만료 전 `analysis_results` row들은 `recommended_product_ids=["prod_001","prod_002","prod_003"]`처럼 legacy demo 상품 ID를 보존하고 있어, demo archive 이후 대시보드 step 3에서는 "매칭된 보험 상품이 없습니다"가 표시된다. 이는 기존 세션 데이터의 stale ID 문제이며, 새 분석 경로는 source-backed 상품을 반환한다.

읽기 전용 검증:

| 검사 | 결과 |
|---|---|
| active source-backed product | 3 |
| approved quote per source | 4, 4, 4 |
| oncology risk profile 기준 `matchProducts` 결과 | KDB 1건 + 교보라이프플래닛 2건 |

따라서 새 분석 결과가 생성되면 추천 카드 3개가 표시되고, 각 카드에는 approved quote 4건이 조건별 예상 보험료로 연결된다.

---

## 6. 남은 작업

1. 기존 analysis result가 legacy product ID를 들고 있을 때 사용자 안내 또는 재분석 유도 정책을 정한다.
2. 사용자 나이/성별 입력값과 quote matrix를 연결하는 1차 개인화 선택 로직은 `41_PREMIUM_QUOTE_PERSONALIZATION_2026_05_31.md`에서 검증했다.
3. 한화생명 0원 quote 재조회와 신한라이프 일반형 공식 문서 endpoint 탐색은 데이터 품질 트랙으로 이어간다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 승인된 조건별 보험료를 추천 카드에서 볼 수 있다 |
| Potential Impact | 사용자 조건 기반 비교로 확장할 수 있는 UI 기반이 생겼다 |
| Novelty | DNA risk 추천, 공식 상품 source, quote matrix를 한 카드에서 분리 표현한다 |
| UX | 대표 가격과 조건별 가격을 혼동하지 않도록 정보 구조를 나눴다 |
| Open-source | approved quote만 노출하는 안전한 UI 패턴을 문서화했다 |
| Business Plan | 실제 보험 비교/중개 서비스 전환에 필요한 조건별 가격 표시를 시작했다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준과 quote 승인 조건
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 대표 보험료와 조건별 quote matrix 분리 정책
- **QA_Validation**: [Premium Quote Personalization](./41_PREMIUM_QUOTE_PERSONALIZATION_2026_05_31.md) - 사용자 나이/성별 선택값과 approved quote 연결 검증
- **QA_Validation**: [Demo Products Archive DB Apply](./34_DEMO_PRODUCTS_ARCHIVE_DB_APPLY_2026_05_30.md) - source-backed active 상품만 남긴 운영 DB 상태
- **QA_Validation**: [First Recommendation Snapshot DB Apply](./32_FIRST_RECOMMENDATION_SNAPSHOT_DB_APPLY_2026_05_30.md) - 첫 source-backed 추천 snapshot과 approved quote 12건 적용 검증
