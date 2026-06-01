# [QA] 한화손보 실손의료보험 Blocker 종결 정책
> Created: 2026-06-01 15:40
> Last Updated: 2026-06-01 15:40

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: `src_hanwha_general_direct_medical_202605` source의 raw blocker 종결 여부, mismatched 공식 문서 처리, quote 4건 상태 정책
- **결론**: 한화손보 실손의료보험 target source는 `갱신형 V`이나 확보된 공식 페이지/PDF는 `갱신형 III` 계열이다. 실손의료보험 세대/개정 mismatch는 보장 구조와 caveat를 바꿀 수 있으므로 추천 snapshot을 발행하지 않는다. 이번 PR에서는 source를 `rejected`로 내리고 관련 quote 4건도 `rejected`로 내리는 seed 정책을 추가한다.

---

## 1. 입력

| 항목 | 값 |
|---|---|
| 대상 source | `src_hanwha_general_direct_medical_202605` |
| 상품명 | `한화다이렉트실손의료보험(갱신형)Ⅴ 무배당` |
| 보험사 | 한화손보 |
| 상품군 | 실손의료보험 |
| e-insmarket code | `N02G004000001G` |
| 현재 review_status | `raw` |
| 현재 source document | 0건 |
| 현재 quote row | 4건, `needs_review` |
| 신규 검수 JSON | `data/insurance/latest_hanwha_general_medical_blocker_policy.json` |
| 신규 검수 CSV | `data/insurance/latest_hanwha_general_medical_blocker_policy.csv` |

---

## 2. 근거

선행 probe는 한화손보 공식 후보 페이지와 PDF를 확인했지만 target source와 variant가 맞지 않았다.

| 항목 | 값 |
|---|---|
| 선행 검증 | `docs/05_QA_Validation/89_HANWHA_GENERAL_MEDICAL_DISCLOSURE_PROBE_2026_06_01.md` |
| 후보 공식 페이지 | `https://mall.hwgeneralins.com/ins/ltr/meditm_features_01.do` |
| 후보 PDF | `https://mall.hwgeneralins.com/upload/product/LA02039001.pdf` |
| 후보 PDF SHA-256 | `10ee12c4218099f34df16f195ad0d5eb968750ab2b35fa56b6f93aaeb24f497a` |
| 후보 페이지 상품명 | `한화실손의료보험갱신형Ⅲ_TM` |
| 후보 PDF 상품명 | `무배당 한화실손의료보험(갱신형)Ⅲ` |
| target source 상품명 | `한화다이렉트실손의료보험(갱신형)Ⅴ 무배당` |
| variant match | false |

---

## 3. 정책 판단

실손의료보험은 세대와 개정 버전이 보장 범위, 자기부담금, 갱신/재가입 caveat에 영향을 준다. 따라서 `갱신형 III` 문서를 `갱신형 V` source의 공식 근거로 연결하면 사용자에게 잘못된 보장 설명을 제공할 수 있다.

| 선택지 | 판단 |
|---|---|
| 확보된 `갱신형 III` PDF를 source document로 seed | 거부 |
| 보험다모아 quote 4건을 approved로 승격 | 거부 |
| active `insurance_products` baseline snapshot 발행 | 거부 |
| source catalog에 blocker 근거를 남기고 `rejected` 처리 | 채택 |

`rejected`는 상품 자체가 판매 불가라는 뜻이 아니다. 현재 확보한 공식 문서가 target source와 일치하지 않으므로 사용자 추천에 노출하지 않는 내부 데이터 상태다.

---

## 4. Seed 변경

`seed.ts`의 `SOURCE_CATALOG_EXCLUSION_UPDATES`에 한화손보 실손 source를 추가한다.

| 필드 | 적용값 |
|---|---|
| source id | `src_hanwha_general_direct_medical_202605` |
| review_status | `rejected` |
| service treatment | source catalog only |
| source document 추가 | 0 |
| quote approval 추가 | 0 |
| quote rejection 추가 | 4 |
| insurance_products snapshot 추가 | 0 |
| active 추천 상품 수 변화 | 0 |

Reject 대상 quote:

| condition | quote id |
|---|---|
| age34 female | `quote_src_hanwha_general_direct_medical_202605_age34_female_b141dc7c5700` |
| age34 male | `quote_src_hanwha_general_direct_medical_202605_age34_male_60456bed3452` |
| age44 female | `quote_src_hanwha_general_direct_medical_202605_age44_female_58dcc145a6b7` |
| age44 male | `quote_src_hanwha_general_direct_medical_202605_age44_male_26615bdcb076` |

---

## 5. 안전성

- 이번 PR은 DB write를 하지 않는다.
- mismatched `갱신형 III` PDF hash는 source document로 seed하지 않는다.
- active `insurance_products` snapshot을 추가하지 않는다.
- 상담 AI 상품 컨텍스트에도 이 source는 들어가지 않는다.
- 갱신형 V 공식 문서 endpoint를 나중에 확보하면 별도 PR로 blocker를 재검토한다.

---

## 6. 다음 작업

1. 이 seed 정책 PR을 merge한다.
2. 운영 DB 백업 후 seed apply PR로 source와 quote 4건의 `rejected` 상태를 반영한다.
3. 남은 raw blocker는 `src_shinhan_life_sol_cancer_standard_202605` 1건이다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 문서 variant가 다른 실손보험을 추천 snapshot에서 차단한다 |
| Potential Impact | 실손 세대/개정 오연결로 인한 사용자 신뢰 하락을 방지한다 |
| Novelty | quote-only source에 대해 공식 문서 hash뿐 아니라 version gate를 적용한다 |
| UX | 사용자가 과거 약관 기반의 잘못된 실손 추천을 받지 않는다 |
| Open-source | 실패한 official document match를 재현 가능한 정책/seed 패턴으로 남긴다 |
| Business Plan | 보험상품 추천의 근거 품질을 지키는 운영 기준을 강화한다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Hanwha General Medical Disclosure Probe](./89_HANWHA_GENERAL_MEDICAL_DISCLOSURE_PROBE_2026_06_01.md) - 공식 후보 문서 variant mismatch 검증
- **QA_Validation**: [Samsung Life Hospital Health DB Apply](./95_SAMSUNG_LIFE_HOSPITAL_HEALTH_DB_APPLY_2026_06_01.md) - 직전 source catalog exclusion DB 적용 검증
- **Data**: [Hanwha General Medical Blocker Policy JSON](../../data/insurance/latest_hanwha_general_medical_blocker_policy.json) - blocker 종결 정책 구조화 결과
- **Data**: [Hanwha General Medical Blocker Policy CSV](../../data/insurance/latest_hanwha_general_medical_blocker_policy.csv) - blocker 종결 정책 요약
