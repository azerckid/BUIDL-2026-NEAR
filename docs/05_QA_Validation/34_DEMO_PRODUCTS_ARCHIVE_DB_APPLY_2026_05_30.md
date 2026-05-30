# [QA] 데모 보험상품 Archive DB 적용 검증
> Created: 2026-05-30 16:26
> Last Updated: 2026-05-30 16:26

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #32에서 `seed.ts`에 반영한 legacy demo insurance products 5건의 운영 Turso DB archive 적용
- **결론**: 백업 생성 후 `src/lib/db/seed.ts`를 실행해 `prod_001`~`prod_005`를 `catalog_status=archived`, `is_active=0`으로 변경했다. 적용 후 active product는 source-backed 상품 3건만 남았고, quote/source 승인 상태는 변경 없이 유지됐다.

---

## 1. 적용 대상

| 항목 | 값 |
|---|---|
| Env file | `.env.local` |
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| 작업 브랜치 | `insurance-demo-products-db-apply` |
| 기준 main merge commit | `ddb3c03` |
| Seed 입력 | `src/lib/db/seed.ts` |
| 적용 대상 | legacy demo product 5건 archive |

DB URL 실제 값과 token은 공개 문서에 기록하지 않는다.

---

## 2. 백업

DB write 전 `.env.local`의 Turso 연결 설정을 사용한 libSQL 읽기 전용 dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-before-demo-products-archive-20260530T072422Z.sql` |
| SHA-256 | `eff144a61cf51ecb8778c6c2a761b5807b6e5c1c65926c4a9cc9932f338c5c85` |
| 백업 테이블 수 | 12 |
| 사전 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-before-demo-products-archive-20260530T072422Z.pre.json` |
| 사후 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-after-demo-products-archive-20260530T072422Z.post.json` |

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
| legacy demo active product | 5 |
| legacy demo archived product | 0 |
| source-backed active product | 3 |

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
Archiving legacy demo insurance products...
Seeding active source-backed insurance products...
Seed complete. 17 carriers, 22 source candidates, 22 documents, 3 source approvals, 12 quote approvals, 5 legacy demo products archived, and 3 active source-backed insurance products checked.
```

이번 seed는 신규 source-backed 상품을 추가하지 않고, 기존 legacy demo product 5건의 추천 노출 상태만 archive 처리한다.

---

## 4. 적용 후 DB 검증

| 검사 | 결과 |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 22 |
| `insurance_products` | 8 |
| `insurance_premium_quotes` | 84 |
| legacy demo active product | 0 |
| legacy demo archived product | 5 |
| active product total | 3 |
| source-backed active product | 3 |

Archive 처리된 legacy demo 상품:

| Product ID | `catalog_status` | `is_active` | `product_source_id` |
|---|---|---:|---|
| `prod_001` | `archived` | 0 | null |
| `prod_002` | `archived` | 0 | null |
| `prod_003` | `archived` | 0 | null |
| `prod_004` | `archived` | 0 | null |
| `prod_005` | `archived` | 0 | null |

운영 active 추천 상품:

| Product ID | Provider | Status |
|---|---|---|
| `prod_kdb_life_direct_cancer_202605` | KDB생명 | active/approved/source-backed |
| `prod_kyobo_lifeplanet_cancer_nonsmoker_202605` | 교보라이프플래닛 | active/approved/source-backed |
| `prod_kyobo_lifeplanet_cancer_standard_202605` | 교보라이프플래닛 | active/approved/source-backed |

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

## 5. 안전성 판단

- DB URL과 token은 문서에 기록하지 않았다.
- 백업은 `/private/tmp`에만 남겼고 Git에는 포함하지 않는다.
- `insurance_products` 전체 row count는 8로 유지했다. 삭제가 아니라 archive update만 수행했다.
- active product total은 3이며, 모두 `product_source_id`가 있는 source-backed 상품이다.
- `insurance_product_sources.review_status`와 `insurance_premium_quotes.review_status` 분포는 적용 전후 동일하다.
- 한화생명 0원 quote source와 신한라이프 일반형 source는 계속 추천에서 제외한다.

---

## 6. 남은 작업

1. 추천 카드에서 대표 보험료와 조건별 approved quote matrix를 분리 표시한다.
2. 한화생명 0원 quote 재조회와 신한라이프 일반형 공식 문서 endpoint 탐색을 이어간다.
3. 다음 실제 상품 source 승인 시에도 source-backed active 조건과 archive 정책을 유지한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 운영 추천 결과에서 demo product 오염을 제거했다 |
| Potential Impact | 실제 보험상품 기반 추천으로 전환하는 DB 상태를 확정했다 |
| Novelty | DNA risk key, 공식 보험 source, 추천 snapshot의 연결만 운영 추천으로 남겼다 |
| UX | 사용자가 demo 특약을 실제 판매 상품으로 오해할 위험을 제거했다 |
| Open-source | 백업, seed, row count, archive target 검증 절차를 재현 가능하게 남겼다 |
| Business Plan | 실제 보험 비교/중개 서비스로 전환하기 위한 추천 데이터 신뢰 기준을 강화했다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준과 source-backed 조건
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 대표 보험료와 조건별 quote matrix 분리 정책
- **QA_Validation**: [Demo Insurance Products Retirement](./33_DEMO_INSURANCE_PRODUCTS_RETIREMENT_2026_05_30.md) - DB 적용 전 코드/seed 정책 검증
- **QA_Validation**: [First Recommendation Snapshot DB Apply](./32_FIRST_RECOMMENDATION_SNAPSHOT_DB_APPLY_2026_05_30.md) - 첫 source-backed 추천 snapshot DB 적용 검증
