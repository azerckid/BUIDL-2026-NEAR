# [QA] 실손의료보험 Baseline 매칭 키워드와 Caveat 검수
> Created: 2026-05-31 02:20
> Last Updated: 2026-05-31 16:14

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 공식 문서 hash와 조건별 quote row가 있는 실손의료보험 source 4개의 `coverage_category`, `matching_strategy`, `risk_targets`, caveat, snapshot 준비도 검수
- **결론**: DB손보, KB손보, 현대해상, 삼성화재 4개 실손의료보험 source는 모두 `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]`로 정리할 수 있다. 삼성화재는 2026-05-31 16:14 KST 재탐색으로 직접 상품 상세 페이지와 PDF 텍스트 근거가 확인되어 문서 특이성 blocker가 해소됐다. DB write와 `seed.ts` 변경은 하지 않았다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 입력 seed | `src/lib/db/seed.ts` |
| 입력 공시 probe | `data/insurance/latest_carrier_disclosure_probe.json` |
| 입력 quote apply | `data/insurance/latest_premium_quote_rows_apply.json` |
| 입력 삼성화재 재탐색 | `data/insurance/latest_samsung_fire_medical_document_reprobe.json` |
| 신규 검수 JSON | `data/insurance/latest_medical_baseline_matching_review.json` |
| 신규 검수 CSV | `data/insurance/latest_medical_baseline_matching_review.csv` |
| DB write | 0 |
| `seed.ts` 변경 | 0 |
| 추천 snapshot 변경 | 0 |

---

## 2. 요약

| 항목 | 결과 |
|---|---:|
| 검수 source | 4 |
| baseline ready source | 4 |
| 문서 특이성 blocker | 0 |
| quote row 확인 | 16 |
| 숫자 KRW quote row | 16 |
| 이번 PR 추천 노출 변경 | 0 |

---

## 3. 공통 매칭 정책

실손의료보험은 특정 DNA risk key와 직접 연결하지 않는다. 사용자가 암, 대사, 심혈관, 신경계 위험 중 어떤 flag를 갖더라도 실손은 질병/상해 의료비를 폭넓게 방어하는 기본 보장이다.

| 필드 | 값 |
|---|---|
| `coverage_category` | `medical_expense` |
| `matching_strategy` | `baseline` |
| `risk_targets` | `[]` |
| 추천 위치 | 위험 점수 랭킹이 아니라 기본 의료비 방어 섹션 |

---

## 4. Source별 판정

| Provider | Source | Product code | 문서 근거 | Quote | 판정 |
|---|---|---|---|---|---|
| DB손보 | `src_db_direct_medical_202605` | `N11G004000001G` | 약관/사업방법서/상품요약서, match 1.0 | 4/4 numeric | 다음 seed 후보 |
| KB손보 | `src_kb_direct_medical_202605` | `N10G004000002G` | 약관, match 1.0 | 4/4 numeric | 다음 seed 후보 |
| 현대해상 | `src_hyundai_direct_medical_202605` | `N09G004000001G` | 약관, match 1.0 | 4/4 numeric | 다음 seed 후보 |
| 삼성화재 | `src_samsung_fire_direct_medical_202605` | `N08G004000002G` | 직접 상품 상세 페이지 + 약관 PDF 텍스트, match 1.0 | 4/4 numeric | 다음 seed 후보 |

삼성화재는 기존 carrier disclosure probe만으로는 generic `realloss.pdf`처럼 보였으나, 후속 재탐색에서 직접 상품 상세 페이지가 상품약관 PDF를 링크하고 PDF 텍스트가 `2605.1` 및 일반형 조항을 포함함을 확인했다.

---

## 5. Caveat 정리

### 5-1. 공통 caveat

| Caveat | 추천 UI 반영 |
|---|---|
| baseline 상품 | 유전자 위험 특화 추천이 아니라 기본 의료비 방어로 표시 |
| 개인 견적 아님 | 보험다모아 quote는 공개 비교 조건의 예시 보험료이며 개인별 인수 심사 견적이 아님 |
| 자기부담금 | 실제 보장에는 자기부담금, 급여/비급여, 보장 한도 조건이 적용됨 |
| 갱신형 | 갱신 시 보험료가 달라질 수 있음 |

### 5-2. Source별 추가 caveat

| Source | 추가 caveat |
|---|---|
| `src_db_direct_medical_202605` | 약관, 사업방법서, 상품요약서 hash가 모두 있어 대표 문서 선택 가능 |
| `src_kb_direct_medical_202605` | 대표 문서는 약관 1건이며 고정 PDF URL은 refresh 시 hash 변경 여부 확인 필요 |
| `src_hyundai_direct_medical_202605` | 갱신형 상품이므로 갱신 보험료 변동과 재가입 조건 표시 필요 |
| `src_samsung_fire_direct_medical_202605` | 직접 상품 상세 페이지와 PDF 텍스트 근거로 상품 전용성을 확인했으며, 고정 PDF URL은 refresh 시 hash 변경 여부 확인 필요 |

