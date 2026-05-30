# [QA] 한화생명 추천 Snapshot Seed 검증
> Created: 2026-05-31 01:09
> Last Updated: 2026-05-31 01:37

- **레이어**: 05_QA_Validation
- **상태**: DB apply completed separately
- **범위**: 한화생명 e암보험 표준체형/비흡연체형 source 승인, 공식 carrier quote row 8건 seed 반영, `insurance_products` snapshot row 2건 추가
- **결론**: 한화생명 공식 carrier quote 근거가 확보된 2개 source를 추천 snapshot 후보로 승격하도록 `seed.ts`를 갱신했다. 이번 PR은 seed/data/docs 변경이며 운영 DB write는 하지 않는다.

---

## 1. 변경 요약

| 항목 | 변경 |
|---|---:|
| source 승인 update | 2 |
| 신규 carrier quote row | 8 |
| 신규 carrier quote 승인 | 8 |
| 기존 보험다모아 0원 quote reject | 8 |
| 신규 `insurance_products` snapshot row | 2 |
| 대표 보험료 조건 | `age34_female` |
| USDC 환산 기준 | 고정 데모 환산율 `1 USDC = 1,350 KRW` |
| DB write | 0 |

이번 seed 변경은 기존 KDB/교보 snapshot 패턴을 따른다. 차이는 한화생명 가격 근거가 보험다모아가 아니라 한화생명 공식 계산 API이므로, `quote_source_type=carrier_quote` row 8건을 seed가 직접 추가한다는 점이다.

---

## 2. Snapshot 대상

| Provider | Source | Product row | 대표 KRW | 데모 USDC | 대표 문서 |
|---|---|---|---:|---:|---|
| 한화생명 | `src_hanwha_life_e_cancer_202604` | `prod_hanwha_life_e_cancer_202604` | 10,950 | 8.11 | `doc_hanwha_life_e_cancer_terms_202604` |
| 한화생명 | `src_hanwha_life_e_cancer_nonsmoker_202604` | `prod_hanwha_life_e_cancer_nonsmoker_202604` | 10,850 | 8.04 | `doc_hanwha_life_e_cancer_nonsmoker_terms_202604` |

대표 보험료는 한화생명 공식 계산 API 기준 `age34_female` 조건이다. 조건별 보험료 matrix는 34세/44세 남성/여성 8건을 모두 `approved`로 넣는다.

---

## 3. Quote 기준

| 항목 | 값 |
|---|---|
| 공식 상품 페이지 | `https://direct.hanwhalife.com/products/CMS00012?utm_source=einsmarket_mo&utm_medium=association&utm_campaign=cancer` |
| 계산 API | `https://api.hanwhalife.com/product/calculate/v3/default` |
| carrier product code | `CMS00012` |
| product version | `55` |
| product reference date | `20260529` |
| 조회 기준 | 100세 만기, 20년납, 월납, 주계약가입금액 1,000만원 |
| quote source type | `carrier_quote` |

---

## 4. 승인 Quote Row

| Source | 조건 | 체형 | 보험료 |
|---|---|---|---:|
| `src_hanwha_life_e_cancer_202604` | 34세 남성 | 표준체형 | 14,840원 |
| `src_hanwha_life_e_cancer_202604` | 34세 여성 | 표준체형 | 10,950원 |
| `src_hanwha_life_e_cancer_202604` | 44세 남성 | 표준체형 | 18,680원 |
| `src_hanwha_life_e_cancer_202604` | 44세 여성 | 표준체형 | 12,170원 |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 34세 남성 | 비흡연체형 | 13,460원 |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 34세 여성 | 비흡연체형 | 10,850원 |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 44세 남성 | 비흡연체형 | 16,820원 |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 44세 여성 | 비흡연체형 | 12,060원 |

기존 보험다모아 `0원` row 8건은 `rejected`로 내린다. 따라서 추천 UI는 공식 carrier quote만 `approved` matrix로 사용한다.

