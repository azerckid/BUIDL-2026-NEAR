# [QA] 흥국화재 실손 Baseline 추천 Snapshot Seed 검증
> Created: 2026-05-31 23:03
> Last Updated: 2026-05-31 23:03

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 흥국화재 흥Good 다이렉트 실손의료보험 source 문서 seed, source 승인, quote 승인, `insurance_products` baseline snapshot seed 준비
- **결론**: PR #74에서 `baseline_ready_snapshot_candidate`로 정리한 흥국화재 실손 source를 seed에 반영했다. 적용 시 source document 1건이 추가되고, 흥국화재 source 1건은 `approved`, quote row 4건은 `approved`, 신규 `insurance_products` snapshot 1건은 `catalog_status=approved`, `is_active=1`, `matching_strategy=baseline`, `risk_targets=[]`로 들어간다. 이번 PR은 운영 DB write를 하지 않으며, 운영 반영은 백업 후 별도 apply PR에서 진행한다.

---

## 1. 변경 대상

| 항목 | 값 |
|---|---|
| source | `src_heungkuk_fire_direct_medical_202605` |
| source documents | `doc_heungkuk_fire_direct_medical_terms_202605` |
| product snapshot | `prod_heungkuk_fire_direct_medical_202605` |
| primary document | `doc_heungkuk_fire_direct_medical_terms_202605` |
| quote approval | 4건 |
| DB write | 없음 |
| 산출물 | `../../data/insurance/latest_heungkuk_fire_baseline_snapshot_seed.json` |

---

## 2. Seed 변경 요약

| 구분 | 변경 |
|---|---:|
| `SOURCE_AWARE_DOCUMENTS` | +1 |
| `FIRST_RECOMMENDATION_SOURCE_APPROVALS` | +1 |
| `MEDICAL_BASELINE_APPROVED_QUOTE_IDS` | +4 |
| `FIRST_RECOMMENDATION_SNAPSHOT_PRODUCTS` | +1 |
| 적용 후 source document 예상 | 27 |
| 적용 후 source approval 총계 | 13 |
| 적용 후 quote approval 총계 | 52 |
| 적용 후 active source-backed product 총계 | 13 |
| 적용 후 baseline active product 총계 | 7 |

---

## 3. Source Documents

후속 apply PR에서 아래 1건이 `insurance_source_documents`에 들어가야 한다.

| id | type | source_url | sha256 | bytes |
|---|---|---|---|---:|
| `doc_heungkuk_fire_direct_medical_terms_202605` | `terms` | 공식 PDF endpoint | `956b60ab796fec97397fc087b799ed487b47a9773fb780fe7ee529c131389756` | 5,125,066 |

`source_url`은 `https://direct.heungkukfire.co.kr/CM_COMM_FileDownload_ACT.do?...downFileName=eYou_mdca_term_next.pdf`를 사용한다. 흥국화재 PDF endpoint는 공식 SPA 화면 `CMMOBDPRM4001`의 `downloadFile(this, "4", "eYou_mdca_term_next.pdf")` 호출을 재현한 URL이다.

---

## 4. Source Approval

`src_heungkuk_fire_direct_medical_202605`는 다음 값으로 승격된다.

| 필드 | 값 |
|---|---|
| `review_status` | `approved` |
| `sale_status` | `active` |
| `monthly_premium_krw` | 8,939 |
| `premium_text` | `8,939원` |
| `coverage_category` | `medical_expense` |
| `matching_strategy` | `baseline` |
| `risk_targets` | `[]` |

공식 약관 파일명은 `eYou_mdca_term_next.pdf`다. 이 파일명은 현재 상품의 약관 endpoint로 검증됐지만 `next` suffix를 사용하므로 seed/apply 전 adapter 재실행으로 hash 신선도를 확인해야 한다.

---

## 5. Quote Approval

운영 DB 읽기 전용 확인으로 실제 row ID를 확정했다. 4건 모두 현재 `needs_review`이며 seed apply 후 `approved`가 되어야 한다.

| quote id | 조건 | 월 보험료 |
|---|---|---:|
| `quote_src_heungkuk_fire_direct_medical_202605_age34_male_60456bed3452` | 34세 남성 | 7,995 KRW |
| `quote_src_heungkuk_fire_direct_medical_202605_age34_female_b141dc7c5700` | 34세 여성 | 8,939 KRW |
| `quote_src_heungkuk_fire_direct_medical_202605_age44_male_26615bdcb076` | 44세 남성 | 10,497 KRW |
| `quote_src_heungkuk_fire_direct_medical_202605_age44_female_58dcc145a6b7` | 44세 여성 | 13,029 KRW |

