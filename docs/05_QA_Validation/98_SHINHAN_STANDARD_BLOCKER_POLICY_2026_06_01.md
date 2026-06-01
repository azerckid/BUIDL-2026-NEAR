# [QA] 신한라이프 표준형 암보험 Blocker 종결 정책
> Created: 2026-06-01 19:26
> Last Updated: 2026-06-01 19:26

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: `src_shinhan_life_sol_cancer_standard_202605` source의 raw blocker 종결 여부, no-refund 문서 재사용 금지, quote 4건 상태 정책
- **결론**: 신한라이프 공식 endpoint를 다시 실행해도 표준형/일반형 문서 row는 발견되지 않았다. 반환되는 `신한SOL암보험` row는 해약환급금 미지급형 1건뿐이고, 해당 문서 3건은 no-refund source에 이미 귀속된 근거다. 이번 PR에서는 표준형 source를 `rejected`로 내리고 관련 quote 4건도 `rejected`로 내리는 seed 정책을 추가한다.

---

## 1. 입력

| 항목 | 값 |
|---|---|
| 대상 source | `src_shinhan_life_sol_cancer_standard_202605` |
| 상품명 | `신한SOL암보험(무배당)(비갱신형)` |
| 보험사 | 신한라이프생명 |
| 상품군 | 암보험 |
| e-insmarket code | `L11C009000007` |
| 현재 review_status | `raw` |
| 현재 source document | 0건 |
| 현재 quote row | 4건, `needs_review` |
| 신규 검수 JSON | `data/insurance/latest_shinhan_standard_blocker_policy.json` |
| 신규 검수 CSV | `data/insurance/latest_shinhan_standard_blocker_policy.csv` |

---

## 2. 최신 Endpoint 재탐색

2026-06-01 19:25 KST에 `npm run collect:insurance:shinhan-standard-docs`를 다시 실행했다.

| 항목 | 값 |
|---|---|
| probe JSON | `data/insurance/latest_shinhan_standard_document_endpoint_probe.json` |
| probe CSV | `data/insurance/latest_shinhan_standard_document_endpoint_probe.csv` |
| decision status | `standard_endpoint_not_found` |
| active rows scanned | 134 |
| historical rows scanned | 1,775 |
| standard/general variant hit | 0 |
| no-refund variant hit | 1 |
| downloaded blocked no-refund documents | 3 |

공식 endpoint가 반환하는 target row는 `신한SOL암보험(무배당, 해약환급금 미지급형)` 1건뿐이다. 보험다모아 source가 요구하는 표준형/일반형 문서 row는 발견되지 않았다.

---

## 3. 정책 판단

신한라이프 no-refund 문서 3건은 이미 `src_shinhan_life_sol_cancer_202601`의 공식 문서로 쓰인다. 이를 표준형 source에 재사용하면 해약환급금 조건과 상품 variant가 섞인다.

| 선택지 | 판단 |
|---|---|
| no-refund 문서 3건을 표준형 source document로 재사용 | 거부 |
| 보험다모아 표준형 quote 4건을 approved로 승격 | 거부 |
| active `insurance_products` oncology snapshot 발행 | 거부 |
| source catalog에 blocker 근거를 남기고 `rejected` 처리 | 채택 |

`rejected`는 상품 자체가 판매 불가라는 뜻이 아니다. 현재 확보 가능한 공식 문서가 표준형 source와 일치하지 않으므로 사용자 추천에 노출하지 않는 내부 데이터 상태다.

---

## 4. Seed 변경

`seed.ts`의 `SOURCE_CATALOG_EXCLUSION_UPDATES`에 신한라이프 표준형 source를 추가한다.

| 필드 | 적용값 |
|---|---|
| source id | `src_shinhan_life_sol_cancer_standard_202605` |
| review_status | `rejected` |
| service treatment | source catalog only |
| source document 추가 | 0 |
| quote approval 추가 | 0 |
| quote rejection 추가 | 4 |
| insurance_products snapshot 추가 | 0 |
| active 추천 상품 수 변화 | 0 |

Reject 대상 quote:

| condition | quote id |
|---|---|
| age34 female | `quote_src_shinhan_life_sol_cancer_standard_202605_age34_female_1015b0165c0e` |
| age34 male | `quote_src_shinhan_life_sol_cancer_standard_202605_age34_male_d2e77ecf4a0c` |
| age44 female | `quote_src_shinhan_life_sol_cancer_standard_202605_age44_female_9cf2588db68b` |
| age44 male | `quote_src_shinhan_life_sol_cancer_standard_202605_age44_male_99a3f15d59fc` |

---

## 5. 안전성

- 이번 PR은 DB write를 하지 않는다.
- no-refund 문서 3건은 표준형 source에 seed하지 않는다.
- active `insurance_products` snapshot을 추가하지 않는다.
- 상담 AI 상품 컨텍스트에도 이 source는 들어가지 않는다.
- 표준형 일반 문서 endpoint를 나중에 확보하면 별도 PR로 blocker를 재검토한다.

---

## 6. 다음 작업

1. 이 seed 정책 PR을 merge한다.
2. 운영 DB 백업 후 seed apply PR로 source와 quote 4건의 `rejected` 상태를 반영한다.
3. 적용 후 source catalog 후보 22개는 `approved=19`, `rejected=3`, `raw=0`, `needs_review=0`이어야 한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 표준형 source에 no-refund 문서를 오연결하지 않도록 마지막 raw blocker를 정리한다 |
| Potential Impact | 실제 보험 추천의 variant 정확성을 유지한다 |
| Novelty | 보험다모아 source와 보험사 endpoint variant 불일치를 seed 정책으로 명시한다 |
| UX | 사용자가 다른 환급 구조의 약관 기반 추천을 받지 않는다 |
| Open-source | 반복 가능한 endpoint probe와 blocker 정책을 함께 남긴다 |
| Business Plan | source-backed 추천의 신뢰 기준을 유지하면서 후보 큐를 닫는다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Shinhan Standard Document Endpoint Reprobe](./45_SHINHAN_STANDARD_DOCUMENT_ENDPOINT_REPROBE_2026_05_31.md) - 공식 endpoint 반복 탐색 근거
- **QA_Validation**: [KDB/Shinhan Variant Review](./26_KDB_SHINHAN_VARIANT_REVIEW_2026_05_29.md) - no-refund 문서 재사용 금지 근거
- **QA_Validation**: [Hanwha General Medical Blocker DB Apply](./97_HANWHA_GENERAL_MEDICAL_BLOCKER_DB_APPLY_2026_06_01.md) - 직전 blocker DB 적용 검증
- **Data**: [Shinhan Standard Blocker Policy JSON](../../data/insurance/latest_shinhan_standard_blocker_policy.json) - blocker 종결 정책 구조화 결과
- **Data**: [Shinhan Standard Blocker Policy CSV](../../data/insurance/latest_shinhan_standard_blocker_policy.csv) - blocker 종결 정책 요약
