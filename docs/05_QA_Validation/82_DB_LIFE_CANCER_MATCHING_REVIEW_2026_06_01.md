# [QA] DB생명 암보험 매칭 키워드와 Caveat 검수
> Created: 2026-06-01 03:34
> Last Updated: 2026-06-01 03:34

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: DB생명 `src_db_life_eroun_cancer_202601` source의 문서 variant, `coverage_category`, `risk_targets`, `matching_strategy`, caveat, quote 상태 검수
- **결론**: DB생명 e로운 암보험은 공식 약관 PDF 1건으로 source evidence gate를 통과했고, `coverage_category=oncology`, `matching_strategy=risk_target`, `risk_targets=[pancreatic_cancer,liver_cancer,lung_cancer,breast_cancer,colon_cancer]`로 정리 가능하다. 숫자 KRW quote 4건이 있으므로 다음 seed PR에서 source document 1건, quote approval 4건, active recommendation snapshot 1건을 준비할 수 있다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 입력 disclosure probe | `data/insurance/latest_db_life_cancer_disclosure_adapter_probe.json` |
| 입력 quote rows | `data/insurance/latest_premium_quote_probe.json` |
| 입력 seed | `src/lib/db/seed.ts` |
| 신규 검수 JSON | `data/insurance/latest_db_life_cancer_matching_review.json` |
| 신규 검수 CSV | `data/insurance/latest_db_life_cancer_matching_review.csv` |
| PDF 텍스트 추출 | DB생명 공식 약관 PDF |
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
| 공식 unique document hash | 1 |
| source별 document candidate | 1 |
| quote row 확인 | 4 |
| 숫자 KRW quote row | 4 |
| 이번 PR 추천 노출 변경 | 0 |

---

## 3. Variant 판단

공식 PDF 텍스트에서 아래 값이 확인됐다.

| 항목 | 확인값 |
|---|---|
| 약관 제목 | `무배당 e로운 암보험(해약환급금 미지급형)(2601)` |
| 보험상품명 | `무배당 e로운 암보험(해약환급금 미지급형)(2601)` |
| 보험상품의 종목 | `암보험` |
| 약관 file hash | `3c25a911b796fa239c45aec82afce4d24e310d76e516ad45ba86821cc58d0074` |
| PDF 크기 | 4,247,768 bytes |

따라서 `src_db_life_eroun_cancer_202601` source에는 공식 약관 1건을 seed 후보로 연결할 수 있다. 이번 adapter pass에서는 상품요약서와 사업방법서의 공식 URL/hash를 별도로 찾지 못했으므로, 다음 seed PR은 `terms` document 1건만 추가하고 summary/business_method는 공식 출처가 확인될 때까지 비워 둔다.

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

약관에는 암진단자금, 특정3대암진단자금, 소액암진단자금, 유방암, 기타피부암, 특정갑상선암, 대장점막내암, 납입면제, 해약환급금 미지급형 조건이 등장한다. 이 항목들은 현재 DNA risk key와 직접 1:1 매칭하지 않고 `coverage_details_json` 및 `coverage_caveats_json`에 표시한다.

---

## 5. Source별 판정

| Provider | Source | Product code | 판정 | 이유 |
|---|---|---|---|---|
| DB생명 | `src_db_life_eroun_cancer_202601` | `L71C009000006` | snapshot 후보 | 공식 약관 1건과 숫자 quote 4건이 있고 약관이 상품명, 해약환급금 미지급형, 2601 version, 암보험 종목을 명시한다 |

---

## 6. Caveat 정리

| Caveat | 추천 UI 반영 |
|---|---|
| 90일 암 보장개시일 | 암 보장개시일은 계약일 또는 부활일부터 90일이 지난 날의 다음날이므로 초기 90일 보장 제외를 표시 |
| 1년 미만 감액 | 계약일부터 1년 미만 암, 특정3대암, 소액암 지급사유 발생 시 50% 지급 조건을 표시 |
| 유방암 180일 조건 | 유방암은 계약일로부터 180일 경과 이전 진단확정 시 암진단자금 20% 지급 조건을 별도 표시 |
| 소액암/특정3대암 분리 | 소액암과 특정3대암은 일반 암진단자금과 별도 급부로 표시 |
| 해약환급금 미지급형 | 납입기간 중 해지 시 해약환급금 없음, 납입기간 이후 표준형 해약환급금 50% 기준을 표시 |
| 최종 약관 확인 | 납입면제와 보장 제외 조건은 세부 조항을 따르므로 최종 가입 전 공식 약관 확인을 요구 |

---

## 7. Quote 상태

| Source | age34 female | age34 male | age44 female | age44 male | 상태 |
|---|---:|---:|---:|---:|---|
| `src_db_life_eroun_cancer_202601` | 9,700 | 10,300 | 10,900 | 13,300 | 숫자 KRW, 승인 전 `needs_review` |

숫자 quote row 4건은 다음 recommendation snapshot seed PR에서 실제 운영 DB quote ID를 확인한 뒤 승인 근거를 함께 남긴다. quote row가 아직 `needs_review`이므로 UI에는 확정 가격처럼 표시하지 않는다.

---

## 8. Snapshot 준비 판단

이번 PR은 추천 snapshot을 발행하지 않는다. 다음 PR은 아래 항목을 묶어서 준비한다.

1. DB생명 source document `terms` 1건 seed 추가.
2. quote 4건 approval.
3. `prod_db_life_eroun_cancer_202601` snapshot 1건 추가.

적용 후 운영 DB 기준 source-backed active 추천 상품은 16건에서 17건으로 늘어야 한다.

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
| Functionality | 공식 약관 variant와 DNA risk key 매칭을 추천 가능한 구조로 연결했다 |
| Potential Impact | 실제 판매 암보험 추천 후보를 1개 더 확대할 준비가 됐다 |
| Novelty | DB생명 공식 공시 약관, 보험다모아 quote, DNA risk key를 하나의 검수 산출물로 결합했다 |
| UX | 90일 보장개시일, 초기 감액, 유방암 180일 조건, 소액암/특정3대암 분리, 해약환급금 미지급형 조건을 추천 카드에 표시할 준비가 됐다 |
| Open-source | 브라우저 헤더가 필요한 공식 약관 source를 snapshot 후보로 다루는 반복 가능한 기준을 남겼다 |
| Business Plan | 추천 가능한 실제 암보험 상품 수를 늘릴 수 있는 seed/apply 직전 단계를 완료했다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [DB Life Cancer Disclosure Adapter Probe](./81_DB_LIFE_CANCER_DISCLOSURE_ADAPTER_PROBE_2026_06_01.md) - DB생명 공식 문서 hash 확보 근거
- **QA_Validation**: [Hanwha General Cancer Matching Review](./78_HANWHA_GENERAL_CANCER_MATCHING_REVIEW_2026_06_01.md) - 직전 암보험 단일 약관 매칭 검수 패턴
- **Data**: [DB Life Cancer Matching Review JSON](../../data/insurance/latest_db_life_cancer_matching_review.json) - 구조화 검수 결과
- **Data**: [DB Life Cancer Matching Review CSV](../../data/insurance/latest_db_life_cancer_matching_review.csv) - 검수 요약
