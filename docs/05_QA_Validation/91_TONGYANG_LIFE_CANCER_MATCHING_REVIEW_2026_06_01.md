# [QA] 동양생명 암보험 매칭 키워드와 Caveat 검수
> Created: 2026-06-01 13:06
> Last Updated: 2026-06-01 13:06

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 동양생명 `src_tongyang_wooriwon_cancer_202605` source의 문서 variant, `coverage_category`, `risk_targets`, `matching_strategy`, caveat, quote 상태 검수
- **결론**: 동양생명 우리WON하는실속하나로암보험은 공식 공시실의 상품요약서, 사업방법서, 보험약관 3건으로 source evidence gate를 통과했고, `coverage_category=oncology`, `matching_strategy=risk_target`, `risk_targets=[pancreatic_cancer,liver_cancer,lung_cancer,breast_cancer,colon_cancer]`로 정리 가능하다. 숫자 KRW quote 4건이 있으므로 다음 seed PR에서 source document 3건, quote approval 4건, active recommendation snapshot 1건을 준비할 수 있다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 입력 disclosure probe | `data/insurance/latest_tongyang_life_cancer_disclosure_adapter_probe.json` |
| 입력 quote rows | `data/insurance/latest_premium_quote_probe.json` |
| 입력 seed | `src/lib/db/seed.ts` |
| 신규 검수 JSON | `data/insurance/latest_tongyang_life_cancer_matching_review.json` |
| 신규 검수 CSV | `data/insurance/latest_tongyang_life_cancer_matching_review.csv` |
| PDF 텍스트 추출 | 동양생명 공식 상품요약서/사업방법서/보험약관 |
| DB read-only check | 미수행 |
| DB write | 0 |
| `seed.ts` 변경 | 0 |
| 추천 snapshot 변경 | 0 |

---

## 2. 요약

| 항목 | 결과 |
|---|---:|
| 검수 source | 1 |
| 매칭 키워드 정리 가능 source | 1 |
| snapshot 후보 | 1 |
| 공식 unique document hash | 3 |
| source별 document candidate | 3 |
| quote row 확인 | 4 |
| 숫자 KRW quote row | 4 |
| 이번 PR 추천 노출 변경 | 0 |

---

## 3. Variant 판단

공식 PDF 텍스트에서 아래 값이 확인됐다.

| 항목 | 확인값 |
|---|---|
| 상품요약서 제목 | `무배당우리 WON 하는실속하나로암보험 상품요약서` |
| 사업방법서 제목 | `무배당우리 WON 하는실속하나로암보험 사업방법서` |
| 약관 제목 | `무배당우리WON하는실속하나로암보험 약관` |
| 적용일 | `2026.03.01` |
| source page | `https://pbano.myangel.co.kr/paging/WE_AC_WEPAAP020100L` |
| download endpoint | `https://pbano.myangel.co.kr/process/CO_ComDownload` |

Document hash:

| document_type | file_group_id | sha256 | bytes |
|---|---|---|---:|
| `summary` | `34D0mcpfsYQVpsLLoUEpB3x1Cudfk83B` | `960aae81795907c539b11667d3804534dc2b3b04c1da2df4f2b4e6d4381097b5` | 355,923 |
| `business_method` | `34D0mcpfsYQVpsLLoUEpBzxfPnWb7yTo` | `4d67901f7df9d4bc631b6cd8d4c371cdb68e4a4b15a01f952f43a3ebf751b18f` | 99,967 |
| `terms` | `34D0mcpfsYQVpsLLoUEpBwjPN9vaY11S` | `882cb3784644e040027c16c984ae8c8c84bd3a12507949063967c618fdc81cb2` | 6,512,683 |

따라서 `src_tongyang_wooriwon_cancer_202605` source에는 공식 문서 3건을 seed 후보로 연결할 수 있다.

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

따라서 이 source의 추천 매칭 후보는 다음 값을 사용한다.

| 필드 | 값 |
|---|---|
| `coverage_category` | `oncology` |
| `matching_strategy` | `risk_target` |
| `risk_targets` | `pancreatic_cancer`, `liver_cancer`, `lung_cancer`, `breast_cancer`, `colon_cancer` |

상품요약서와 약관에는 고액치료비관련 암, 고액치료비관련 암이외의 암, 소액암, 기타피부암, 갑상선암, 제자리암, 경계성종양, 표적항암/특정면역항암 갱신형 특약이 등장한다. 이 항목들은 현재 DNA risk key와 직접 1:1 매칭하지 않고 `coverage_details_json` 및 `coverage_caveats_json`에 표시한다.

---

## 5. Source별 판정

| Provider | Source | Product code | 판정 | 이유 |
|---|---|---|---|---|
| 동양생명 | `src_tongyang_wooriwon_cancer_202605` | `L74C009000006` | snapshot 후보 | 공식 문서 3건과 숫자 quote 4건이 있고 상품요약서/약관이 상품명, 적용일, 암보험 보장 구조를 명시한다 |

