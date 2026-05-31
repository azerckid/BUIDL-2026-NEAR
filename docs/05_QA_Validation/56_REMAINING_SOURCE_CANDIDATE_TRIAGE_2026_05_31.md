# [QA] 남은 Source 후보 처리 순서 검증
> Created: 2026-05-31 17:57
> Last Updated: 2026-05-31 17:57

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #59 이후 운영 Turso DB에 남은 `raw`/`needs_review` source 후보 13개의 처리 순서 정리
- **결론**: 남은 13개 후보는 바로 추천 발행할 수 있는 묶음이 아니다. 신한라이프 해약환급금 미지급형 1개는 매칭 키워드/caveat 검수 후보이고, 10개 raw 후보는 공식 문서 hash 확보가 먼저이며, 삼성생명 입원 건강보험은 category 정책 결정이 필요하고, 신한라이프 표준형은 일반형 문서 endpoint 발견 전까지 차단한다.

---

## 1. 확인 방법

운영 DB에 쓰기는 하지 않고 `.env.local`의 Turso 연결 설정으로 읽기 전용 확인만 수행했다.

| 항목 | 값 |
|---|---|
| 기준 시각 | 2026-05-31 17:57 KST |
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| DB write | 없음 |
| 기준 상태 | PR #59 삼성화재 실손 baseline DB apply 이후 |
| 산출물 JSON | `../../data/insurance/latest_remaining_source_candidate_triage.json` |
| 산출물 CSV | `../../data/insurance/latest_remaining_source_candidate_triage.csv` |

---

## 2. 현재 운영 DB 요약

| 항목 | 값 |
|---|---:|
| source-backed active 추천 상품 | 9 |
| approved quote | 36 |
| `insurance_products` 전체 | 14 |
| `insurance_product_sources` 전체 | 22 |
| 남은 non-approved source | 13 |

남은 13개 source 상태:

| review_status | 개수 |
|---|---:|
| `needs_review` | 2 |
| `raw` | 11 |

---

## 3. 처리 묶음

| 묶음 | 개수 | 의미 | 다음 PR 방향 |
|---|---:|---|---|
| 매칭 키워드/caveat 검수 후보 | 1 | 공식 문서와 quote가 있으므로 추천 후보로 검토 가능 | 신한라이프 해약환급금 미지급형 암보험 매칭 리뷰 |
| 공식 문서 probe 필요 | 10 | quote는 있으나 source document가 0건 | 보험사별 공시/API adapter 또는 상품 페이지 probe |
| category 정책 결정 필요 | 1 | 문서는 있으나 현 `coverage_category` enum에 맞지 않음 | hospitalization/general_health 정책 결정 |
| endpoint blocker 유지 | 1 | 일반형 공식 문서 endpoint 미발견 | 신한라이프 표준형 차단 유지 |

---

## 4. 후보별 상태

| source id | 보험사 | 상품군 | review | 문서 | quote | next action |
|---|---|---|---|---:|---:|---|
| `src_shinhan_life_sol_cancer_202601` | 신한라이프생명 | 암보험 | `needs_review` | 3 | 4 | 매칭 키워드/caveat 검수 |
| `src_samsung_life_hospital_health_202601` | 삼성생명 | 입원 건강보험 | `needs_review` | 1 | 0 | category 정책 결정 |
| `src_nh_fire_medical_202605` | 농협손보 | 실손의료보험 | `raw` | 0 | 4 | 공식 문서 probe |
| `src_lotte_direct_medical_202605` | 롯데손보 | 실손의료보험 | `raw` | 0 | 4 | 공식 문서 probe |
| `src_meritz_direct_medical_202605` | 메리츠화재 | 실손의료보험 | `raw` | 0 | 4 | 공식 문서 probe |
| `src_hanwha_general_direct_medical_202605` | 한화손보 | 실손의료보험 | `raw` | 0 | 4 | 공식 문서 probe |
| `src_heungkuk_fire_direct_medical_202605` | 흥국화재 | 실손의료보험 | `raw` | 0 | 4 | 공식 문서 probe |
| `src_db_life_eroun_cancer_202601` | DB생명 | 암보험 | `raw` | 0 | 4 | 공식 문서 probe |
| `src_tongyang_wooriwon_cancer_202605` | 동양생명 | 암보험 | `raw` | 0 | 4 | 공식 문서 probe |
| `src_miraeasset_online_cancer_basic_202605` | 미래에셋생명 | 암보험 | `raw` | 0 | 4 | 공식 문서 probe |
| `src_miraeasset_online_cancer_no_refund_202605` | 미래에셋생명 | 암보험 | `raw` | 0 | 4 | 공식 문서 probe |
| `src_shinhan_life_sol_cancer_standard_202605` | 신한라이프생명 | 암보험 | `raw` | 0 | 4 | 일반형 endpoint 발견 전까지 차단 |
| `src_hanwha_general_direct_cancer_202604` | 한화손보 | 암보험 | `raw` | 0 | 4 | 공식 문서 probe |

---

## 5. 권장 작업 순서

1. `src_shinhan_life_sol_cancer_202601`의 문서 variant, 암 보장 키워드, 면책/감액 caveat, quote 4건을 검수한다.
2. 문서가 없는 raw source 10개를 보험사별 probe 묶음으로 나눠 공식 상품 문서 hash를 확보한다.
3. `src_samsung_life_hospital_health_202601`은 `hospitalization` 또는 `general_health` category 확장 필요성을 먼저 결정한다.
4. `src_shinhan_life_sol_cancer_standard_202605`는 일반형 문서 endpoint가 발견되기 전까지 추천 snapshot 후보에서 제외한다.
5. 위 후보와 별도로 보험다모아 P0 샘플 34개는 공식 상품 URL과 source row 구조화가 먼저다.

---

## 6. 안전 기준

- `raw` 또는 `needs_review` source는 추천 UI에 노출하지 않는다.
- 신한라이프 표준형에는 해약환급금 미지급형 문서를 재사용하지 않는다.
- 문서 hash가 없는 raw source는 `insurance_products` snapshot으로 발행하지 않는다.
- category enum에 맞지 않는 상품은 seed보다 정책/스키마 결정을 먼저 한다.
- P0 샘플 34개는 상품명만으로 DB에 밀어 넣지 않고 공식 URL, source row, 문서 hash 순서로 올린다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 남은 source 후보를 추천 가능, 문서 필요, 스키마 필요, blocker로 분리해 다음 작업이 결정 가능해졌다 |
| Potential Impact | 실제 상품 수를 늘릴 때 오연결과 중복 seed를 줄인다 |
| Novelty | 보험다모아 quote, 공식 문서 hash, DNA 매칭 키워드를 단계별 gate로 분리한다 |
| UX | 사용자는 근거가 부족한 상품 대신 source-backed 추천만 보게 된다 |
| Open-source | 남은 후보 처리 순서를 JSON/CSV/QA 문서로 재현 가능하게 남긴다 |
| Business Plan | 추천 상품 수 확대 작업의 병목과 우선순위를 명확히 한다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Samsung Fire Baseline DB Apply](./55_SAMSUNG_FIRE_BASELINE_DB_APPLY_2026_05_31.md) - 직전 source-backed active 9건 적용 검증
- **QA_Validation**: [Shinhan Standard Document Endpoint Reprobe](./45_SHINHAN_STANDARD_DOCUMENT_ENDPOINT_REPROBE_2026_05_31.md) - 신한라이프 표준형 blocker 근거
