# [QA] 삼성화재 실손 Baseline 추천 Snapshot Seed 검증
> Created: 2026-05-31 16:42
> Last Updated: 2026-05-31 16:42

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 삼성화재 다이렉트 실손의료비보험 source 승인, quote 승인, `insurance_products` baseline snapshot seed 준비
- **결론**: PR #57에서 해소한 삼성화재 문서 특이성 blocker를 seed에 반영했다. 적용 시 삼성화재 source 1건은 `approved`, quote row 4건은 `approved`, 신규 `insurance_products` snapshot 1건은 `catalog_status=approved`, `is_active=1`, `matching_strategy=baseline`, `risk_targets=[]`로 들어간다. 이번 PR은 운영 DB write를 하지 않으며, 운영 반영은 백업 후 별도 apply PR에서 진행한다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 입력 검수 | `data/insurance/latest_samsung_fire_medical_document_reprobe.json` |
| 보조 검수 | `data/insurance/latest_medical_baseline_matching_review.json` |
| 변경 seed | `src/lib/db/seed.ts` |
| 갱신 seed 산출물 | `data/insurance/latest_medical_baseline_recommendation_snapshot_seed.json` |
| DB write | 0 |
| 신규 source approval | 1 |
| 신규 quote approval | 4 |
| 신규 `insurance_products` snapshot | 1 |

---

## 2. Seed 변경 요약

| 대상 | 변경 |
|---|---:|
| `FIRST_RECOMMENDATION_SOURCE_APPROVALS` | +1 |
| `MEDICAL_BASELINE_APPROVED_QUOTE_IDS` | +4 |
| `FIRST_RECOMMENDATION_SNAPSHOT_PRODUCTS` | +1 |
| `ACTIVE_INSURANCE_PRODUCTS` | 자동 +1 |
| 신규 DB row 직접 insert | 0 |

이번 seed PR은 이미 수집된 source row, quote row, source document row를 추천 snapshot으로 연결하는 준비 작업이다. 운영 DB 적용은 하지 않는다.

---

## 3. Source 승인 대상

| Provider | Source | 대표 문서 | 대표 보험료 | 판정 |
|---|---|---|---:|---|
| 삼성화재 | `src_samsung_fire_direct_medical_202605` | `doc_samsung_fire_direct_medical_terms_202605` | 7,503 KRW | baseline snapshot 준비 |

대표 보험료는 보험다모아 실손의료보험 모바일 공개 비교 조건 중 `age34_female`을 사용한다. 조건별 가격은 `insurance_premium_quotes`에서 별도 표시한다.

---

## 4. Quote 승인 대상

운영 DB 읽기 전용 확인으로 실제 row ID를 확정했다. 남성 조건은 기존 실손 baseline과 동일하게 probe 초기 suffix가 아니라 운영 DB 실제 suffix를 사용한다.

| 조건 | Quote row ID | 보험료 |
|---|---|---:|
| `age34_male` | `quote_src_samsung_fire_direct_medical_202605_age34_male_f20570f4817b` | 6,575 KRW |
| `age34_female` | `quote_src_samsung_fire_direct_medical_202605_age34_female_b141dc7c5700` | 7,503 KRW |
| `age44_male` | `quote_src_samsung_fire_direct_medical_202605_age44_male_2a491b5a1fab` | 9,546 KRW |
| `age44_female` | `quote_src_samsung_fire_direct_medical_202605_age44_female_58dcc145a6b7` | 11,938 KRW |

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
| 대표 문서 hash | `db0ed9738c9f59fbb28b678b910e0bdd3ef4bf08bdac52643c2e2dd167003415` |

실손 baseline 상품은 암보험처럼 DNA risk target 점수와 직접 경쟁하지 않는다. 추천 엔진과 UI는 이 상품을 기본 의료비 방어 lane으로 표시해야 한다.

---

## 6. 적용 전후 예상

운영 DB 적용 전 기준은 PR #53 이후 상태다.

| 항목 | 적용 전 | 적용 후 예상 |
|---|---:|---:|
| active source-backed 추천 상품 | 8 | 9 |
| source approved | 8 | 9 |
| quote approved | 32 | 36 |
| baseline active product | 3 | 4 |

적용 PR에서는 운영 DB 백업 후 `npx tsx src/lib/db/seed.ts`를 실행하고 위 카운트를 검증한다.

---

## 7. 안전성

- DB write는 이번 PR에서 수행하지 않았다.
- Drizzle schema와 migration은 변경하지 않았다.
- legacy demo 상품은 계속 `archived` 상태로 유지한다.
- `matching_strategy=baseline` 상품은 `risk_targets=[]`를 유지한다.
- 신한라이프 표준형 source는 일반형 공식 문서 endpoint 미발견으로 계속 `raw` 차단 상태를 유지한다.

---

## 8. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 실손 baseline 추천 상품을 3개에서 4개로 확대할 seed 준비를 마쳤다 |
| Potential Impact | 테스트 사용자가 삼성화재까지 포함해 주요 손보사 실손 상품을 비교할 수 있게 된다 |
| Novelty | DNA risk-target 추천과 baseline 의료비 방어 추천을 같은 카탈로그에서 분리 운영한다 |
| UX | 삼성화재 상품도 대표 보험료와 조건별 보험료, 공식 출처, caveat를 함께 표시할 수 있다 |
| Open-source | source 승인, quote 승인, snapshot 발행 패턴을 반복 가능한 문서로 남긴다 |
| Business Plan | 실제 상품 카탈로그 폭을 넓혀 보험 비교/제휴 검증 가능성을 높인다 |

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Samsung Fire Medical Document Reprobe](./53_SAMSUNG_FIRE_MEDICAL_DOCUMENT_REPROBE_2026_05_31.md) - 삼성화재 문서 특이성 blocker 해소 검증
- **QA_Validation**: [Medical Baseline Snapshot Seed](./47_MEDICAL_BASELINE_SNAPSHOT_SEED_2026_05_31.md) - 선행 실손 baseline seed 패턴
- **Data**: [Medical Baseline Recommendation Snapshot Seed JSON](../../data/insurance/latest_medical_baseline_recommendation_snapshot_seed.json) - 구조화 seed 준비 결과
- **Data**: [Samsung Fire Medical Document Reprobe JSON](../../data/insurance/latest_samsung_fire_medical_document_reprobe.json) - 삼성화재 상품 전용 문서 재탐색 결과