---

## 6. Caveat 정리

| Caveat | 추천 UI 반영 |
|---|---|
| 90일 암 보장개시일 | 암 보장개시일은 계약일 또는 부활일부터 90일이 지난 날의 다음날이므로 초기 90일 보장 제외를 표시 |
| 1년 미만 감액 | 주요 암진단비와 기타피부암/갑상선암/제자리암/경계성종양은 계약일부터 1년 미만 진단확정 시 50% 지급 조건을 표시 |
| 유방암 180일 조건 | 유방암은 계약일로부터 180일 경과 이전 진단확정 시 고액치료비관련 암이외의 암진단비 10% 지급 조건을 별도 표시 |
| 소액암/갑상선/피부암 분리 | 기타피부암과 갑상선암은 암의 정의에서 제외되고, 중증 갑상선암은 암에 포함되는 분류 차이를 설명 |
| 납입면제 제외 | 기타피부암, 갑상선암, 제자리암, 경계성종양은 보험료 납입면제 대상에서 제외되고 중증 갑상선암은 예외 가능성을 표시 |
| 갱신형 특약 | 표적항암약물허가치료특약과 특정면역항암약물허가치료특약은 갱신형이므로 갱신 시 보험료 변동 가능성을 표시 |
| 가입 조건 | 보험기간, 납입기간, 가입나이, 가입금액 선택과 건강진단/인수심사 가능성을 표시 |
| 해약환급금 | 중도 해지 시 해약환급금은 납입 보험료보다 적거나 없을 수 있음을 표시 |
| 최종 약관 확인 | 선택특약과 지급제한은 세부 조항을 따르므로 최종 가입 전 공식 문서 확인을 요구 |

---

## 7. Quote 상태

| Source | age34 female | age34 male | age44 female | age44 male | 상태 |
|---|---:|---:|---:|---:|---|
| `src_tongyang_wooriwon_cancer_202605` | 11,000 | 9,700 | 14,100 | 17,100 | 숫자 KRW, 승인 전 `needs_review` |

숫자 quote row 4건은 다음 recommendation snapshot seed PR에서 실제 운영 DB quote ID를 확인한 뒤 승인 근거를 함께 남긴다. quote row가 아직 `needs_review`이므로 UI에는 확정 가격처럼 표시하지 않는다.

---

## 8. Snapshot 준비 판단

이번 PR은 추천 snapshot을 발행하지 않는다. 다음 PR은 아래 항목을 묶어서 준비한다.

1. 동양생명 source document `summary`, `business_method`, `terms` 3건 seed 추가.
2. quote 4건 approval.
3. `prod_tongyang_wooriwon_cancer_202605` snapshot 1건 추가.

적용 후 운영 DB 기준 source-backed active 추천 상품은 18건에서 19건으로 늘어야 한다.

---

## 9. 안전성

- 이번 작업은 data/docs 산출물만 추가한다.
- `seed.ts`, Drizzle schema, Turso DB, `.env.local`은 수정하지 않았다.
- active `insurance_products` 추천 snapshot은 변경하지 않았다.
- source 1건은 계속 `raw`이며 추천 UI에 노출되지 않는다.

---

## 10. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 공식 문서 3건의 variant와 DNA risk key 매칭을 추천 가능한 구조로 연결했다 |
| Potential Impact | 실제 판매 암보험 추천 후보를 1개 더 확대할 준비가 됐다 |
| Novelty | 동양생명 POST 공시 문서 hash, 보험다모아 quote, DNA risk key를 하나의 검수 산출물로 결합했다 |
| UX | 90일 면책, 1년 미만 감액, 유방암 180일 조건, 갱신형 특약 보험료 변동, 납입면제 제외를 추천 카드에 표시할 준비가 됐다 |
| Open-source | 공식 문서 3건이 있는 source를 snapshot 후보로 다루는 반복 가능한 기준을 남겼다 |
| Business Plan | 추천 가능한 실제 암보험 상품 수를 늘릴 수 있는 seed/apply 직전 단계를 완료했다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Tongyang Life Cancer Disclosure Adapter Probe](./90_TONGYANG_LIFE_CANCER_DISCLOSURE_ADAPTER_PROBE_2026_06_01.md) - 동양생명 공식 문서 hash 확보 근거
- **QA_Validation**: [Matching Keyword Caveat Review](./30_MATCHING_KEYWORD_CAVEAT_REVIEW_2026_05_30.md) - 암보험 risk target/caveat 정리 선행 패턴
- **Data**: [Tongyang Life Cancer Matching Review JSON](../../data/insurance/latest_tongyang_life_cancer_matching_review.json) - 구조화 검수 결과
- **Data**: [Tongyang Life Cancer Matching Review CSV](../../data/insurance/latest_tongyang_life_cancer_matching_review.csv) - 검수 요약