---

## 6. Quote 상태

| Source | Quote row | 숫자 quote | 보험료 범위 |
|---|---:|---:|---|
| `src_db_direct_medical_202605` | 4 | 4 | 6,219~11,030 KRW |
| `src_kb_direct_medical_202605` | 4 | 4 | 6,400~10,323 KRW |
| `src_hyundai_direct_medical_202605` | 4 | 4 | 6,545~9,949 KRW |
| `src_samsung_fire_direct_medical_202605` | 4 | 4 | 6,575~11,938 KRW |

이번 PR은 quote row를 승인하지 않는다. 다음 seed PR에서 삼성화재 4개 quote row를 `approved`로 승격할지 판단한다.

---

## 7. Snapshot 준비 판단

| 우선순위 | 대상 | 조건 |
|---|---|---|
| 완료 | DB손보 실손 | source status 승격, quote 승인, baseline snapshot row 생성 |
| 완료 | KB손보 실손 | source status 승격, quote 승인, baseline snapshot row 생성 |
| 완료 | 현대해상 실손 | source status 승격, quote 승인, baseline snapshot row 생성 |
| 1 | 삼성화재 실손 | source status 승격, quote 승인, baseline snapshot row 생성 |

실손 baseline snapshot은 암보험처럼 DNA risk target 점수와 직접 경쟁하지 않는다. 다음 seed PR은 `matching_strategy=baseline`, `risk_targets=[]`, `coverage_category=medical_expense`가 유지되는지 반드시 확인해야 한다.

---

## 8. 안전성

- 이번 작업은 data/docs 산출물만 추가한다.
- `seed.ts`, Drizzle schema, Turso DB, `.env.local`은 수정하지 않았다.
- active `insurance_products` 추천 snapshot은 변경하지 않았다.
- 실손 baseline 상품은 위험 점수 랭킹에 섞지 않는다.
- 삼성화재는 문서 특이성 blocker가 해소됐지만, seed/apply 전까지 추천 snapshot에는 노출하지 않는다.

---

## 9. 다음 작업

1. 삼성화재 source를 대상으로 source status 승격, quote row 승인, baseline `insurance_products` snapshot row 생성을 묶은 seed PR을 만든다.
2. seed PR에서 `primary_source_document_id`, `coverage_details_json`, `coverage_caveats_json`, `monthly_premium_krw`, `premium_basis`, `monthly_premium_usdc` 환산 기준을 함께 기록한다.
3. 운영 DB 백업 후 seed apply PR로 source-backed active 추천 상품을 8건에서 9건으로 확대한다.
4. 실손 baseline 상품이 dashboard에서 위험 추천과 구분되어 보이는지 UI 회귀 검증한다.

---

## 10. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 실손의료보험을 DNA risk target 직접 매칭이 아닌 baseline lane으로 정리했다 |
| Potential Impact | source-backed 추천 후보를 암보험 5개에서 의료비 baseline 상품까지 넓힐 준비가 됐다 |
| Novelty | 보험다모아 quote, 공식 PDF hash, 유전자 위험 매칭 정책을 baseline 추천 구조로 분리했다 |
| UX | 사용자에게 특정 질병 보장과 기본 의료비 방어 상품을 혼동시키지 않는다 |
| Open-source | 같은 JSON/CSV 검수 형식으로 다른 실손/유병력자실손 상품에도 반복 적용 가능하다 |
| Business Plan | 실제 테스트 사용자가 선택할 수 있는 상품군을 암보험에서 실손 baseline까지 확장할 수 있다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Insurance Review Queue](./07_INSURANCE_REVIEW_QUEUE_2026_05_27.md) - 실손의료보험 hash-backed 후보의 초기 review queue
- **QA_Validation**: [Premium Quote Rows DB Apply](./15_PREMIUM_QUOTE_ROWS_DB_APPLY_2026_05_28.md) - 실손 조건별 quote row 적용 근거
- **QA_Validation**: [Premium Quote Matrix UI](./35_PREMIUM_QUOTE_MATRIX_UI_2026_05_30.md) - 대표 보험료와 조건별 quote 표시 UI
- **QA_Validation**: [Samsung Fire Medical Document Reprobe](./53_SAMSUNG_FIRE_MEDICAL_DOCUMENT_REPROBE_2026_05_31.md) - 삼성화재 문서 특이성 blocker 해소 근거
- **Data**: [Medical Baseline Matching Review JSON](../../data/insurance/latest_medical_baseline_matching_review.json) - 구조화 검수 결과
- **Data**: [Medical Baseline Matching Review CSV](../../data/insurance/latest_medical_baseline_matching_review.csv) - 검수 요약
