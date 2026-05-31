# [QA] 신한라이프 해약환급금 미지급형 추천 Snapshot DB 적용 검증
> Created: 2026-05-31 18:51
> Last Updated: 2026-05-31 18:51

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #62에서 `seed.ts`에 반영한 신한라이프 해약환급금 미지급형 암보험 source 승인, quote 승인, active `insurance_products` snapshot 1건의 운영 Turso DB 적용
- **결론**: 백업 생성 후 `src/lib/db/seed.ts`를 실행해 신한라이프 source 1건을 `approved`로 승격하고, quote 4건을 `approved`로 바꾸며, source-backed active 추천 상품을 9건에서 10건으로 확대했다.

---

## 1. 적용 대상

| 항목 | 값 |
|---|---|
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| Seed 입력 | `src/lib/db/seed.ts` |
| 적용 source | `src_shinhan_life_sol_cancer_202601` |
| 적용 product | `prod_shinhan_life_sol_cancer_no_refund_202601` |
| 대표 문서 | `doc_shinhan_life_sol_cancer_terms_202601` |
| DB write | 1회 seed 실행 |

---

## 2. 백업

DB write 전 `.env.local`의 Turso 연결 설정을 사용한 libSQL 읽기 전용 dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-shinhan-no-refund-db-apply-20260531T184832KST.sql` |
| 백업 SHA-256 | `a286429e30bf50e2a2e75b49f2e46d9352e8f4c5a0c9e077f3c804698b949564` |
| 백업 크기 | 389,891 bytes |
| 백업 테이블 수 | 13 |
| 백업 object 수 | 31 |
| 사전 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-shinhan-no-refund-db-apply-20260531T184832KST.pre.json` |
| 사후 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-shinhan-no-refund-db-apply-20260531T184832KST.post.json` |

---

## 3. 사전 상태

| 항목 | 적용 전 |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 22 |
| `insurance_premium_quotes` | 92 |
| `insurance_products` | 14 |
| source-backed active product | 9 |
| approved source | 9 |
| approved quote | 36 |

신한라이프 target 상태:

| 대상 | 적용 전 |
|---|---|
| source `src_shinhan_life_sol_cancer_202601` | `needs_review`, `sale_status=unknown`, 대표 보험료 6,750 KRW |
| quote 4건 | 모두 `needs_review` |
| product `prod_shinhan_life_sol_cancer_no_refund_202601` | 없음 |

---

## 4. 적용 명령

```bash
env DOTENV_CONFIG_PATH=.env.local DOTENV_CONFIG_QUIET=true npx tsx -r dotenv/config src/lib/db/seed.ts
```

실행 결과:

```text
Seed complete. 17 carriers, 22 source candidates, 22 documents, 10 source approvals, 8 Hanwha carrier quotes inserted if missing, 40 quote approvals, 8 Hanwha zero quotes rejected, 5 legacy demo products archived, and 10 active source-backed insurance products checked.
```

---

## 5. 사후 상태

| 항목 | 적용 전 | 적용 후 |
|---|---:|---:|
| `insurance_products` | 14 | 15 |
| source-backed active product | 9 | 10 |
| approved source | 9 | 10 |
| approved quote | 36 | 40 |

신한라이프 target 상태:

| 대상 | 적용 후 |
|---|---|
| source `src_shinhan_life_sol_cancer_202601` | `approved`, `sale_status=active`, 대표 보험료 6,750 KRW |
| quote `age34_female` | `approved`, 6,750 KRW |
| quote `age34_male` | `approved`, 8,530 KRW |
| quote `age44_female` | `approved`, 7,320 KRW |
| quote `age44_male` | `approved`, 10,030 KRW |
| product `prod_shinhan_life_sol_cancer_no_refund_202601` | `catalog_status=approved`, `is_active=1`, `monthly_premium_usdc=5` |

---

## 6. 안전성

- 운영 DB write 전 백업을 생성했다.
- 백업 파일과 pre/post JSON은 `/private/tmp`에만 남기고 Git에는 포함하지 않는다.
- DB URL 실제 값과 token은 문서에 기록하지 않았다.
- Drizzle schema와 migration은 변경하지 않았다.
- 신한라이프 표준형 source는 계속 `raw` 차단 상태로 유지한다.
- legacy demo 상품은 계속 `archived` 상태로 유지한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 운영 추천 카탈로그가 신한라이프 암보험을 포함해 10개 active 상품으로 확대됐다 |
| Potential Impact | 테스트 사용자가 KDB/한화/교보/신한 암보험과 주요 실손 baseline 상품을 비교할 수 있다 |
| Novelty | 공식 PDF hash와 보험다모아 quote matrix를 결합한 암보험 추천 발행 패턴을 반복 검증했다 |
| UX | 신한라이프 카드도 대표 보험료, 조건별 quote, 공식 출처, caveat 기반으로 설명 가능하다 |
| Open-source | 백업, seed apply, 사후 검증, row count 기록 절차를 재현 가능하게 남긴다 |
| Business Plan | 실제 상품 카탈로그 폭을 넓혀 보험 비교/제휴 검증 가능성을 높인다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Shinhan No-refund Matching Review](./57_SHINHAN_NO_REFUND_MATCHING_REVIEW_2026_05_31.md) - 매칭 키워드 검수 근거
- **QA_Validation**: [Shinhan No-refund Snapshot Seed](./58_SHINHAN_NO_REFUND_SNAPSHOT_SEED_2026_05_31.md) - 이번 apply의 seed 준비 검증
