# [QA] DB생명 암보험 추천 Snapshot DB 적용 검증
> Created: 2026-06-01 04:06
> Last Updated: 2026-06-01 04:06

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #87에서 `seed.ts`에 반영한 DB생명 e로운 암보험 source document, source 승인, quote 승인, active `insurance_products` snapshot 1건의 운영 Turso DB 적용
- **결론**: 백업 생성 후 `src/lib/db/seed.ts`를 실행해 DB생명 source document 1건을 추가하고, source 1건을 `approved`로 승격하고, quote 4건을 `approved`로 바꾸며, source-backed active 추천 상품을 16건에서 17건으로 확대했다.

---

## 1. 적용 대상

| 항목 | 값 |
|---|---|
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| Seed 입력 | `src/lib/db/seed.ts` |
| 적용 source | `src_db_life_eroun_cancer_202601` |
| 적용 document | `doc_db_life_eroun_cancer_terms_202601` |
| 적용 product | `prod_db_life_eroun_cancer_202601` |
| DB write | 1회 seed 실행 |

---

## 2. 백업

DB write 전 `.env.local`의 Turso 연결 설정을 사용한 libSQL 읽기 전용 dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-db-life-cancer-db-apply-20260601T040205KST.sql` |
| 백업 SHA-256 | `b311d85d2463a825001457f43366ee8b63338594449ba7575a1787dd330c865f` |
| 백업 크기 | 439,432 bytes |
| 백업 테이블 수 | 13 |
| 백업 object 수 | 31 |
| 사전 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-db-life-cancer-db-apply-20260601T040205KST.pre.json` |
| 사후 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-db-life-cancer-db-apply-20260601T040205KST.post.json` |

---

## 3. 사전 상태

| 항목 | 적용 전 |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 34 |
| `insurance_premium_quotes` | 92 |
| `insurance_products` | 21 |
| source-backed active product | 16 |
| oncology active product | 9 |
| baseline active product | 7 |
| approved source | 16 |
| approved quote | 64 |

DB생명 target 상태:

| 대상 | 적용 전 |
|---|---|
| source 1건 | `raw`, `sale_status=unknown`, 대표 보험료 없음 |
| source document 1건 | 없음 |
| quote 4건 | 모두 `needs_review` |
| product 1건 | 없음 |

---

## 4. 적용 명령

```bash
env DOTENV_CONFIG_PATH=.env.local DOTENV_CONFIG_QUIET=true npx tsx -r dotenv/config src/lib/db/seed.ts
```

실행 결과:

```text
Seed complete. 17 carriers, 22 source candidates, 35 documents, 17 source approvals, 8 Hanwha carrier quotes inserted if missing, 68 quote approvals, 8 Hanwha zero quotes rejected, 5 legacy demo products archived, and 17 active source-backed insurance products checked.
```

---

## 5. 사후 상태

| 항목 | 적용 전 | 적용 후 |
|---|---:|---:|
| `insurance_source_documents` | 34 | 35 |
| `insurance_products` | 21 | 22 |
| source-backed active product | 16 | 17 |
| oncology active product | 9 | 10 |
| baseline active product | 7 | 7 |
| approved source | 16 | 17 |
| approved quote | 64 | 68 |

DB생명 target 상태:

| 대상 | 적용 후 |
|---|---|
| source `src_db_life_eroun_cancer_202601` | `approved`, `sale_status=active`, 대표 보험료 9,700 KRW |
| source document | `doc_db_life_eroun_cancer_terms_202601` 1건 존재, SHA-256 일치 |
| quote 4건 | 모두 `approved` |
| product `prod_db_life_eroun_cancer_202601` | `catalog_status=approved`, `is_active=1`, `monthly_premium_usdc=7.19` |

---

## 6. 안전성

- 운영 DB write 전 백업을 생성했다.
- 백업 파일과 pre/post JSON은 `/private/tmp`에만 남기고 Git에는 포함하지 않는다.
- DB URL 실제 값과 token은 문서에 기록하지 않았다.
- Drizzle schema와 migration은 변경하지 않았다.
- legacy demo 상품은 계속 `archived` 상태로 유지한다.
- DB생명 상품은 `matching_strategy=risk_target`, 5개 oncology `risk_targets`를 유지한다.
- 공식 문서 hash는 64자 SHA-256이며 적용 후 DB row hash와 일치한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 운영 추천 카탈로그가 DB생명 암보험 1건을 포함해 17개 active 상품으로 확대됐다 |
| Potential Impact | 테스트 사용자가 oncology 상품을 10개까지 비교할 수 있다 |
| Novelty | DB생명 공식 공시 약관 hash와 보험다모아 quote matrix를 결합한 추천 발행 패턴을 운영 DB에 적용했다 |
| UX | DB생명 카드도 대표 보험료, 조건별 quote, 공식 출처, caveat 기반으로 설명 가능하다 |
| Open-source | 백업, seed apply, 사후 검증, row count 기록 절차를 재현 가능하게 남긴다 |
| Business Plan | 실제 상품 카탈로그 폭을 넓혀 보험 비교/제휴 검증 가능성을 높인다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [DB Life Cancer Disclosure Adapter Probe](./81_DB_LIFE_CANCER_DISCLOSURE_ADAPTER_PROBE_2026_06_01.md) - 공식 문서 hash 검증
- **QA_Validation**: [DB Life Cancer Matching Review](./82_DB_LIFE_CANCER_MATCHING_REVIEW_2026_06_01.md) - 매칭 키워드와 caveat 검수 근거
- **QA_Validation**: [DB Life Cancer Snapshot Seed](./83_DB_LIFE_CANCER_SNAPSHOT_SEED_2026_06_01.md) - 이번 apply의 seed 준비 검증
