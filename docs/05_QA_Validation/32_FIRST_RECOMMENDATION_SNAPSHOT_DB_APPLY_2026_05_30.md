# [QA] 첫 실제 보험 추천 Snapshot DB 적용 검증
> Created: 2026-05-30 15:31
> Last Updated: 2026-05-30 15:31

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #30에서 `seed.ts`에 반영한 KDB생명 1개, 교보라이프플래닛 2개 source-backed 추천 snapshot의 운영 Turso DB 적용
- **결론**: 백업 생성 후 `src/lib/db/seed.ts`를 실행해 source 3건을 `approved`로 승격하고, quote row 12건을 `approved`로 변경했으며, source-backed active `insurance_products` 3건을 추가했다. 최종 DB는 `insurance_products=8`, `insurance_product_sources.review_status` 분포는 `approved=3`, `needs_review=7`, `raw=12`다.

---

## 1. 적용 대상

| 항목 | 값 |
|---|---|
| Env file | `.env.local` |
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| 작업 브랜치 | `insurance-first-snapshot-db-apply` |
| 기준 main merge commit | `f34ff6e` |
| Seed 입력 | `src/lib/db/seed.ts` |
| 적용 대상 | source 승인 3건, quote 승인 12건, active product 3건 |

DB URL 실제 값과 token은 공개 문서에 기록하지 않는다.

---

## 2. 백업

DB write 전 `.env.local`의 Turso 연결 설정을 사용한 libSQL 읽기 전용 dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-before-first-snapshot-db-apply-20260530T063024Z.sql` |
| SHA-256 | `9673a22e355a761c6a7c9f073864d8fb33836f56f9b1724cbdeeab063447670f` |
| 백업 테이블 수 | 12 |
| 사전 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-before-first-snapshot-db-apply-20260530T063024Z.pre.json` |
| 사후 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-after-first-snapshot-db-apply-20260530T063024Z.post.json` |

백업 직전 핵심 row count:

| 테이블 | Row count |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 22 |
| `insurance_products` | 5 |
| `insurance_premium_quotes` | 84 |

백업 직전 target 상태:

| 검사 | 결과 |
|---|---:|
| target source row | 3 |
| target quote row | 12 |
| target product row | 0 |
| target source `approved` | 0 |
| target quote `approved` | 0 |
| source-backed active product | 0 |
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
Approving first recommendation snapshot quote rows...
Seeding active insurance products...
Seed complete. 17 carriers, 22 source candidates, 22 documents, 3 source approvals, 12 quote approvals, and 8 active insurance products checked.
```

이번 seed는 기존 insert-only 단계에 더해 첫 snapshot target에 한정한 update 단계를 수행한다. 승인 update 대상은 PR #30에서 고정한 source 3건과 quote row 12건뿐이다.

---

## 4. 적용 후 DB 검증

| 검사 | 결과 |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 22 |
| `insurance_products` | 8 |
| `insurance_premium_quotes` | 84 |
| target source row | 3 |
| target source `approved` | 3 |
| target quote row | 12 |
| target quote `approved` | 12 |
| target product row | 3 |
| source-backed active product | 3 |
| invalid source document hash | 0 |

Product source review 상태:

| `review_status` | Row |
|---|---:|
| `approved` | 3 |
| `needs_review` | 7 |
| `raw` | 12 |

Quote review 상태:

| `review_status` | Row |
|---|---:|
| `approved` | 12 |
| `needs_review` | 72 |

---

## 5. 적용된 추천 Snapshot

