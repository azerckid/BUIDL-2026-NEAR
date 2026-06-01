# [QA] 동양생명 암보험 추천 Snapshot Seed 준비
> Created: 2026-06-01 13:20
> Last Updated: 2026-06-01 13:20

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: `src_tongyang_wooriwon_cancer_202605` source의 공식 문서 seed row, quote approval, source approval, active `insurance_products` snapshot 준비
- **결론**: 동양생명 우리WON하는실속하나로암보험은 공식 문서 hash 3건, 매칭 키워드/caveat 검수, 운영 DB quote ID 4건 확인을 통과했다. 이번 PR은 DB write 없이 `seed.ts`와 data/docs만 갱신하며, merge 후 운영 DB 백업과 seed apply PR을 별도로 진행한다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 입력 disclosure probe | `data/insurance/latest_tongyang_life_cancer_disclosure_adapter_probe.json` |
| 입력 matching review | `data/insurance/latest_tongyang_life_cancer_matching_review.json` |
| 입력 seed | `src/lib/db/seed.ts` |
| 신규 seed JSON | `data/insurance/latest_tongyang_life_cancer_snapshot_seed.json` |
| 신규 seed CSV | `data/insurance/latest_tongyang_life_cancer_snapshot_seed.csv` |
| DB read-only check | 수행 |
| DB write | 0 |
| 추천 snapshot DB 적용 | 0 |

---

## 2. 운영 DB 사전 상태

운영 DB를 읽기 전용으로 확인했다.

| 테이블 | count |
|---|---:|
| `insurance_source_documents` | 36 |
| `insurance_products` | 23 |
| `insurance_product_sources` | 22 |
| `insurance_premium_quotes` | 92 |

동양생명 source 상태:

| 항목 | 값 |
|---|---|
| source id | `src_tongyang_wooriwon_cancer_202605` |
| current review_status | `raw` |
| current sale_status | `unknown` |
| current monthly_premium_krw | `null` |
| existing documents | 0 |
| existing products | 0 |

---

## 3. Seed 변경 요약

| 변경 | 건수 | 비고 |
|---|---:|---|
| source approval | 1 | `raw` -> `approved`, `sale_status=active` |
| source document row | 3 | 상품요약서, 사업방법서, 보험약관 |
| quote approval | 4 | 운영 DB actual quote ID 확인 완료 |
| active product snapshot | 1 | `prod_tongyang_wooriwon_cancer_202605` |
| DB write in this PR | 0 | apply PR에서 수행 |

적용 후 기대 상태:

| 항목 | 적용 전 | 적용 후 기대 |
|---|---:|---:|
| source-backed active 추천 상품 | 18 | 19 |
| approved quote row | 72 | 76 |

---

## 4. Source Document Seed

동양생명 공식 다운로드는 `CO_ComDownload` POST endpoint에 `FILE_GRP_ID`를 전달하는 방식이다. DB의 `source_url`에는 endpoint와 `FILE_GRP_ID`를 함께 기록해 사람이 재현 가능한 형태로 남긴다.

| document_type | seed id | file_group_id | sha256 | bytes |
|---|---|---|---|---:|
| `summary` | `doc_tongyang_life_wooriwon_cancer_summary_202603` | `34D0mcpfsYQVpsLLoUEpB3x1Cudfk83B` | `960aae81795907c539b11667d3804534dc2b3b04c1da2df4f2b4e6d4381097b5` | 355,923 |
| `business_method` | `doc_tongyang_life_wooriwon_cancer_business_202603` | `34D0mcpfsYQVpsLLoUEpBzxfPnWb7yTo` | `4d67901f7df9d4bc631b6cd8d4c371cdb68e4a4b15a01f952f43a3ebf751b18f` | 99,967 |
| `terms` | `doc_tongyang_life_wooriwon_cancer_terms_202603` | `34D0mcpfsYQVpsLLoUEpBwjPN9vaY11S` | `882cb3784644e040027c16c984ae8c8c84bd3a12507949063967c618fdc81cb2` | 6,512,683 |

---

## 5. Quote Approval

운영 DB actual quote ID를 확인했다.

