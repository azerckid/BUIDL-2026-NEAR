# [QA] 미래에셋생명 암보험 매칭 키워드와 Caveat 검수
> Created: 2026-06-01 00:31
> Last Updated: 2026-06-01 00:31

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 미래에셋생명 온라인 암보험 기본형/해약환급금이없는유형 source 2건의 문서 variant, `coverage_category`, `risk_targets`, `matching_strategy`, caveat, quote 상태 검수
- **결론**: 두 source는 같은 공식 약관/상품요약서/사업방법서 hash를 공유할 수 있고, 모두 `coverage_category=oncology`, `matching_strategy=risk_target`, `risk_targets=[pancreatic_cancer,liver_cancer,lung_cancer,breast_cancer,colon_cancer]`로 정리 가능하다. 숫자 KRW quote 8건이 있으므로 다음 seed PR에서 source document row, quote approval, active recommendation snapshot 2건을 준비할 수 있다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 입력 disclosure probe | `data/insurance/latest_miraeasset_life_disclosure_adapter_probe.json` |
| 입력 quote rows | `data/insurance/latest_premium_quote_rows_apply.json` |
| 입력 seed | `src/lib/db/seed.ts` |
| 신규 검수 JSON | `data/insurance/latest_miraeasset_life_cancer_matching_review.json` |
| 신규 검수 CSV | `data/insurance/latest_miraeasset_life_cancer_matching_review.csv` |
| PDF 텍스트 추출 | 미래에셋생명 약관 |
| DB read-only check | source 2건 raw, docs 0건, quote 8건 needs_review, products 0건 |
| DB write | 0 |
| `seed.ts` 변경 | 0 |
| 추천 snapshot 변경 | 0 |

---

## 2. 요약

| 항목 | 결과 |
|---|---:|
| 검수 source | 2 |
| 매칭 키워드 정리 가능 source | 2 |
| snapshot 후보 | 2 |
| 공식 unique document hash | 3 |
| source별 document candidate | 3 |
| quote row 확인 | 8 |
| 숫자 KRW quote row | 8 |
| 이번 PR 추천 노출 변경 | 0 |

---

## 3. Variant 판단

약관 첫 부분에서 아래 문구와 상품코드가 확인됐다.

| 항목 | 확인값 |
|---|---|
| 약관 제목 | `온라인 암보험 무배당 [기본형/해약환급금이 없는 유형]` |
| 기본형 코드 | `21279` |
| 해약환급금이 없는 유형 코드 | `21280` |
| 약관 file hash | `8d4a162186b510c576e7333e4ae75e72b6c785a089798688d0d490e267c14378` |

따라서 기본형과 해약환급금이없는유형 source는 같은 공식 문서 3종을 공유해도 된다. 후속 seed PR에서는 한화/교보 shared hash 정책과 동일하게 source별 `insurance_source_documents.id`와 `product_source_id`를 분리하고, 같은 `file_hash_sha256`을 허용한다.

---

## 4. 공통 매칭 정책

이번 검수 대상은 암보험이다. 현재 DNA risk key 사전과 DB schema가 지원하는 암 관련 key는 아래 5개다.

```text
pancreatic_cancer
liver_cancer
lung_cancer
breast_cancer
colon_cancer
```

따라서 2개 source의 추천 매칭 후보는 공통으로 다음 값을 사용한다.

| 필드 | 값 |
|---|---|
| `coverage_category` | `oncology` |
| `matching_strategy` | `risk_target` |
| `risk_targets` | `pancreatic_cancer`, `liver_cancer`, `lung_cancer`, `breast_cancer`, `colon_cancer` |

약관에는 갑상선암, 전립선암, 기타피부암, 대장점막내암, 비침습방광암, 제자리암, 경계성종양도 등장하지만 현재 DNA risk key로 직접 매칭하지 않는다. 이 항목들은 `risk_targets`가 아니라 `coverage_caveats_json`에 급부 차이로 표시한다.

---

## 5. Source별 판정

| Provider | Source | Product code | 판정 | 이유 |
|---|---|---|---|---|
| 미래에셋생명 | `src_miraeasset_online_cancer_basic_202605` | `L34C009000021` | snapshot 후보 | 공식 문서 3종과 숫자 quote 4건이 있고 약관이 기본형을 명시한다 |
| 미래에셋생명 | `src_miraeasset_online_cancer_no_refund_202605` | `L34C009000022` | snapshot 후보 | 같은 공식 문서 3종과 숫자 quote 4건이 있고 약관이 해약환급금이 없는 유형을 명시한다 |

