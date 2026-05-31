# [QA] 실손의료보험 남성 Quote 승인 DB 적용 검증
> Created: 2026-05-31 04:49
> Last Updated: 2026-05-31 04:49

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #52에서 교정한 DB손보, KB손보, 현대해상 실손의료보험 남성 조건 quote 6건의 운영 Turso DB approval 적용
- **결론**: 백업 생성 후 `src/lib/db/seed.ts`를 재실행해 실손 baseline 남성 조건 quote 6건을 `needs_review`에서 `approved`로 승격했다. 운영 DB 기준 `insurance_premium_quotes.review_status=approved`는 26건에서 32건으로 증가했고, 실손 baseline target quote 12건이 모두 approved 상태가 됐다.

---

## 1. 적용 대상

| 항목 | 값 |
|---|---|
| Env file | `.env.local` |
| DB URL | `.env.local`의 `TURSO_DATABASE_URL` (`libsql://***.turso.io`, masked) |
| 작업 브랜치 | `medical-baseline-male-quotes-db-apply` |
| 기준 main merge commit | `d104f33` |
| Seed 입력 | `src/lib/db/seed.ts` |
| 적용 대상 | 실손 baseline 남성 조건 quote 6건 승인 |

DB URL 실제 값과 token은 공개 문서에 기록하지 않는다.

---

## 2. 백업

DB write 전 `.env.local`의 Turso 연결 설정을 사용한 libSQL 읽기 전용 dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-medical-baseline-male-quotes-db-apply-20260530T193342Z.sql` |
| SHA-256 | `d7dd6243c4e8e1c0b0597ef0685a877fff0c478385a2ca06b1c4ff476862593d` |
| 백업 테이블 수 | 13 |
| 백업 object 수 | 31 |
| 사전 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-medical-baseline-male-quotes-db-apply-20260530T193342Z.pre.json` |
| 사후 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-medical-baseline-male-quotes-db-apply-20260530T193342Z.post.json` |

백업 직전 핵심 row count:

| 테이블 | Row count |
|---|---:|
| `insurance_carriers` | 17 |
| `insurance_product_sources` | 22 |
| `insurance_source_documents` | 22 |
| `insurance_products` | 13 |
| `insurance_premium_quotes` | 92 |
| `test_pilot_checkouts` | 1 |

백업 직전 target 상태:

| 검사 | 결과 |
|---|---:|
| 실손 baseline target quote row | 12 |
| 실손 baseline target quote approved | 6 |
| 실손 baseline 남성 target quote approved | 0 |
| source-backed active product | 8 |
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

seed 로그의 `32 quote approvals`는 전체 승인 target ID 수다. 이번 적용에서 실제로 새로 변경된 것은 PR #52에서 교정한 남성 조건 quote 6건이다.

---

## 4. 적용 후 DB 검증

| 검사 | 적용 전 | 적용 후 |
|---|---:|---:|
| `insurance_carriers` | 17 | 17 |
| `insurance_product_sources` | 22 | 22 |
| `insurance_source_documents` | 22 | 22 |
| `insurance_products` | 13 | 13 |
| `insurance_premium_quotes` | 92 | 92 |
| source-backed active product | 8 | 8 |
| invalid source document hash | 0 | 0 |
| 실손 baseline target quote row | 12 | 12 |
| 실손 baseline target quote approved | 6 | 12 |
| 실손 baseline 남성 target quote approved | 0 | 6 |

Product source review 상태는 변경되지 않았다.

| `review_status` | Row |
|---|---:|
| `approved` | 8 |
| `needs_review` | 3 |
| `raw` | 11 |

Quote review 상태:

| `review_status` | 적용 전 | 적용 후 |
|---|---:|---:|
| `approved` | 26 | 32 |
| `needs_review` | 62 | 56 |
| `rejected` | 4 | 4 |

---

## 5. 승인 완료된 실손 Quote Row

| Source | Age/Sex | KRW | Status |
|---|---|---:|---|
| `src_db_direct_medical_202605` | 34/female | 6,854 | approved |
| `src_db_direct_medical_202605` | 34/male | 6,219 | approved |
| `src_db_direct_medical_202605` | 44/female | 11,030 | approved |
| `src_db_direct_medical_202605` | 44/male | 9,320 | approved |
| `src_kb_direct_medical_202605` | 34/female | 6,439 | approved |
| `src_kb_direct_medical_202605` | 34/male | 6,400 | approved |
| `src_kb_direct_medical_202605` | 44/female | 10,323 | approved |
| `src_kb_direct_medical_202605` | 44/male | 9,074 | approved |
| `src_hyundai_direct_medical_202605` | 34/female | 6,545 | approved |
| `src_hyundai_direct_medical_202605` | 34/male | 6,740 | approved |
| `src_hyundai_direct_medical_202605` | 44/female | 9,949 | approved |
| `src_hyundai_direct_medical_202605` | 44/male | 9,190 | approved |

---

## 6. 안전성

- 운영 DB write 전 백업을 생성했다.
- DB URL과 token은 문서와 PR 본문에 기록하지 않는다.
- Drizzle schema와 migration은 변경하지 않았다.
- `insurance_products`, `insurance_product_sources`, `insurance_source_documents` row count는 변경되지 않았다.
- active source-backed 상품 수는 8건으로 유지됐다.
- 이번 적용은 기존 quote row의 `review_status`만 변경했다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 실손 baseline 상품의 남성/여성 조건별 보험료 matrix가 모두 approved 상태가 됐다 |
| Potential Impact | 실손 추천의 사용자 조건별 가격 신뢰도를 높인다 |
| Novelty | source-backed 추천과 quote approval을 분리해 데이터 품질을 단계적으로 완성한다 |
| UX | 남성 테스트 사용자가 fallback 없이 조건별 예상 보험료를 볼 수 있다 |
| Open-source | 백업, seed apply, 사후 검증, ID 교정 적용 절차를 재현 가능하게 남긴다 |
| Business Plan | 실제 보험 비교 서비스 전환에 필요한 가격 데이터 완성도를 높인다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Medical Baseline Matching Review](./46_MEDICAL_BASELINE_MATCHING_REVIEW_2026_05_31.md) - 실손 baseline 매칭 키워드 검수
- **QA_Validation**: [Medical Baseline Snapshot Seed](./47_MEDICAL_BASELINE_SNAPSHOT_SEED_2026_05_31.md) - 실손 baseline seed 준비 검증
- **QA_Validation**: [Medical Baseline Snapshot DB Apply](./48_MEDICAL_BASELINE_SNAPSHOT_DB_APPLY_2026_05_31.md) - 실손 baseline snapshot 운영 DB 적용 검증
- **QA_Validation**: [Medical Baseline Male Quote ID Correction](./49_MEDICAL_BASELINE_MALE_QUOTE_ID_CORRECTION_2026_05_31.md) - 남성 quote approval ID 교정 검증
