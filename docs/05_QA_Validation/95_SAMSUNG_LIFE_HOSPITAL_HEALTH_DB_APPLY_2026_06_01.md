# [QA] 삼성생명 입원 건강보험 Source Exclusion DB 적용 검증
> Created: 2026-06-01 15:32
> Last Updated: 2026-06-01 15:32

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #98에서 `seed.ts`에 반영한 `src_samsung_life_hospital_health_202601` source catalog exclusion의 운영 Turso DB 적용
- **결론**: 백업 생성 후 `src/lib/db/seed.ts`를 실행해 삼성생명 인터넷 입원 건강보험 source를 `needs_review`에서 `rejected`로 변경했다. 공식 약관 문서 row와 대표 보험료는 보존했고, active 추천 상품 수와 approved quote 수는 변하지 않았다.

---

## 1. 입력

| 항목 | 값 |
|---|---|
| Seed 입력 | `src/lib/db/seed.ts` |
| Seed 정책 검증 | `docs/05_QA_Validation/94_SAMSUNG_LIFE_HOSPITAL_HEALTH_POLICY_2026_06_01.md` |
| 대상 source | `src_samsung_life_hospital_health_202601` |
| 대상 상품명 | 삼성 인터넷 입원 건강보험 |
| DB write | 수행 |

---

## 2. 백업

DB write 전 `.env.local`의 Turso 연결 설정을 사용한 SQL dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-samsung-life-hospital-health-db-apply-20260601T152552KST.sql` |
| 백업 SHA-256 | `2a21e212f1b955c33bd433d843816a75fef683ba8188b9269272ea61f4fe8fb8` |
| 백업 크기 | 335,807 bytes |
| 백업 테이블 수 | 13 |
| 백업 object 수 | 31 |
| 사전 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-samsung-life-hospital-health-db-apply-20260601T152552KST.pre.json` |
| 사후 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-samsung-life-hospital-health-db-apply-20260601T152552KST.post.json` |

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
| rejected source | 0 |
| approved quote | 76 |

삼성생명 target 상태:

| 대상 | 적용 전 |
|---|---|
| source `src_samsung_life_hospital_health_202601` | `needs_review`, `sale_status=unknown`, 대표 보험료 8,650 KRW |
| source document | 약관 1건 존재 |
| quote | 0건 |
| product snapshot | 0건 |

---

## 4. 적용 명령

```bash
env DOTENV_CONFIG_PATH=.env.local DOTENV_CONFIG_QUIET=true npx tsx -r dotenv/config src/lib/db/seed.ts
```

실행 결과:

```text
Seed complete. 17 carriers, 22 source candidates, 39 documents, 19 source approvals, 1 source catalog exclusions, 8 Hanwha carrier quotes inserted if missing, 76 quote approvals, 8 Hanwha zero quotes rejected, 5 legacy demo products archived, and 19 active source-backed insurance products checked.
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
| rejected source | 0 | 1 |
| approved quote | 76 | 76 |

삼성생명 target 상태:

| 대상 | 적용 후 |
|---|---|
| source `src_samsung_life_hospital_health_202601` | `rejected`, `sale_status=unknown`, 대표 보험료 8,650 KRW |
| source document | `doc_samsung_life_hospital_health_terms_202601` 1건 유지 |
| quote | 0건 |
| product snapshot | 0건 |

---

## 6. Source Document 확인

| document_type | id | sha256 |
|---|---|---|
| `terms` | `doc_samsung_life_hospital_health_terms_202601` | `ce40ecf0629246dd761d63c9badbc04d32e74839fce8a4d74176277b8e5d1363` |

---

## 7. 남은 Non-approved Source

적용 후 `needs_review` source는 0건이고, 남은 `raw` blocker는 2건이다.

| source | 상태 | blocker |
|---|---|---|
| `src_hanwha_general_direct_medical_202605` | `raw` | target `갱신형 V` 공식 문서 endpoint 미확보 |
| `src_shinhan_life_sol_cancer_standard_202605` | `raw` | 표준형 일반형 공식 문서 endpoint 미확보 |

---

## 8. 안전성

- 적용 전 SQL dump 백업과 사전 JSON을 생성했다.
- 적용 후 JSON으로 target source/doc/quote/product 상태를 재확인했다.
- DB URL과 auth token은 문서에 기록하지 않았다.
- 백업 파일과 pre/post JSON은 `/private/tmp` 로컬 복구용이며 Git에는 포함하지 않는다.
- 이번 apply는 active 추천 상품과 approved quote를 늘리거나 줄이지 않는다.
- 상담 AI 상품 컨텍스트와 Dashboard 추천 카드에는 이 source가 노출되지 않는다.

---

## 9. 다음 작업

1. 한화손보 실손 `갱신형 V` 공식 문서 endpoint를 재탐색하거나 blocker 종결 정책을 결정한다.
2. 신한라이프 표준형 일반형 공식 문서 endpoint를 재탐색하거나 blocker 종결 정책을 결정한다.
3. 아직 source 후보로 구조화하지 못한 보험다모아 P0 샘플 34개는 공식 URL, source row, 문서 hash 순서로 별도 확장한다.

---

## 10. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 현재 추천 category 밖 source를 active 추천에서 명확히 제외했다 |
| Potential Impact | 추천 정확성을 해치지 않고 source catalog 상태를 정리했다 |
| Novelty | source 보존과 추천 발행을 분리하는 exclusion 패턴을 운영 DB에 적용했다 |
| UX | 사용자가 입원 건강보험을 DNA risk 기반 정밀 추천으로 오해하지 않는다 |
| Open-source | 백업, seed apply, post-check를 반복 가능한 기록으로 남겼다 |
| Business Plan | 근거 없는 추천 확장보다 신뢰 가능한 상품 노출 기준을 유지한다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Samsung Life Hospital Health Policy](./94_SAMSUNG_LIFE_HOSPITAL_HEALTH_POLICY_2026_06_01.md) - DB 적용 전 category 정책 결정
- **QA_Validation**: [Remaining Source Candidate Triage](./56_REMAINING_SOURCE_CANDIDATE_TRIAGE_2026_05_31.md) - 남은 source 후보 처리 순서
