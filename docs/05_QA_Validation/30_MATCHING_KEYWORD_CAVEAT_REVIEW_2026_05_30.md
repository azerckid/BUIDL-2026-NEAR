# [QA] KDB/한화/교보 매칭 키워드와 Caveat 검수
> Created: 2026-05-30 14:41
> Last Updated: 2026-05-30 14:41

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 공식 문서 variant가 확인된 KDB생명, 한화생명, 교보라이프플래닛 암보험 후보의 `coverage_category`, `risk_targets`, `matching_strategy`, caveat, quote 상태 검수
- **결론**: 5개 source 모두 암보험 매칭 키워드는 `coverage_category=oncology`, `matching_strategy=risk_target`, `risk_targets=[pancreatic_cancer,liver_cancer,lung_cancer,breast_cancer,colon_cancer]`로 정리할 수 있다. 다만 한화생명 2개 source는 quote row가 모두 `0원`이라 첫 active 추천 snapshot에서는 제외한다. KDB생명 1개, 교보라이프플래닛 2개가 다음 추천 snapshot seed PR의 우선 후보이다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 입력 seed | `src/lib/db/seed.ts` |
| 입력 quote probe | `data/insurance/latest_premium_quote_probe.json` |
| 입력 variant review | `data/insurance/latest_quote_only_source_document_variant_review.json` |
| 입력 KDB/Shinhan review | `data/insurance/latest_kdb_shinhan_variant_resolution.json` |
| 신규 검수 JSON | `data/insurance/latest_matching_keyword_caveat_review.json` |
| 신규 검수 CSV | `data/insurance/latest_matching_keyword_caveat_review.csv` |
| PDF 텍스트 추출 | 한화생명 약관, KDB 약관/요약서, 교보라이프플래닛 약관/요약서 |
| DB write | 0 |
| `seed.ts` 변경 | 0 |
| 추천 snapshot 변경 | 0 |

---

## 2. 요약

| 항목 | 결과 |
|---|---:|
| 검수 source | 5 |
| 매칭 키워드 정리 가능 source | 5 |
| 첫 snapshot 우선 후보 | 3 |
| 보험료 blocker source | 2 |
| quote row 확인 | 20 |
| 숫자 KRW quote row | 12 |
| 0원 quote row | 8 |
| 이번 PR 추천 노출 변경 | 0 |

---

## 3. 공통 매칭 정책

이번 검수 대상은 모두 암보험이다. 현재 DNA risk key 사전과 DB schema가 지원하는 암 관련 key는 아래 5개다.

```text
pancreatic_cancer
liver_cancer
lung_cancer
breast_cancer
colon_cancer
```

따라서 5개 source의 추천 매칭 후보는 공통으로 다음 값을 사용한다.

| 필드 | 값 |
|---|---|
| `coverage_category` | `oncology` |
| `matching_strategy` | `risk_target` |
| `risk_targets` | `pancreatic_cancer`, `liver_cancer`, `lung_cancer`, `breast_cancer`, `colon_cancer` |

약관에는 갑상선암, 전립선암, 기타피부암, 제자리암, 경계성종양, 대장점막내암도 등장하지만 현재 DNA risk key로 직접 매칭하지 않는다. 이 항목들은 `risk_targets`가 아니라 `coverage_caveats_json`에 급부 차이로 표시한다.

---

## 4. Source별 판정

