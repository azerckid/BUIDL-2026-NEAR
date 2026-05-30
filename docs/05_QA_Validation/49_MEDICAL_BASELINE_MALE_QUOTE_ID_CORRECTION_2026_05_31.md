# [QA] 실손의료보험 남성 Quote ID 교정 검증
> Created: 2026-05-31 03:58
> Last Updated: 2026-05-31 04:49

- **레이어**: 05_QA_Validation
- **상태**: Applied via follow-up
- **범위**: DB손보, KB손보, 현대해상 실손의료보험 남성 조건 quote 6건의 approval target ID 교정
- **결론**: PR #51 적용 당시 no-op으로 보였던 실손 남성 quote 6건은 운영 DB에 없는 row가 아니라, 같은 source/조건/보험료 row가 다른 `quote_hash_sha256` suffix ID로 존재하는 상태였다. 따라서 재적재가 아니라 `MEDICAL_BASELINE_APPROVED_QUOTE_IDS`를 운영 DB 실제 row ID로 교정한다. 이번 PR은 DB write를 하지 않으며, 후속 apply PR에서 seed를 재실행하면 quote approved가 26건에서 32건으로 증가한다.

---

## 1. 확인 방법

| 항목 | 값 |
|---|---|
| 확인 방식 | 운영 DB 읽기 전용 SELECT |
| 대상 source | `src_db_direct_medical_202605`, `src_kb_direct_medical_202605`, `src_hyundai_direct_medical_202605` |
| 대상 조건 | `age34_male`, `age44_male` |
| DB write | 0 |
| seed 변경 | `MEDICAL_BASELINE_APPROVED_QUOTE_IDS` 6건 교정 |

기존 `scripts/insurance/apply-premium-quotes.mjs` dry-run은 현재 DB 기준 84/84 semantic duplicate, insert candidate 0을 반환했다. 이는 남성 quote가 insert되지 않은 것이 아니라 이미 같은 의미의 row가 존재한다는 뜻이다.

교정 후 승인 target ID 12건을 운영 DB에서 읽기 전용으로 재확인했으며, 12건 모두 존재한다. 여성 조건 6건은 이미 `approved`, 남성 조건 6건은 `needs_review` 상태이므로 후속 apply에서 남성 6건만 승인 상태로 올라가면 된다.

---

## 2. 교정 대상

| Source | 조건 | 기존 seed ID | 실제 DB ID | KRW |
|---|---|---|---|---:|
| DB손보 | 34/male | `quote_src_db_direct_medical_202605_age34_male_60456bed3452` | `quote_src_db_direct_medical_202605_age34_male_f20570f4817b` | 6,219 |
| DB손보 | 44/male | `quote_src_db_direct_medical_202605_age44_male_26615bdcb076` | `quote_src_db_direct_medical_202605_age44_male_2a491b5a1fab` | 9,320 |
| KB손보 | 34/male | `quote_src_kb_direct_medical_202605_age34_male_60456bed3452` | `quote_src_kb_direct_medical_202605_age34_male_f20570f4817b` | 6,400 |
| KB손보 | 44/male | `quote_src_kb_direct_medical_202605_age44_male_26615bdcb076` | `quote_src_kb_direct_medical_202605_age44_male_2a491b5a1fab` | 9,074 |
| 현대해상 | 34/male | `quote_src_hyundai_direct_medical_202605_age34_male_60456bed3452` | `quote_src_hyundai_direct_medical_202605_age34_male_f20570f4817b` | 6,740 |
| 현대해상 | 44/male | `quote_src_hyundai_direct_medical_202605_age44_male_26615bdcb076` | `quote_src_hyundai_direct_medical_202605_age44_male_2a491b5a1fab` | 9,190 |

여성 조건 6건은 기존 seed ID가 운영 DB 실제 row ID와 이미 일치하므로 변경하지 않는다.

---

## 3. 원인 해석

`latest_premium_quote_probe.json`에는 남성 조건 response hash suffix가 `60456bed3452`, `26615bdcb076`으로 남아 있다. 반면 운영 DB에는 같은 source/조건/보험료 row가 각각 `f20570f4817b`, `2a491b5a1fab` suffix로 들어 있다.

`apply-premium-quotes.mjs`의 semantic duplicate key는 `quote_hash_sha256`이 아니라 source, age, sex, source sex code, payment cycle, premium text, monthly premium, params를 기준으로 한다. 따라서 hash suffix가 달라도 같은 의미의 quote row로 판단되어 추가 insert candidate가 0이 된다.

이번 수정은 canonical row ID를 새로 만들지 않고, 이미 운영 DB에 존재하는 row를 승인 대상으로 삼는다.

---

## 4. 적용 전후 예상

| 항목 | 현재 운영 DB | 후속 apply 후 예상 |
|---|---:|---:|
| `insurance_premium_quotes.review_status=approved` | 26 | 32 |
| 실손 baseline target quote approved | 6 | 12 |
| active source-backed product | 8 | 8 |
| `insurance_products` | 13 | 13 |

후속 apply PR에서는 운영 DB 백업 후 `src/lib/db/seed.ts`를 재실행하고, 위 6개 actual DB quote ID가 `approved`로 바뀌었는지 확인한다.

2026-05-31 04:49 KST 기준 후속 apply를 완료했다. 실손 baseline target quote 12건은 모두 `approved` 상태이며, 세부 적용 기록은 `./50_MEDICAL_BASELINE_MALE_QUOTE_DB_APPLY_2026_05_31.md`에 둔다.

---

## 5. 안전성

- 이번 PR은 DB write를 수행하지 않는다.
- 기존 quote row를 새로 삽입하지 않는다.
- `insurance_products` snapshot과 source approval은 변경하지 않는다.
- `quote_hash_sha256` 차이는 보존하고, 운영 DB에 존재하는 row ID만 approval target으로 사용한다.
- DB URL과 token은 문서에 기록하지 않는다.

---

## 6. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 사용자 조건별 보험료에서 남성 조건도 approved quote로 노출할 수 있게 준비한다 |
| Potential Impact | 실손 baseline 상품의 조건별 가격 matrix 완성도를 높인다 |
| Novelty | hash가 달라도 의미상 동일한 quote row를 보존하며 승인 ID만 교정한다 |
| UX | 남성 테스트 사용자의 조건별 보험료 fallback 가능성을 줄인다 |
| Open-source | semantic duplicate와 row ID 교정 기준을 문서화한다 |
| Business Plan | 보험료 데이터 신뢰도를 높여 실제 비교 서비스 전환 가능성을 높인다 |

---

## 7. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Medical Baseline Snapshot Seed](./47_MEDICAL_BASELINE_SNAPSHOT_SEED_2026_05_31.md) - 실손 baseline seed 준비 검증
- **QA_Validation**: [Medical Baseline Snapshot DB Apply](./48_MEDICAL_BASELINE_SNAPSHOT_DB_APPLY_2026_05_31.md) - no-op으로 보였던 남성 quote ID 발견 기록
- **QA_Validation**: [Medical Baseline Male Quote DB Apply](./50_MEDICAL_BASELINE_MALE_QUOTE_DB_APPLY_2026_05_31.md) - 교정된 남성 quote approval 운영 DB 적용 검증
