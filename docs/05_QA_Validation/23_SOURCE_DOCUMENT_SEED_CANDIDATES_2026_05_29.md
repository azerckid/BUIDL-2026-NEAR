# [QA] Source Document Seed 후보 추가 검증
> Created: 2026-05-29 03:24
> Last Updated: 2026-05-29 03:24

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: quote-only variant 검수에서 안전 후보로 분리한 8개 `insurance_source_documents` row를 `seed.ts`에 추가
- **결론**: 한화생명 비흡연체형 2개 문서와 교보라이프플래닛 비흡연체/표준체 6개 문서를 source document seed 후보로 추가했다. `insurance_product_sources.review_status`, `insurance_products`, 추천 노출 상태는 변경하지 않았다. DB write는 하지 않았다.

---

## 1. 변경 범위

| 파일 | 변경 |
|---|---|
| `src/lib/db/seed.ts` | `SOURCE_AWARE_DOCUMENTS`에 quote-only safe candidate 8개 추가 |
| `docs/03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md` | source document seed 후보 단계 기록 |
| `docs/04_Logic_Progress/ROADMAP.md` | Track A 진행 상태 갱신 |

---

## 2. 추가 Row

| 보험사 | Product source | 문서 수 | 문서 타입 |
|---|---|---:|---|
| 한화생명 | `src_hanwha_life_e_cancer_nonsmoker_202604` | 2 | `summary`, `terms` |
| 교보라이프플래닛 | `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | 3 | `summary`, `business_method`, `terms` |
| 교보라이프플래닛 | `src_kyobo_lifeplanet_cancer_standard_202605` | 3 | `summary`, `business_method`, `terms` |

Seed 기준 문서 row 총계는 기존 12개에서 20개로 증가한다.

---

## 3. Shared Hash 정책

이번 seed 후보는 같은 PDF hash를 여러 product source에 연결한다.

| 케이스 | 처리 |
|---|---|
| 한화생명 표준체형/비흡연체형 shared hash | 같은 hash라도 source가 다르므로 별도 `id`와 별도 `product_source_id` row로 연결 |
| 교보라이프플래닛 비흡연체/표준체 shared hash | 같은 공시 상품 코드 `10054`를 공유하므로 각 source별 별도 row로 연결 |
| DB 중복 정책 | `file_hash_sha256`은 unique가 아니라 index이므로 hash 중복 자체는 허용 |
| seed idempotency | `id`를 고유하게 부여하고 `onConflictDoNothing()`으로 재실행 시 중복 삽입을 방지 |

이 정책은 문서 파일의 중복 저장을 뜻하지 않는다. 같은 공식 PDF가 여러 보험다모아 product source의 근거가 될 때, 각 source와 문서의 연결 관계를 명시적으로 남기는 방식이다.

---

## 4. 안전성

- `insurance_product_sources.review_status`는 승격하지 않는다.
- `insurance_products` active 추천 seed는 변경하지 않는다.
- KDB생명과 신한라이프 차단 후보는 추가하지 않는다.
- Turso DB에는 아직 적용하지 않는다. 운영 DB 적용은 백업 후 별도 apply PR에서 진행한다.

---

## 5. 검증

| 검증 | 결과 |
|---|---|
| SHA-256 64자 형식 | 통과 |
| source document id 중복 | 없음 |
| source document count | 20 |
| `npx tsc --noEmit --incremental false` | 통과 |
| `npm run lint -- src/lib/db/seed.ts --quiet` | 통과 |
| `git diff --check` | 통과 |

---

## 6. 다음 작업

1. 운영 DB 백업 후 `seed.ts`를 실행해 8개 문서 row를 Turso에 적용한다.
2. 적용 후 row count와 hash 중복 정책이 의도대로 반영됐는지 읽기 전용으로 검증한다.
3. KDB생명 40869/40870 약관 variant와 신한라이프 표준형/해약환급금 미지급형 문서 관계를 별도 PR에서 해소한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | variant gate를 통과한 공식 문서만 seed 후보로 추가했다 |
| Potential Impact | quote-only source 확장을 운영 DB에 적용 가능한 단위로 전환했다 |
| Novelty | 같은 공식 문서를 여러 product source의 근거로 연결하는 shared hash 정책을 명시했다 |
| UX | 추천 노출 전 공식 문서 근거만 먼저 보강해 오안내 위험을 낮춘다 |
| Open-source | seed 후보와 검수 산출물의 연결 기준을 재현 가능하게 남겼다 |
| Business Plan | 실제 보험상품 universe 확장 작업을 DB 적용 가능한 작은 단위로 쪼갰다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - raw/needs_review/approved 의미
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Quote-only Source 문서 Variant 검수](./22_QUOTE_ONLY_SOURCE_DOCUMENT_VARIANT_REVIEW_2026_05_29.md) - seed 후보 8개 분리 근거
- **QA_Validation**: [Source Catalog Quote DB Apply](./19_SOURCE_CATALOG_QUOTE_DB_APPLY_2026_05_29.md) - quote-only source DB 적용 상태
- **Data**: [Quote-only Source Document Variant Review JSON](../../data/insurance/latest_quote_only_source_document_variant_review.json) - 구조화 검수 결과
