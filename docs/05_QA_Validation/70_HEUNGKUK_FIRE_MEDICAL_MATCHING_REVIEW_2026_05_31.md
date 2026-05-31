# [QA] 흥국화재 실손의료보험 Baseline 매칭 검수
> Created: 2026-05-31 22:34
> Last Updated: 2026-05-31 22:34

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 흥국화재 `src_heungkuk_fire_direct_medical_202605`의 `coverage_category`, `matching_strategy`, `risk_targets`, caveat, source document citation 정책, snapshot 준비도 검수
- **결론**: 흥국화재 실손의료보험은 공식 다이렉트 화면의 약관 다운로드 흐름에서 공식 약관 hash 1건과 보험다모아 조건별 숫자 quote 4건이 확인됐다. `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]` 추천 후보로 정리할 수 있다. 이번 작업은 DB write와 `seed.ts` 변경을 하지 않는다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 입력 seed | `src/lib/db/seed.ts` |
| 입력 adapter probe | `data/insurance/latest_heungkuk_fire_disclosure_adapter_probe.json` |
| 입력 quote probe | `data/insurance/latest_premium_quote_probe.json` |
| 신규 검수 JSON | `data/insurance/latest_heungkuk_fire_medical_matching_review.json` |
| 신규 검수 CSV | `data/insurance/latest_heungkuk_fire_medical_matching_review.csv` |
| DB write | 0 |
| `seed.ts` 변경 | 0 |
| 추천 snapshot 변경 | 0 |

---

## 2. 요약

| 항목 | 결과 |
|---|---:|
| 검수 source | 1 |
| baseline ready source | 1 |
| source document seed 후보 | 1 |
| quote row 확인 | 4 |
| 숫자 KRW quote row | 4 |
| 이번 PR 추천 노출 변경 | 0 |

---

## 3. 매칭 정책

실손의료보험은 특정 DNA risk key와 직접 연결하지 않는다. 흥국화재 실손 source도 기존 DB손보, KB손보, 현대해상, 삼성화재, 농협손보, 메리츠화재 실손 baseline 상품과 동일하게 기본 의료비 방어 섹션에서만 표시한다.

| 필드 | 값 |
|---|---|
| `coverage_category` | `medical_expense` |
| `matching_strategy` | `baseline` |
| `risk_targets` | `[]` |
| 추천 위치 | 위험 점수 랭킹이 아니라 기본 의료비 방어 섹션 |

---

## 4. Source 판정

| 항목 | 값 |
|---|---|
| Provider | 흥국화재 |
| Source | `src_heungkuk_fire_direct_medical_202605` |
| Product code | `N05G004000001G` |
| 보험다모아 상품명 | `(무)흥Good 다이렉트 실손의료보험(26.05)` |
| 공식 상품 페이지 | `https://direct.heungkukfire.co.kr/?ccid=0606001007#/CMMOBDPRM4001` |
| 공식 약관 파일명 | `eYou_mdca_term_next.pdf` |
| 문서 근거 | 약관 1건, match 1.0 |
| Quote | 4/4 numeric |
| 판정 | source document seed 추가 후 baseline snapshot seed 후보 |

공식 약관 hash:

| 항목 | 값 |
|---|---|
| document candidate | `doc_heungkuk_fire_direct_medical_terms_202605` |
| document_type | `terms` |
| sha256 | `956b60ab796fec97397fc087b799ed487b47a9773fb780fe7ee529c131389756` |
| source_url | `https://direct.heungkukfire.co.kr/CM_COMM_FileDownload_ACT.do?_SERVICE_=CM_COMM_FileDownload_ACT&_TYPE_=M&_PRODTYPE_=4&scrId=CMMOBDPRM4001&fileType=4&downFileName=eYou_mdca_term_next.pdf` |
| content_length_bytes | `5125066` |

---

## 5. Caveat 정리

| Caveat | 추천 UI/상담 AI 반영 |
|---|---|
| baseline 상품 | 유전자 위험 특화 추천이 아니라 기본 의료비 방어로 표시 |
| 개인 견적 아님 | 보험다모아 quote는 공개 비교 조건의 예시 보험료이며 개인별 인수 심사 견적이 아님 |
| 실손 제한 | 자기부담금, 급여/비급여, 보장 한도, 갱신 조건이 적용됨 |
| variant 주의 | 공식 약관 파일명이 `eYou_mdca_term_next.pdf`라서 후속 seed/apply 전 hash 신선도 확인 필요 |
| 문서 범위 | 대표 문서는 약관 1건이며 상품요약서/사업방법서 hash는 아직 없음 |

---