| condition | quote id | monthly_premium_krw | current status | seed status |
|---|---|---:|---|---|
| age34 female | `quote_src_tongyang_wooriwon_cancer_202605_age34_female_1015b0165c0e` | 11,000 | `needs_review` | `approved` |
| age34 male | `quote_src_tongyang_wooriwon_cancer_202605_age34_male_d2e77ecf4a0c` | 9,700 | `needs_review` | `approved` |
| age44 female | `quote_src_tongyang_wooriwon_cancer_202605_age44_female_9cf2588db68b` | 14,100 | `needs_review` | `approved` |
| age44 male | `quote_src_tongyang_wooriwon_cancer_202605_age44_male_99a3f15d59fc` | 17,100 | `needs_review` | `approved` |

대표 보험료는 기존 oncology snapshot 정책과 동일하게 `age34_female=11,000 KRW`를 사용한다.

---

## 6. Snapshot 값

| 필드 | 값 |
|---|---|
| product id | `prod_tongyang_wooriwon_cancer_202605` |
| source id | `src_tongyang_wooriwon_cancer_202605` |
| name | `동양생명 우리WON하는실속하나로암보험` |
| provider | `동양생명` |
| coverage_category | `oncology` |
| matching_strategy | `risk_target` |
| risk_targets | `pancreatic_cancer`, `liver_cancer`, `lung_cancer`, `breast_cancer`, `colon_cancer` |
| primary document | `doc_tongyang_life_wooriwon_cancer_terms_202603` |
| catalog_status | `approved` |
| is_active | 1 |

---

## 7. Caveat 반영

이번 seed는 매칭 검수 문서의 caveat를 `coverage_caveats_json`에 반영한다.

| Caveat | 반영 위치 |
|---|---|
| 90일 암 보장개시일 | source/product caveat |
| 1년 미만 50% 감액 | source/product caveat |
| 유방암 180일 이전 10% 지급 조건 | source/product caveat |
| 기타피부암/갑상선암/제자리암/경계성종양 분리 | source/product caveat |
| 납입면제 제외와 중증 갑상선암 예외 | source/product caveat |
| 표적항암/특정면역항암 갱신형 특약 보험료 변동 | source/product caveat |
| 건강진단/인수심사 가능성 | source/product caveat |
| 해약환급금 유의 | source/product caveat |

---

## 8. 안전성

- 이번 PR은 DB write를 하지 않는다.
- `insurance_source_documents` hash 3건은 64자 SHA-256 형식이다.
- source URL에는 DB URL, auth token, 로컬 env 값을 포함하지 않는다.
- `src_tongyang_wooriwon_cancer_202605`는 seed apply 전까지 운영 DB에서 계속 `raw`다.
- apply 단계는 운영 DB 백업 후 별도 PR로 진행한다.

---

## 9. 다음 작업

1. 이 seed PR을 merge한다.
2. 운영 DB 백업을 수행한다.
3. `npx tsx src/lib/db/seed.ts`를 실행한다.
4. 동양생명 source approved, document 3건, quote 4건 approved, product 1건 active를 읽기 전용으로 검증한다.
5. DB apply 기록 문서를 별도 PR로 남긴다.

---

## 10. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 동양생명 암보험을 추천 엔진이 읽을 수 있는 source-backed snapshot으로 준비했다 |
| Potential Impact | 실제 판매 암보험 추천 상품 수를 18개에서 19개로 늘릴 준비를 완료했다 |
| Novelty | 동양생명 POST 기반 공시 문서 hash, 보험다모아 quote, DNA risk key를 하나의 seed 흐름으로 연결했다 |
| UX | 보장개시일, 감액, 유방암 180일 조건, 갱신형 특약 caveat를 추천 카드와 상담 AI에 표시할 수 있다 |
| Open-source | 공식 문서와 quote ID 확인을 분리한 반복 가능한 seed 준비 패턴을 남겼다 |
| Business Plan | 실제 보험상품 기반 추천 카탈로그를 한 건 더 확장해 서비스 가능성을 높였다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Tongyang Life Cancer Disclosure Adapter Probe](./90_TONGYANG_LIFE_CANCER_DISCLOSURE_ADAPTER_PROBE_2026_06_01.md) - 공식 문서 hash 확보 근거
- **QA_Validation**: [Tongyang Life Cancer Matching Review](./91_TONGYANG_LIFE_CANCER_MATCHING_REVIEW_2026_06_01.md) - 매칭 키워드와 caveat 검수 근거
- **Data**: [Tongyang Life Cancer Snapshot Seed JSON](../../data/insurance/latest_tongyang_life_cancer_snapshot_seed.json) - seed 준비 구조화 결과
- **Data**: [Tongyang Life Cancer Snapshot Seed CSV](../../data/insurance/latest_tongyang_life_cancer_snapshot_seed.csv) - seed 준비 요약
