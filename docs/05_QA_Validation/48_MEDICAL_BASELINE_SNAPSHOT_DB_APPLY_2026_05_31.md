# [QA] 실손의료보험 Baseline 추천 Snapshot DB 적용 검증
> Created: 2026-05-31 03:20
> Last Updated: 2026-05-31 03:58

- **레이어**: 05_QA_Validation
- **상태**: Passed with note
- **범위**: PR #50에서 `seed.ts`에 반영한 DB손보, KB손보, 현대해상 실손의료보험 baseline source 승인, quote 승인, active `insurance_products` snapshot 3건의 운영 Turso DB 적용
- **결론**: 백업 생성 후 `src/lib/db/seed.ts`를 실행해 DB손보, KB손보, 현대해상 source 3건을 `approved`로 승격하고 baseline active 추천 상품 3건을 추가했다. 운영 DB 기준 source-backed active 추천 상품은 5건에서 8건으로 늘었다. 단, seed target quote 12건 중 운영 DB에 실제 존재한 row는 여성 조건 6건뿐이어서 실제 `approved` quote는 20건에서 26건으로 증가했다.

---

## 1. 적용 대상

| 항목 | 값 |
|---|---|
| Env file | `.env.local` |
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| 작업 브랜치 | `medical-baseline-snapshot-db-apply` |
| 기준 main merge commit | `bae8f4d` |
| Seed 입력 | `src/lib/db/seed.ts` |
| 적용 대상 | 실손 baseline source 승인 3건, baseline active product 3건, 운영 DB에 존재하는 target quote 승인 6건 |

DB URL 실제 값과 token은 공개 문서에 기록하지 않는다.

---

## 2. 백업

DB write 전 `.env.local`의 Turso 연결 설정을 사용한 libSQL 읽기 전용 dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-medical-baseline-snapshot-db-apply-20260530T181746Z.sql` |
| SHA-256 | `0fdf8a8b13538882cd6f2c7abf745123db75c788238fc82e63667d6d8228603d` |
| 백업 테이블 수 | 13 |
| 사전 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-medical-baseline-snapshot-db-apply-20260530T181746Z.pre.json` |
| 사후 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-medical-baseline-snapshot-db-apply-20260530T181746Z.post.json` |

백업 직전 핵심 row count:

| 테이블 | Row count |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 22 |
| `insurance_products` | 10 |
| `insurance_premium_quotes` | 92 |

백업 직전 target 상태:

| 검사 | 결과 |
|---|---:|
| target source row | 3 |
| target source `approved` | 0 |
| target quote seed ID | 12 |
| target quote row 실제 존재 | 6 |
| target quote `approved` | 0 |
| target product row | 0 |
| source-backed active product | 5 |
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
Seed complete. 17 carriers, 22 source candidates, 22 documents, 8 source approvals, 8 Hanwha carrier quotes inserted if missing, 32 quote approvals, 8 Hanwha zero quotes rejected, 5 legacy demo products archived, and 8 active source-backed insurance products checked.
```

seed 로그의 `32 quote approvals`는 seed target ID 수다. 운영 DB에는 실손 baseline target 12건 중 6건만 존재했으므로 실제 증가분은 6건이다.

---

## 4. 적용 후 DB 검증

| 검사 | 결과 |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 22 |
| `insurance_products` | 13 |
| `insurance_premium_quotes` | 92 |
| target source row | 3 |
| target source `approved` | 3 |
| target quote seed ID | 12 |
| target quote row 실제 존재 | 6 |
| target quote `approved` | 6 |
| target product row | 3 |
| target product active/approved | 3 |
| source-backed active product | 8 |
| invalid source document hash | 0 |

Product source review 상태:

| `review_status` | Row |
|---|---:|
| `approved` | 8 |
| `needs_review` | 3 |
| `raw` | 11 |

Quote review 상태:

| `review_status` | Row |
|---|---:|
| `approved` | 26 |
| `needs_review` | 62 |
| `rejected` | 4 |

---

## 5. 적용된 추천 Snapshot

| Product ID | Source | Provider | KRW | USDC | Strategy | Status |
|---|---|---|---:|---:|---|---|
| `prod_db_direct_medical_202605` | `src_db_direct_medical_202605` | DB손보 | 6,854 | 5.08 | `baseline` | active/approved |
| `prod_kb_direct_medical_202605` | `src_kb_direct_medical_202605` | KB손보 | 6,439 | 4.77 | `baseline` | active/approved |
| `prod_hyundai_direct_medical_202605` | `src_hyundai_direct_medical_202605` | 현대해상 | 6,545 | 4.85 | `baseline` | active/approved |

세 상품 모두 `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]`다. 대표 보험료는 보험다모아 `age34_female` 조건이며, USDC는 고정 데모 환산율 `1 USDC = 1,350 KRW`를 사용한다.

---

## 6. 승인된 실손 Quote Row

운영 DB에 존재해 이번 apply에서 `approved`로 바뀐 row:

