# [QA] 삼성생명 입원 건강보험 Category 정책 결정
> Created: 2026-06-01 15:05
> Last Updated: 2026-06-01 15:05

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: `src_samsung_life_hospital_health_202601` source의 추천 발행 가능 여부, `coverage_category` 정책, source catalog 처리 방식
- **결론**: 삼성생명 인터넷 입원 건강보험은 공식 통합약관 hash와 보험다모아 대표 보험료는 보존하지만, 현재 추천 엔진의 `coverage_category` enum과 DNA risk target 매칭 범위에 맞지 않는다. 이번 PR에서는 schema를 확장하지 않고 `review_status=rejected` source catalog exclusion으로 종결 처리한다. active 추천 상품 수와 approved quote 수는 변하지 않는다.

---

## 1. 입력

| 항목 | 값 |
|---|---|
| 대상 source | `src_samsung_life_hospital_health_202601` |
| 상품명 | `삼성 인터넷 입원 건강보험(2601)(무배당,무해약환급금형)` |
| 보험사 | 삼성생명 |
| 상품군 | 입원 건강보험 |
| e-insmarket code | `L03C001000015` |
| 공식 URL | `https://direct.samsunglife.com/damoa.eds?cid=di:insmarket:damoa:insmarket:240513` |
| 기존 근거 문서 | `doc_samsung_life_hospital_health_terms_202601` |
| 기존 대표 보험료 | 8,650 KRW |
| 신규 검수 JSON | `data/insurance/latest_samsung_life_hospital_health_policy_review.json` |
| 신규 검수 CSV | `data/insurance/latest_samsung_life_hospital_health_policy_review.csv` |

---

## 2. 운영 DB 사전 상태

동양생명 DB apply 후 운영 DB에서 남은 non-approved source를 읽기 전용으로 확인했다.

| 항목 | 값 |
|---|---|
| current review_status | `needs_review` |
| sale_status | `unknown` |
| source document count | 1 |
| quote count | 0 |
| approved quote count | 0 |
| product snapshot count | 0 |

---

## 3. 정책 판단

현재 `insurance_products.coverage_category`는 아래 값만 지원한다.

```text
oncology
cardiovascular
metabolic
neurological
medical_expense
```

삼성생명 인터넷 입원 건강보험은 암/심혈관/대사/신경계 같은 DNA risk target 상품이 아니고, 실손의료비처럼 `medical_expense` baseline으로 직접 분류하기도 어렵다. 입원 일당형 또는 일반 건강보험형 상품에 가깝다.

따라서 현재 선택지는 두 가지다.

| 선택지 | 판단 |
|---|---|
| 기존 enum에 억지로 넣어 active 추천 발행 | 거부. 매칭 정밀도를 과장한다 |
| `hospitalization` 또는 `general_health` 카테고리 추가 | 향후 정책 후보. schema, i18n, dashboard advisory, match ordering을 함께 바꿔야 한다 |
| 현 단계 source catalog 보존 + 추천 제외 | 채택 |

---

## 4. Seed 변경

`seed.ts`에 `SOURCE_CATALOG_EXCLUSION_UPDATES`를 추가한다.

| 필드 | 적용값 |
|---|---|
| source id | `src_samsung_life_hospital_health_202601` |
| review_status | `rejected` |
| service treatment | source catalog only |
| source document 추가 | 0 |
| quote approval 추가 | 0 |
| insurance_products snapshot 추가 | 0 |
| active 추천 상품 수 변화 | 0 |

`rejected`는 상품 자체가 나쁘거나 판매 불가라는 뜻이 아니다. 현재 추천 엔진의 매칭 범위 밖이라 사용자 추천에 노출하지 않는 내부 데이터 상태다.

---

## 5. 안전성

- 이번 PR은 DB write를 하지 않는다.
- 기존 공식 문서 hash row는 유지한다.
- active `insurance_products` snapshot을 추가하지 않는다.
- 상담 AI 상품 컨텍스트에도 이 상품은 들어가지 않는다.
- 향후 `hospitalization` 또는 `general_health` 카테고리를 추가하려면 schema, Zod, i18n, dashboard advisory, match priority, QA를 별도 PR로 설계해야 한다.

---

## 6. 다음 작업

1. 이 seed 정책 PR을 merge한다.
2. 운영 DB 백업 후 seed apply PR로 `src_samsung_life_hospital_health_202601.review_status=rejected`를 반영한다.
3. 남은 raw blocker 2건은 계속 처리한다.
   - `src_hanwha_general_direct_medical_202605`: target `갱신형 V` 공식 문서 endpoint 발견 전까지 blocker.
   - `src_shinhan_life_sol_cancer_standard_202605`: 일반형 공식 문서 endpoint 발견 전까지 blocker.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 현재 enum 밖 상품을 잘못된 추천 카테고리에 넣지 않도록 차단했다 |
| Potential Impact | 추천 정확성을 유지해 실제 서비스 신뢰도를 보호한다 |
| Novelty | source catalog 보존과 active recommendation 발행을 분리한다 |
| UX | 사용자가 DNA risk와 무관한 상품을 정밀 추천으로 오해하지 않게 한다 |
| Open-source | 카테고리 확장 전 source exclusion 패턴을 문서화했다 |
| Business Plan | 신뢰할 수 없는 추천 확대보다 근거 있는 상품만 노출하는 원칙을 유지한다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - 현재 coverage category enum과 확장 후보
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Hash-backed Product Manual Review](./08_HASH_BACKED_PRODUCT_MANUAL_REVIEW_2026_05_27.md) - 삼성생명 입원 건강보험 초기 schema extension 판단
- **QA_Validation**: [Remaining Source Candidate Triage](./56_REMAINING_SOURCE_CANDIDATE_TRIAGE_2026_05_31.md) - 남은 source 처리 순서
- **Data**: [Samsung Life Hospital Health Policy JSON](../../data/insurance/latest_samsung_life_hospital_health_policy_review.json) - 정책 결정 구조화 결과
- **Data**: [Samsung Life Hospital Health Policy CSV](../../data/insurance/latest_samsung_life_hospital_health_policy_review.csv) - 정책 결정 요약
