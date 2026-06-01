# [QA] 한화생명 E-insmarket NULL Quote Hygiene DB 적용 검증
> Created: 2026-06-01 20:08
> Last Updated: 2026-06-01 20:08

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #104에서 `seed.ts`에 반영한 한화생명 표준체형 e암보험 e-insmarket NULL quote 4건의 rejection ID 보정 운영 Turso DB 적용
- **결론**: 백업 생성 후 `src/lib/db/seed.ts`를 실행해 운영 DB에 남아 있던 한화생명 e-insmarket NULL quote 4건을 `needs_review`에서 `rejected`로 변경했다. 적용 후 source catalog 후보 22개는 모두 `approved/rejected`로 닫혔고, 전체 quote 큐에도 `needs_review`가 남아 있지 않다.

---

## 1. 입력

| 항목 | 값 |
|---|---|
| Seed 입력 | `src/lib/db/seed.ts` |
| Seed 정책 검증 | `docs/05_QA_Validation/100_HANWHA_LIFE_ZERO_QUOTE_HYGIENE_2026_06_01.md` |
| 대상 source | `src_hanwha_life_e_cancer_202604` |
| 대상 quote | e-insmarket NULL quote 4건 |
| DB write | 수행 |

---

## 2. 백업

DB write 전 `.env.local`의 Turso 연결 설정을 사용한 SQL dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-hanwha-life-zero-quote-hygiene-db-apply-20260601T200624KST.sql` |
| 백업 SHA-256 | `846d44b4a66b5ff251e07706158dc7f8c97f1ceffed76d7d05f5a890b3c56f28` |
| 백업 크기 | 338,366 bytes |
| 백업 테이블 수 | 13 |
| 백업 object 수 | 31 |
| 사전 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-hanwha-life-zero-quote-hygiene-db-apply-20260601T200624KST.pre.json` |
| 사후 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-hanwha-life-zero-quote-hygiene-db-apply-20260601T200624KST.post.json` |

---

## 3. 사전 상태

| 항목 | 적용 전 |
|---|---:|
| `insurance_source_documents` | 39 |
| `insurance_products` | 24 |
| `insurance_product_sources` | 22 |
| `insurance_premium_quotes` | 92 |
| source-backed active product | 19 |
| approved source | 19 |
| rejected source | 3 |
| raw source | 0 |
| needs_review source | 0 |
| approved quote | 76 |
| rejected quote | 12 |
| needs_review quote | 4 |

한화생명 target 상태:

| 대상 | 적용 전 |
|---|---|
| source `src_hanwha_life_e_cancer_202604` | `approved`, active 추천 snapshot 존재 |
| e-insmarket NULL quote 4건 | 모두 `needs_review` |
| carrier quote 4건 | active 추천 보험료로 사용, `approved` 유지 |

---

## 4. 적용 명령

```bash
env DOTENV_CONFIG_PATH=.env.local DOTENV_CONFIG_QUIET=true npx tsx -r dotenv/config src/lib/db/seed.ts
```

실행 결과:

```text
Seed complete. 17 carriers, 22 source candidates, 39 documents, 19 source approvals, 3 source catalog exclusions, 8 Hanwha carrier quotes inserted if missing, 76 quote approvals, 8 Hanwha zero quotes rejected, 8 source catalog exclusion quotes rejected, 5 legacy demo products archived, and 19 active source-backed insurance products checked.
```

---

## 5. 사후 상태

| 항목 | 적용 전 | 적용 후 |
|---|---:|---:|
| `insurance_source_documents` | 39 | 39 |
| `insurance_products` | 24 | 24 |
| `insurance_product_sources` | 22 | 22 |
| `insurance_premium_quotes` | 92 | 92 |
| source-backed active product | 19 | 19 |
| approved source | 19 | 19 |
| rejected source | 3 | 3 |
| raw source | 0 | 0 |
| needs_review source | 0 | 0 |
| approved quote | 76 | 76 |
| rejected quote | 12 | 16 |
| needs_review quote | 4 | 0 |

한화생명 target 상태:

| condition | quote id | monthly_premium_krw | status |
|---|---|---:|---|
| age34 female | `quote_src_hanwha_life_e_cancer_202604_age34_female_2589f537c6fc` | `NULL` | `rejected` |
| age34 male | `quote_src_hanwha_life_e_cancer_202604_age34_male_0d807392cd7d` | `NULL` | `rejected` |
| age44 female | `quote_src_hanwha_life_e_cancer_202604_age44_female_88d1cf1a2fad` | `NULL` | `rejected` |
| age44 male | `quote_src_hanwha_life_e_cancer_202604_age44_male_dbd72b264aa2` | `NULL` | `rejected` |

---

## 6. 완료 상태

| 큐 | 완료 기준 | 적용 후 |
|---|---|---|
| source catalog 후보 22개 | `raw=0`, `needs_review=0` | 완료 |
| quote review queue | `needs_review=0` | 완료 |
| active 추천 상품 | source-backed 19건 유지 | 완료 |
| NULL/0원 quote | 추천 보험료에서 제외 | 완료 |

---

## 7. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Hanwha Life Zero Quote Hygiene](./100_HANWHA_LIFE_ZERO_QUOTE_HYGIENE_2026_06_01.md) - 한화생명 e-insmarket NULL quote actual row ID 보정 검증
- **QA_Validation**: [Shinhan Standard Blocker DB Apply](./99_SHINHAN_STANDARD_BLOCKER_DB_APPLY_2026_06_01.md) - source 후보 22개 정리와 잔여 quote hygiene 발견