| Provider | Source | Product code | 판정 | 이유 |
|---|---|---|---|---|
| 한화생명 | `src_hanwha_life_e_cancer_202604` | `L01C009000009` | 매칭 가능, 가격 차단 | 암보험 매칭 필드는 정리 가능하지만 quote row가 전부 `0원`이다 |
| 한화생명 | `src_hanwha_life_e_cancer_nonsmoker_202604` | `L01C009000010` | 매칭 가능, 가격 차단 | 비흡연체 caveat까지 정리 가능하지만 quote row가 전부 `0원`이다 |
| KDB생명 | `src_kdb_life_direct_cancer_202605` | `L33C009000025` | 첫 snapshot 후보 | 숫자 quote 4건과 KDB no-refund III 공식 문서가 있다 |
| 교보라이프플래닛 | `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | `L43C009000022` | 첫 snapshot 후보 | 숫자 quote 4건, 비흡연체 caveat, 공식 문서 hash가 있다 |
| 교보라이프플래닛 | `src_kyobo_lifeplanet_cancer_standard_202605` | `L43C009000019` | 첫 snapshot 후보 | 숫자 quote 4건, 표준체 variant, 공식 문서 hash가 있다 |

---

## 5. Caveat 정리

### 5-1. 한화생명 e암보험

한화생명 표준체형과 비흡연체형은 같은 공식 약관/상품요약서 hash를 공유한다. 공통 caveat는 다음과 같다.

| Caveat | 추천 UI 반영 |
|---|---|
| 90일 보장 제외 | 암 관련 주요 급부가 가입 후 90일 동안 보장 제외될 수 있음을 표시 |
| 감액지급 | 계약 초기에는 급부별 보험금이 일부만 지급될 수 있음을 표시 |
| 급부 분리 | 직결장암, 유방암, 여성생식기암, 전립선암, 기타피부암, 갑상선암, 대장점막내암 등은 일반암과 급부가 다름 |
| 해약환급금 미지급형 | 보험료 납입기간 중 해지 시 해약환급금이 없을 수 있음 |
| 보험료 blocker | 보험다모아 quote row가 `0원`이므로 active 추천 카드의 가격으로 표시하지 않음 |

비흡연체형은 추가 caveat가 필요하다.

| Caveat | 추천 UI 반영 |
|---|---|
| 비흡연체 가입 조건 | 만 19세 이상, 표준체형 가입 가능 상태, 최근 1년 비흡연 등 조건 표시 |
| 흡연 상태 변경 | 보험기간 중 30일 이상 흡연 시 표준체형 보험료 적용, 정산차액, 보험가입금액 감액 가능성 표시 |

### 5-2. KDB다이렉트 암보험

KDB source는 `40869_summary`와 `40870_policy`가 source variant와 맞고, `40869_policy` 갱신형 약관은 제외된 상태다.

| Caveat | 추천 UI 반영 |
|---|---|
| 90일 보장 제외 | 암진단보험금 I/II/III 보장개시일 caveat 표시 |
| 2년 감액 | 암진단보험금과 소액암진단보험금의 초기 50% 감액 caveat 표시 |
| 소액암 분리 | 기타피부암, 특정갑상선암, 대장점막내암, 비침습 방광암, 제자리암, 경계성종양은 소액암 급부로 분리 |
| 해약환급금 미지급형III | 보험료 납입기간 중 해지 시 해약환급금이 없고 납입기간 이후에도 표준형보다 적음 |
| renewal type 확인 | 보험다모아 query는 비갱신형 조건이나, source row의 `renewal_type` 변경은 별도 seed PR에서 명시 |

### 5-3. 교보라플 비갱신암보험

교보라이프플래닛 표준체와 비흡연체는 같은 공시 상품 코드 `10054` 문서를 공유하고, quote row로 보험료만 분리한다.

| Caveat | 추천 UI 반영 |
|---|---|
| 90일 보장 제외 | 일반암, 고액암, 유방암 및 전립선암, All 페이백 일반암의 90일 보장 제외 표시 |
| 1년 감액 | 가입 후 1년 미만 주요 급부 50% 감액 표시 |
| 급부 분리 | 유방암, 전립선암, 기타피부암, 중증 이외 갑상선암, 대장점막내암, 경계성종양, 제자리암은 일반암과 별도 표시 |
| 해약환급금 미지급형 | 보험료 납입기간 중 해지 시 해약환급금 없음, 납입완료 이후 지급형 상품 해약환급금의 50% 지급 |
| 표준체/비흡연체 분리 | 같은 문서 hash를 공유하되 quote row와 caveat는 source별로 분리 |
| 비흡연체 조건 | 최근 1년 비흡연, 만 19세 이상, 흡연 검사, 흡연 상태 변경 시 표준체 전환/감액 caveat 표시 |

---

## 6. Quote 상태

| Source | Quote row | 숫자 quote | 상태 |
|---|---:|---:|---|
| `src_hanwha_life_e_cancer_202604` | 4 | 0 | `0원`이라 가격 blocker |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 4 | 0 | `0원`이라 가격 blocker |
| `src_kdb_life_direct_cancer_202605` | 4 | 4 | 조건별 KRW 값 존재, 승인 전 `needs_review` |
| `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | 4 | 4 | 조건별 KRW 값 존재, 승인 전 `needs_review` |
| `src_kyobo_lifeplanet_cancer_standard_202605` | 4 | 4 | 조건별 KRW 값 존재, 승인 전 `needs_review` |

