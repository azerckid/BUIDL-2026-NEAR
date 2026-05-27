# [기술 명세] 보험상품 매칭 키워드 정리 정책
> Created: 2026-05-28 03:56
> Last Updated: 2026-05-28 03:56

- **레이어**: 03_Technical_Specs
- **상태**: Draft v1
- **범위**: DNA 질병 위험 결과와 한국 보험상품 보장 내용을 연결하기 위한 매칭 키워드 정리 기준
- **결론**: 이 프로젝트에서 말하는 "검수"는 보험상품의 외부 승인이나 품질 심사가 아니다. DB에 보험상품을 넣기 전에 DNA risk target과 매칭할 수 있도록 `coverage_category`, `risk_targets`, `matching_strategy`, `coverage_caveats_json`을 정리하는 내부 데이터 정규화 작업이다.

---

## 1. 목적

서비스의 핵심 기능은 보험상품을 많이 보여주는 것이 아니라, DNA 검사 결과에서 나온 질병 위험과 보험상품의 보장 내용을 정확히 연결하는 것이다.

따라서 보험상품이 실제 판매 중이라는 사실만으로는 추천 엔진에 바로 넣지 않는다. 먼저 상품명, 보장명, 약관, 상품요약서, 사업방법서에서 질병/담보 키워드를 추출하고, DNA 분석 결과의 risk key와 연결 가능한 형태로 정리한다.

```text
DNA 분석 결과
-> 질병 risk key 추출
-> 보험상품 보장 키워드와 비교
-> coverage_category, risk_targets, matching_strategy 기준으로 추천
```

---

## 2. 용어 정리

| 기존 표현 | 앞으로 사용할 표현 | 의미 |
|---|---|---|
| 수동 검수 | 매칭 키워드 정리 | 상품 원문에서 질병/담보 키워드를 추출해 DNA risk target과 연결하는 작업 |
| 승인 | 추천 매칭 가능 상태 | 외부 허가가 아니라, 추천 엔진이 읽어도 되는 내부 데이터 상태 |
| 검수 승인된 상품 | 질병-보장 매핑 완료 상품 | `coverage_category`, `risk_targets`, `matching_strategy`, caveat가 정리된 상품 |
| 추천 가능 상품 | 매칭 키워드 정리 완료 상품 | 사용자 추천 카드에 노출 가능한 상품 snapshot |
| `needs_review` | 매칭 키워드 정리 필요 | 수집은 되었지만 DNA risk target 매핑이 아직 불완전한 상태 |
| `approved` | 매칭 키워드 정리 완료 | 내부적으로 추천 매칭에 사용할 수 있는 상태 |

`approved`라는 DB enum 이름은 외부 기관의 승인이나 보험사 승인을 의미하지 않는다. 내부 추천 매칭 데이터가 준비됐다는 상태값이다.

---

## 3. 핵심 데이터 흐름

```text
1. 공식 온라인 출처에서 보험상품 수집
2. insurance_product_sources에 원천 row 저장
3. 약관/요약서/PDF/API 응답 hash를 insurance_source_documents에 저장
4. 상품명/보장명/약관에서 질병 키워드 추출
5. DNA risk target 사전에 맞게 키워드 정규화
6. coverage_category, risk_targets, matching_strategy, caveat 작성
7. 매칭 키워드 정리 완료 상품만 insurance_products snapshot으로 발행
8. matchProducts가 DNA risk key와 risk_targets를 결정론적으로 매칭
```

이 흐름에서 사람 또는 LLM-assisted reviewer가 확인하는 것은 "이 보험이 좋은가"가 아니다. 확인 대상은 "이 상품이 어떤 질병/담보와 연결되는가"이다.

---

## 4. 매칭 필드 정의

| 필드 | 역할 | 예시 |
|---|---|---|
| `coverage_category` | 상품의 보장 대분류 | `oncology`, `cardiovascular`, `metabolic`, `neurological`, `medical_expense` |
| `risk_targets` | DNA 분석 결과와 교집합을 계산할 질병 key | `colon_cancer`, `lung_cancer`, `type2_diabetes` |
| `matching_strategy` | 추천 방식 | `risk_target`, `baseline`, `manual` |
| `coverage_details_json` | 급부/담보/한도 구조 | 일반암, 유사암, 특정암, 입원, 수술 등 |
| `coverage_caveats_json` | 추천 표시 시 함께 보여야 할 제한사항 | 면책기간, 감액기간, 갱신형, 보장 제외 |
| `premium_basis` | 보험료가 어떤 조건에서 나온 값인지 설명 | 보험다모아 34세 여성 월납 기준 등 |

---

## 5. 매칭 분류 예시

