# [QA] 보험료 Quote Schema Migration 검증
> Created: 2026-05-28 19:28
> Last Updated: 2026-05-28 19:28

- **레이어**: 05_QA_Validation
- **상태**: Completed - Schema Only
- **범위**: `insurance_premium_quotes` Drizzle schema와 `0006` migration 생성 검증
- **결론**: 조건별 보험료 quote row를 저장할 DB schema와 migration 파일을 생성했다. 운영 Turso DB 적용과 quote row 적재는 아직 수행하지 않는다.

---

## 1. 목적

PR #9의 quote matrix PoC는 보험다모아 모바일 출처에서 같은 상품의 보험료가 나이/성별 조건에 따라 달라진다는 점을 확인했다. 기존 `insurance_product_sources.monthly_premium_krw`와 `insurance_products.monthly_premium_krw`는 대표 보험료 1개만 담으므로, 조건별 가격 matrix를 별도 테이블에 저장해야 한다.

이번 검증은 다음을 확인한다.

- Drizzle schema가 정책 문서의 필드를 반영했는지
- migration SQL이 새 테이블, FK, 인덱스를 포함하는지
- 기존 추천/seed/checkout 경로를 변경하지 않았는지
- 운영 DB 적용이 이번 PR 범위를 넘지 않는지

---

## 2. 생성 산출물

| 항목 | 값 |
|---|---|
| schema 파일 | `src/lib/db/schema.ts` |
| migration 파일 | `drizzle/0006_real_war_machine.sql` |
| snapshot 파일 | `drizzle/meta/0006_snapshot.json` |
| journal 갱신 | `drizzle/meta/_journal.json` |
| 테이블 | `insurance_premium_quotes` |
| 컬럼 수 | 23 |
| 인덱스 수 | 3 |
| FK 수 | 2 |

---

## 3. 테이블 검증

| 항목 | 결과 |
|---|---|
| `product_source_id` FK | `insurance_product_sources.id` 참조 |
| `carrier_id` FK | `insurance_carriers.id` 참조 |
| 조건 필드 | `age`, `sex`, `source_sex_code`, `payment_cycle`, `payment_period_years`, `insurance_period_years`, `coverage_amount_krw`, `plan_name`, `renewal_type`, `riders_json` 포함 |
| 보험료 필드 | `premium_currency`, `monthly_premium_krw`, `premium_text` 포함 |
| 출처 필드 | `quote_source_type`, `quote_source_url`, `quote_params_json`, `quote_hash_sha256`, `retrieved_at` 포함 |
| 검수 필드 | `review_status`, `created_at` 포함 |
| Zod schema | `insurancePremiumQuoteInsertSchema` 추가. `quote_params_json`, `riders_json`은 JSON 문자열 검증, `quote_hash_sha256`은 64자 hex 검증 |
| inferred type | `InsurancePremiumQuote` 추가 |

---

## 4. 인덱스 검증

| 인덱스 | 컬럼 | 목적 | 결과 |
|---|---|---|---|
| `premium_quotes_product_condition_idx` | `product_source_id`, `age`, `sex` | 특정 상품의 조건별 가격 조회 | PASS |
| `premium_quotes_product_review_idx` | `product_source_id`, `review_status` | 노출 가능한 quote 필터링 | PASS |
| `premium_quotes_hash_idx` | `quote_hash_sha256` | 응답 중복/변경 추적 | PASS |

---

## 5. 비적용 확인

이번 PR에서는 다음을 하지 않는다.

| 항목 | 상태 |
|---|---|
| Turso 운영 DB migration 실행 | 미실행 |
| `insurance_premium_quotes` row seed | 미실행 |
| active demo 상품 변경 | 미변경 |
| 기존 추천 로직 변경 | 미변경 |
| checkout USDC 정산 경로 변경 | 미변경 |

운영 DB 적용은 PR 머지 후 별도 작업으로 진행한다. 적용 전에는 CLAUDE.md 규칙에 따라 백업을 먼저 수행한다.

---

## 6. 검증 명령

```bash
npx drizzle-kit generate
npx drizzle-kit check
npx eslint src/lib/db/schema.ts
npx tsc --noEmit
git diff --check
```

`npm run lint` 전체 명령은 현재 로컬의 gitignored `.agent`, `.claude`, `.next` 디렉터리까지 검사할 수 있으므로 PR 검증에서는 변경 파일과 `src` 범위 검증을 기준으로 삼는다.

---

## 7. 다음 작업

1. PR 머지 후 운영 DB를 백업한다.
2. `drizzle/0006_real_war_machine.sql`을 Turso DB에 적용한다.
3. 적용 후 `sqlite_master` 또는 Drizzle introspection으로 테이블/인덱스 생성을 확인한다.
4. P0 암보험/실손의료보험 quote row 수집 crawler를 작성한다.
5. 실손의료보험 여성 조건 POST 파라미터를 공식 화면 기준으로 재확인한다.

---

## 8. Related Documents

- **Technical_Specs**: [DB Schema](../03_Technical_Specs/DB_SCHEMA.md) - 현재 DB schema 명세
- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - 보험 카탈로그 확장 설계
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 조건별 보험료 matrix 관리 방침
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 트랙
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 다음 작업 일정
- **QA_Validation**: [Premium Quote Matrix PoC](./12_PREMIUM_QUOTE_MATRIX_POC_2026_05_28.md) - quote table이 필요한 실측 근거
- **QA_Validation**: [Source-aware Seed DB Apply](./11_SOURCE_AWARE_SEED_DB_APPLY_2026_05_28.md) - 직전 DB 적용 상태