| Source | Age/Sex | KRW | Status |
|---|---|---:|---|
| `src_db_direct_medical_202605` | 34/female | 6,854 | approved |
| `src_db_direct_medical_202605` | 44/female | 11,030 | approved |
| `src_kb_direct_medical_202605` | 34/female | 6,439 | approved |
| `src_kb_direct_medical_202605` | 44/female | 10,323 | approved |
| `src_hyundai_direct_medical_202605` | 34/female | 6,545 | approved |
| `src_hyundai_direct_medical_202605` | 44/female | 9,949 | approved |

이번 apply에서 no-op이 된 seed target ID:

| Old seed quote ID | 조건 |
|---|---|
| `quote_src_db_direct_medical_202605_age34_male_60456bed3452` | DB손보 34/male |
| `quote_src_db_direct_medical_202605_age44_male_26615bdcb076` | DB손보 44/male |
| `quote_src_kb_direct_medical_202605_age34_male_60456bed3452` | KB손보 34/male |
| `quote_src_kb_direct_medical_202605_age44_male_26615bdcb076` | KB손보 44/male |
| `quote_src_hyundai_direct_medical_202605_age34_male_60456bed3452` | 현대해상 34/male |
| `quote_src_hyundai_direct_medical_202605_age44_male_26615bdcb076` | 현대해상 44/male |

후속 읽기 전용 확인 결과, 이 6개 남성 조건 quote는 운영 DB에 없던 것이 아니라 같은 `product_source_id`, 나이, 성별, 보험료 기준의 row가 다른 `quote_hash_sha256` suffix ID로 존재했다. 따라서 재적재가 아니라 seed approval target ID 교정이 필요하다.

| Actual DB quote ID | 조건 | KRW | 현재 상태 |
|---|---|---:|---|
| `quote_src_db_direct_medical_202605_age34_male_f20570f4817b` | DB손보 34/male | 6,219 | needs_review |
| `quote_src_db_direct_medical_202605_age44_male_2a491b5a1fab` | DB손보 44/male | 9,320 | needs_review |
| `quote_src_kb_direct_medical_202605_age34_male_f20570f4817b` | KB손보 34/male | 6,400 | needs_review |
| `quote_src_kb_direct_medical_202605_age44_male_2a491b5a1fab` | KB손보 44/male | 9,074 | needs_review |
| `quote_src_hyundai_direct_medical_202605_age34_male_f20570f4817b` | 현대해상 34/male | 6,740 | needs_review |
| `quote_src_hyundai_direct_medical_202605_age44_male_2a491b5a1fab` | 현대해상 44/male | 9,190 | needs_review |

교정 PR은 `src/lib/db/seed.ts`와 seed 산출물의 `MEDICAL_BASELINE_APPROVED_QUOTE_IDS`를 위 actual DB ID로 바꾼다. 운영 DB write는 별도 apply PR에서 수행하며, 적용 후 quote approved는 26건에서 32건이 된다.

---

## 7. 안전성

- 운영 DB write 전 백업을 생성했다.
- DB URL과 token은 문서와 PR 본문에 기록하지 않는다.
- Drizzle schema와 migration은 변경하지 않았다.
- legacy demo 상품은 계속 `archived` 상태다.
- 삼성화재 실손은 문서 특이성 blocker가 해소되기 전까지 추천 snapshot에 포함하지 않는다.
- 실손 baseline 상품은 `risk_targets=[]`를 유지해 특정 DNA risk key와 직접 경쟁하지 않는다.

---

## 8. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 운영 DB 추천 경로에서 실제 실손 baseline 상품 3건을 조회할 수 있게 됐다 |
| Potential Impact | 암보험 중심 추천에서 기본 의료비 방어 추천으로 상품 폭을 넓혔다 |
| Novelty | risk-target 보험과 baseline 실손보험을 같은 추천 카탈로그에서 분리 운영한다 |
| UX | 테스트 사용자는 source-backed 실제 상품 8건을 볼 수 있다 |
| Open-source | 백업, seed apply, 사후 검증, no-op row 기록 절차를 재현 가능하게 남겼다 |
| Business Plan | 실제 보험상품 커버리지 확대와 quote 데이터 품질 이슈를 동시에 추적한다 |

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Medical Baseline Matching Review](./46_MEDICAL_BASELINE_MATCHING_REVIEW_2026_05_31.md) - 이번 apply의 선행 매칭 검수
- **QA_Validation**: [Medical Baseline Snapshot Seed](./47_MEDICAL_BASELINE_SNAPSHOT_SEED_2026_05_31.md) - 이번 apply의 seed 준비 검증
- **QA_Validation**: [Medical Baseline Male Quote ID Correction](./49_MEDICAL_BASELINE_MALE_QUOTE_ID_CORRECTION_2026_05_31.md) - 실손 남성 조건 quote approval ID 교정 검증
- **QA_Validation**: [Hanwha Recommendation Snapshot DB Apply](./44_HANWHA_RECOMMENDATION_SNAPSHOT_DB_APPLY_2026_05_31.md) - 직전 추천 snapshot DB apply 패턴
