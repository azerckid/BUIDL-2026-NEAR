# [QA] 미래에셋생명 온라인 암보험 추천 Snapshot Seed 검증
> Created: 2026-06-01 00:48
> Last Updated: 2026-06-01 00:48

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 미래에셋생명 온라인 암보험 기본형/해약환급금이없는유형 source 문서 seed, source 승인, quote 승인, `insurance_products` oncology snapshot seed 준비
- **결론**: PR #78에서 `matching_ready_snapshot_candidate`로 정리한 미래에셋생명 암보험 2개 source를 seed에 반영했다. 적용 시 source document 6건이 추가되고, source 2건은 `approved`, quote row 8건은 `approved`, 신규 `insurance_products` snapshot 2건은 `catalog_status=approved`, `is_active=1`, `matching_strategy=risk_target`로 들어간다. 이번 PR은 운영 DB write를 하지 않으며, 운영 반영은 백업 후 별도 apply PR에서 진행한다.

---

## 1. 변경 대상

| 항목 | 값 |
|---|---|
| sources | `src_miraeasset_online_cancer_basic_202605`, `src_miraeasset_online_cancer_no_refund_202605` |
| source documents | summary/terms/business_method 각 source별 3건, 총 6건 |
| product snapshots | `prod_miraeasset_online_cancer_basic_202605`, `prod_miraeasset_online_cancer_no_refund_202605` |
| primary documents | `doc_miraeasset_online_cancer_basic_terms_202605`, `doc_miraeasset_online_cancer_no_refund_terms_202605` |
| quote approval | 8건 |
| DB write | 없음 |
| 산출물 | `../../data/insurance/latest_miraeasset_life_cancer_snapshot_seed.json` |

---

## 2. Seed 변경 요약

| 구분 | 변경 |
|---|---:|
| `SOURCE_AWARE_DOCUMENTS` | +6 |
| `FIRST_RECOMMENDATION_SOURCE_APPROVALS` | +2 |
| `MIRAEASSET_LIFE_CANCER_APPROVED_QUOTE_IDS` | +8 |
| `FIRST_RECOMMENDATION_SNAPSHOT_PRODUCTS` | +2 |
| 적용 후 source document 예상 | 33 |
| 적용 후 source approval 총계 | 15 |
| 적용 후 quote approval 총계 | 60 |
| 적용 후 active source-backed product 총계 | 15 |
| 적용 후 oncology active product 총계 | 8 |
| 적용 후 baseline active product 총계 | 7 |

---

## 3. Source Documents

후속 apply PR에서 아래 6건이 `insurance_source_documents`에 들어가야 한다.

| id | source | type | sha256 | bytes |
|---|---|---|---|---:|
| `doc_miraeasset_online_cancer_basic_summary_202604` | basic | `summary` | `133a9d91d3547e04ed25717275ce350ae0988c480ddde008346dd109255e722f` | 3,945,603 |
| `doc_miraeasset_online_cancer_basic_terms_202605` | basic | `terms` | `8d4a162186b510c576e7333e4ae75e72b6c785a089798688d0d490e267c14378` | 11,732,601 |
| `doc_miraeasset_online_cancer_basic_business_202602` | basic | `business_method` | `be8d5a3ec858875dbeb06c4b467ba4633928cb74475aa2cf159ed53ad508b71f` | 2,676,313 |
| `doc_miraeasset_online_cancer_no_refund_summary_202604` | no_refund | `summary` | `133a9d91d3547e04ed25717275ce350ae0988c480ddde008346dd109255e722f` | 3,945,603 |
| `doc_miraeasset_online_cancer_no_refund_terms_202605` | no_refund | `terms` | `8d4a162186b510c576e7333e4ae75e72b6c785a089798688d0d490e267c14378` | 11,732,601 |
| `doc_miraeasset_online_cancer_no_refund_business_202602` | no_refund | `business_method` | `be8d5a3ec858875dbeb06c4b467ba4633928cb74475aa2cf159ed53ad508b71f` | 2,676,313 |

공식 약관은 `온라인 암보험 무배당 [기본형/해약환급금이 없는 유형]`을 함께 다루고 상품코드 21279/21280을 명시한다. 따라서 두 source는 같은 공식 hash 3종을 공유하되, source별 document row ID는 분리한다. `source_documents_hash_idx`는 unique index가 아니므로 같은 hash의 별도 row 보존이 가능하다.

---

## 4. Source Approval

| source | review_status | sale_status | 대표 보험료 | primary document |
|---|---|---|---:|---|
| `src_miraeasset_online_cancer_basic_202605` | `approved` | `active` | 4,510 KRW | `doc_miraeasset_online_cancer_basic_terms_202605` |
| `src_miraeasset_online_cancer_no_refund_202605` | `approved` | `active` | 6,490 KRW | `doc_miraeasset_online_cancer_no_refund_terms_202605` |

두 source 모두 `coverage_category=oncology`, `matching_strategy=risk_target`, `risk_targets=[pancreatic_cancer,liver_cancer,lung_cancer,breast_cancer,colon_cancer]`로 승격한다.

---

## 5. Quote Approval

운영 DB 읽기 전용 확인으로 실제 row ID를 확정했다. 8건 모두 현재 `needs_review`이며 seed apply 후 `approved`가 되어야 한다.

