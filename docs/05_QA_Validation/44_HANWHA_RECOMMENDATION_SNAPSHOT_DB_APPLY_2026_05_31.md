# [QA] 한화생명 추천 Snapshot DB 적용 검증
> Created: 2026-05-31 01:37
> Last Updated: 2026-05-31 01:37

- **레이어**: 05_QA_Validation
- **상태**: Passed with note
- **범위**: PR #46에서 `seed.ts`에 반영한 한화생명 e암보험 표준체형/비흡연체형 source 승인, 공식 carrier quote 8건, active `insurance_products` snapshot 2건의 운영 Turso DB 적용
- **결론**: 백업 생성 후 `src/lib/db/seed.ts`를 실행해 한화생명 source 2건을 `approved`로 승격하고, 공식 carrier quote 8건을 삽입/승인했으며, source-backed active 추천 상품을 3건에서 5건으로 확대했다. 운영 DB에 존재하던 한화생명 보험다모아 `0원` quote는 4건이어서 실제 `rejected` 처리도 4건이다.

---

## 1. 적용 대상

| 항목 | 값 |
|---|---|
| Env file | `.env.local` |
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| 작업 브랜치 | `hanwha-life-snapshot-db-apply` |
| 기준 main merge commit | `410f3b5` |
| Seed 입력 | `src/lib/db/seed.ts` |
| 적용 대상 | 한화생명 source 승인 2건, carrier quote 승인 8건, active product 2건 |

DB URL 실제 값과 token은 공개 문서에 기록하지 않는다.

---

## 2. 백업

DB write 전 `.env.local`의 Turso 연결 설정을 사용한 libSQL 읽기 전용 dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-hanwha-snapshot-db-apply-20260530T163327Z.sql` |
| SHA-256 | `95f8a20eed7f7f9c357979aa0a130d084951c6c7123550973dc1fee1cdb1b99e` |
| 백업 테이블 수 | 13 |
| 백업 object 수 | 31 |
| 사전 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-hanwha-snapshot-db-apply-20260530T163327Z.pre.json` |
| 사후 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-hanwha-snapshot-db-apply-20260530T163617Z.post.json` |

백업 직전 핵심 row count:

| 테이블 | Row count |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 22 |
| `insurance_products` | 8 |
| `insurance_premium_quotes` | 84 |

백업 직전 target 상태:

| 검사 | 결과 |
|---|---:|
| source-backed active product | 3 |
| `insurance_product_sources.review_status=approved` | 3 |
| `insurance_premium_quotes.review_status=approved` | 12 |
| 한화생명 carrier quote row | 0 |
| 한화생명 active product row | 0 |
| 한화생명 기존 `0원` quote row | 4 |
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
Approving first recommendation snapshot source rows...
Seeding source-aware insurance documents...
Seeding Hanwha Life carrier quote rows...
Rejecting Hanwha Life e-insmarket zero quote rows...
Approving recommendation snapshot quote rows...
Archiving legacy demo insurance products...
Seeding active source-backed insurance products...
Seed complete. 17 carriers, 22 source candidates, 22 documents, 5 source approvals, 8 Hanwha carrier quotes inserted if missing, 20 quote approvals, 8 Hanwha zero quotes rejected, 5 legacy demo products archived, and 5 active source-backed insurance products checked.
```

seed 로그의 `8 Hanwha zero quotes rejected`는 seed target ID 수다. 운영 DB에는 그중 4건만 존재했으므로 실제 update matched row는 4건이다. 나머지 4개 ID는 이전 quote row 적용 단계의 semantic duplicate skip 때문에 운영 DB에 존재하지 않아 no-op이었다.

---

## 4. 적용 후 DB 검증

| 검사 | 결과 |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 22 |
| `insurance_products` | 10 |
| `insurance_premium_quotes` | 92 |
| source-backed active product | 5 |
| `insurance_product_sources.review_status=approved` | 5 |
| `insurance_premium_quotes.review_status=approved` | 20 |
| 한화생명 carrier quote row | 8 |
| 한화생명 carrier quote `approved` row | 8 |
| 한화생명 active product row | 2 |
| 한화생명 기존 `0원` quote `rejected` row | 4 |
| invalid source document hash | 0 |

Product source review 상태:

| `review_status` | Row |
|---|---:|
| `approved` | 5 |
| `needs_review` | 6 |
| `raw` | 11 |

Quote review 상태:

| `review_status` | Row |
|---|---:|
| `approved` | 20 |
| `needs_review` | 68 |
| `rejected` | 4 |

---

## 5. 적용된 추천 Snapshot

