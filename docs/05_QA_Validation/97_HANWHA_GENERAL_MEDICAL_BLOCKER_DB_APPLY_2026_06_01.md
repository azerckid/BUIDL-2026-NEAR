# [QA] 한화손보 실손의료보험 Blocker DB 적용 검증
> Created: 2026-06-01 19:13
> Last Updated: 2026-06-01 19:13

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #100에서 `seed.ts`에 반영한 `src_hanwha_general_direct_medical_202605` source blocker와 quote 4건 rejection의 운영 Turso DB 적용
- **결론**: 백업 생성 후 `src/lib/db/seed.ts`를 실행해 한화손보 실손의료보험 source를 `raw`에서 `rejected`로 변경하고, 관련 quote 4건을 `needs_review`에서 `rejected`로 변경했다. active 추천 상품 수와 approved quote 수는 변하지 않았고, 남은 raw blocker는 신한라이프 표준형 1건이다.

---

## 1. 입력

| 항목 | 값 |
|---|---|
| Seed 입력 | `src/lib/db/seed.ts` |
| Seed 정책 검증 | `docs/05_QA_Validation/96_HANWHA_GENERAL_MEDICAL_BLOCKER_POLICY_2026_06_01.md` |
| 대상 source | `src_hanwha_general_direct_medical_202605` |
| 대상 상품명 | 한화다이렉트실손의료보험(갱신형)Ⅴ 무배당 |
| DB write | 수행 |

---

## 2. 백업

DB write 전 `.env.local`의 Turso 연결 설정을 사용한 SQL dump 백업을 생성했다. 백업 파일은 로컬 복구용이며 Git에는 포함하지 않는다.

| 항목 | 값 |
|---|---|
| 백업 파일 | `/private/tmp/buidl_near_turso_backups/mydna-local-hanwha-general-medical-blocker-db-apply-20260601T154947KST.sql` |
| 백업 SHA-256 | `89a555a77649ef1ad9a15fcebd70e6e2bcd69b1e44857c11fb37b54de957182d` |
| 백업 크기 | 336,624 bytes |
| 백업 테이블 수 | 13 |
| 백업 object 수 | 31 |
| 사전 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-hanwha-general-medical-blocker-db-apply-20260601T154947KST.pre.json` |
| 사후 검증 JSON | `/private/tmp/buidl_near_turso_backups/mydna-local-hanwha-general-medical-blocker-db-apply-20260601T154947KST.post.json` |

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
| rejected source | 1 |
| raw source | 2 |
| approved quote | 76 |
| rejected quote | 4 |
| needs_review quote | 12 |

한화손보 target 상태:

| 대상 | 적용 전 |
|---|---|
| source `src_hanwha_general_direct_medical_202605` | `raw`, `sale_status=unknown`, 대표 보험료 없음 |
| source document | 0건 |
| quote 4건 | 모두 `needs_review` |
| product snapshot | 0건 |

---

## 4. 적용 명령

```bash
env DOTENV_CONFIG_PATH=.env.local DOTENV_CONFIG_QUIET=true npx tsx -r dotenv/config src/lib/db/seed.ts
```

실행 결과:

```text
Seed complete. 17 carriers, 22 source candidates, 39 documents, 19 source approvals, 2 source catalog exclusions, 8 Hanwha carrier quotes inserted if missing, 76 quote approvals, 8 Hanwha zero quotes rejected, 4 source catalog exclusion quotes rejected, 5 legacy demo products archived, and 19 active source-backed insurance products checked.
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
| rejected source | 1 | 2 |
| raw source | 2 | 1 |
| approved quote | 76 | 76 |
| rejected quote | 4 | 8 |
| needs_review quote | 12 | 8 |

한화손보 target 상태:

| 대상 | 적용 후 |
|---|---|
| source `src_hanwha_general_direct_medical_202605` | `rejected`, `sale_status=unknown` |
| source document | 0건 |
| quote 4건 | 모두 `rejected` |
| product snapshot | 0건 |

---

## 6. Quote 확인

| condition | quote id | monthly_premium_krw | status |
|---|---|---:|---|
| age34 female | `quote_src_hanwha_general_direct_medical_202605_age34_female_b141dc7c5700` | 6,539 | `rejected` |
| age34 male | `quote_src_hanwha_general_direct_medical_202605_age34_male_60456bed3452` | 6,394 | `rejected` |
| age44 female | `quote_src_hanwha_general_direct_medical_202605_age44_female_58dcc145a6b7` | 10,329 | `rejected` |
| age44 male | `quote_src_hanwha_general_direct_medical_202605_age44_male_26615bdcb076` | 8,703 | `rejected` |

---

## 7. 남은 Non-approved Source

적용 후 남은 `raw` blocker는 1건이다.

| source | 상태 | blocker |
|---|---|---|
| `src_shinhan_life_sol_cancer_standard_202605` | `raw` | 표준형 일반형 공식 문서 endpoint 미확보 |

---

## 8. 안전성

- 적용 전 SQL dump 백업과 사전 JSON을 생성했다.
- 적용 후 JSON으로 target source/quote/product 상태를 재확인했다.
- DB URL과 auth token은 문서에 기록하지 않았다.
- 백업 파일과 pre/post JSON은 `/private/tmp` 로컬 복구용이며 Git에는 포함하지 않는다.
- 이번 apply는 active 추천 상품과 approved quote를 늘리거나 줄이지 않는다.
- 상담 AI 상품 컨텍스트와 Dashboard 추천 카드에는 이 source가 노출되지 않는다.

---

## 9. 다음 작업

1. 신한라이프 표준형 일반형 공식 문서 endpoint blocker를 최종 정리한다.
2. 신한라이프 표준형 source와 quote 4건을 승인할 근거가 없으면 `rejected` 정책을 별도 seed PR로 분리한다.
3. 아직 source 후보로 구조화하지 못한 보험다모아 P0 샘플 34개는 공식 URL, source row, 문서 hash 순서로 별도 확장한다.

---

## 10. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 한화손보 실손 source와 quote 4건을 현재 추천 경로에서 명확히 제외했다 |
| Potential Impact | 실손 세대/개정 mismatch로 인한 잘못된 추천을 방지했다 |
| Novelty | source blocker와 quote rejection을 함께 적용하는 운영 패턴을 정리했다 |
| UX | 사용자가 과거 약관 근거의 실손 추천을 받지 않는다 |
| Open-source | 백업, seed apply, post-check를 반복 가능한 기록으로 남겼다 |
| Business Plan | 추천상품 확대보다 근거 품질을 우선하는 운영 기준을 유지했다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Hanwha General Medical Disclosure Probe](./89_HANWHA_GENERAL_MEDICAL_DISCLOSURE_PROBE_2026_06_01.md) - 공식 후보 문서 variant mismatch 검증
- **QA_Validation**: [Hanwha General Medical Blocker Policy](./96_HANWHA_GENERAL_MEDICAL_BLOCKER_POLICY_2026_06_01.md) - DB 적용 전 blocker 종결 정책
- **QA_Validation**: [Samsung Life Hospital Health DB Apply](./95_SAMSUNG_LIFE_HOSPITAL_HEALTH_DB_APPLY_2026_06_01.md) - 직전 source catalog exclusion DB 적용 검증