## 6. Quote 상태

| 조건 | 보험료 | 예상 quote id |
|---|---:|---|
| 34세 남성 | 7,995 KRW | `quote_src_heungkuk_fire_direct_medical_202605_age34_male_60456bed3452` |
| 34세 여성 | 8,939 KRW | `quote_src_heungkuk_fire_direct_medical_202605_age34_female_b141dc7c5700` |
| 44세 남성 | 10,497 KRW | `quote_src_heungkuk_fire_direct_medical_202605_age44_male_26615bdcb076` |
| 44세 여성 | 13,029 KRW | `quote_src_heungkuk_fire_direct_medical_202605_age44_female_58dcc145a6b7` |

이번 PR은 quote row를 승인하지 않는다. 다음 seed PR에서 운영 DB 실제 quote id를 읽기 전용으로 확인한 뒤 4건을 `approved`로 승격한다.

---

## 7. Snapshot 준비 판단

| 항목 | 판단 |
|---|---|
| source approval | 가능. 다만 `next` suffix hash refresh caveat 유지 필요 |
| source document seed | `doc_heungkuk_fire_direct_medical_terms_202605` 1건 추가 필요 |
| quote approval | 4건 numeric quote가 있어 가능 |
| product snapshot | baseline `insurance_products` 1건 추가 후보 |
| 운영 노출 | seed/apply 전까지 변경 없음 |

실손 baseline snapshot은 암보험처럼 DNA risk target 점수와 직접 경쟁하지 않는다. 다음 seed PR은 `matching_strategy=baseline`, `risk_targets=[]`, `coverage_category=medical_expense`를 반드시 유지해야 한다.

---

## 8. 안전성

- 이번 작업은 data/docs 산출물만 추가한다.
- `seed.ts`, Drizzle schema, Turso DB, `.env.local`은 수정하지 않았다.
- active `insurance_products` 추천 snapshot은 변경하지 않았다.
- 흥국화재 source는 아직 `raw`이며 추천 UI에 노출되지 않는다.
- 공식 약관명 `next` suffix caveat를 숨기지 않고 후속 seed PR의 필수 확인 항목으로 남긴다.

---

## 9. 다음 작업

1. `SOURCE_AWARE_DOCUMENTS`에 `doc_heungkuk_fire_direct_medical_terms_202605`를 추가한다.
2. 흥국화재 source를 `approved`로 승격하고 quote 4건을 `approved`로 바꾸는 seed PR을 만든다.
3. baseline `insurance_products` snapshot 1건을 추가하되, 대표 보험료는 기존 실손 baseline 정책처럼 `age34_female` 조건을 사용한다.
4. 운영 DB 백업 후 seed apply PR로 source-backed active 추천 상품을 12건에서 13건으로 확대한다.
5. 이어서 미래에셋생명, 한화손보 adapter를 순차 보강한다.

---

## 10. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 흥국화재 실손 source를 baseline 추천 후보로 정규화했다 |
| Potential Impact | 실제 source-backed 실손 baseline 추천 후보를 1개 더 확대할 준비가 됐다 |
| Novelty | SPA downloadFile endpoint에서 얻은 공식 약관 hash를 DNA 추천 baseline 정책과 연결했다 |
| UX | 사용자가 실손을 특정 유전자 질병 추천으로 오해하지 않도록 baseline caveat를 유지한다 |
| Open-source | 같은 검수 형식을 다른 손보사 실손 source에도 반복 적용할 수 있다 |
| Business Plan | 실제 판매 보험상품 커버리지를 넓히되 variant freshness 리스크를 seed 전 단계에서 차단한다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 매칭 키워드와 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Heungkuk Fire Disclosure Adapter Probe](./69_HEUNGKUK_FIRE_DISCLOSURE_ADAPTER_PROBE_2026_05_31.md) - 공식 약관 hash 확보 근거
- **QA_Validation**: [Medical Baseline Matching Review](./46_MEDICAL_BASELINE_MATCHING_REVIEW_2026_05_31.md) - 실손 baseline 공통 매칭 정책
- **QA_Validation**: [Meritz Fire Medical Matching Review](./66_MERITZ_FIRE_MEDICAL_MATCHING_REVIEW_2026_05_31.md) - 직전 실손 baseline 매칭 검수 패턴
- **Data**: [Heungkuk Fire Medical Matching Review JSON](../../data/insurance/latest_heungkuk_fire_medical_matching_review.json) - 구조화 검수 결과
- **Data**: [Heungkuk Fire Medical Matching Review CSV](../../data/insurance/latest_heungkuk_fire_medical_matching_review.csv) - 검수 요약
