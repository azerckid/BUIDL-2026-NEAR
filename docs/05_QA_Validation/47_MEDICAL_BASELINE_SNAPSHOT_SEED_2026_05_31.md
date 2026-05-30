# [QA] 실손의료보험 Baseline 추천 Snapshot Seed 검증
> Created: 2026-05-31 02:49
> Last Updated: 2026-05-31 02:49

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: DB손보, KB손보, 현대해상 실손의료보험 baseline source의 source 승인, quote 승인, `insurance_products` snapshot seed 준비
- **결론**: PR #49에서 `ready_for_seed_pr`로 분리한 DB손보, KB손보, 현대해상 3개 실손의료보험 source를 baseline 추천 snapshot seed에 반영했다. 적용 시 source 3건은 `approved`, quote row 12건은 `approved`, 신규 `insurance_products` 3건은 `catalog_status=approved`, `is_active=1`, `matching_strategy=baseline`, `risk_targets=[]`로 들어간다. 이번 PR은 운영 DB write를 하지 않으며, 운영 반영은 백업 후 별도 apply PR에서 진행한다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 입력 검수 | `data/insurance/latest_medical_baseline_matching_review.json` |
| 변경 seed | `src/lib/db/seed.ts` |
| 신규 seed 산출물 | `data/insurance/latest_medical_baseline_recommendation_snapshot_seed.json` |
| DB write | 0 |
| 신규 source approval | 3 |
| 신규 quote approval | 12 |
| 신규 `insurance_products` snapshot | 3 |

---

## 2. Seed 변경 요약

| 대상 | 변경 |
|---|---:|
| `FIRST_RECOMMENDATION_SOURCE_APPROVALS` | +3 |
| `MEDICAL_BASELINE_APPROVED_QUOTE_IDS` | +12 |
| `FIRST_RECOMMENDATION_SNAPSHOT_PRODUCTS` | +3 |
| `ACTIVE_INSURANCE_PRODUCTS` | 자동 +3 |
| 신규 DB row 직접 insert | 0 |

이번 seed PR은 기존 source row, quote row, source document row를 승인하고 snapshot으로 연결하는 준비 작업이다. 운영 DB 적용은 하지 않는다.

---

## 3. Source 승인 대상

| Provider | Source | 대표 문서 | 대표 보험료 | 판정 |
|---|---|---|---:|---|
| DB손보 | `src_db_direct_medical_202605` | `doc_db_direct_medical_terms_202605` | 6,854 KRW | baseline snapshot 준비 |
| KB손보 | `src_kb_direct_medical_202605` | `doc_kb_direct_medical_terms_202605` | 6,439 KRW | baseline snapshot 준비 |
| 현대해상 | `src_hyundai_direct_medical_202605` | `doc_hyundai_direct_medical_terms_202605` | 6,545 KRW | baseline snapshot 준비 |

대표 보험료는 모두 보험다모아 실손의료보험 모바일 공개 비교 조건 중 `age34_female`을 사용한다. 조건별 가격은 `insurance_premium_quotes`에서 별도 표시한다.

---

## 4. Quote 승인 대상

| Source | Quote row | 조건 |
|---|---:|---|
| `src_db_direct_medical_202605` | 4 | `age34_male`, `age34_female`, `age44_male`, `age44_female` |
| `src_kb_direct_medical_202605` | 4 | `age34_male`, `age34_female`, `age44_male`, `age44_female` |
| `src_hyundai_direct_medical_202605` | 4 | `age34_male`, `age34_female`, `age44_male`, `age44_female` |

승인 후 dashboard는 기존 개인화 로직에 따라 사용자가 선택한 나이/성별과 일치하는 approved quote를 `내 조건 예상 보험료`로 표시할 수 있다.

---

## 5. Snapshot 필드 기준

| 필드 | 값 |
|---|---|
| `coverage_category` | `medical_expense` |
| `matching_strategy` | `baseline` |
| `risk_targets` | `[]` |
| `catalog_status` | `approved` |
| `is_active` | `1` |
| `premium_currency` | `KRW` |
| USDC 환산 | `1 USDC = 1,350 KRW` 고정 데모 환산율 |

실손 baseline 상품은 암보험처럼 DNA risk target 점수와 직접 경쟁하지 않는다. 추천 엔진과 UI는 이 상품들을 기본 의료비 방어 lane으로 표시해야 한다.

---

## 6. 차단 유지 항목

| Source | 이유 |
|---|---|
| `src_samsung_fire_direct_medical_202605` | quote는 있으나 문서 URL이 generic `realloss.pdf`이고 match score 0.65라 상품 전용 문서 endpoint 재탐색 필요 |
| `src_shinhan_life_sol_cancer_standard_202605` | 일반형 공식 문서 endpoint 미발견. 해약환급금 미지급형 문서 재사용 금지 |

---

## 7. 적용 전후 예상

운영 DB 적용 전 기준은 PR #47 이후 상태다.

| 항목 | 적용 전 | 적용 후 예상 |
|---|---:|---:|
| active source-backed 추천 상품 | 5 | 8 |
| source approved | 5 | 8 |
| quote approved | 20 | 32 |
| baseline active product | 0 | 3 |

적용 PR에서는 운영 DB 백업 후 `npx tsx src/lib/db/seed.ts`를 실행하고 위 카운트를 검증한다.

---

## 8. 안전성

- DB write는 이번 PR에서 수행하지 않았다.
- Drizzle schema와 migration은 변경하지 않았다.
- 삼성화재는 문서 특이성 blocker가 해소되기 전까지 추천 snapshot에 포함하지 않는다.
- legacy demo 상품은 계속 `archived` 상태로 유지한다.
- `matching_strategy=baseline` 상품은 `risk_targets=[]`를 유지한다.

---

## 9. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 실제 source-backed 추천 상품을 암보험 5개에서 실손 baseline 8개 후보 체계로 확장할 준비를 마쳤다 |
| Potential Impact | 테스트 사용자가 암보험뿐 아니라 기본 의료비 방어 상품도 비교할 수 있게 된다 |
| Novelty | DNA risk-target 추천과 baseline 의료비 방어 추천을 같은 카탈로그에서 분리 운영한다 |
| UX | 사용자가 특정 질병 추천과 일반 의료비 보장 상품을 혼동하지 않게 한다 |
| Open-source | source 승인, quote 승인, snapshot 발행 체크리스트를 재사용 가능한 seed 패턴으로 남긴다 |
| Business Plan | 실제 상품 카탈로그 폭을 넓혀 보험 비교/제휴 검증 가능성을 높인다 |

---

## 10. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Medical Baseline Matching Review](./46_MEDICAL_BASELINE_MATCHING_REVIEW_2026_05_31.md) - 이번 seed의 선행 검수
- **QA_Validation**: [Premium Quote Matrix UI](./35_PREMIUM_QUOTE_MATRIX_UI_2026_05_30.md) - 조건별 quote 표시 UI
- **Data**: [Medical Baseline Recommendation Snapshot Seed JSON](../../data/insurance/latest_medical_baseline_recommendation_snapshot_seed.json) - 구조화 seed 준비 결과
- **Data**: [Medical Baseline Matching Review JSON](../../data/insurance/latest_medical_baseline_matching_review.json) - source별 baseline 매칭 검수
