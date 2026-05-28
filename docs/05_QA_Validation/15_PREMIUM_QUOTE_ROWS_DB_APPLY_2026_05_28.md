# [QA] 보험료 Quote Row DB 적용 검증
> Created: 2026-05-28 21:13
> Last Updated: 2026-05-28 23:51

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: `data/insurance/latest_premium_quote_probe.json`의 보험다모아 quote row를 `insurance_premium_quotes`에 source-aware 후보 단위로 적재
- **결론**: 백업 생성 후 당시 PoC raw quote 66건 중 현재 `insurance_product_sources`와 매칭되는 16건을 Turso DB에 `needs_review` 상태로 적재했다. 이후 실손 여성 파라미터 해소 PR에서 8건을 추가 적재해 현재 quote row는 24건이다.

---

## 1. 적용 대상 DB

| 항목 | 값 |
|---|---|
| Env file | `.env.local` |
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| 작업 브랜치 | `insurance-premium-quotes-rows` |
| 입력 파일 | `data/insurance/latest_premium_quote_probe.json` |
| 적용 스크립트 | `scripts/insurance/apply-premium-quotes.mjs` |

DB URL 실제 값은 공개 문서에 남기지 않고 `.env.local`에서만 관리한다.

---

## 2. 백업

적재 전 `.env.local`의 Turso URL/token을 사용한 libSQL 읽기 전용 dump 백업을 생성했다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-before-premium-quote-rows-20260528T121137Z.sql` |
| SHA-256 | `3358ef6392c05e6a8e96a5f17fa5b3108fd3f604638993c3ca4a83771f1ef72a` |
| 백업 방식 | `.env.local`의 Turso URL/token을 사용한 libSQL 읽기 전용 dump |

백업 직전 row count:

| 테이블 | Row count |
|---|---:|
| `__drizzle_migrations` | 7 |
| `analysis_results` | 70 |
| `analysis_sessions` | 78 |
| `auth_nonces` | 2 |
| `insurance_carriers` | 7 |
| `insurance_premium_quotes` | 0 |
| `insurance_product_sources` | 7 |
| `insurance_products` | 5 |
| `insurance_source_documents` | 12 |
| `recommendation_carts` | 64 |
| `transactions` | 45 |
| `user_profiles` | 2 |

백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

---

## 3. 실행

Dry-run 명령:

```bash
npm run apply:insurance:quotes
```

Dry-run 결과:

```text
Mode: dry_run
Probe quote rows: 66
Matched source rows: 16
Skipped rows: 50
Inserted rows: 0
Table count: 0 -> 0
```

적용 명령:

```bash
npm run apply:insurance:quotes -- --apply
```

적용 결과:

```text
Mode: apply
Probe quote rows: 66
Matched source rows: 16
Skipped rows: 50
Inserted rows: 16
Table count: 0 -> 16
```

적용 요약 산출물:

| 파일 | 역할 |
|---|---|
| `data/insurance/latest_premium_quote_rows_apply.json` | source 후보 매칭, 제외 사유, DB 적용 row count 요약 |

---

## 4. 적용 후 DB 검증

| 검사 | 결과 |
|---|---:|
| `insurance_premium_quotes` 전체 row | 16 |
| `review_status=needs_review` | 16 |
| invalid `quote_hash_sha256` | 0 |
| duplicate primary key | 0 |

Source별 적재 결과:

| Source ID | Row | Null 보험료 | 최저 KRW | 최고 KRW |
|---|---:|---:|---:|---:|
| `src_hanwha_life_e_cancer_202604` | 4 | 4 | null | null |
| `src_shinhan_life_sol_cancer_202601` | 4 | 0 | 6,750 | 10,030 |
| `src_db_direct_medical_202605` | 2 | 0 | 6,219 | 9,320 |
| `src_kb_direct_medical_202605` | 2 | 0 | 6,400 | 9,074 |
| `src_samsung_fire_direct_medical_202605` | 2 | 0 | 6,575 | 9,546 |
| `src_hyundai_direct_medical_202605` | 2 | 0 | 6,740 | 9,190 |

한화생명 e암보험은 보험다모아 화면에서 `0원`으로 표시되어 숫자형 월 보험료로 정규화하지 않고 `monthly_premium_krw=null`, `premium_text=0원` 형태로 보존한다.

---

## 5. 제외 Row 해석

PoC raw quote 66건 중 50건은 `not_in_source_catalog`로 제외했다. 이는 quote row가 잘못됐다는 뜻이 아니라, 아직 `insurance_product_sources`에 해당 상품이 source 후보로 등록되지 않았다는 뜻이다.

| 제외 사유 | Row |
|---|---:|
| `not_in_source_catalog` | 50 |

후속 작업은 제외된 50건 중 P0 질병/암/실손 상품을 원천 상품 후보로 등록하고, 공식 문서 hash와 매칭 키워드를 정리한 뒤 quote row를 다시 적용하는 것이다.

---

## 6. 안전성 판단

- 이번 적재는 `insurance_premium_quotes`만 변경했다.
- 모든 신규 row는 `needs_review` 상태이므로 사용자 UI에 확정 견적으로 노출하지 않는다.
- 기존 active demo `insurance_products` 5건은 변경하지 않았다.
- quote row ID는 `product_source_id`, `condition_id`, 응답 hash prefix 기반으로 생성되어 같은 응답의 중복 삽입을 방지한다.
- 실손의료보험 여성 조건은 후속 QA17에서 모바일 폼 기준 `L` 파라미터로 해소했고, 여성 실손 quote row 8건을 추가 적재했다.

---

## 7. 남은 작업

1. source catalog 미등록 quote 60건 중 P0 질병/암/실손 상품을 원천 후보로 확장한다.
2. quote row를 사람이 검수한 뒤 `approved` 승격 기준을 정한다.
3. UI에서 대표 보험료와 조건별 예상 보험료를 분리 표시한다.

---

## 8. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 공식 비교 출처의 조건별 보험료를 실제 DB에 저장하는 반복 실행 경로가 생겼다 |
| Potential Impact | 나이/성별 기반 보험료 차이를 추천 근거와 함께 보여줄 수 있는 기반이 생겼다 |
| Novelty | DNA risk matching과 공식 quote matrix를 분리 검수하는 보험 추천 구조가 구체화됐다 |
| UX | 사용자가 대표 보험료와 자신의 조건별 예상 보험료를 구분할 수 있는 UI 기반이 생겼다 |
| Open-source | dry-run, 백업, apply, DB 검증 절차가 산출물과 문서로 재현 가능하다 |
| Business Plan | 실제 비교/중개 서비스로 가기 위한 조건별 가격 데이터 적재 루프가 작동한다 |

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - source-aware catalog와 quote table 설계
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 조건별 보험료 matrix 관리 방침
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 트랙
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 다음 작업 일정
- **QA_Validation**: [Premium Quote Matrix PoC](./12_PREMIUM_QUOTE_MATRIX_POC_2026_05_28.md) - quote row 수집 근거
- **QA_Validation**: [Premium Quotes Schema Migration](./13_PREMIUM_QUOTES_SCHEMA_MIGRATION_2026_05_28.md) - `insurance_premium_quotes` schema/migration 검증
- **QA_Validation**: [Premium Quotes DB Apply](./14_PREMIUM_QUOTES_DB_APPLY_2026_05_28.md) - `0006` Turso DB 적용 검증
- **QA_Validation**: [Medical Female Quote Params](./17_MEDICAL_FEMALE_QUOTE_PARAMS_2026_05_28.md) - 실손 여성 파라미터 해소와 8건 추가 적재 검증