| Product ID | Source | Provider | KRW | Status |
|---|---|---|---:|---|
| `prod_kdb_life_direct_cancer_202605` | `src_kdb_life_direct_cancer_202605` | KDB생명 | 8,020 | active/approved |
| `prod_kyobo_lifeplanet_cancer_nonsmoker_202605` | `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | 교보라이프플래닛 | 8,410 | active/approved |
| `prod_kyobo_lifeplanet_cancer_standard_202605` | `src_kyobo_lifeplanet_cancer_standard_202605` | 교보라이프플래닛 | 8,490 | active/approved |
| `prod_hanwha_life_e_cancer_202604` | `src_hanwha_life_e_cancer_202604` | 한화생명 | 10,950 | active/approved |
| `prod_hanwha_life_e_cancer_nonsmoker_202604` | `src_hanwha_life_e_cancer_nonsmoker_202604` | 한화생명 | 10,850 | active/approved |

다섯 상품 모두 `coverage_category=oncology`, `matching_strategy=risk_target`, `risk_targets=[pancreatic_cancer,liver_cancer,lung_cancer,breast_cancer,colon_cancer]`다.

---

## 6. 한화생명 Quote Row

적용된 공식 carrier quote:

| Source | Age/Sex | KRW | Status |
|---|---|---:|---|
| `src_hanwha_life_e_cancer_202604` | 34/female | 10,950 | approved |
| `src_hanwha_life_e_cancer_202604` | 34/male | 14,840 | approved |
| `src_hanwha_life_e_cancer_202604` | 44/female | 12,170 | approved |
| `src_hanwha_life_e_cancer_202604` | 44/male | 18,680 | approved |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 34/female | 10,850 | approved |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 34/male | 13,460 | approved |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 44/female | 12,060 | approved |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 44/male | 16,820 | approved |

운영 DB에 존재해 `rejected`로 내려간 기존 보험다모아 `0원` quote:

| Source | Age/Sex | KRW | Status |
|---|---|---:|---|
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 34/female | null | rejected |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 34/male | null | rejected |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 44/female | null | rejected |
| `src_hanwha_life_e_cancer_nonsmoker_202604` | 44/male | null | rejected |

`src_hanwha_life_e_cancer_202604`의 보험다모아 `0원` quote target ID 4건은 운영 DB에 없었다. 이 차이는 recommendation 결과에는 영향을 주지 않는다. UI는 `approved` carrier quote 8건만 조건별 예상 보험료로 사용한다.

---

## 7. 안전성 판단

- DB URL과 token은 문서에 기록하지 않았다.
- 백업은 `/private/tmp`에만 남겼고 Git에는 포함하지 않는다.
- active 추천 상품은 모두 source-backed 상품이며 legacy demo 상품 5건은 계속 `archived`/`is_active=0` 상태다.
- 한화생명 `0원` quote는 운영 DB에 존재하는 4건만 `rejected`로 내렸다. 존재하지 않는 4개 target ID update는 no-op이다.
- `insurance_products`는 8건에서 10건으로 증가했지만, active 추천 필터는 source-backed approved 5건만 노출한다.
- 신한라이프 일반형 source는 공식 문서 endpoint 미확보 상태라 계속 추천에서 제외한다.

---

## 8. 남은 작업

1. 신한라이프 일반형 공식 문서 endpoint 탐색을 계속한다.
2. `needs_review=6`, `raw=11` source의 문서 hash, 매칭 키워드, caveat 정리를 이어간다.
3. seed 로그가 target ID 수와 실제 matched row 수를 구분하도록 후속 개선을 검토한다.

---

## 9. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 실제 source-backed 추천 상품이 3건에서 5건으로 늘었다 |
| Potential Impact | 테스트 사용자가 더 다양한 실제 암보험 추천을 볼 수 있다 |
| Novelty | 보험다모아 0원 실패를 보험사 공식 carrier quote로 대체해 추천 snapshot에 반영했다 |
| UX | 0원 대신 공식 계산 API 기준 숫자 보험료를 표시할 수 있다 |
| Open-source | 백업, seed, row count, quote status 검증 절차를 재현 가능하게 남겼다 |
| Business Plan | 실제 보험상품 기반 추천의 상품 폭을 넓혀 서비스 검증력을 높였다 |

---

## 10. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - carrier quote fallback과 DB 적용 상태
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 현재 구현 순서와 다음 작업
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - quote source와 승인 정책
- **QA_Validation**: [Hanwha Recommendation Snapshot Seed](./43_HANWHA_RECOMMENDATION_SNAPSHOT_SEED_2026_05_31.md) - DB 적용 전 seed 검증
- **QA_Validation**: [Hanwha Life Zero Quote Blocker Probe](./42_HANWHA_LIFE_ZERO_QUOTE_BLOCKER_PROBE_2026_05_31.md) - 공식 carrier quote 8건 확보 근거