| Product ID | Source | Provider | KRW | USDC | Status |
|---|---|---|---:|---:|---|
| `prod_kdb_life_direct_cancer_202605` | `src_kdb_life_direct_cancer_202605` | KDB생명 | 8,020 | 5.94 | active/approved |
| `prod_kyobo_lifeplanet_cancer_nonsmoker_202605` | `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | 교보라이프플래닛 | 8,410 | 6.23 | active/approved |
| `prod_kyobo_lifeplanet_cancer_standard_202605` | `src_kyobo_lifeplanet_cancer_standard_202605` | 교보라이프플래닛 | 8,490 | 6.29 | active/approved |

세 상품 모두 `coverage_category=oncology`, `matching_strategy=risk_target`, `risk_targets=[pancreatic_cancer,liver_cancer,lung_cancer,breast_cancer,colon_cancer]`다. 대표 보험료는 보험다모아 `age34_female` 조건이며, USDC는 PR #30에서 승인한 고정 데모 환산율 `1 USDC = 1,350 KRW`를 사용한다.

---

## 6. 적용된 Quote Row

| Source | Age/Sex | KRW |
|---|---|---:|
| `src_kdb_life_direct_cancer_202605` | 34/female | 8,020 |
| `src_kdb_life_direct_cancer_202605` | 34/male | 11,230 |
| `src_kdb_life_direct_cancer_202605` | 44/female | 8,650 |
| `src_kdb_life_direct_cancer_202605` | 44/male | 13,340 |
| `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | 34/female | 8,410 |
| `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | 34/male | 10,710 |
| `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | 44/female | 9,120 |
| `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | 44/male | 12,910 |
| `src_kyobo_lifeplanet_cancer_standard_202605` | 34/female | 8,490 |
| `src_kyobo_lifeplanet_cancer_standard_202605` | 34/male | 11,320 |
| `src_kyobo_lifeplanet_cancer_standard_202605` | 44/female | 9,210 |
| `src_kyobo_lifeplanet_cancer_standard_202605` | 44/male | 13,700 |

위 12건은 모두 `review_status=approved`로 확인됐다.

---

## 7. 안전성 판단

- DB URL과 token은 문서에 기록하지 않았다.
- 백업은 `/private/tmp`에만 남겼고 Git에는 포함하지 않는다.
- 한화생명 표준체형/비흡연체형은 `0원` quote blocker 때문에 active snapshot에 포함하지 않았다.
- 신한라이프 표준형은 일반형 공식 문서 endpoint 미확보 상태라 계속 제외한다.
- 기존 demo 상품 5건은 이번 적용에서 비활성화하지 않았다. 따라서 추천 엔진은 기존 demo 상품 5건과 실제 source-backed 상품 3건을 함께 읽는다.
- `insurance_premium_quotes`는 검수한 12건만 `approved`이며 나머지 72건은 `needs_review`로 유지한다.

---

## 8. 남은 작업

1. 추천 카드에서 대표 보험료와 조건별 approved quote matrix를 분리 표시한다.
2. 기존 demo 상품 5건을 계속 유지할지, source-backed 상품만 노출할지 별도 정책을 정한다.
3. 한화생명 0원 quote 재조회와 신한라이프 일반형 공식 문서 endpoint 탐색을 이어간다.

---

## 9. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 최초로 공식 source-backed 보험상품 3건이 실제 추천 엔진 입력으로 들어갔다 |
| Potential Impact | DNA risk 기반 보험 추천이 mock 상품에서 실제 판매 상품 기반으로 전환되기 시작했다 |
| Novelty | 보험다모아 quote, 보험사 공시 PDF hash, DNA risk key를 승인된 snapshot row로 연결했다 |
| UX | 추천 카드에 실제 보험사/상품명/공식 출처/대표 보험료가 노출될 수 있다 |
| Open-source | 백업, seed, row count, approval target 검증 절차를 재현 가능하게 남겼다 |
| Business Plan | 실제 보험상품 추천으로 제휴/전환 모델 검증을 시작할 수 있다 |

---

## 10. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [첫 실제 보험 추천 Snapshot Seed](./31_FIRST_RECOMMENDATION_SNAPSHOT_SEED_2026_05_30.md) - DB 적용 전 seed 검증
- **QA_Validation**: [KDB/한화/교보 매칭 키워드와 Caveat 검수](./30_MATCHING_KEYWORD_CAVEAT_REVIEW_2026_05_30.md) - 매칭/caveat 승인 근거
