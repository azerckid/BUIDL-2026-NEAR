# [QA] 보험료 Quote DB Migration 0006 적용 검증
> Created: 2026-05-28 20:55
> Last Updated: 2026-05-28 20:55

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: Turso DB schema migration `0006_real_war_machine.sql`
- **결론**: 백업 생성 후 `insurance_premium_quotes` 테이블 migration을 Turso DB에 적용했고, 신규 테이블, FK, 인덱스, Drizzle migration 기록이 모두 확인됐다.

---

## 1. 적용 대상 DB

| 항목 | 값 |
|---|---|
| Env file | `.env.local` |
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| 작업 브랜치 | `insurance-premium-quotes-db-apply` |
| 기준 커밋 | `797d7b5` |
| 적용 migration | `drizzle/0006_real_war_machine.sql` |

DB URL 실제 값은 공개 문서에 남기지 않고 `.env.local`에서만 관리한다.

---

## 2. 사전 상태

Migration 적용 전 Turso DB 상태는 다음과 같았다.

| 항목 | 확인 결과 |
|---|---:|
| Drizzle migration 기록 | 6 |
| 전체 테이블 수 | 11 |
| `insurance_premium_quotes` 테이블 | 없음 |
| `insurance_carriers` | 7 |
| `insurance_product_sources` | 7 |
| `insurance_source_documents` | 12 |
| `insurance_products` | 5 |

---

## 3. 백업

첫 백업 시도는 `.env.local`을 명시하지 않아 `TURSO_DATABASE_URL=undefined` 상태에서 실패했다. 이 실패는 DB 연결 생성 전 오류이며 row write는 발생하지 않았다.

성공한 백업은 `.env.local`의 Turso URL/token을 사용한 libSQL 읽기 전용 dump 방식으로 생성했다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-before-0006-20260528T115401Z.sql` |
| SHA-256 | `d521e808c54b170cdf433e9f1f4a3c8c47b9e50360fea2cf605c7bf615c61b3d` |
| 백업 방식 | `.env.local`의 Turso URL/token을 사용한 libSQL 읽기 전용 dump |

백업 직전 row count:

| 테이블 | Row count |
|---|---:|
| `__drizzle_migrations` | 6 |
| `analysis_results` | 70 |
| `analysis_sessions` | 78 |
| `auth_nonces` | 2 |
| `insurance_carriers` | 7 |
| `insurance_product_sources` | 7 |
| `insurance_products` | 5 |
| `insurance_source_documents` | 12 |
| `recommendation_carts` | 64 |
| `transactions` | 45 |
| `user_profiles` | 2 |

백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

---

## 4. 실행

실행 명령:

```bash
npx drizzle-kit migrate
```

결과:

```text
migrations applied successfully
```

---

## 5. 적용 후 DB 검증

| 검사 | 결과 |
|---|---:|
| Drizzle migration 기록 | 7 |
| 전체 테이블 수 | 12 |
| `insurance_premium_quotes` 테이블 | 존재 |
| `insurance_premium_quotes` row | 0 |
| `insurance_carriers` | 7 |
| `insurance_product_sources` | 7 |
| `insurance_source_documents` | 12 |
| `insurance_products` | 5 |

검증된 컬럼 수:

| 테이블 | 컬럼 수 |
|---|---:|
| `insurance_premium_quotes` | 23 |

검증된 custom index:

| 인덱스 | 목적 |
|---|---|
| `premium_quotes_product_condition_idx` | 특정 상품의 나이/성별 조건별 가격 조회 |
| `premium_quotes_product_review_idx` | 승인된 quote row만 노출 |
| `premium_quotes_hash_idx` | quote 응답 중복/변경 추적 |

SQLite primary key 자동 인덱스 `sqlite_autoindex_insurance_premium_quotes_1`도 함께 생성됐다.

---

## 6. 안전성 판단

- 이번 migration은 신규 테이블과 신규 인덱스 추가만 수행했다.
- 기존 테이블 row count는 백업 직전과 동일하게 유지됐다.
- `insurance_premium_quotes`는 아직 0건이므로 사용자 추천 결과와 UI에는 영향이 없다.
- quote row 적재, 실손 여성 파라미터 확인, 사용자 조건별 가격 UI는 후속 PR 범위다.

---

## 7. 검증 명령

```bash
npx drizzle-kit check
npx drizzle-kit migrate
```

적용 후에는 libSQL 읽기 전용 query로 `sqlite_master`, `PRAGMA table_info`, row count를 확인했다.

---

## 8. 남은 작업

1. P0 암보험/실손의료보험 quote row 수집 crawler를 작성한다.
2. PR #9 산출물의 quote row를 `insurance_premium_quotes` raw/needs_review row로 적재한다.
3. 실손의료보험 여성 조건 POST 파라미터 500 블로커를 해소한다.
4. 조건별 예상 보험료를 UI에 표시하기 전 review/approved 정책을 적용한다.

---

## 9. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 조건별 보험료 matrix를 실제 DB에 저장할 구조가 운영 DB에 적용됐다 |
| Potential Impact | 나이/성별 기반 실제 보험료 비교로 한국 보험상품 추천의 현실성이 높아진다 |
| Novelty | DNA risk matching과 공식 quote matrix를 분리 저장하는 검증 가능한 보험 추천 구조가 된다 |
| UX | 대표 보험료와 사용자 조건별 예상 보험료를 분리 표시할 기반이 생겼다 |
| Open-source | migration, 백업, 검증 절차가 문서화되어 재현 가능하다 |
| Business Plan | 보험 비교/중개 서비스 전환에 필요한 가격 matrix 저장 기반을 확보했다 |

---

## 10. Related Documents

- **Technical_Specs**: [DB Schema](../03_Technical_Specs/DB_SCHEMA.md) - 현재 DB schema 명세
- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - 보험 카탈로그 확장 설계
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 조건별 보험료 matrix 관리 방침
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 트랙
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 다음 작업 일정
- **QA_Validation**: [Premium Quotes Schema Migration](./13_PREMIUM_QUOTES_SCHEMA_MIGRATION_2026_05_28.md) - `0006` migration 생성 검증
- **QA_Validation**: [Premium Quote Matrix PoC](./12_PREMIUM_QUOTE_MATRIX_POC_2026_05_28.md) - quote row 수집 근거