| quote id | 조건 | 월 보험료 |
|---|---|---:|
| `quote_src_miraeasset_online_cancer_basic_202605_age34_female_1015b0165c0e` | 34세 여성 | 4,510 KRW |
| `quote_src_miraeasset_online_cancer_basic_202605_age34_male_d2e77ecf4a0c` | 34세 남성 | 5,970 KRW |
| `quote_src_miraeasset_online_cancer_basic_202605_age44_female_9cf2588db68b` | 44세 여성 | 7,780 KRW |
| `quote_src_miraeasset_online_cancer_basic_202605_age44_male_99a3f15d59fc` | 44세 남성 | 13,000 KRW |
| `quote_src_miraeasset_online_cancer_no_refund_202605_age34_female_1015b0165c0e` | 34세 여성 | 6,490 KRW |
| `quote_src_miraeasset_online_cancer_no_refund_202605_age34_male_d2e77ecf4a0c` | 34세 남성 | 8,910 KRW |
| `quote_src_miraeasset_online_cancer_no_refund_202605_age44_female_9cf2588db68b` | 44세 여성 | 7,060 KRW |
| `quote_src_miraeasset_online_cancer_no_refund_202605_age44_male_99a3f15d59fc` | 44세 남성 | 10,700 KRW |

---

## 6. Product Snapshot

| 필드 | 기본형 | 해약환급금이없는유형 |
|---|---:|---:|
| `id` | `prod_miraeasset_online_cancer_basic_202605` | `prod_miraeasset_online_cancer_no_refund_202605` |
| `monthly_premium_krw` | 4,510 | 6,490 |
| `monthly_premium_usdc` | 3.34 | 4.81 |
| `premium_basis` | 보험다모아 암보험 모바일 공개 조건, 고정 데모 환산율 1 USDC = 1,350 KRW | 보험다모아 암보험 모바일 공개 조건, 고정 데모 환산율 1 USDC = 1,350 KRW |
| `catalog_status` | `approved` | `approved` |
| `is_active` | 1 | 1 |

대표 보험료는 기존 oncology snapshot 정책과 동일하게 `age34_female` 조건을 사용한다. 조건별 가격은 `insurance_premium_quotes`에서 별도 표시한다.

---

## 7. 적용 전후 예상

운영 DB 적용 전 기준은 PR #78 이후 상태다.

| 항목 | 적용 전 | 적용 후 예상 |
|---|---:|---:|
| source document | 27 | 33 |
| active source-backed 추천 상품 | 13 | 15 |
| source approved | 13 | 15 |
| quote approved | 52 | 60 |
| oncology active product | 6 | 8 |
| baseline active product | 7 | 7 |
| insurance_products | 18 | 20 |

적용 PR에서는 운영 DB 백업 후 `npx tsx src/lib/db/seed.ts`를 실행하고 위 카운트를 검증한다.

---

## 8. 안전성

- 이번 PR은 `seed.ts`와 문서/데이터 산출물만 변경하며 운영 DB write를 하지 않는다.
- 적용 PR에서는 운영 DB 백업을 먼저 수행해야 한다.
- legacy demo 상품은 계속 `archived` 상태로 유지한다.
- 같은 공식 hash를 두 source의 별도 document row로 보존하되, hash index가 unique가 아님을 확인했다.
- 추천 상담 AI 컨텍스트에는 apply 후 approved/active 상품만 들어가며 raw source는 계속 제외된다.

---

## 9. 다음 작업

1. 이번 seed PR을 머지한다.
2. 운영 DB 백업 후 `src/lib/db/seed.ts`를 실행한다.
3. 적용 후 source document 33건, source-backed active 추천 상품 15건, approved quote 60건을 확인한다.
4. Dashboard에서 미래에셋생명 2개 암보험 카드와 조건별 보험료가 표시되는지 확인한다.
5. 상담 AI가 미래에셋생명 상품을 설명할 때 shared document hash와 암 보장 caveat를 포함하는지 확인한다.

---

## 10. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 미래에셋생명 암보험 2건이 source-backed 추천 snapshot으로 발행될 준비가 끝났다 |
| Potential Impact | oncology active 추천 폭이 6건에서 8건으로 늘어난다 |
| Novelty | 보험사 공식 공시 PDF hash와 보험다모아 quote matrix를 source별 snapshot으로 결합한다 |
| UX | 사용자는 미래에셋생명 카드에서도 조건별 보험료, 출처, caveat를 확인할 수 있다 |
| Open-source | shared document hash를 source별 row로 분리하는 반복 가능한 seed 정책을 남긴다 |
| Business Plan | 실제 상품 카탈로그 폭을 넓혀 테스트 사용자 피드백의 비교 폭을 넓힌다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Mirae Asset Life Disclosure Adapter Probe](./73_MIRAEASSET_LIFE_DISCLOSURE_ADAPTER_PROBE_2026_06_01.md) - 공식 문서 hash 검증
- **QA_Validation**: [Mirae Asset Life Cancer Matching Review](./74_MIRAEASSET_LIFE_CANCER_MATCHING_REVIEW_2026_06_01.md) - 이번 seed의 매칭 검수 근거
- **QA_Validation**: [Heungkuk Fire Baseline Snapshot Seed](./71_HEUNGKUK_FIRE_BASELINE_SNAPSHOT_SEED_2026_05_31.md) - 직전 snapshot seed 패턴
- **Data**: [Mirae Asset Life Cancer Snapshot Seed JSON](../../data/insurance/latest_miraeasset_life_cancer_snapshot_seed.json) - 구조화 seed 준비 결과
