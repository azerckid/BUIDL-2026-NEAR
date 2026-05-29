# [QA] KDB/신한 Source 문서 Variant 재검수
> Created: 2026-05-29 23:11
> Last Updated: 2026-05-29 23:11

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: quote-only raw source 중 KDB생명 `40869/40870` 약관 variant와 신한라이프 표준형/해약환급금 미지급형 variant 재검수
- **결론**: KDB생명 `src_kdb_life_direct_cancer_202605`는 `40869_summary`와 `40870_policy` 2건을 다음 seed 후보로 확정할 수 있다. `40869_policy`는 갱신형 약관이라 제외한다. 신한라이프 `src_shinhan_life_sol_cancer_standard_202605`는 현재 확보 문서 3건이 모두 해약환급금 미지급형으로 확인되어 표준형 source에는 연결하지 않는다. DB write와 `seed.ts` 변경은 하지 않았다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 입력 variant gate | `data/insurance/latest_quote_only_source_document_variant_review.json` |
| 입력 product probe | `data/insurance/latest_quote_only_product_document_probe.json` |
| 입력 carrier disclosure probe | `data/insurance/latest_quote_only_carrier_disclosure_probe.json` |
| 신규 검수 JSON | `data/insurance/latest_kdb_shinhan_variant_resolution.json` |
| 신규 검수 CSV | `data/insurance/latest_kdb_shinhan_variant_resolution.csv` |
| DB write | 0 |
| `seed.ts` 변경 | 0 |

---

## 2. 요약

| 항목 | 결과 |
|---|---:|
| 검수 source | 2 |
| 검수 document row | 6 |
| 해소 source | 1 |
| seed 후보 source | 1 |
| seed 후보 document row | 2 |
| 제외 document row | 1 |
| 차단 source | 1 |
| 차단 document row | 3 |

---

## 3. KDB생명 판정

대상 source는 `src_kdb_life_direct_cancer_202605`이며, 보험다모아 product code는 `L33C009000025`다. source 상품명은 `KDB다이렉트 암보험(해약환급금 미지급형III)(무)`이므로 갱신형 약관을 연결하면 안 된다.

| 문서 | Hash | 판정 | 근거 |
|---|---|---|---|
| `40869_summary.pdf` | `b6b3c5607f73accfd7cd28595cd466c6fecbc09c3b6e02e28867822fd51d407a` | seed 후보 | 표지 텍스트가 `KDB다이렉트 암보험(무) 상품요약서`이며 표준형과 해약환급금 미지급형III를 함께 설명한다 |
| `40870_policy.pdf` | `a9f07c34b0551ba616f8098027873dcaed3367d2c035dd72403daa431cdc52b6` | seed 후보 | 표지와 주계약 텍스트가 `KDB다이렉트 암보험(표준형, 해약환급금 미지급형III)(무)`를 명시한다 |
| `40869_policy.pdf` | `10d4904403a4756932e3463f121b5f5b314df5c29f324fb223d35cfed39ca8ba` | 제외 | 표지 텍스트가 `KDB다이렉트 암보험(갱신형)(무)`라서 source variant와 다르다 |

다음 seed PR에서는 `40869_summary`와 `40870_policy`만 `insurance_source_documents` 후보로 추가한다. source의 `review_status`는 계속 `raw`로 둔다.

---

## 4. 신한라이프 판정

대상 source는 `src_shinhan_life_sol_cancer_standard_202605`이며, 보험다모아 product code는 `L11C009000007`다. source 상품명은 `신한SOL암보험(무배당)(비갱신형)`으로 표준형처럼 보이지만, 현재 crawler가 찾은 문서는 모두 해약환급금 미지급형이다.

| 문서 | Hash | 판정 | 근거 |
|---|---|---|---|
| 상품요약서 | `d557ed911adc877976863155e45fec5217ebfe485aed8f0c685797d0d7314c03` | 차단 | 표지 텍스트가 해약환급금 미지급형이다 |
| 사업방법서 | `9aa1ed61e51a9c67a339430266f8551cd6739bcb48d725bf298e3742fe3797ea` | 차단 | 문서가 일반형과 해약환급금 미지급형을 별도 상품으로 구분하며, 해당 PDF는 해약환급금 미지급형이다 |
| 판매약관 | `fcd915ee2e5440cf9542711dabd1c3014a1f5f3efef9c0a1f8fc88ed7ca40ffa` | 차단 | 표지 텍스트가 해약환급금 미지급형이다 |

이 3개 문서는 이미 기존 no-refund source인 `src_shinhan_life_sol_cancer_202601`에 연결된 문서와 동일하다. 따라서 표준형 source에는 재사용하지 않고, 신한라이프 공시 endpoint에서 일반형 문서를 별도로 찾아야 한다.

---

## 5. 안전성 판단

- 이번 작업은 구조화 검수 산출물과 문서 갱신만 수행했다.
- 운영 DB, `.env.local`, Turso URL/token, `seed.ts`는 수정하지 않았다.
- KDB는 다음 seed PR에서 2개 document row만 추가 가능한 상태다.
- 신한라이프 표준형 source는 공식 일반형 문서를 찾기 전까지 `raw` 상태로 유지한다.
- 두 source 모두 추천 상품으로 승격하지 않는다.

---

## 6. 남은 작업

1. KDB생명 `40869_summary`와 `40870_policy` 2건을 `SOURCE_AWARE_DOCUMENTS`에 추가하는 seed PR을 만든다.
2. 운영 DB 적용은 seed PR 머지 후 백업을 먼저 수행하고 별도 apply PR로 진행한다.
3. 신한라이프 `L11C009000007` 일반형 상품요약서, 사업방법서, 판매약관 endpoint를 추가 탐색한다.
4. source 문서가 채워진 뒤 `coverage_category`, `risk_targets`, `matching_strategy`, caveat와 quote row 승인 기준을 정리한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | KDB 약관 variant를 확정하고 신한 오연결을 차단해 공식 문서 연결 정확도를 높였다 |
| Potential Impact | quote-only source 확장을 계속 진행할 수 있는 수동 검수 병목을 줄였다 |
| Novelty | 보험료 source와 공시 문서 source를 variant 단위로 재결합하는 절차를 반복 가능하게 남겼다 |
| UX | 잘못된 약관을 근거로 추천하는 위험을 줄여 사용자 신뢰를 보존한다 |
| Open-source | PDF hash, 표지 텍스트, seed 후보 여부를 구조화해 재검토 가능한 산출물로 남겼다 |
| Business Plan | 실제 판매 상품 universe를 안전하게 늘려 보험 비교/중개 가능성을 강화한다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - raw/needs_review/approved 의미
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Quote-only Source 문서 Variant 검수](./22_QUOTE_ONLY_SOURCE_DOCUMENT_VARIANT_REVIEW_2026_05_29.md) - 기존 variant gate
- **QA_Validation**: [Source Document DB 적용 검증](./24_SOURCE_DOCUMENTS_DB_APPLY_2026_05_29.md) - 이전 안전 후보 8건 DB 적용
- **Data**: [KDB/Shinhan Variant Resolution JSON](../../data/insurance/latest_kdb_shinhan_variant_resolution.json) - 구조화 검수 결과
- **Data**: [KDB/Shinhan Variant Resolution CSV](../../data/insurance/latest_kdb_shinhan_variant_resolution.csv) - 검수 요약
