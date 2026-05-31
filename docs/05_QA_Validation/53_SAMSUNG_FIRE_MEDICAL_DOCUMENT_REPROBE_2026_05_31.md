# [QA] 삼성화재 실손의료보험 상품 전용 문서 재탐색
> Created: 2026-05-31 16:14
> Last Updated: 2026-05-31 16:14

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: `src_samsung_fire_direct_medical_202605` / `N08G004000002G`의 generic `realloss.pdf` 문서 특이성 blocker 재검증
- **결론**: 삼성화재 다이렉트 상품 상세 페이지가 `realloss.pdf` 상품약관 링크를 직접 노출하고, PDF 텍스트가 `무배당 삼성화재 다이렉트 실손의료비보험(2605.1)` 및 일반형 조항을 포함한다. 따라서 문서 특이성 blocker는 해소됐고, 다음 PR에서 baseline seed 후보로 다룰 수 있다.

---

## 1. 실행 범위

| 항목 | 값 |
|---|---|
| 실행 스크립트 | `npm run collect:insurance:samsung-fire-medical-docs` |
| 신규 스크립트 | `scripts/insurance/probe-samsung-fire-medical-documents.mjs` |
| 신규 JSON | `data/insurance/latest_samsung_fire_medical_document_reprobe.json` |
| 신규 CSV | `data/insurance/latest_samsung_fire_medical_document_reprobe.csv` |
| DB write | 0 |
| `seed.ts` 변경 | 0 |
| 추천 snapshot 변경 | 0 |

---

## 2. 대상 상품

| 필드 | 값 |
|---|---|
| provider | 삼성화재 |
| product_source_id | `src_samsung_fire_direct_medical_202605` |
| carrier_id | `carrier_samsung_fire` |
| 보험다모아 product code | `N08G004000002G` |
| 상품명 | 무배당 삼성화재 다이렉트 실손의료비보험(2605.1) |
| 기존 blocker | `realloss.pdf`가 generic 문서처럼 보이고 carrier match score가 0.65라 상품 전용성 미확정 |

---

## 3. 재탐색 결과

| 검증 항목 | 결과 |
|---|---|
| 직접 상품 상세 페이지 접근 | PASS |
| 직접 상품 상세 페이지의 상품명 근거 | PASS |
| 직접 상품 상세 페이지의 상품약관 링크 | PASS |
| 직접 상품 상세 페이지의 2026년 5월 요율/5세대 실손 문구 | PASS |
| `realloss.pdf` 다운로드 | PASS |
| PDF SHA-256 | `db0ed9738c9f59fbb28b678b910e0bdd3ef4bf08bdac52643c2e2dd167003415` |
| PDF 텍스트 내 상품명 | PASS |
| PDF 텍스트 내 `2605.1` 버전 | PASS |
| PDF 텍스트 내 일반형 조항 | PASS |

직접 상품 상세 페이지:

```text
https://direct.samsungfire.com/mall/PP030404_001.html?pcMode=true
```

상품약관 PDF:

```text
https://direct.samsungfire.com/docs/realloss.pdf
```

---

## 4. 판정

| 항목 | 이전 | 재탐색 후 |
|---|---|---|
| document specificity | blocked | resolved |
| recommended_matching_review_status | `baseline_blocked_document_specificity` | `baseline_ready_snapshot_candidate` |
| snapshot_readiness | `blocked_until_product_specific_document_confirmed` | `ready_for_seed_pr_after_source_document_update` |
| active 추천 노출 | 변경 없음 | 변경 없음 |

이번 PR은 문서 특이성 blocker만 해소한다. 운영 추천 노출은 다음 seed PR과 DB apply PR에서 별도로 처리한다.

---

## 5. 다음 작업

1. `seed.ts`에서 삼성화재 source를 `approved`로 승격한다.
2. 삼성화재 실손 baseline `insurance_products` snapshot row를 추가한다.
3. 삼성화재 조건별 quote 4건을 `approved`로 승격한다.
4. 운영 DB 백업 후 seed apply PR에서 source-backed active 추천 상품을 8건에서 9건으로 확대한다.

---

## 6. 안전성

- 원문 PDF는 저장하지 않고 URL, hash, 텍스트 근거 여부만 기록했다.
- DB write, migration, seed 변경은 수행하지 않았다.
- 기존 active 추천 상품 8건에는 영향이 없다.
- 실손의료보험 정책은 계속 `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]`로 유지한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 삼성화재 실손의료보험을 baseline 후보로 승격할 수 있는 공식 문서 근거가 확보됐다 |
| Potential Impact | 실손 baseline 추천 상품군을 3개에서 4개로 확대할 준비가 됐다 |
| Novelty | 보험다모아 quote, 공식 상품 상세 페이지, PDF hash, PDF 텍스트 근거를 한 번에 연결했다 |
| UX | 사용자가 삼성화재 상품을 볼 때 출처와 caveat를 함께 확인할 수 있는 기반이 생겼다 |
| Open-source | 삼성화재 전용 probe를 수동 반복 실행 가능한 스크립트로 남겼다 |
| Business Plan | 실제 보험사 상품 universe를 늘려 테스트 사용자에게 더 현실적인 비교 경험을 제공할 수 있다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 실손 baseline 매칭 정책
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Medical Baseline Matching Review](./46_MEDICAL_BASELINE_MATCHING_REVIEW_2026_05_31.md) - 삼성화재 blocker의 선행 기록
- **QA_Validation**: [Medical Baseline Quote UI Verification](./51_MEDICAL_BASELINE_QUOTE_UI_VERIFICATION_2026_05_31.md) - 실손 baseline UI 검증
- **Data**: [Samsung Fire Medical Document Reprobe JSON](../../data/insurance/latest_samsung_fire_medical_document_reprobe.json) - 구조화 재탐색 결과
- **Data**: [Samsung Fire Medical Document Reprobe CSV](../../data/insurance/latest_samsung_fire_medical_document_reprobe.csv) - 재탐색 요약