| 원문 키워드 | 매칭 분류 |
|---|---|
| 암, 일반암, 특정암, 대장암, 폐암, 유방암 | `coverage_category=oncology`, 관련 암 `risk_targets` |
| 심근경색, 뇌졸중, 허혈성 심장질환, 뇌혈관질환 | `coverage_category=cardiovascular` |
| 당뇨, 당뇨합병증, 고지혈증 | `coverage_category=metabolic` |
| 치매, 알츠하이머, 파킨슨, 장기요양 | `coverage_category=neurological` 또는 향후 `long_term_care` 후보 |
| 실손의료비, 질병입원, 질병통원 | `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]` |
| 입원/수술 중심 건강보험 | 현 enum에 없으면 `manual` 또는 category 확장 후보 |

실손의료보험은 질병 치료비를 폭넓게 보장하지만 특정 DNA risk key와 직접 연결되는 상품은 아니다. 따라서 특정 질병 risk target에 억지로 연결하지 않고 baseline 보장으로 분리한다.

---

## 6. 추천 매칭 가능 상태 기준

상품 row가 `insurance_products`로 발행되려면 최소한 아래 조건을 만족해야 한다.

| 조건 | 이유 |
|---|---|
| 공식 온라인 출처 URL 존재 | 사용자가 출처를 확인할 수 있어야 함 |
| 상품명과 보험사 정규화 완료 | 중복/오매칭 방지 |
| `coverage_category` 결정 | 대분류 추천 섹션 결정 |
| `matching_strategy` 결정 | 유전자 위험 직접 매칭인지 baseline인지 구분 |
| `risk_targets` 정리 | DNA risk key와 결정론적 교집합 계산 |
| 주요 caveat 정리 | 면책, 감액, 갱신, 특정 담보 제한을 표시 |
| 보험료 기준 분리 | 대표 보험료와 조건별 quote를 혼동하지 않음 |

이 기준은 보험상품의 상업적 우열을 평가하지 않는다. 오직 추천 엔진이 틀린 질병 연결을 하지 않도록 데이터 품질을 맞추는 기준이다.

---

## 7. 현재 적용 상태

2026-05-28 기준 보험다모아 P0 샘플은 56개이며, 공식 문서 hash와 매칭 키워드 정리 샘플은 7개다.

| 단계 | 개수 | 의미 |
|---|---:|---|
| 보험다모아 P0 샘플 | 56개 | 암보험, 실손의료보험, 유병력자실손, 질병보험, 간병/치매보험 원천 후보 |
| 공식 상품 URL 보유 | 47개 | 상품 페이지 후보 있음 |
| 공식 문서 hash 확보 | 7개 | 약관/요약서/사업방법서 hash 확인 |
| 매칭 키워드 정리 샘플 | 7개 | PR #7 source-aware seed 기준 |
| 추천 매칭 가능 상품 | 0개 | 아직 active demo 상품만 사용자 추천 흐름에 사용 |

다음 단계는 나머지 49개 후보의 공식 문서 hash와 매칭 키워드를 정리하고, 협회/보험사 공시실까지 넓혀 질병 관련 보험상품 universe를 확장하는 것이다.

---

## 8. QA 체크리스트

보험상품을 추천 snapshot으로 발행하기 전 아래 질문에 답한다.

1. 이 상품은 어떤 질병/담보를 보장하는가?
2. DNA risk key와 직접 연결되는가, 아니면 baseline 보장인가?
3. `risk_targets`가 상품 보장 범위를 과장하지 않는가?
4. 특정암/소액암/유사암처럼 급부 차이가 caveat에 기록됐는가?
5. 실손의료보험을 특정 질병 위험 추천으로 오해하게 만들지 않았는가?
6. 보험료가 대표 비교 조건인지, 사용자 조건별 quote인지 구분됐는가?
7. 출처 URL, 문서 hash, 확인일이 남아 있는가?

---

## 9. 365 Rubric 영향

| Rubric | 영향 |
|---|---|
| Functionality | DNA risk key와 보험상품 보장 키워드의 결정론적 매칭 정확도를 높인다 |
| Potential Impact | 한국 질병 보험상품 전체 universe로 확장할 때 데이터 품질 기준이 된다 |
| Novelty | 유전자 위험 분석과 공식 보험 공시자료를 직접 연결하는 구조를 명확히 한다 |
| UX | 사용자는 추천 이유, 보장 근거, caveat를 함께 확인해 오해를 줄일 수 있다 |
| Open-source | 보험상품 수집 프로젝트가 재사용할 수 있는 matching taxonomy 기준을 제공한다 |
| Business Plan | 잘못된 추천 리스크를 줄여 보험 비교/중개형 서비스로 확장 가능한 기반을 만든다 |

---

## 10. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](./01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Catalog Schema Extension](./02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - source table과 recommendation snapshot 스키마
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 적용 트랙
- **Logic_Progress**: [AI Matching Pipeline](../04_Logic_Progress/AI_MATCHING_PIPELINE.md) - DNA 분석 결과와 DB 상품 추천의 경계
- **QA_Validation**: [Source-aware Seed Policy QA](../05_QA_Validation/10_SOURCE_AWARE_SEED_POLICY_2026_05_28.md) - PR #7 seed 후보 반영 검증
