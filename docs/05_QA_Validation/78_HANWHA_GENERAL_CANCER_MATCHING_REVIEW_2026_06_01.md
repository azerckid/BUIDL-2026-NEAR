# [QA] 한화손보 암보험 매칭 키워드와 Caveat 검수
> Created: 2026-06-01 02:09
> Last Updated: 2026-06-01 02:09

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 한화손보 `src_hanwha_general_direct_cancer_202604` source의 문서 variant, `coverage_category`, `risk_targets`, `matching_strategy`, caveat, quote 상태 검수
- **결론**: 한화손보 다이렉트 내가고른 암보험은 공식 약관 `LA02969001.pdf` 1건으로 source evidence gate를 통과했고, `coverage_category=oncology`, `matching_strategy=risk_target`, `risk_targets=[pancreatic_cancer,liver_cancer,lung_cancer,breast_cancer,colon_cancer]`로 정리 가능하다. 숫자 KRW quote 4건이 있으므로 다음 seed PR에서 source document 1건, quote approval 4건, active recommendation snapshot 1건을 준비할 수 있다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 입력 disclosure probe | `data/insurance/latest_hanwha_general_cancer_disclosure_adapter_probe.json` |
| 입력 quote rows | `data/insurance/latest_premium_quote_rows_apply.json` |
| 입력 seed | `src/lib/db/seed.ts` |
| 신규 검수 JSON | `data/insurance/latest_hanwha_general_cancer_matching_review.json` |
| 신규 검수 CSV | `data/insurance/latest_hanwha_general_cancer_matching_review.csv` |
| PDF 텍스트 추출 | 한화손보 공식 약관 `LA02969001.pdf` |
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
| 약관 제목 | `한화 다이렉트 내가고른 암보험 무배당2604` |
| 약관 개정일 | `2026.04.01` |
| PDF 파일 | `LA02969001.pdf` |
| 약관 file hash | `ca8dd26a25c1aa60cefb4c298c8df843f8a35d5bf0ff758a0624e37ddaf15ca0` |
| PDF 크기 | 2,071,737 bytes |

따라서 `src_hanwha_general_direct_cancer_202604` source에는 공식 약관 1건을 seed 후보로 연결할 수 있다. 이번 adapter pass에서는 상품요약서와 사업방법서의 공식 URL/hash를 별도로 찾지 못했으므로, 다음 seed PR은 `terms` document 1건만 추가하고 summary/business_method는 공식 출처가 확인될 때까지 비워 둔다.

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

약관에는 4대유사암, 특정유사암, 표적항암, 항암양성자방사선, 항암세기조절방사선, CAR-T, 다빈치로봇수술, 입원, 수술 담보가 등장한다. 이 항목들은 현재 DNA risk key와 직접 1:1 매칭하지 않고 `coverage_details_json` 및 `coverage_caveats_json`에 표시한다.

---

## 5. Source별 판정

| Provider | Source | Product code | 판정 | 이유 |
|---|---|---|---|---|
| 한화손보 | `src_hanwha_general_direct_cancer_202604` | `N02C009000016` | snapshot 후보 | 공식 약관 1건과 숫자 quote 4건이 있고 약관이 상품명과 개정일을 명시한다 |

---

## 6. Caveat 정리

| Caveat | 추천 UI 반영 |
|---|---|
| 선택특약형 상품 | 약관은 가입 특약별 지급사유와 미지급사유 확인을 요구하므로 실제 가입 담보에 따라 보장 범위가 달라질 수 있음을 표시 |
| 90일 암 면책 | 암(4대유사암제외)진단비는 계약일부터 90일 이하에는 지급금액이 없음 |
| 1년 미만 감액 | 암(4대유사암제외)진단비는 90일 초과 1년 미만 보험가입금액의 50%, 1년 이상 보험가입금액 기준 |
| 4대유사암 별도 급부 | 기타피부암, 갑상선암, 제자리암, 경계성종양은 일반암과 별도 급부로 표시 |
| 4대유사암 감액 | 4대유사암진단비는 계약일부터 1년 미만 50%, 1년 이상 보험가입금액 기준 |
| 특정유사암 특약 | 특정유사암은 기타피부암과 갑상선암으로 정의되며 표적항암, 양성자방사선, 세기조절방사선 등은 가입 특약별 조건을 따름 |
| 갱신형 특약 | 갱신형 특별약관은 10년 갱신주기와 갱신일 현재 기초율을 적용하므로 보험료가 변동될 수 있음 |
| 납입면제 제외 | 기타피부암, 갑상선암, 제자리암, 경계성종양 및 갱신형 특별약관은 납입면제 대상에서 제외됨 |
| 해약환급금 | 환급금은 납입한 보험료보다 적거나 없을 수 있음 |

---

## 7. Quote 상태

| Source | age34 female | age34 male | age44 female | age44 male | 상태 |
|---|---:|---:|---:|---:|---|
| `src_hanwha_general_direct_cancer_202604` | 12,204 | 13,721 | 13,018 | 17,151 | 숫자 KRW, 승인 전 `needs_review` |

숫자 quote row 4건은 다음 recommendation snapshot seed PR에서 실제 운영 DB quote ID를 확인한 뒤 승인 근거를 함께 남긴다. quote row가 아직 `needs_review`이므로 UI에는 확정 가격처럼 표시하지 않는다.

---

## 8. Snapshot 준비 판단

이번 PR은 추천 snapshot을 발행하지 않는다. 다음 PR은 아래 항목을 묶어서 준비한다.

1. 한화손보 source document `terms` 1건 seed 추가.
2. quote 4건 approval.
3. `prod_hanwha_general_direct_cancer_202604` snapshot 1건 추가.

적용 후 운영 DB 기준 source-backed active 추천 상품은 15건에서 16건으로 늘어야 한다.

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
| Novelty | 한화손보 공식 JS/PDF hash, 보험다모아 quote, DNA risk key를 하나의 검수 산출물로 결합했다 |
| UX | 90일 면책, 1년 미만 감액, 유사암 별도 급부, 갱신형 특약 보험료 변동, 납입면제 제외를 추천 카드에 표시할 준비가 됐다 |
| Open-source | 공식 약관 1건만 있는 source를 snapshot 후보로 다루는 반복 가능한 기준을 남겼다 |
| Business Plan | 추천 가능한 실제 암보험 상품 수를 늘릴 수 있는 seed/apply 직전 단계를 완료했다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Hanwha General Cancer Disclosure Adapter Probe](./77_HANWHA_GENERAL_CANCER_DISCLOSURE_ADAPTER_PROBE_2026_06_01.md) - 한화손보 공식 문서 hash 확보 근거
- **QA_Validation**: [Matching Keyword Caveat Review](./30_MATCHING_KEYWORD_CAVEAT_REVIEW_2026_05_30.md) - 암보험 risk target/caveat 정리 선행 패턴
- **Data**: [Hanwha General Cancer Matching Review JSON](../../data/insurance/latest_hanwha_general_cancer_matching_review.json) - 구조화 검수 결과
- **Data**: [Hanwha General Cancer Matching Review CSV](../../data/insurance/latest_hanwha_general_cancer_matching_review.csv) - 검수 요약