---

## 6. Caveat 정리

| Caveat | 추천 UI 반영 |
|---|---|
| 공통 문서 hash | 기본형과 해약환급금이없는유형은 같은 문서를 공유하되 source row와 quote row는 분리 |
| 90일 암보장개시일 | 암은 계약일 또는 부활일부터 90일이 지난 날의 다음 날 이후부터 보장 |
| 2년 미만 감액 | 보험가입금액 1,000만원 기준 일반암은 2년 미만 500만원, 2년 이후 1,000만원 |
| 여성유방암/전립선암 별도 급부 | 보험가입금액 1,000만원 기준 2년 미만 100만원, 2년 이후 200만원 |
| 소액/유사암 별도 급부 | 기타피부암, 갑상선암, 대장점막내암, 비침습방광암, 제자리암, 경계성종양은 50만원/100만원 기준 |
| 납입면제 제외 | 기타피부암, 갑상선암, 대장점막내암, 비침습방광암, 제자리암, 경계성종양은 납입면제 대상이 아님 |
| 해약환급금이 없는 유형 | 해지 환급 조건이 기본형과 다를 수 있으므로 별도 caveat 표시 |

---

## 7. Quote 상태

| Source | age34 female | age34 male | age44 female | age44 male | 상태 |
|---|---:|---:|---:|---:|---|
| `src_miraeasset_online_cancer_basic_202605` | 4,510 | 5,970 | 7,780 | 13,000 | 숫자 KRW, 승인 전 `needs_review` |
| `src_miraeasset_online_cancer_no_refund_202605` | 6,490 | 8,910 | 7,060 | 10,700 | 숫자 KRW, 승인 전 `needs_review` |

두 source의 숫자 quote row는 다음 recommendation snapshot seed PR에서 승인 근거를 함께 남겨야 한다. quote row가 아직 `needs_review`이므로 UI에는 확정 가격처럼 표시하지 않는다.

---

## 8. Snapshot 준비 판단

이번 PR은 추천 snapshot을 발행하지 않는다. 다음 PR은 아래 항목을 묶어서 준비한다.

1. 기본형 source document 3건 seed 추가.
2. 해약환급금이없는유형 source document 3건 seed 추가.
3. quote 8건 approval.
4. `prod_miraeasset_online_cancer_basic_202605`, `prod_miraeasset_online_cancer_no_refund_202605` snapshot 2건 추가.

적용 후 운영 DB 기준 source-backed active 추천 상품은 13건에서 15건으로 늘어야 한다.

---

## 9. 안전성

- 이번 작업은 data/docs 산출물만 추가한다.
- `seed.ts`, Drizzle schema, Turso DB, `.env.local`은 수정하지 않았다.
- active `insurance_products` 추천 snapshot은 변경하지 않았다.
- source 2건은 계속 `raw`이며 추천 UI에 노출되지 않는다.

---

## 10. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 공식 약관 variant와 DNA risk key 매칭을 추천 가능한 구조로 연결했다 |
| Potential Impact | 실제 판매 암보험 추천 후보를 2개 더 확대할 준비가 됐다 |
| Novelty | 보험사 공시 Ajax, 공식 PDF hash, 보험다모아 quote, DNA risk key를 하나의 검수 산출물로 결합했다 |
| UX | 90일 보장 제외, 감액, 소액/유사암 급부 차이, 해약환급금 caveat를 추천 카드에 표시할 준비가 됐다 |
| Open-source | shared document hash를 source별로 분리하는 반복 가능한 검수 기준을 남겼다 |
| Business Plan | 추천 가능한 실제 암보험 상품 수를 늘릴 수 있는 seed/apply 직전 단계를 완료했다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Mirae Asset Life Disclosure Adapter Probe](./73_MIRAEASSET_LIFE_DISCLOSURE_ADAPTER_PROBE_2026_06_01.md) - 미래에셋생명 공식 문서 hash 확보 근거
- **QA_Validation**: [Matching Keyword Caveat Review](./30_MATCHING_KEYWORD_CAVEAT_REVIEW_2026_05_30.md) - 암보험 risk target/caveat 정리 선행 패턴
- **Data**: [Mirae Asset Life Matching Review JSON](../../data/insurance/latest_miraeasset_life_cancer_matching_review.json) - 구조화 검수 결과
- **Data**: [Mirae Asset Life Matching Review CSV](../../data/insurance/latest_miraeasset_life_cancer_matching_review.csv) - 검수 요약
