# [QA] KDB Source Document DB 적용 검증
> Created: 2026-05-30 03:06
> Last Updated: 2026-05-30 03:06

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #25에서 `seed.ts`에 추가한 KDB생명 source document 2건의 Turso DB 실제 적용
- **결론**: 백업 생성 후 `src/lib/db/seed.ts`를 실행해 KDB생명 `40869_summary`와 `40870_policy` 2개 문서를 `insurance_source_documents`에 적용했다. 최종 DB는 `insurance_source_documents=22`이며, `insurance_product_sources.review_status`, `insurance_products`, 추천 노출 상태는 변경하지 않았다. `40869_policy` 갱신형 약관 hash는 DB에 추가하지 않았다.

---

## 1. 적용 대상

| 항목 | 값 |
|---|---|
| Env file | `.env.local` |
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| 작업 브랜치 | `insurance-kdb-source-docs-db-apply` |
| 기준 main merge commit | `e735b24` |
| Seed 입력 | `src/lib/db/seed.ts` |
| 적용 대상 | `insurance_source_documents` 신규 2건 |

DB URL 실제 값과 인증값은 공개 문서에 기록하지 않는다.

---

## 2. 백업

DB write 전 `.env.local`의 Turso 연결 설정을 사용한 libSQL 읽기 전용 dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-before-kdb-source-docs-db-apply-20260529T180637Z.sql` |
| SHA-256 | `c0aadee56f962281796581cf7ad933e5668538cbac72d6dc2e88c73efa4246c6` |
| 백업 테이블 수 | 12 |

백업 직전 핵심 row count:

| 테이블 | Row count |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 20 |
| `insurance_products` | 5 |
| `insurance_premium_quotes` | 84 |

백업 직전 추가 대상 상태:

| 검사 | 결과 |
|---|---:|
| KDB 신규 source document row | 0 |
| invalid source document hash | 0 |

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
Seed complete. 17 carriers, 22 source candidates, 22 documents, and 5 active demo products checked.
```

Seed는 `onConflictDoNothing()` 기반이므로 기존 carrier/source/document/product row를 덮어쓰지 않는다.

---

## 4. 적용 후 DB 검증

| 검사 | 결과 |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 22 |
| `insurance_products` | 5 |
| `insurance_premium_quotes` | 84 |
| 신규 KDB source document row | 2 |
| 누락 신규 KDB document id | 0 |
| invalid source document hash | 0 |
| 제외한 `40869_policy` hash row | 0 |

Product source review 상태:

| `review_status` | Row |
|---|---:|
| `needs_review` | 7 |
| `raw` | 15 |

신규 문서 row:

| Document ID | Product source | Type | Content length |
|---|---|---|---:|
| `doc_kdb_life_direct_cancer_summary_202605` | `src_kdb_life_direct_cancer_202605` | `summary` | 204656 |
| `doc_kdb_life_direct_cancer_terms_202605` | `src_kdb_life_direct_cancer_202605` | `terms` | 6688831 |

---

## 5. 안전성 판단

- `insurance_product_sources.review_status`는 승격하지 않았다.
- 신규 quote-only source 15개는 계속 `raw` 상태다.
- 기존 hash-backed source 7개는 계속 `needs_review` 상태다.
- `insurance_products` active demo 5건은 변경하지 않았다.
- 추천 엔진은 이번 신규 source document row를 사용자 추천 snapshot으로 사용하지 않는다.
- 신한라이프 표준형 source는 일반형 공식 문서 endpoint 확인 전까지 계속 차단 상태다.

---

## 6. 남은 작업

1. 신한라이프 `L11C009000007` 일반형 상품요약서, 사업방법서, 판매약관 endpoint를 탐색한다.
2. `raw`/`needs_review` source의 `coverage_category`, `risk_targets`, `matching_strategy`, caveat를 정리한다.
3. quote row `approved` 승격 기준과 조건별 보험료 UI 분리 표시를 이어서 구현한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | KDB no-refund III source에 맞는 공식 문서 2건이 실제 DB에 연결됐다 |
| Potential Impact | quote-only source 확장을 운영 DB에 반영해 한국 보험상품 universe가 한 단계 확장됐다 |
| Novelty | 보험다모아 quote source와 보험사 PDF variant를 hash 기반으로 안전하게 재결합했다 |
| UX | 잘못된 갱신형 약관 연결을 차단해 추천 근거 정확도를 높였다 |
| Open-source | 백업, seed, row count, 제외 hash 검증 절차를 재현 가능하게 남겼다 |
| Business Plan | 실제 판매 상품 카탈로그의 공식 문서 기반 DB 품질을 높였다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - raw/needs_review/approved 의미
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [KDB/신한 Source 문서 Variant 재검수](./26_KDB_SHINHAN_VARIANT_REVIEW_2026_05_29.md) - KDB 문서 2건 seed 후보 확정 근거
- **QA_Validation**: [KDB Source Document Seed 후보 추가 검증](./27_KDB_SOURCE_DOCUMENT_SEED_CANDIDATES_2026_05_30.md) - `seed.ts` 추가 검증
- **QA_Validation**: [Source Document DB 적용 검증](./24_SOURCE_DOCUMENTS_DB_APPLY_2026_05_29.md) - 직전 source document DB 적용 상태
