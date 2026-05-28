# [QA] Source-aware Seed DB 적용 검증
> Created: 2026-05-28 10:43
> Last Updated: 2026-05-28 10:56

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #7에서 추가한 `insurance_carriers`, `insurance_product_sources`, `insurance_source_documents` seed row의 Turso DB 실제 적용
- **결론**: 백업 생성 후 source-aware seed를 Turso DB에 적용했고, 7개 보험사, 7개 source 후보, 12개 source document가 기대값대로 적재됐다. 기존 active demo `insurance_products` 5건은 유지됐고, 실제 상품 후보는 사용자 추천 상품으로 노출되지 않는다.

---

## 1. 적용 대상 DB

| 항목 | 값 |
|---|---|
| Env file | `.env.local` |
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| 작업 브랜치 | `source-aware-seed-db-apply` |
| 기준 커밋 | `b92d6ef` |

DB URL 실제 값은 공개 문서에 남기지 않고 `.env.local`에서만 관리한다. 대상 DB는 원격 Turso 인스턴스이므로, seed 실행 전 기존 migration 절차와 동일하게 읽기 전용 SQL dump 백업을 먼저 생성했다.

---

## 2. 백업

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-before-source-aware-seed-20260528T013753Z.sql` |
| SHA-256 | `fb40ce1e2e3ff9914883ea8f34f45e0ead497b559fd714921067981740efa2ca` |
| 백업 방식 | `.env.local`의 Turso URL/token을 사용한 libSQL 읽기 전용 dump |

백업 직전 row count:

| 테이블 | Row count |
|---|---:|
| `__drizzle_migrations` | 6 |
| `analysis_results` | 70 |
| `analysis_sessions` | 78 |
| `auth_nonces` | 2 |
| `insurance_carriers` | 0 |
| `insurance_product_sources` | 0 |
| `insurance_products` | 5 |
| `insurance_source_documents` | 0 |
| `recommendation_carts` | 64 |
| `transactions` | 45 |
| `user_profiles` | 2 |

백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

---

## 3. 실행

첫 실행은 `.env.local`을 명시하지 않아 `TURSO_DATABASE_URL=undefined` 상태에서 실패했다. 이 실패는 DB 연결 생성 전 오류이며 row write는 발생하지 않았다.

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
Seed complete. 7 carriers, 7 source candidates, 12 documents, and 5 active demo products checked.
```

---

## 4. 적용 후 DB 검증

| 검사 | 결과 |
|---|---:|
| `insurance_carriers` | 7 |
| `insurance_product_sources` | 7 |
| `insurance_source_documents` | 12 |
| `insurance_products` | 5 |
| active `insurance_products` | 5 |
| `review_status=needs_review` source 후보 | 7 |
| `usage_status=link_only` source documents | 12 |
| `parse_status=not_parsed` source documents | 12 |
| invalid source document hash | 0 |

검증된 보험사:

| ID | 이름 | 유형 |
|---|---|---|
| `carrier_db_insurance` | DB손보 | general |
| `carrier_hanwha_life` | 한화생명 | life |
| `carrier_hyundai_marine` | 현대해상 | general |
| `carrier_kb_insurance` | KB손보 | general |
| `carrier_samsung_fire` | 삼성화재 | general |
| `carrier_samsung_life` | 삼성생명 | life |
| `carrier_shinhan_life` | 신한라이프생명 | life |

검증된 source 후보:

| ID | Review status | 대표 월 보험료 |
|---|---|---:|
| `src_db_direct_medical_202605` | `needs_review` | 6,219 |
| `src_hanwha_life_e_cancer_202604` | `needs_review` | null |
| `src_hyundai_direct_medical_202605` | `needs_review` | 6,740 |
| `src_kb_direct_medical_202605` | `needs_review` | 6,400 |
| `src_samsung_fire_direct_medical_202605` | `needs_review` | 6,575 |
| `src_samsung_life_hospital_health_202601` | `needs_review` | 8,650 |
| `src_shinhan_life_sol_cancer_202601` | `needs_review` | 6,750 |

한화생명 e암보험 약관 문서 검증:

| 항목 | 값 |
|---|---|
| Document ID | `doc_hanwha_life_e_cancer_terms_202604` |
| SHA-256 | `918796d28b8274195258621c08c32c87159c18b1a50fb6e6f653a8c42ba8f7ed` |
| Content length | 3,661,413 bytes |

---

## 5. 안전성 판단

- Seed는 `onConflictDoNothing()` 기반이므로 이미 존재하는 row를 덮어쓰지 않는다.
- 실제 상품 후보 7개는 모두 `insurance_product_sources.review_status=needs_review`다.
- `insurance_products` active row는 기존 demo 5건 그대로 유지됐다.
- 추천 엔진은 아직 `insurance_product_sources`를 읽지 않으므로, 이번 DB 적용은 사용자 추천 노출을 바꾸지 않는다.
- Source document hash는 모두 64자 lowercase hex로 확인됐다.

---

## 6. 남은 작업

1. 보험다모아/보험사 페이지에서 나이와 성별별 보험료 재조회 PoC를 수행한다.
2. `insurance_premium_quotes` schema/migration 초안을 작성한다.
3. 나머지 49개 P0 후보의 공식 문서 hash와 매칭 키워드를 정리한다.
4. 매칭 키워드가 정리된 실제 상품만 `insurance_products` active snapshot으로 별도 발행한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 공식 출처 기반 source catalog가 실제 DB에 적재되어 후속 매칭 작업의 기반이 생겼다 |
| Potential Impact | 한국 질병 보험상품 universe 확장을 위한 원천 row 저장 경로가 작동한다 |
| Novelty | DNA risk matching 전 단계에서 source row와 추천 snapshot을 분리하는 운영 구조를 검증했다 |
| UX | 매칭 키워드 정리 전 실제 상품이 사용자 추천으로 노출되지 않아 오해를 막는다 |
| Open-source | 백업, seed, row count 검증 절차가 문서화되어 재현 가능하다 |
| Business Plan | 보험 비교/중개 서비스로 가기 위한 공식 출처 DB 기반을 확보했다 |

---

## 8. Related Documents

- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 다음 구현 순서와 Track A 상태
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 적용 전략
- **QA_Validation**: [Source-aware Seed Policy QA](./10_SOURCE_AWARE_SEED_POLICY_2026_05_28.md) - seed 정책과 추천 노출 차단 기준
- **QA_Validation**: [DB Migration 0004/0005](./09_DB_MIGRATION_0004_0005_2026_05_28.md) - source-aware catalog schema 적용 검증
- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - source-aware catalog DB 필드
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - DNA risk target과 보험상품 보장 키워드 매칭 기준
