# [QA] 동양생명 암보험 추천 Snapshot DB 적용 검증
> Created: 2026-06-01 13:42
> Last Updated: 2026-06-01 13:42

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #96에서 `seed.ts`에 반영한 동양생명 우리WON하는실속하나로암보험 source document, source 승인, quote 승인, active `insurance_products` snapshot 1건의 운영 Turso DB 적용
- **결론**: 백업 생성 후 `src/lib/db/seed.ts`를 실행해 동양생명 source document 3건을 추가하고, source 1건을 `approved`로 승격하고, quote 4건을 `approved`로 바꾸며, source-backed active 추천 상품을 18건에서 19건으로 확대했다.

---

## 1. 입력

| 항목 | 값 |
|---|---|
| Seed 입력 | `src/lib/db/seed.ts` |
| Seed 준비 검증 | `docs/05_QA_Validation/92_TONGYANG_LIFE_CANCER_SNAPSHOT_SEED_2026_06_01.md` |
| 대상 source | `src_tongyang_wooriwon_cancer_202605` |
| 대상 product | `prod_tongyang_wooriwon_cancer_202605` |
| DB write | 수행 |

---

## 2. 백업

DB write 전 `.env.local`의 Turso 연결 설정을 사용한 SQL dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-tongyang-life-cancer-db-apply-20260601T133738KST.sql` |
| 백업 SHA-256 | `9519a54616688257e1d7509ec9027c1c9ab89b2cc96915dae974353f3fc8be` |
| 백업 크기 | 450,539 bytes |
| 백업 테이블 수 | 13 |
| 백업 object 수 | 31 |
| 사전 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-tongyang-life-cancer-db-apply-20260601T133738KST.pre.json` |
| 사후 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-tongyang-life-cancer-db-apply-20260601T133738KST.post.json` |

---

## 3. 사전 상태

| 항목 | 적용 전 |
|---|---:|
| `insurance_source_documents` | 36 |
| `insurance_products` | 23 |
| source-backed active product | 18 |
| oncology active product | 10 |
| approved source | 18 |
| approved quote | 72 |

동양생명 target 상태:

| 대상 | 적용 전 |
|---|---|
| source `src_tongyang_wooriwon_cancer_202605` | `raw`, `sale_status=unknown`, 대표 보험료 없음 |
| source document 3건 | 없음 |
| quote 4건 | 모두 `needs_review` |
| product `prod_tongyang_wooriwon_cancer_202605` | 없음 |

---

## 4. 적용 명령

```bash
env DOTENV_CONFIG_PATH=.env.local DOTENV_CONFIG_QUIET=true npx tsx -r dotenv/config src/lib/db/seed.ts
```

실행 결과:

```text
Seed complete. 17 carriers, 22 source candidates, 39 documents, 19 source approvals, 8 Hanwha carrier quotes inserted if missing, 76 quote approvals, 8 Hanwha zero quotes rejected, 5 legacy demo products archived, and 19 active source-backed insurance products checked.
```

---

## 5. 사후 상태

| 항목 | 적용 전 | 적용 후 |
|---|---:|---:|
| `insurance_source_documents` | 36 | 39 |
| `insurance_products` | 23 | 24 |
| source-backed active product | 18 | 19 |
| oncology active product | 10 | 11 |
| approved source | 18 | 19 |
| approved quote | 72 | 76 |

동양생명 target 상태:

| 대상 | 적용 후 |
|---|---|
| source `src_tongyang_wooriwon_cancer_202605` | `approved`, `sale_status=active`, 대표 보험료 11,000 KRW |
| source document | 상품요약서, 사업방법서, 보험약관 3건 존재 |
| quote 4건 | 모두 `approved` |
| product `prod_tongyang_wooriwon_cancer_202605` | `catalog_status=approved`, `is_active=1`, `monthly_premium_usdc=8.15`, `matching_strategy=risk_target`, `coverage_category=oncology` |

---

## 6. Source Document 확인

| document_type | id | sha256 |
|---|---|---|
| `business_method` | `doc_tongyang_life_wooriwon_cancer_business_202603` | `4d67901f7df9d4bc631b6cd8d4c371cdb68e4a4b15a01f952f43a3ebf751b18f` |
| `summary` | `doc_tongyang_life_wooriwon_cancer_summary_202603` | `960aae81795907c539b11667d3804534dc2b3b04c1da2df4f2b4e6d4381097b5` |
| `terms` | `doc_tongyang_life_wooriwon_cancer_terms_202603` | `882cb3784644e040027c16c984ae8c8c84bd3a12507949063967c618fdc81cb2` |

---

## 7. Quote 확인

| condition | quote id | monthly_premium_krw | status |
|---|---|---:|---|
| age34 female | `quote_src_tongyang_wooriwon_cancer_202605_age34_female_1015b0165c0e` | 11,000 | `approved` |
| age34 male | `quote_src_tongyang_wooriwon_cancer_202605_age34_male_d2e77ecf4a0c` | 9,700 | `approved` |
| age44 female | `quote_src_tongyang_wooriwon_cancer_202605_age44_female_9cf2588db68b` | 14,100 | `approved` |
| age44 male | `quote_src_tongyang_wooriwon_cancer_202605_age44_male_99a3f15d59fc` | 17,100 | `approved` |

---

## 8. 안전성

- 적용 전 SQL dump 백업과 사전 JSON을 생성했다.
- 적용 후 JSON으로 target source/doc/quote/product 상태를 재확인했다.
- DB URL과 auth token은 문서에 기록하지 않았다.
- 백업 파일과 pre/post JSON은 `/private/tmp` 로컬 복구용이며 Git에 포함하지 않는다.
- 이번 apply는 기존 source-backed product를 삭제하지 않고 동양생명 snapshot 1건만 추가한다.

---

## 9. 다음 작업

1. Dashboard와 상담 AI에서 동양생명 카드 설명이 DB-selected 상품 컨텍스트로 전달되는지 수동 확인한다.
2. 남은 non-approved source 중 삼성생명 입원 건강보험의 category 정책을 결정하거나, 신한라이프 표준형 일반형 endpoint blocker를 유지하면서 재탐색한다.
3. 한화손보 실손은 target `갱신형 V` 공식 문서 endpoint 발견 전까지 blocker로 유지한다.

---

## 10. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 동양생명 암보험 source-backed 추천 snapshot이 운영 DB에서 active 상태가 됐다 |
| Potential Impact | 실제 판매 암보험 추천 상품을 1건 더 늘려 source-backed active 추천 상품이 19건이 됐다 |
| Novelty | 동양생명 POST 공시 문서 hash, 보험다모아 quote, DNA risk target 매칭을 운영 추천 경로에 연결했다 |
| UX | 추천 카드와 상담 AI가 동양생명 보험료, 공식 출처, caveat를 표시할 수 있다 |
| Open-source | 백업, seed apply, read-only post check까지 반복 가능한 적용 기록을 남겼다 |
| Business Plan | 실제 보험상품 기반 추천 카탈로그 확대를 운영 DB에 반영했다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Tongyang Life Cancer Disclosure Adapter Probe](./90_TONGYANG_LIFE_CANCER_DISCLOSURE_ADAPTER_PROBE_2026_06_01.md) - 공식 문서 hash 확보 근거
- **QA_Validation**: [Tongyang Life Cancer Matching Review](./91_TONGYANG_LIFE_CANCER_MATCHING_REVIEW_2026_06_01.md) - 매칭 키워드와 caveat 검수 근거
- **QA_Validation**: [Tongyang Life Cancer Snapshot Seed](./92_TONGYANG_LIFE_CANCER_SNAPSHOT_SEED_2026_06_01.md) - DB 적용 전 seed 준비 검증