---

## 5. 매칭 필드

두 상품 모두 암보험이므로 동일한 결정론적 매칭 값을 사용한다.

| 필드 | 값 |
|---|---|
| `coverage_category` | `oncology` |
| `matching_strategy` | `risk_target` |
| `risk_targets` | `pancreatic_cancer`, `liver_cancer`, `lung_cancer`, `breast_cancer`, `colon_cancer` |
| `catalog_status` | `approved` |
| `is_active` | `1` |

갑상선암, 전립선암, 기타피부암, 대장점막내암 등은 현재 DNA risk key로 직접 매칭하지 않고 caveat에 보존한다.

---

## 6. 적용 전제

1. 운영 DB 백업을 먼저 수행한다.
2. `insurance_product_sources`에 한화생명 표준체형/비흡연체형 source가 존재해야 한다.
3. `insurance_source_documents`에 한화생명 표준체형/비흡연체형 문서 4건이 존재해야 한다.
4. `.env.local`이 의도한 Turso DB를 가리키는지 확인한 뒤 `npx tsx src/lib/db/seed.ts`를 실행한다.
5. 적용 후 다음 값을 검증한다.

| 검증 항목 | 기대값 |
|---|---:|
| source-backed active product row | 5 |
| `insurance_product_sources.review_status=approved` | 5 |
| `insurance_premium_quotes.review_status=approved` | 20 |
| 한화생명 carrier quote row | 8 |
| 한화생명 0원 quote `rejected` target ID | 8 |

---

DB 적용 결과, seed target ID는 8개였지만 운영 DB에 실제 존재하던 기존 `0원` quote row는 4개였다. 나머지 4개 target ID는 이전 quote row 적용 단계에서 semantic duplicate skip으로 DB에 없었으므로 no-op이다. 적용 검증은 `./44_HANWHA_RECOMMENDATION_SNAPSHOT_DB_APPLY_2026_05_31.md`에 둔다.

## 7. 범위 밖

| 항목 | 이유 |
|---|---|
| 운영 DB 적용 | 백업 후 별도 apply PR로 분리 |
| 신한라이프 일반형 source | 공식 문서 endpoint 미확보 상태라 계속 차단 |
| 나머지 raw/needs_review source | 문서 hash, 매칭 키워드, caveat 정리가 아직 필요 |
| checkout 금액 개인화 | 현재 checkout 합계는 snapshot 대표가 기준을 유지 |

---

## 8. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 공식 carrier quote가 확보된 한화생명 실제 암보험 2개를 추천 후보로 승격한다 |
| Potential Impact | 운영 추천 상품 수를 3개에서 5개로 늘릴 준비가 됐다 |
| Novelty | 보험다모아 `0원` 가격 실패를 보험사 공식 계산 API로 대체하는 패턴을 seed에 반영한다 |
| UX | 0원 가격 대신 공식 계산 API 기준 숫자 보험료를 보여줄 수 있다 |
| Open-source | carrier quote fallback 상품을 추천 snapshot으로 발행하는 절차를 문서화한다 |
| Business Plan | 테스트 사용자가 더 많은 실제 상품 추천을 체험할 수 있게 된다 |

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - carrier quote fallback 단계
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 남은 구현 순서 7번 seed 준비 기록
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - quote source와 승인 정책
- **QA_Validation**: [Hanwha Life Zero Quote Blocker Probe](./42_HANWHA_LIFE_ZERO_QUOTE_BLOCKER_PROBE_2026_05_31.md) - 공식 carrier quote 8건 확보 근거
- **QA_Validation**: [First Recommendation Snapshot Seed](./31_FIRST_RECOMMENDATION_SNAPSHOT_SEED_2026_05_30.md) - KDB/교보 첫 snapshot seed 패턴
- **Data**: [Hanwha Recommendation Snapshot Seed JSON](../../data/insurance/latest_hanwha_life_recommendation_snapshot_seed.json) - seed 적용 대상 요약
