# [QA] 신한라이프 해약환급금 미지급형 추천 Snapshot Seed 검증
> Created: 2026-05-31 18:23
> Last Updated: 2026-05-31 18:23

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: PR #61에서 매칭 검수한 `src_shinhan_life_sol_cancer_202601`의 source 승인, quote 승인, `insurance_products` snapshot seed 준비
- **결론**: 신한라이프 해약환급금 미지급형 암보험 1건을 다음 운영 DB apply 대상 seed로 준비했다. 이번 PR은 DB write를 수행하지 않으며, 적용 후 source-backed active 추천 상품은 9건에서 10건으로 늘어야 한다.

---

## 1. 변경 대상

| 항목 | 값 |
|---|---|
| source | `src_shinhan_life_sol_cancer_202601` |
| product snapshot | `prod_shinhan_life_sol_cancer_no_refund_202601` |
| primary document | `doc_shinhan_life_sol_cancer_terms_202601` |
| quote approval | 4건 |
| DB write | 없음 |
| 산출물 | `../../data/insurance/latest_shinhan_no_refund_snapshot_seed.json` |

---

## 2. Seed 변경 요약

| 구분 | 변경 |
|---|---:|
| `FIRST_RECOMMENDATION_SOURCE_APPROVALS` | +1 |
| `SHINHAN_NO_REFUND_APPROVED_QUOTE_IDS` | +4 |
| `FIRST_RECOMMENDATION_SNAPSHOT_PRODUCTS` | +1 |
| 적용 후 source approval 총계 | 10 |
| 적용 후 quote approval 총계 | 40 |
| 적용 후 active source-backed product 총계 | 10 |

---

## 3. Source Approval

`src_shinhan_life_sol_cancer_202601`은 다음 값으로 승격된다.

| 필드 | 값 |
|---|---|
| `review_status` | `approved` |
| `sale_status` | `active` |
| `monthly_premium_krw` | 6,750 |
| `premium_text` | `6,750원` |
| `coverage_category` | `oncology` |
| `matching_strategy` | `risk_target` |
| `risk_targets` | `pancreatic_cancer`, `liver_cancer`, `lung_cancer`, `breast_cancer`, `colon_cancer` |

---

## 4. Quote Approval

다음 4개 quote row를 `approved` 대상으로 추가했다.

| quote id | 조건 | 월 보험료 |
|---|---|---:|
| `quote_src_shinhan_life_sol_cancer_202601_age34_female_2589f537c6fc` | 34세 여성 | 6,750 KRW |
| `quote_src_shinhan_life_sol_cancer_202601_age34_male_0d807392cd7d` | 34세 남성 | 8,530 KRW |
| `quote_src_shinhan_life_sol_cancer_202601_age44_female_88d1cf1a2fad` | 44세 여성 | 7,320 KRW |
| `quote_src_shinhan_life_sol_cancer_202601_age44_male_dbd72b264aa2` | 44세 남성 | 10,030 KRW |

---

## 5. Product Snapshot

| 필드 | 값 |
|---|---|
| `id` | `prod_shinhan_life_sol_cancer_no_refund_202601` |
| `name` | 신한SOL암보험 해약환급금 미지급형 |
| `provider` | 신한라이프생명 |
| `monthly_premium_krw` | 6,750 |
| `monthly_premium_usdc` | 5.00 |
| `premium_basis` | 보험다모아 암보험 모바일 34세 여성 조건, 고정 데모 환산율 1 USDC = 1,350 KRW |
| `catalog_status` | `approved` |
| `is_active` | 1 |

---

## 6. 안전성

- 이번 PR은 `seed.ts`와 문서/데이터 산출물만 변경하며 운영 DB write를 하지 않는다.
- 적용 PR에서는 운영 DB 백업을 먼저 수행해야 한다.
- 신한라이프 표준형 `src_shinhan_life_sol_cancer_standard_202605`는 계속 raw 차단 상태이며 이번 seed에 포함하지 않는다.
- source-backed 추천 경로는 기존 필터를 유지한다.
- legacy demo 상품은 계속 archived 상태로 유지한다.

---

## 7. 다음 작업

1. 이번 seed PR을 머지한다.
2. 운영 DB 백업 후 `src/lib/db/seed.ts`를 실행한다.
3. 적용 후 `insurance_products=15`, source-backed active 추천 상품 10건, approved quote 40건을 확인한다.
4. Test Pilot Dashboard에서 신한라이프 카드와 상담 AI 상품 설명을 수동 확인한다.

---

## 8. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 신한라이프 암보험이 source-backed 추천 snapshot으로 발행될 준비가 끝났다 |
| Potential Impact | 실제 생명보험사 암보험 추천 폭이 5건에서 6건으로 늘어난다 |
| Novelty | 공식 PDF hash와 보험다모아 quote matrix를 결합한 추천 발행 패턴을 반복한다 |
| UX | 사용자는 신한라이프 카드에서도 조건별 보험료, 출처, caveat를 확인할 수 있다 |
| Open-source | seed 준비와 DB apply를 분리해 반복 가능한 운영 절차를 유지한다 |
| Business Plan | 추천 가능 상품 수를 늘려 테스트 사용자 피드백의 비교 폭을 넓힌다 |

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Shinhan No-refund Matching Review](./57_SHINHAN_NO_REFUND_MATCHING_REVIEW_2026_05_31.md) - 이번 seed의 매칭 검수 근거
- **QA_Validation**: [Remaining Source Candidate Triage](./56_REMAINING_SOURCE_CANDIDATE_TRIAGE_2026_05_31.md) - 남은 source 후보 처리 순서
