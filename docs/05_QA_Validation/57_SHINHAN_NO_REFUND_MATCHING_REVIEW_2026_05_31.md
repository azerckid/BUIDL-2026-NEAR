# [QA] 신한라이프 해약환급금 미지급형 암보험 매칭 키워드 검증
> Created: 2026-05-31 18:09
> Last Updated: 2026-05-31 18:09

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: `src_shinhan_life_sol_cancer_202601`의 공식 문서 hash 재확인, 암 보장 키워드, caveat, quote row 추천 발행 가능성 검토
- **결론**: 신한라이프 해약환급금 미지급형 암보험은 `coverage_category=oncology`, `matching_strategy=risk_target`, 암 관련 5개 DNA risk target 후보로 정리 가능하다. 다음 PR에서 source 승인, quote 4건 승인, `insurance_products` snapshot 1건 seed를 준비할 수 있다.

---

## 1. 검증 방식

공식 PDF 3개를 `/private/tmp/shinhan_sol/`에 임시 다운로드하고 SHA-256을 seed 값과 대조했다. 운영 DB는 quote row 확인을 위해 읽기 전용으로만 조회했다.

| 항목 | 값 |
|---|---|
| 대상 source | `src_shinhan_life_sol_cancer_202601` |
| 상품명 | 신한SOL암보험(무배당, 해약환급금 미지급형)(비갱신형) |
| 보험다모아 코드 | `L11C009000006` |
| DB write | 없음 |
| 산출물 JSON | `../../data/insurance/latest_shinhan_no_refund_matching_review.json` |
| 산출물 CSV | `../../data/insurance/latest_shinhan_no_refund_matching_review.csv` |

---

## 2. 공식 문서 Hash 재확인

| 문서 | document id | SHA-256 | 재다운로드 일치 |
|---|---|---|---|
| 상품요약서 | `doc_shinhan_life_sol_cancer_summary_202601` | `d557ed911adc877976863155e45fec5217ebfe485aed8f0c685797d0d7314c03` | yes |
| 사업방법서 | `doc_shinhan_life_sol_cancer_business_202601` | `9aa1ed61e51a9c67a339430266f8551cd6739bcb48d725bf298e3742fe3797ea` | yes |
| 판매약관 | `doc_shinhan_life_sol_cancer_terms_202601` | `fcd915ee2e5440cf9542711dabd1c3014a1f5f3efef9c0a1f8fc88ed7ca40ffa` | yes |

대표 근거 문서는 판매약관 `doc_shinhan_life_sol_cancer_terms_202601`로 둔다.

---

## 3. 매칭 키워드 판단

| 필드 | 값 |
|---|---|
| `coverage_category` | `oncology` |
| `matching_strategy` | `risk_target` |
| `risk_targets` | `pancreatic_cancer`, `liver_cancer`, `lung_cancer`, `breast_cancer`, `colon_cancer` |
| snapshot 후보 | yes |

근거:

- 상품요약서와 약관은 비갱신형 인터넷 암보험임을 명시한다.
- 주계약은 암진단급여금, 여성유방암 진단급여금, 전립선암 진단급여금, 소액암 진단급여금을 구분한다.
- 일반 암 및 중증 갑상선암은 보험가입금액 100%, 여성유방암과 전립선암은 30%, 소액암은 10% 급부로 구분된다.
- 대장점막내암은 소액암으로 구분되므로 `colon_cancer` 매칭에는 별도 caveat를 붙인다.

---

## 4. Caveat

추천 카드와 상담 AI context에는 최소 아래 caveat를 포함한다.

1. 암 및 중증 갑상선암은 계약일을 포함해 90일이 지난 날의 다음 날부터 보장한다.
2. 계약일부터 1년 미만에 지급사유가 발생하면 암진단급여금, 여성유방암/전립선암 진단급여금, 소액암 진단급여금이 감액 지급된다.
3. 여성유방암과 전립선암은 일반 암진단급여금보다 낮은 별도 급부로 구분된다.
4. 기타피부암, 중증 이외 갑상선암, 제자리암, 경계성종양, 대장점막내암, 비침습방광암은 소액암 급부로 구분된다.
5. 해약환급금 미지급형은 보험료 납입기간 중 해지 시 해약환급금이 없다.
6. 보험다모아 조건별 보험료는 대표 비교 기준이며 실제 보험료는 가입금액, 납입기간, 인수심사 결과에 따라 달라질 수 있다.

---

## 5. Quote Row

운영 DB 기준 quote 4건은 모두 `needs_review` 상태이며, 다음 seed PR에서 `approved`로 승격할 수 있다.

| quote id | 조건 | 월 보험료 |
|---|---|---:|
| `quote_src_shinhan_life_sol_cancer_202601_age34_female_2589f537c6fc` | 34세 여성 | 6,750 KRW |
| `quote_src_shinhan_life_sol_cancer_202601_age34_male_0d807392cd7d` | 34세 남성 | 8,530 KRW |
| `quote_src_shinhan_life_sol_cancer_202601_age44_female_88d1cf1a2fad` | 44세 여성 | 7,320 KRW |
| `quote_src_shinhan_life_sol_cancer_202601_age44_male_dbd72b264aa2` | 44세 남성 | 10,030 KRW |

대표 보험료는 기존 cancer snapshot 기준과 맞춰 34세 여성 6,750 KRW로 둔다. `monthly_premium_usdc`는 다음 seed PR에서 고정 데모 환산율 `1 USDC = 1,350 KRW`를 적용하면 5.00 USDC다.

---

## 6. 다음 작업

1. `seed.ts`에 `src_shinhan_life_sol_cancer_202601` source approval을 추가한다.
2. quote 4건을 approval list에 추가한다.
3. `prod_shinhan_life_sol_cancer_no_refund_202601` snapshot 1건을 추가한다.
4. DB write 없이 seed/data/docs PR을 만든 뒤, 운영 DB 백업 후 apply PR로 분리한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 신한라이프 암보험 후보를 DNA 암 risk target과 연결할 수 있게 됐다 |
| Potential Impact | active 추천 상품이 9개에서 10개로 늘어날 다음 seed 후보가 생겼다 |
| Novelty | 암 급부 차이와 면책/감액 caveat를 추천 데이터 gate에 반영한다 |
| UX | 사용자는 여성유방암, 대장점막내암, 소액암 차이를 caveat로 확인할 수 있다 |
| Open-source | 공식 PDF hash, quote row, 매칭 판단을 재현 가능한 산출물로 남긴다 |
| Business Plan | 생명보험사 암보험 추천 카탈로그를 KDB/한화/교보 외 신한라이프로 확장한다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Remaining Source Candidate Triage](./56_REMAINING_SOURCE_CANDIDATE_TRIAGE_2026_05_31.md) - 남은 source 후보 처리 순서
- **QA_Validation**: [Hash-backed Matching Keyword Review](./08_HASH_BACKED_PRODUCT_MANUAL_REVIEW_2026_05_27.md) - 신한SOL암보험 초기 후보 판단
- **QA_Validation**: [Shinhan Standard Document Endpoint Reprobe](./45_SHINHAN_STANDARD_DOCUMENT_ENDPOINT_REPROBE_2026_05_31.md) - 표준형 blocker 근거
