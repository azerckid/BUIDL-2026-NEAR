# [QA] 첫 실제 보험 추천 Snapshot Seed
> Created: 2026-05-30 16:30
> Last Updated: 2026-05-30 16:30

- **레이어**: 05_QA_Validation
- **상태**: Ready for DB apply
- **범위**: KDB생명 1개, 교보라이프플래닛 2개 암보험 source의 승인 상태, quote row 승인, `insurance_products` 첫 실제 snapshot row seed
- **결론**: KDB생명 `src_kdb_life_direct_cancer_202605`, 교보라이프플래닛 `src_kyobo_lifeplanet_cancer_nonsmoker_202605`, `src_kyobo_lifeplanet_cancer_standard_202605`를 첫 source-backed active 추천 후보로 승격할 수 있도록 `seed.ts`를 갱신했다. 이번 PR은 코드/문서/데이터 seed 변경이며 DB write는 하지 않았다.

---

## 1. 변경 요약

| 항목 | 변경 |
|---|---:|
| source 승인 update | 3 |
| quote 승인 대상 | 12 |
| 신규 `insurance_products` snapshot row | 3 |
| 대표 보험료 조건 | `age34_female` |
| USDC 환산 기준 | 고정 데모 환산율 `1 USDC = 1,350 KRW` |
| DB write | 0 |

`seed.ts`는 기존 insert-only 흐름에 첫 snapshot 전용 update 단계를 추가한다. 적용 시 `insurance_product_sources` 3건을 `approved`로 승격하고, 기존 `insurance_premium_quotes` 12건을 `approved`로 변경한 뒤, source-backed `insurance_products` 3건을 삽입한다.

---

## 2. Snapshot 대상

| Provider | Source | Product row | 대표 KRW | 데모 USDC | 대표 문서 |
|---|---|---|---:|---:|---|
| KDB생명 | `src_kdb_life_direct_cancer_202605` | `prod_kdb_life_direct_cancer_202605` | 8,020 | 5.94 | `doc_kdb_life_direct_cancer_terms_202605` |
| 교보라이프플래닛 | `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | `prod_kyobo_lifeplanet_cancer_nonsmoker_202605` | 8,410 | 6.23 | `doc_kyobo_lifeplanet_cancer_nonsmoker_terms_202604` |
| 교보라이프플래닛 | `src_kyobo_lifeplanet_cancer_standard_202605` | `prod_kyobo_lifeplanet_cancer_standard_202605` | 8,490 | 6.29 | `doc_kyobo_lifeplanet_cancer_standard_terms_202604` |

대표 보험료는 보험다모아 암보험 모바일 조회 조건 `age=34`, `sex=2`, `enterType=A`, `indemnityTypeA=1`, `renewTypeA=C1`의 월 보험료다. `monthly_premium_usdc`는 checkout/demo 경로가 요구하는 필수값이라 고정 데모 환산율로 계산했다. 이는 실시간 환율이나 실제 결제 고지 금액이 아니다.

---

## 3. 매칭 필드

세 상품 모두 암보험이므로 동일한 결정론적 매칭 값을 사용한다.

| 필드 | 값 |
|---|---|
| `coverage_category` | `oncology` |
| `matching_strategy` | `risk_target` |
| `risk_targets` | `pancreatic_cancer`, `liver_cancer`, `lung_cancer`, `breast_cancer`, `colon_cancer` |
| `catalog_status` | `approved` |
| `is_active` | `1` |

약관에 등장하는 갑상선암, 전립선암, 기타피부암, 대장점막내암, 제자리암, 경계성종양 등은 현재 DNA risk key로 직접 매칭하지 않고 caveat에 보존한다.

---

## 4. Quote 승인 대상

| Source | 조건 | 승인 quote row |
|---|---|---:|
| `src_kdb_life_direct_cancer_202605` | 34세 남/여, 44세 남/여 | 4 |
| `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | 34세 남/여, 44세 남/여 | 4 |
| `src_kyobo_lifeplanet_cancer_standard_202605` | 34세 남/여, 44세 남/여 | 4 |

승인 대상 quote row ID는 `data/insurance/latest_first_recommendation_snapshot_seed.json`에 고정했다. future quote row가 같은 source에 추가되어도 자동 승인되지 않도록 product source 전체 update가 아니라 현재 검수한 12개 ID만 승인한다.

---

## 5. 보류 대상

| Source | 상태 | 이유 |
|---|---|---|
| `src_hanwha_life_e_cancer_202604` | 보류 | quote row가 모두 `0원`이라 대표 가격으로 사용할 수 없음 |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 보류 | quote row가 모두 `0원`이라 대표 가격으로 사용할 수 없음 |
| `src_shinhan_life_sol_cancer_standard_202605` | 보류 | 일반형 공식 문서 endpoint 미확보 |

보류 source는 `insurance_products` snapshot row로 발행하지 않는다.

---

## 6. 적용 전제

1. 운영 DB 백업을 먼저 수행한다.
2. `insurance_premium_quotes`에 PR #12/#16에서 적재한 quote row 84건이 있어야 한다.
3. `insurance_source_documents`에 KDB/교보 대표 문서 8건이 적용되어 있어야 한다.
4. `.env.local`이 의도한 Turso DB를 가리키는지 확인한 뒤 `npx tsx src/lib/db/seed.ts`를 실행한다.
5. 적용 후 다음 값을 검증한다.

| 검증 항목 | 기대값 |
|---|---:|
| 신규 source-backed active product row | 3 |
| 이번 source `review_status=approved` | 3 |
| 이번 quote `review_status=approved` | 12 |
| invalid SHA-256 document hash | 0 |

---

## 7. 잔여 리스크

- 기존 데모 상품 5개는 이번 PR에서 비활성화하지 않는다. 따라서 DB 적용 후 추천 엔진은 기존 데모 상품과 첫 실제 source-backed 상품을 함께 읽는다.
- quote 조건은 34세/44세 남/여 matrix로 제한된다. 사용자별 가격 산정 UI는 별도 단계에서 대표 보험료와 조건별 보험료를 분리 표시해야 한다.
- `monthly_premium_usdc`는 데모 결제용 고정 환산값이다. 실제 결제 단계에서는 환율 기준 또는 KRW 정산 정책을 별도로 확정해야 한다.

---

## 8. Related Documents

- [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md)
- [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md)
- [Roadmap](../04_Logic_Progress/ROADMAP.md)
- [Matching Keyword Caveat Review](30_MATCHING_KEYWORD_CAVEAT_REVIEW_2026_05_30.md)
- [First Recommendation Snapshot Seed Data](../../data/insurance/latest_first_recommendation_snapshot_seed.json)
