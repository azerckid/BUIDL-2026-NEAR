# [QA] 메리츠화재 실손 Baseline 추천 Snapshot Seed 검증
> Created: 2026-05-31 21:52
> Last Updated: 2026-05-31 21:52

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 메리츠화재 다이렉트 실손의료비보험 source 문서 seed, source 승인, quote 승인, `insurance_products` baseline snapshot seed 준비
- **결론**: PR #70에서 `baseline_ready_snapshot_candidate`로 정리한 메리츠화재 실손 source를 seed에 반영했다. 적용 시 source document 3건이 추가되고, 메리츠화재 source 1건은 `approved`, quote row 4건은 `approved`, 신규 `insurance_products` snapshot 1건은 `catalog_status=approved`, `is_active=1`, `matching_strategy=baseline`, `risk_targets=[]`로 들어간다. 이번 PR은 운영 DB write를 하지 않으며, 운영 반영은 백업 후 별도 apply PR에서 진행한다.

---

## 1. 변경 대상

| 항목 | 값 |
|---|---|
| source | `src_meritz_direct_medical_202605` |
| source documents | `doc_meritz_direct_medical_terms_202605`, `doc_meritz_direct_medical_business_method_202605`, `doc_meritz_direct_medical_summary_202605` |
| product snapshot | `prod_meritz_direct_medical_202605` |
| primary document | `doc_meritz_direct_medical_terms_202605` |
| quote approval | 4건 |
| DB write | 없음 |
| 산출물 | `../../data/insurance/latest_meritz_fire_baseline_snapshot_seed.json` |

---

## 2. Seed 변경 요약

| 구분 | 변경 |
|---|---:|
| `SOURCE_AWARE_DOCUMENTS` | +3 |
| `FIRST_RECOMMENDATION_SOURCE_APPROVALS` | +1 |
| `MEDICAL_BASELINE_APPROVED_QUOTE_IDS` | +4 |
| `FIRST_RECOMMENDATION_SNAPSHOT_PRODUCTS` | +1 |
| 적용 후 source document 예상 | 26 |
| 적용 후 source approval 총계 | 12 |
| 적용 후 quote approval 총계 | 48 |
| 적용 후 active source-backed product 총계 | 12 |
| 적용 후 baseline active product 총계 | 6 |

---

## 3. Source Documents

후속 apply PR에서 아래 3건이 `insurance_source_documents`에 들어가야 한다.

| id | type | source_url | sha256 | bytes |
|---|---|---|---|---:|
| `doc_meritz_direct_medical_terms_202605` | `terms` | 공식 상품 페이지 | `bbbb86eb265233a01b71b0cc298748267531839a39bcf8aec79d442475274c0c` | 2,776,323 |
| `doc_meritz_direct_medical_business_method_202605` | `business_method` | 공식 상품 페이지 | `2331cd4a07e8fabd5977e6a715a174d822a9ac495f5b956335d600b75b43d280` | 95,371 |
| `doc_meritz_direct_medical_summary_202605` | `summary` | 공식 상품 페이지 | `6b02df741bb07a565d5315c3a5ce1655bcd56bdded61e9531c1bcaad60ce661e` | 127,920 |

`source_url`은 `https://store.meritzfire.com/health-and-kids/direct-medicalInfo.do`를 사용한다. 메리츠화재 직접 PDF URL은 같은 세션 cookie와 encrypted path가 있어야 동작하므로 장기 citation으로 저장하지 않는다.

---

## 4. Source Approval

`src_meritz_direct_medical_202605`는 다음 값으로 승격된다.

| 필드 | 값 |
|---|---|
| `review_status` | `approved` |
| `sale_status` | `active` |
| `monthly_premium_krw` | 7,103 |
| `premium_text` | `7,103원` |
| `coverage_category` | `medical_expense` |
| `matching_strategy` | `baseline` |
| `risk_targets` | `[]` |

사업방법서와 상품요약서 파일명에는 `2408`이 포함되지만, 2026-05-31 기준 공식 상품 페이지의 `6ADGE` 문서 목록에서 같은 상품명으로 제공된 파일이다. 이 variant caveat는 source/product caveat에 유지한다.

---

## 5. Quote Approval

운영 DB 읽기 전용 확인으로 실제 row ID를 확정했다. 4건 모두 현재 `needs_review`이며 seed apply 후 `approved`가 되어야 한다.