KDB와 교보 3개 source의 숫자 quote row는 첫 recommendation snapshot PR에서 승인 근거를 함께 남겨야 한다. quote row가 아직 `needs_review`이므로 UI에는 확정 가격처럼 표시하지 않는다.

---

## 7. Snapshot 준비 판단

이번 PR은 추천 snapshot을 발행하지 않는다. 다만 다음 PR의 우선순위는 확정한다.

| 우선순위 | 대상 | 조건 |
|---|---|---|
| 1 | KDB생명 `src_kdb_life_direct_cancer_202605` | source status 승격, quote 승인, snapshot row 생성 |
| 1 | 교보 비흡연체 `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | source status 승격, quote 승인, snapshot row 생성 |
| 1 | 교보 표준체 `src_kyobo_lifeplanet_cancer_standard_202605` | source status 승격, quote 승인, snapshot row 생성 |
| 보류 | 한화 표준체/비흡연체 | `0원` quote 해소 또는 no-price 추천 정책 승인 필요 |
| 제외 | 신한라이프 표준형 | 일반형 공식 문서 endpoint 미확보 |

---

## 8. 안전성

- 이번 작업은 data/docs 산출물만 추가한다.
- `seed.ts`, Drizzle schema, Turso DB, `.env.local`은 수정하지 않았다.
- active `insurance_products` 추천 snapshot은 0건 그대로다.
- 한화생명 2개 source는 매칭 키워드가 정리되더라도 가격 blocker 때문에 첫 active 추천에서 제외한다.
- 신한라이프 표준형 source는 PR #28의 차단 결론을 유지한다.

---

## 9. 다음 작업

1. KDB 1개와 교보 2개 source를 대상으로 source status 승격, quote row 승인, `insurance_products` snapshot row 생성을 묶은 seed PR을 만든다.
2. 첫 snapshot PR에서 `primary_source_document_id`, `coverage_details_json`, `coverage_caveats_json`, `monthly_premium_krw`, `premium_basis`, `monthly_premium_usdc` 환산 기준을 함께 기록한다.
3. 한화생명 0원 quote는 별도 재조회 또는 no-price display 정책을 확정하기 전까지 active 추천에서 제외한다.
4. 신한라이프 표준형 일반 문서 endpoint 탐색은 별도 트랙으로 유지한다.

---

## 10. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | DNA risk key와 공식 암보험 약관 caveat를 추천 가능한 구조로 연결했다 |
| Potential Impact | 실제 판매 상품 추천으로 넘어갈 수 있는 첫 후보군을 3개로 좁혔다 |
| Novelty | 보험다모아 quote, 보험사 PDF hash, DNA risk key를 같은 검수 산출물로 결합했다 |
| UX | 90일 보장 제외, 감액, 소액암/유사암, 비흡연체 조건을 추천 카드에 표시할 준비가 됐다 |
| Open-source | 같은 절차를 다른 보험사 상품에도 반복할 수 있는 JSON/CSV 검수 형식을 남겼다 |
| Business Plan | 실제 상품 추천으로 전환 가능한 후보와 가격 blocker를 분리해 서비스 출시 리스크를 낮췄다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Quote-only Source 문서 Variant 검수](./22_QUOTE_ONLY_SOURCE_DOCUMENT_VARIANT_REVIEW_2026_05_29.md) - 한화/교보 variant 근거
- **QA_Validation**: [KDB/신한 Source 문서 Variant 재검수](./26_KDB_SHINHAN_VARIANT_REVIEW_2026_05_29.md) - KDB variant 근거
- **QA_Validation**: [신한라이프 일반형 문서 Endpoint 탐색](./29_SHINHAN_STANDARD_DOCUMENT_ENDPOINT_PROBE_2026_05_30.md) - 신한 표준형 차단 근거
- **Data**: [Matching Keyword Caveat Review JSON](../../data/insurance/latest_matching_keyword_caveat_review.json) - 구조화 검수 결과
- **Data**: [Matching Keyword Caveat Review CSV](../../data/insurance/latest_matching_keyword_caveat_review.csv) - 검수 요약
