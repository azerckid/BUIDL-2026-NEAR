# [QA] 롯데손보 실손 Baseline 추천 Snapshot Seed 검증
> Created: 2026-06-01 04:59
> Last Updated: 2026-06-01 04:59

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 롯데손보 let:care 실손의료보험 source 문서 seed, source 승인, quote 승인, `insurance_products` baseline snapshot seed 준비
- **결론**: PR #90에서 `baseline_ready_snapshot_candidate`로 정리한 롯데손보 실손 source를 seed에 반영했다. 적용 시 source document 1건이 추가되고, 롯데손보 source 1건은 `approved`, quote row 4건은 `approved`, 신규 `insurance_products` snapshot 1건은 `catalog_status=approved`, `is_active=1`, `matching_strategy=baseline`, `risk_targets=[]`로 들어간다. 이번 PR은 운영 DB write를 하지 않으며, 운영 반영은 백업 후 별도 apply PR에서 진행한다.

---

## 1. 변경 대상

| 항목 | 값 |
|---|---|
| source | `src_lotte_direct_medical_202605` |
| source document | `terms` 1건 |
| product snapshot | `prod_lotte_direct_medical_202605` |
| primary document | `doc_lotte_direct_medical_terms_202605` |
| quote approval | 4건 |
| DB write | 없음 |
| 산출물 | `../../data/insurance/latest_lotte_medical_baseline_snapshot_seed.json` |

---

## 2. Seed 변경 요약

| 구분 | 변경 |
|---|---:|
| `SOURCE_AWARE_DOCUMENTS` | +1 |
| `FIRST_RECOMMENDATION_SOURCE_APPROVALS` | +1 |
| `MEDICAL_BASELINE_APPROVED_QUOTE_IDS` | +4 |
| `FIRST_RECOMMENDATION_SNAPSHOT_PRODUCTS` | +1 |
| 적용 후 source document 예상 | 36 |
| 적용 후 source approval 총계 | 18 |
| 적용 후 quote approval 총계 | 72 |
| 적용 후 active source-backed product 총계 | 18 |
| 적용 후 oncology active product 총계 | 10 |
| 적용 후 baseline active product 총계 | 8 |

---

## 3. Source Document

후속 apply PR에서 아래 1건이 `insurance_source_documents`에 들어가야 한다.

| id | source | type | sha256 | bytes |
|---|---|---|---|---:|
| `doc_lotte_direct_medical_terms_202605` | `src_lotte_direct_medical_202605` | `terms` | `593987e051e2ec7e04292740aeda4448a6a0a60da7d2fc56287c8746322e7168` | 3,867,788 |

공식 약관은 `무배당 let:care 실손의료보험Ⅴ(2605)` 상품명을 명시한다. 이번 adapter pass에서는 상품요약서와 사업방법서의 공식 URL/hash를 별도로 찾지 못했으므로, 이번 seed는 `terms` document 1건만 추가한다.

---

## 4. Source Approval

| source | review_status | sale_status | 대표 보험료 | primary document |
|---|---|---|---:|---|
| `src_lotte_direct_medical_202605` | `approved` | `active` | 15,675 KRW | `doc_lotte_direct_medical_terms_202605` |

이 source는 `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]`로 승격한다. 실손 baseline 상품이므로 DNA 질병 risk target 랭킹에 섞지 않는다.

---

## 5. Quote Approval

운영 DB 읽기 전용 확인으로 실제 row ID를 확정했다. 4건 모두 현재 `needs_review`이며 seed apply 후 `approved`가 되어야 한다.

| quote id | 조건 | 월 보험료 |
|---|---|---:|
| `quote_src_lotte_direct_medical_202605_age34_female_b141dc7c5700` | 34세 여성 | 15,675 KRW |
| `quote_src_lotte_direct_medical_202605_age34_male_60456bed3452` | 34세 남성 | 12,183 KRW |
| `quote_src_lotte_direct_medical_202605_age44_female_58dcc145a6b7` | 44세 여성 | 21,254 KRW |
| `quote_src_lotte_direct_medical_202605_age44_male_26615bdcb076` | 44세 남성 | 17,565 KRW |

---

## 6. Product Snapshot