| quote id | 조건 | 월 보험료 |
|---|---|---:|
| `quote_src_meritz_direct_medical_202605_age34_male_60456bed3452` | 34세 남성 | 6,643 KRW |
| `quote_src_meritz_direct_medical_202605_age34_female_b141dc7c5700` | 34세 여성 | 7,103 KRW |
| `quote_src_meritz_direct_medical_202605_age44_male_26615bdcb076` | 44세 남성 | 8,635 KRW |
| `quote_src_meritz_direct_medical_202605_age44_female_58dcc145a6b7` | 44세 여성 | 10,519 KRW |

---

## 6. Product Snapshot

| 필드 | 값 |
|---|---|
| `id` | `prod_meritz_direct_medical_202605` |
| `name` | 메리츠 다이렉트 실손의료비보험 |
| `provider` | 메리츠화재 |
| `monthly_premium_krw` | 7,103 |
| `monthly_premium_usdc` | 5.26 |
| `premium_basis` | 보험다모아 실손의료보험 모바일 공개 비교 조건, 고정 데모 환산율 1 USDC = 1,350 KRW |
| `catalog_status` | `approved` |
| `is_active` | 1 |

대표 보험료는 기존 실손 baseline 정책과 동일하게 `age34_female` 조건을 사용한다. 조건별 가격은 `insurance_premium_quotes`에서 별도 표시한다.

---

## 7. 적용 전후 예상

운영 DB 적용 전 기준은 PR #70 이후 상태다.

| 항목 | 적용 전 | 적용 후 예상 |
|---|---:|---:|
| source document | 23 | 26 |
| active source-backed 추천 상품 | 11 | 12 |
| source approved | 11 | 12 |
| quote approved | 44 | 48 |
| baseline active product | 5 | 6 |
| insurance_products | 16 | 17 |

적용 PR에서는 운영 DB 백업 후 `npx tsx src/lib/db/seed.ts`를 실행하고 위 카운트를 검증한다.

---

## 8. 안전성

- 이번 PR은 `seed.ts`와 문서/데이터 산출물만 변경하며 운영 DB write를 하지 않는다.
- 적용 PR에서는 운영 DB 백업을 먼저 수행해야 한다.
- legacy demo 상품은 계속 `archived` 상태로 유지한다.
- `matching_strategy=baseline` 상품은 `risk_targets=[]`를 유지한다.
- session-bound encrypted PDF 직접 URL은 seed에 저장하지 않는다.
- 메리츠화재 공식 상품 페이지와 adapter 재실행 절차를 source evidence caveat로 유지한다.

---

## 9. 다음 작업

1. 이번 seed PR을 머지한다.
2. 운영 DB 백업 후 `src/lib/db/seed.ts`를 실행한다.
3. 적용 후 source document 26건, source-backed active 추천 상품 12건, approved quote 48건을 확인한다.
4. Dashboard에서 메리츠화재 baseline 카드와 조건별 보험료가 표시되는지 확인한다.
5. 상담 AI가 메리츠화재 상품을 설명할 때 session-bound citation caveat를 포함하는지 확인한다.

---

## 10. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 메리츠화재 실손보험이 source-backed 추천 snapshot으로 발행될 준비가 끝났다 |
| Potential Impact | 실손 baseline 추천 폭이 5건에서 6건으로 늘어난다 |
| Novelty | session-bound PDF 목록 API hash와 보험다모아 quote matrix를 결합한 추천 발행 패턴을 반복한다 |
| UX | 사용자는 메리츠화재 카드에서도 조건별 보험료, 출처, caveat를 확인할 수 있다 |
| Open-source | source document 추가와 snapshot seed를 분리해 반복 가능한 운영 절차를 유지한다 |
| Business Plan | 실제 상품 카탈로그 폭을 넓혀 테스트 사용자 피드백의 비교 폭을 넓힌다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Meritz Fire Disclosure Adapter Probe](./65_MERITZ_FIRE_DISCLOSURE_ADAPTER_PROBE_2026_05_31.md) - 공식 문서 hash 검증
- **QA_Validation**: [Meritz Fire Medical Matching Review](./66_MERITZ_FIRE_MEDICAL_MATCHING_REVIEW_2026_05_31.md) - 이번 seed의 매칭 검수 근거
- **QA_Validation**: [NH Fire Baseline Snapshot Seed](./63_NH_FIRE_BASELINE_SNAPSHOT_SEED_2026_05_31.md) - 직전 실손 baseline seed 패턴
- **Data**: [Meritz Fire Baseline Snapshot Seed JSON](../../data/insurance/latest_meritz_fire_baseline_snapshot_seed.json) - 구조화 seed 준비 결과
