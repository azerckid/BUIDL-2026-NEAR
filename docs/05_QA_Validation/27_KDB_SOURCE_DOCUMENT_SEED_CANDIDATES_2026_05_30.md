# [QA] KDB Source Document Seed 후보 추가 검증
> Created: 2026-05-30 00:11
> Last Updated: 2026-05-30 00:11

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #24에서 variant가 확정된 KDB생명 source document 2건을 `seed.ts` 후보로 추가
- **결론**: KDB생명 `src_kdb_life_direct_cancer_202605`에 `40869_summary`와 `40870_policy` 2개 문서 row를 추가했다. `40869_policy`는 갱신형 약관으로 확인되어 포함하지 않았다. `insurance_product_sources.review_status`, `insurance_products`, 추천 노출 상태는 변경하지 않았다. DB write는 하지 않았다.

---

## 1. 변경 범위

| 파일 | 변경 |
|---|---|
| `src/lib/db/seed.ts` | `SOURCE_AWARE_DOCUMENTS`에 KDB source document 2건 추가 |
| `docs/03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md` | KDB seed 후보 단계 기록 |
| `docs/04_Logic_Progress/ROADMAP.md` | Track A 다음 작업 갱신 |

---

## 2. 추가 Row

| Document ID | Product source | Type | Hash | 근거 |
|---|---|---|---|---|
| `doc_kdb_life_direct_cancer_summary_202605` | `src_kdb_life_direct_cancer_202605` | `summary` | `b6b3c5607f73accfd7cd28595cd466c6fecbc09c3b6e02e28867822fd51d407a` | `40869_summary`는 KDB다이렉트 암보험 상품요약서이며 해약환급금 미지급형III 설명을 포함 |
| `doc_kdb_life_direct_cancer_terms_202605` | `src_kdb_life_direct_cancer_202605` | `terms` | `a9f07c34b0551ba616f8098027873dcaed3367d2c035dd72403daa431cdc52b6` | `40870_policy`는 해약환급금 미지급형III 약관으로 확인 |

Seed 기준 문서 row 총계는 기존 20개에서 22개로 증가한다.

---

## 3. 제외 Row

| 문서 | Hash | 제외 이유 |
|---|---|---|
| `40869_policy.pdf` | `10d4904403a4756932e3463f121b5f5b314df5c29f324fb223d35cfed39ca8ba` | 표지 텍스트가 `KDB다이렉트 암보험(갱신형)(무)`라서 no-refund III source와 다름 |

---

## 4. 안전성

- `insurance_product_sources.review_status`는 `raw` 그대로 유지한다.
- `insurance_products` active 추천 seed는 변경하지 않는다.
- 신한라이프 표준형 source는 계속 차단 상태로 유지한다.
- Turso DB에는 아직 적용하지 않는다. 운영 DB 적용은 백업 후 별도 apply PR에서 진행한다.
- 이번 변경은 source document 연결 근거만 추가하며, 매칭 키워드와 caveat 승격은 후속 검수에서 처리한다.

---

## 5. 검증

| 검증 | 결과 |
|---|---|
| SHA-256 64자 형식 | 통과 |
| source document id 중복 | 없음 |
| KDB 신규 document count | 2 |
| source document seed count | 22 |
| `npx tsc --noEmit --incremental false` | 통과 |
| `npx eslint src/lib/db/seed.ts --quiet` | 통과 |
| `git diff --check` | 통과 |

---

## 6. 다음 작업

1. 운영 DB 백업 후 `seed.ts`를 실행해 KDB 문서 row 2건을 Turso에 적용한다.
2. 적용 후 `insurance_source_documents=22`, invalid hash 0건, KDB 신규 document 2건 존재를 읽기 전용으로 검증한다.
3. 신한라이프 `L11C009000007` 일반형 상품요약서, 사업방법서, 판매약관 endpoint 탐색을 이어간다.
4. raw/needs_review source의 `coverage_category`, `risk_targets`, `matching_strategy`, caveat를 정리한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | KDB no-refund III source에 맞는 공식 문서만 seed 후보로 추가했다 |
| Potential Impact | quote-only source 중 KDB 암보험을 공식 문서 기반 검수 대상으로 전환했다 |
| Novelty | 보험다모아 quote source와 보험사 PDF variant를 hash 기반으로 재결합했다 |
| UX | 잘못된 갱신형 약관 연결을 피하고 추천 근거의 정확도를 높인다 |
| Open-source | variant 판정과 seed 반영 기준을 재현 가능한 문서로 남겼다 |
| Business Plan | 실제 판매 상품 카탈로그 확장 단위를 운영 DB 적용 직전까지 끌어올렸다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - raw/needs_review/approved 의미
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [KDB/신한 Source 문서 Variant 재검수](./26_KDB_SHINHAN_VARIANT_REVIEW_2026_05_29.md) - KDB 문서 2건 seed 후보 확정 근거
- **QA_Validation**: [Source Document DB 적용 검증](./24_SOURCE_DOCUMENTS_DB_APPLY_2026_05_29.md) - 직전 source document DB 적용 상태
- **Data**: [KDB/Shinhan Variant Resolution JSON](../../data/insurance/latest_kdb_shinhan_variant_resolution.json) - 구조화 검수 결과
