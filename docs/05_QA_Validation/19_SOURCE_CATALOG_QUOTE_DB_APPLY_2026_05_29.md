# [QA] Quote-only Source Catalog DB 적용 검증
> Created: 2026-05-29 01:25
> Last Updated: 2026-05-29 01:25

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: quote-only raw source 후보 15개 DB 적용, 보험다모아 quote row 60건 추가 적재
- **결론**: 백업 생성 후 PR #15의 신규 carrier/source seed를 Turso DB에 적용했고, 기존 24건에 더해 quote row 60건을 추가 적재했다. 최종 DB는 `insurance_carriers=17`, `insurance_product_sources=22`, `insurance_premium_quotes=84`이며, 모든 quote row는 `needs_review` 상태다.

---

## 1. 적용 대상

| 항목 | 값 |
|---|---|
| Env file | `.env.local` |
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| 작업 브랜치 | `insurance-quote-expansion-db-apply` |
| Seed 입력 | `src/lib/db/seed.ts` |
| Quote 입력 | `data/insurance/latest_premium_quote_probe.json` |
| 적용 스크립트 | `scripts/insurance/apply-premium-quotes.mjs` |

DB URL 실제 값과 token은 공개 문서에 기록하지 않는다.

---

## 2. 백업

DB write 전 `.env.local`의 Turso URL/token을 사용한 libSQL dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-before-quote-expansion-db-apply-20260528T161450Z.sql` |
| SHA-256 | `3a18684b3da227b607c127a5fca046d63c7fc246e68ca7404257968ab1d3e550` |
| 백업 테이블 수 | 12 |

백업 직전 핵심 row count:

| 테이블 | Row count |
|---|---:|
| `insurance_carriers` | 7 |
| `insurance_product_sources` | 7 |
| `insurance_source_documents` | 12 |
| `insurance_products` | 5 |
| `insurance_premium_quotes` | 24 |

---

## 3. 적용 전 Dry-run

Seed 적용 전 quote dry-run에서는 신규 source catalog가 아직 DB에 없어서 60건이 제외됐다.

```text
Mode: dry_run
Probe quote rows: 84
Matched source rows: 24
Semantic duplicates: 24
Insert candidates: 0
Skipped rows: 60
Inserted rows: 0
Table count: 24 -> 24
```

Seed 적용 후 같은 dry-run은 84건 모두 source 후보와 매칭했고, 기존 24건을 semantic duplicate로 제외한 뒤 60건을 신규 insert 후보로 잡았다.

```text
Mode: dry_run
Probe quote rows: 84
Matched source rows: 84
Semantic duplicates: 24
Insert candidates: 60
Skipped rows: 0
Inserted rows: 0
Table count: 24 -> 24
```

---

## 4. Seed 및 Quote Apply

Seed 실행 결과:

```text
Seed complete. 17 carriers, 22 source candidates, 12 documents, and 5 active demo products checked.
```

Quote apply 실행 결과:

```text
Mode: apply
Probe quote rows: 84
Matched source rows: 84
Semantic duplicates: 24
Insert candidates: 60
Skipped rows: 0
Inserted rows: 60
Table count: 24 -> 84
```

적용 요약 산출물:

| 파일 | 역할 |
|---|---|
| `data/insurance/latest_premium_quote_rows_apply.json` | source 후보 매칭, semantic duplicate, insert row count 요약 |

---

## 5. 적용 후 DB 검증

| 검사 | 결과 |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 12 |
| `insurance_products` | 5 |
| `insurance_premium_quotes` | 84 |
| invalid `quote_hash_sha256` | 0 |
| semantic duplicate key | 0 |

Product source 상태:

| `review_status` | Row |
|---|---:|
| `needs_review` | 7 |
| `raw` | 15 |

Quote 상태:

| `review_status` | Row |
|---|---:|
| `needs_review` | 84 |

Quote 조건 분포:

| 구분 | Row |
|---|---:|
| 남성 | 42 |
| 여성 | 42 |
| 암보험 | 48 |
| 실손의료보험 | 36 |
| 이번 적용으로 추가된 raw source 기반 quote | 60 |

적용 후 idempotency dry-run 결과:

```text
Mode: dry_run
Probe quote rows: 84
Matched source rows: 84
Semantic duplicates: 84
Insert candidates: 0
Skipped rows: 0
Inserted rows: 0
Table count: 84 -> 84
```

---

## 6. 안전성 판단

- 이번 적용은 source catalog와 raw quote matrix를 확장했지만 `insurance_products` active demo 5건은 변경하지 않았다.
- 신규 15개 product source는 `review_status=raw`라 사용자 추천 대상으로 해석하지 않는다.
- 신규 quote row 60건과 기존 quote row 24건은 모두 `needs_review` 상태다.
- `insurance_source_documents`는 12건 그대로다. quote-only 후보의 공식 PDF hash는 아직 확보하지 않았기 때문에 문서 row를 늘리지 않았다.
- quote row의 조건별 보험료는 확정 견적이 아니라 보험다모아 비교 조건 기준 예상 보험료로만 다룬다.

---

## 7. 남은 작업

1. quote-only raw source 15개의 공식 상품 페이지/PDF hash를 확보한다.
2. 암보험/실손의료보험별 `coverage_category`, `risk_targets`, `matching_strategy`, caveat를 정리한다.
3. quote row `approved` 승격 기준을 정한다.
4. UI에서 대표 보험료와 조건별 예상 보험료를 분리 표시한다.

---

## 8. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 보험다모아 quote matrix 84건이 모두 source catalog와 연결됐다 |
| Potential Impact | 암보험과 실손의료보험의 실제 비교 가능 상품 폭이 넓어졌다 |
| Novelty | 원천 상품, 공식 문서, 조건별 quote를 분리해 단계적으로 추천 가능 상태로 승격하는 구조가 작동했다 |
| UX | 향후 사용자는 나이/성별 조건별 예상 보험료를 대표 보험료와 구분해 볼 수 있다 |
| Open-source | 백업, seed, dry-run, apply, idempotency 검증 절차가 문서로 재현 가능하다 |
| Business Plan | 보험 비교/중개형 서비스로 확장하기 위한 가격 데이터 기반이 84건으로 확대됐다 |

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - source-aware catalog와 quote table 설계
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - raw/needs_review/approved 의미
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 적용 트랙
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 조건별 보험료 matrix 정책
- **QA_Validation**: [Premium Quote Rows DB Apply](./15_PREMIUM_QUOTE_ROWS_DB_APPLY_2026_05_28.md) - 초기 source-aware quote 24건 적재 맥락
- **QA_Validation**: [Medical Female Quote Params](./17_MEDICAL_FEMALE_QUOTE_PARAMS_2026_05_28.md) - 실손 여성 파라미터 해소와 24건 quote 누적
- **QA_Validation**: [Source Catalog Quote Expansion](./18_SOURCE_CATALOG_QUOTE_EXPANSION_2026_05_29.md) - quote-only raw source 후보 15개 확장 근거
