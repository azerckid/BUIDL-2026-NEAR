# [QA] Source Document DB 적용 검증
> Created: 2026-05-29 14:23
> Last Updated: 2026-05-29 14:23

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #20에서 `seed.ts`에 추가한 quote-only source document 8건의 Turso DB 실제 적용
- **결론**: 백업 생성 후 `src/lib/db/seed.ts`를 실행해 한화생명 비흡연체형 2개 문서와 교보라이프플래닛 비흡연체/표준체 6개 문서를 `insurance_source_documents`에 적용했다. 최종 DB는 `insurance_source_documents=20`이며, `insurance_product_sources.review_status`, `insurance_products`, 추천 노출 상태는 변경하지 않았다.

---

## 1. 적용 대상

| 항목 | 값 |
|---|---|
| Env file | `.env.local` |
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| 작업 브랜치 | `source-documents-db-apply` |
| 기준 main merge commit | `b090567` |
| Seed 입력 | `src/lib/db/seed.ts` |
| 적용 대상 | `insurance_source_documents` 신규 8건 |

DB URL 실제 값과 token은 공개 문서에 기록하지 않는다.

---

## 2. 백업

DB write 전 `.env.local`의 Turso URL/token을 사용한 libSQL 읽기 전용 dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-before-source-documents-db-apply-20260529T052302Z.sql` |
| SHA-256 | `a9a746ff49c5789eaaf2b89aed577b9222e786578eac83eb321a3d725b181147` |
| 백업 테이블 수 | 12 |

백업 직전 핵심 row count:

| 테이블 | Row count |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 12 |
| `insurance_products` | 5 |
| `insurance_premium_quotes` | 84 |

---

## 3. Seed 실행

성공 실행 명령:

```bash
env DOTENV_CONFIG_PATH=.env.local DOTENV_CONFIG_QUIET=true npx tsx -r dotenv/config src/lib/db/seed.ts
```

성공 출력:

```text
Seeding insurance carriers...
Seeding source-aware insurance product candidates...
Seeding source-aware insurance documents...
Seeding active demo insurance products...
Seed complete. 17 carriers, 22 source candidates, 20 documents, and 5 active demo products checked.
```

Seed는 `onConflictDoNothing()` 기반이므로 기존 carrier/source/document/product row를 덮어쓰지 않는다.

---

## 4. 적용 후 DB 검증

| 검사 | 결과 |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 20 |
| `insurance_products` | 5 |
| `insurance_premium_quotes` | 84 |
| 신규 source document row | 8 |
| 누락 신규 document id | 0 |
| invalid source document hash | 0 |

Product source review 상태:

| `review_status` | Row |
|---|---:|
| `needs_review` | 7 |
| `raw` | 15 |

신규 문서 row:

| Document ID | Product source | Type |
|---|---|---|
| `doc_hanwha_life_e_cancer_nonsmoker_summary_202604` | `src_hanwha_life_e_cancer_nonsmoker_202604` | `summary` |
| `doc_hanwha_life_e_cancer_nonsmoker_terms_202604` | `src_hanwha_life_e_cancer_nonsmoker_202604` | `terms` |
| `doc_kyobo_lifeplanet_cancer_nonsmoker_summary_202604` | `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | `summary` |
| `doc_kyobo_lifeplanet_cancer_nonsmoker_business_202604` | `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | `business_method` |
| `doc_kyobo_lifeplanet_cancer_nonsmoker_terms_202604` | `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | `terms` |
| `doc_kyobo_lifeplanet_cancer_standard_summary_202604` | `src_kyobo_lifeplanet_cancer_standard_202605` | `summary` |
| `doc_kyobo_lifeplanet_cancer_standard_business_202604` | `src_kyobo_lifeplanet_cancer_standard_202605` | `business_method` |
| `doc_kyobo_lifeplanet_cancer_standard_terms_202604` | `src_kyobo_lifeplanet_cancer_standard_202605` | `terms` |

---

## 5. Shared Hash 검증

이번 적용 후 shared hash group은 의도된 상태로 존재한다. `file_hash_sha256`은 unique가 아니라 index이므로, 같은 공식 PDF가 여러 source의 근거일 때 source별 별도 row로 연결한다.

| Shared hash group | Row count | 의미 |
|---|---:|---|
| 한화생명 e암보험 요약서 hash | 2 | 표준체형/비흡연체형 source가 같은 요약서를 공유 |
| 한화생명 e암보험 약관 hash | 2 | 표준체형/비흡연체형 source가 같은 약관을 공유 |
| 교보라이프플래닛 요약서 hash | 2 | 비흡연체/표준체 source가 같은 요약서를 공유 |
| 교보라이프플래닛 사업방법서 hash | 2 | 비흡연체/표준체 source가 같은 사업방법서를 공유 |
| 교보라이프플래닛 약관 hash | 2 | 비흡연체/표준체 source가 같은 약관을 공유 |

---

## 6. 안전성 판단

- `insurance_product_sources.review_status`는 승격하지 않았다.
- 신규 quote-only source 15개는 계속 `raw` 상태다.
- 기존 hash-backed source 7개는 계속 `needs_review` 상태다.
- `insurance_products` active demo 5건은 변경하지 않았다.
- 추천 엔진은 이번 신규 source document row를 사용자 추천 snapshot으로 사용하지 않는다.
- KDB생명 40869/40870 variant 미해결 후보와 신한라이프 match score 0.5 후보는 DB에 추가하지 않았다.

---

## 7. 남은 작업

1. KDB생명 `40869_policy`/`40870_policy` 중 product code `L33C009000025`에 맞는 약관 variant를 확정한다.
2. 신한라이프 quote-only 표준형 source와 해약환급금 미지급형 문서의 관계를 재확인한다.
3. `raw`/`needs_review` source의 `coverage_category`, `risk_targets`, `matching_strategy`, caveat를 정리한다.
4. quote row `approved` 승격 기준과 조건별 보험료 UI 분리 표시를 이어서 구현한다.

---

## 8. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | variant gate를 통과한 공식 문서 8건이 실제 DB에 연결됐다 |
| Potential Impact | quote-only source가 공식 문서 근거를 갖기 시작해 한국 보험상품 universe 확장 기반이 강화됐다 |
| Novelty | shared hash를 source별 연결 row로 관리하는 구조를 운영 DB에서 검증했다 |
| UX | 추천 노출 전 공식 문서 근거만 보강해 오안내 위험을 낮춘다 |
| Open-source | 백업, seed, row count, shared hash 검증 절차를 재현 가능하게 남겼다 |
| Business Plan | 실제 보험상품 비교/중개로 가기 위한 공식 문서 기반 DB 품질을 높였다 |

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - raw/needs_review/approved 의미
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Quote-only Source 문서 Variant 검수](./22_QUOTE_ONLY_SOURCE_DOCUMENT_VARIANT_REVIEW_2026_05_29.md) - DB 적용 전 variant gate
- **QA_Validation**: [Source Document Seed 후보 추가 검증](./23_SOURCE_DOCUMENT_SEED_CANDIDATES_2026_05_29.md) - `seed.ts` 추가 검증
- **QA_Validation**: [Source Catalog Quote DB Apply](./19_SOURCE_CATALOG_QUOTE_DB_APPLY_2026_05_29.md) - quote-only source와 quote row 적용 상태