| 필드 | 값 |
|---|---|
| `id` | `prod_lotte_direct_medical_202605` |
| `monthly_premium_krw` | 15,675 |
| `monthly_premium_usdc` | 11.61 |
| `premium_basis` | 보험다모아 실손의료보험 모바일 공개 조건, 고정 데모 환산율 1 USDC = 1,350 KRW |
| `catalog_status` | `approved` |
| `is_active` | 1 |

대표 보험료는 기존 실손 baseline 정책과 동일하게 `age34_female` 조건을 사용한다. 조건별 가격은 `insurance_premium_quotes`에서 별도 표시한다.

---

## 7. 적용 전후 예상

운영 DB 적용 전 기준은 PR #90 이후 상태다.

| 항목 | 적용 전 | 적용 후 예상 |
|---|---:|---:|
| source document | 35 | 36 |
| active source-backed 추천 상품 | 17 | 18 |
| source approved | 17 | 18 |
| quote approved | 68 | 72 |
| oncology active product | 10 | 10 |
| baseline active product | 7 | 8 |
| insurance_products | 22 | 23 |

적용 PR에서는 운영 DB 백업 후 `npx tsx src/lib/db/seed.ts`를 실행하고 위 카운트를 검증한다.

---

## 8. 안전성

- 이번 PR은 `seed.ts`와 문서/데이터 산출물만 변경하며 운영 DB write를 하지 않는다.
- 적용 PR에서는 운영 DB 백업을 먼저 수행해야 한다.
- legacy demo 상품은 계속 `archived` 상태로 유지한다.
- 공식 문서 hash는 64자 SHA-256이고, DB URL과 auth token은 문서에 기록하지 않는다.
- 추천 상담 AI 컨텍스트에는 apply 후 approved/active 상품만 들어가며 raw source는 계속 제외된다.

---

## 9. 다음 작업

1. 이번 seed PR을 머지한다.
2. 운영 DB 백업 후 `src/lib/db/seed.ts`를 실행한다.
3. 적용 후 source document 36건, source-backed active 추천 상품 18건, approved quote 72건을 확인한다.
4. Dashboard에서 롯데손보 실손 카드와 조건별 보험료가 표시되는지 확인한다.
5. 상담 AI가 롯데손보 상품을 설명할 때 공식 약관 hash와 실손 baseline caveat를 포함하는지 확인한다.

---

## 10. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 롯데손보 실손 1건이 source-backed 추천 snapshot으로 발행될 준비가 끝났다 |
| Potential Impact | baseline active 추천 폭이 7건에서 8건으로 늘어난다 |
| Novelty | EUC-KR 공식 상품 페이지, 약관 PDF hash, 보험다모아 quote matrix를 source별 snapshot으로 결합한다 |
| UX | 사용자는 롯데손보 카드에서도 조건별 보험료, 출처, caveat를 확인할 수 있다 |
| Open-source | 공식 약관 1건만 확보된 실손 source를 baseline snapshot으로 발행하는 반복 가능한 seed 정책을 남긴다 |
| Business Plan | 실제 상품 카탈로그 폭을 넓혀 테스트 사용자 피드백의 비교 폭을 넓힌다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Lotte Medical Disclosure Adapter Probe](./85_LOTTE_MEDICAL_DISCLOSURE_ADAPTER_PROBE_2026_06_01.md) - 공식 문서 hash 검증
- **QA_Validation**: [Lotte Medical Matching Review](./86_LOTTE_MEDICAL_MATCHING_REVIEW_2026_06_01.md) - 이번 seed의 매칭 검수 근거
- **QA_Validation**: [Heungkuk Fire Baseline Snapshot Seed](./71_HEUNGKUK_FIRE_BASELINE_SNAPSHOT_SEED_2026_05_31.md) - 직전 실손 baseline snapshot seed 패턴
- **Data**: [Lotte Medical Baseline Snapshot Seed JSON](../../data/insurance/latest_lotte_medical_baseline_snapshot_seed.json) - 구조화 seed 준비 결과
- **Data**: [Lotte Medical Baseline Snapshot Seed CSV](../../data/insurance/latest_lotte_medical_baseline_snapshot_seed.csv) - seed 준비 요약
