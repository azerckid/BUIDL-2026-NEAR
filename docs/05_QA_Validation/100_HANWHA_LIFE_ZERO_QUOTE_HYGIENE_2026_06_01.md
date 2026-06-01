# [QA] 한화생명 E-insmarket NULL Quote Hygiene
> Created: 2026-06-01 19:49
> Last Updated: 2026-06-01 19:49

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: `src_hanwha_life_e_cancer_202604`에 남은 e-insmarket NULL quote 4건의 actual DB row ID 보정
- **결론**: source 후보 22개는 모두 approved/rejected로 닫혔지만, 전체 quote 큐에는 한화생명 e암보험 e-insmarket NULL quote 4건이 `needs_review`로 남아 있었다. 기존 zero quote rejection seed의 표준체형 e암보험 ID 4개가 운영 DB actual row ID와 달랐으므로, 실제 row ID로 교체한다.

---

## 1. 입력

| 항목 | 값 |
|---|---|
| 대상 source | `src_hanwha_life_e_cancer_202604` |
| quote source type | `e_insmarket` |
| monthly_premium_krw | `NULL` |
| 현재 review_status | `needs_review` |
| 대상 quote row | 4건 |
| 신규 검수 JSON | `data/insurance/latest_hanwha_life_zero_quote_hygiene.json` |
| 신규 검수 CSV | `data/insurance/latest_hanwha_life_zero_quote_hygiene.csv` |

---

## 2. 문제

한화생명 추천 snapshot은 carrier quote 숫자 KRW row를 사용한다. 보험다모아에서 들어온 `NULL` 또는 0원 quote는 추천 보험료로 쓰면 안 되므로 `rejected`로 내려야 한다.

기존 seed는 nonsmoker source의 NULL quote 4건은 정확히 reject했지만, 표준체형 e암보험 source의 actual row ID 4건은 semantic suffix가 달라 남아 있었다.

---

## 3. Actual Row ID

| condition | actual quote id | 상태 |
|---|---|---|
| age34 female | `quote_src_hanwha_life_e_cancer_202604_age34_female_2589f537c6fc` | `needs_review` |
| age34 male | `quote_src_hanwha_life_e_cancer_202604_age34_male_0d807392cd7d` | `needs_review` |
| age44 female | `quote_src_hanwha_life_e_cancer_202604_age44_female_88d1cf1a2fad` | `needs_review` |
| age44 male | `quote_src_hanwha_life_e_cancer_202604_age44_male_dbd72b264aa2` | `needs_review` |

---

## 4. Seed 변경

`HANWHA_LIFE_ZERO_QUOTE_REJECTED_IDS`에서 표준체형 e암보험 stale ID 4개를 운영 DB actual row ID 4개로 교체한다.

| 항목 | 값 |
|---|---|
| source approval 변경 | 없음 |
| product snapshot 변경 | 없음 |
| approved quote 변경 | 없음 |
| rejected quote target | 4건 추가 실효 |
| 예상 apply 후 needs_review quote | 0건 |

---

## 5. 안전성

- 이번 PR은 DB write를 하지 않는다.
- carrier quote approved row와 active product snapshot은 변경하지 않는다.
- NULL e-insmarket quote만 `rejected` 대상에 포함한다.
- 운영 DB 반영은 백업 후 별도 apply PR로 진행한다.

---

## 6. 다음 작업

1. 이 seed correction PR을 merge한다.
2. 운영 DB 백업 후 seed apply PR을 실행한다.
3. 적용 후 `insurance_premium_quotes.review_status='needs_review'`가 0건인지 확인한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 추천에 쓰지 않는 NULL quote 잔여 큐를 닫는다 |
| Potential Impact | 보험료 표시의 신뢰성을 유지한다 |
| Novelty | semantic duplicate로 달라진 실제 row ID를 운영 검증으로 보정한다 |
| UX | 사용자가 0원/NULL 보험료를 실제 보험료로 오해하지 않는다 |
| Open-source | quote hygiene 기준과 actual row ID 보정 절차를 문서화한다 |
| Business Plan | 실제 보험료 기반 추천 카탈로그의 품질을 유지한다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Hanwha Recommendation Snapshot DB Apply](./44_HANWHA_RECOMMENDATION_SNAPSHOT_DB_APPLY_2026_05_31.md) - 한화생명 carrier quote 적용과 기존 zero quote rejection 근거
- **QA_Validation**: [Shinhan Standard Blocker DB Apply](./99_SHINHAN_STANDARD_BLOCKER_DB_APPLY_2026_06_01.md) - source 후보 22개 정리와 잔여 quote hygiene 발견
- **Data**: [Hanwha Life Zero Quote Hygiene JSON](../../data/insurance/latest_hanwha_life_zero_quote_hygiene.json) - quote hygiene 구조화 결과
- **Data**: [Hanwha Life Zero Quote Hygiene CSV](../../data/insurance/latest_hanwha_life_zero_quote_hygiene.csv) - quote hygiene 요약