---

## 6. Product Snapshot

| 필드 | 값 |
|---|---|
| `id` | `prod_heungkuk_fire_direct_medical_202605` |
| `name` | 흥국화재 흥Good 다이렉트 실손의료보험 |
| `provider` | 흥국화재 |
| `monthly_premium_krw` | 8,939 |
| `monthly_premium_usdc` | 6.62 |
| `premium_basis` | 보험다모아 실손의료보험 모바일 공개 비교 조건, 고정 데모 환산율 1 USDC = 1,350 KRW |
| `catalog_status` | `approved` |
| `is_active` | 1 |

대표 보험료는 기존 실손 baseline 정책과 동일하게 `age34_female` 조건을 사용한다. 조건별 가격은 `insurance_premium_quotes`에서 별도 표시한다.

---

## 7. 적용 전후 예상

운영 DB 적용 전 기준은 PR #72 이후 상태다.

| 항목 | 적용 전 | 적용 후 예상 |
|---|---:|---:|
| source document | 26 | 27 |
| active source-backed 추천 상품 | 12 | 13 |
| source approved | 12 | 13 |
| quote approved | 48 | 52 |
| baseline active product | 6 | 7 |
| insurance_products | 17 | 18 |

적용 PR에서는 운영 DB 백업 후 `npx tsx src/lib/db/seed.ts`를 실행하고 위 카운트를 검증한다.

---

## 8. 안전성

- 이번 PR은 `seed.ts`와 문서/데이터 산출물만 변경하며 운영 DB write를 하지 않는다.
- 적용 PR에서는 운영 DB 백업을 먼저 수행해야 한다.
- legacy demo 상품은 계속 `archived` 상태로 유지한다.
- `matching_strategy=baseline` 상품은 `risk_targets=[]`를 유지한다.
- 흥국화재 약관 파일명 `next` suffix caveat를 source/product caveat에 유지한다.

---

## 9. 다음 작업

1. 이번 seed PR을 머지한다.
2. 운영 DB 백업 후 `src/lib/db/seed.ts`를 실행한다.
3. 적용 후 source document 27건, source-backed active 추천 상품 13건, approved quote 52건을 확인한다.
4. Dashboard에서 흥국화재 baseline 카드와 조건별 보험료가 표시되는지 확인한다.
5. 상담 AI가 흥국화재 상품을 설명할 때 `next` suffix hash refresh caveat를 포함하는지 확인한다.

---

## 10. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 흥국화재 실손보험이 source-backed 추천 snapshot으로 발행될 준비가 끝났다 |
| Potential Impact | 실손 baseline 추천 폭이 6건에서 7건으로 늘어난다 |
| Novelty | SPA downloadFile endpoint hash와 보험다모아 quote matrix를 결합한 추천 발행 패턴을 반복한다 |
| UX | 사용자는 흥국화재 카드에서도 조건별 보험료, 출처, caveat를 확인할 수 있다 |
| Open-source | source document 추가와 snapshot seed를 분리해 반복 가능한 운영 절차를 유지한다 |
| Business Plan | 실제 상품 카탈로그 폭을 넓혀 테스트 사용자 피드백의 비교 폭을 넓힌다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Heungkuk Fire Disclosure Adapter Probe](./69_HEUNGKUK_FIRE_DISCLOSURE_ADAPTER_PROBE_2026_05_31.md) - 공식 문서 hash 검증
- **QA_Validation**: [Heungkuk Fire Medical Matching Review](./70_HEUNGKUK_FIRE_MEDICAL_MATCHING_REVIEW_2026_05_31.md) - 이번 seed의 매칭 검수 근거
- **QA_Validation**: [Meritz Fire Baseline Snapshot Seed](./67_MERITZ_FIRE_BASELINE_SNAPSHOT_SEED_2026_05_31.md) - 직전 실손 baseline seed 패턴
- **Data**: [Heungkuk Fire Baseline Snapshot Seed JSON](../../data/insurance/latest_heungkuk_fire_baseline_snapshot_seed.json) - 구조화 seed 준비 결과
