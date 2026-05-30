# [기술 명세] 보험상품 매칭 키워드 정리 정책
> Created: 2026-05-28 03:56
> Last Updated: 2026-05-30 15:46

- **레이어**: 03_Technical_Specs
- **상태**: Draft v1.5
- **범위**: DNA 질병 위험 결과와 한국 보험상품 보장 내용을 연결하기 위한 매칭 키워드 정리 기준, 추천 snapshot 발행 기준
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

## 7. 추천 snapshot 발행 체크리스트

`insurance_product_sources`와 `insurance_source_documents`는 원천 증거를 보존하는 테이블이다. 사용자가 실제로 보는 추천 카드는 `insurance_products` snapshot에서만 나온다. 따라서 원천 row가 존재한다는 사실과 추천 노출 가능 상태는 분리해서 판단한다.

추천 snapshot 발행 PR은 최소한 아래 체크리스트를 통과해야 한다.

### 7-1. 원천 근거 체크

| 항목 | 발행 기준 |
|---|---|
| source row | `insurance_product_sources.id`가 존재하고 보험사, 상품명, 원문 URL이 정규화되어야 한다 |
| source 상태 | `insurance_product_sources.review_status=approved`로 승격할 근거가 PR에 포함되어야 한다 |
| 대표 문서 | `primary_source_document_id`로 연결할 약관, 상품요약서, 사업방법서 중 최소 1개가 있어야 한다 |
| 문서 hash | `file_hash_sha256`은 64자 SHA-256이어야 하며, variant가 다른 문서를 재사용하면 안 된다 |
| 확인일 | `source_checked_at`과 원천 문서의 `retrieved_at` 기준일을 기록해야 한다 |

### 7-2. 매칭 필드 체크

| 항목 | 발행 기준 |
|---|---|
| `coverage_category` | 현재 enum 중 하나로 결정한다. 맞지 않으면 snapshot 발행 전에 category 확장 PR을 먼저 낸다 |
| `matching_strategy=risk_target` | `risk_targets`는 1개 이상이어야 하며, 실제 보장명과 DNA risk key가 과장 없이 연결되어야 한다 |
| `matching_strategy=baseline` | 실손의료보험처럼 특정 DNA risk key에 직접 연결하지 않는 상품만 사용하며, `risk_targets=[]`를 유지한다 |
| `matching_strategy=manual` | enum 확장 전 임시 상태로만 사용하고, 사용자 추천 노출은 보류한다 |
| `coverage_details_json` | 주요 담보, 보장금액, 급부 차이를 카드/상세 화면이 읽을 수 있게 구조화한다 |
| `coverage_caveats_json` | 면책기간, 감액기간, 갱신형, 소액암/유사암 급부 차이, 가입 조건을 반드시 포함한다 |

### 7-3. 보험료 필드 체크

| 항목 | 발행 기준 |
|---|---|
| 대표 보험료 | `monthly_premium_krw`와 `premium_basis`는 같은 조건을 가리켜야 한다 |
| 조건별 보험료 | 나이, 성별, 납입기간별 가격은 `insurance_premium_quotes`에 남기고, 승인 전에는 추천 카드의 확정 가격처럼 표시하지 않는다 |
| quote 상태 | 조건별 보험료를 UI에 노출하려면 해당 quote row의 `review_status=approved` 근거가 있어야 한다 |
| USDC 금액 | `monthly_premium_usdc`는 checkout/demo 결제 경로 때문에 필수다. KRW-only 상품은 환산 기준과 시각을 PR에 남긴다 |

### 7-4. snapshot row 체크

| 항목 | 발행 기준 |
|---|---|
| `product_source_id` | 원천 source row를 FK로 연결한다 |
| `primary_source_document_id` | 추천 판단의 대표 근거 문서를 FK로 연결한다 |
| `catalog_status` | 최초 발행은 `approved`, 문서 hash 변경 또는 매칭 의심 시 `needs_review`, 판매 중단 시 `archived`로 둔다 |
| `is_active` | 모든 체크가 끝난 상품만 `1`로 둔다. 준비 중 상품은 source table에만 남긴다 |
| 운영 추천 조건 | 서비스 추천 경로는 `is_active=1`, `catalog_status=approved`, `product_source_id IS NOT NULL` 상품만 읽는다 |
| UI 문구 | 추천 이유, 출처, 확인일, caveat, 보험료 기준이 카드 또는 상세 화면에서 확인 가능해야 한다 |

### 7-5. 발행 PR 필수 검증

1. `insurance_product_sources.review_status` 변경 수와 대상 source id를 명시한다.
2. 신규 또는 갱신되는 `insurance_products` row 수를 명시한다.
3. `risk_targets`가 현재 DNA risk key 사전에 존재하는지 확인한다.
4. `baseline` 상품이 위험 점수 랭킹에 섞이지 않는지 확인한다.
5. 대표 보험료와 조건별 quote를 UI에서 구분해 표시하는지 확인한다.
6. legacy demo 상품이 운영 추천, 대시보드, 카트 경로에 노출되지 않는지 확인한다.
7. 문서 hash 변경, 판매 중단, 상품명 variant 발견 시 rollback 또는 `catalog_status=needs_review` 처리 방안을 PR에 남긴다.

첫 실제 상품 발행 PR은 KDB, 한화생명, 교보라이프플래닛처럼 공식 문서 hash와 상품 variant가 상대적으로 명확한 후보 중에서 시작한다. 신한라이프 표준형처럼 일반형 문서 endpoint가 아직 확보되지 않은 source는 발행 대상에서 제외한다.

---

## 8. 현재 적용 상태

2026-05-30 기준 보험다모아 P0 샘플은 56개이며, source catalog에는 22개 원천 후보와 22개 공식 문서 row가 들어 있다. quote matrix에서 확인된 84개 조건별 보험료 row 중 첫 snapshot 대상 12건은 `approved`, 나머지 72건은 `needs_review` 상태다. 실제 source 후보 중 `insurance_products` 추천 snapshot으로 발행할 첫 상품 3개는 운영 DB에 적용됐다.

2026-05-30 14:41 KST 기준 KDB생명, 한화생명, 교보라이프플래닛 암보험 후보 5개 source는 매칭 키워드와 caveat 정리를 통과했다. 다만 한화생명 2개 source는 quote row가 모두 `0원`이라 active 추천 snapshot에서는 보류한다. 첫 추천 snapshot seed PR의 우선 후보는 KDB생명 1개와 교보라이프플래닛 2개 source다. 검증은 `../05_QA_Validation/30_MATCHING_KEYWORD_CAVEAT_REVIEW_2026_05_30.md`에 둔다.

2026-05-30 16:30 KST 기준 `seed.ts`는 위 3개 우선 후보를 첫 source-backed active recommendation snapshot으로 발행할 준비를 마쳤다. seed 적용 시 source 3건은 `approved`, quote row 12건은 `approved`, 신규 `insurance_products` 3건은 `catalog_status=approved`, `is_active=1`로 들어간다. 대표 보험료는 보험다모아 `age34_female` 조건이며, `monthly_premium_usdc`는 고정 데모 환산율 `1 USDC = 1,350 KRW`로 계산한다. 검증은 `../05_QA_Validation/31_FIRST_RECOMMENDATION_SNAPSHOT_SEED_2026_05_30.md`에 둔다.

2026-05-30 15:31 KST 기준 위 seed를 운영 Turso DB에 백업 후 적용했다. 적용 후 `insurance_products=8`, source-backed active 상품 3건, `insurance_product_sources.review_status` 분포 `approved=3`, `needs_review=7`, `raw=12`, `insurance_premium_quotes.review_status` 분포 `approved=12`, `needs_review=72`를 확인했다. 검증은 `../05_QA_Validation/32_FIRST_RECOMMENDATION_SNAPSHOT_DB_APPLY_2026_05_30.md`에 둔다.

2026-05-30 15:46 KST 기준 legacy demo 상품은 운영 추천 경로에서 제거한다. 추천 엔진, 대시보드, 카트는 source-backed active 상품만 읽으며, 다음 seed 적용 시 `prod_001`~`prod_005`는 `catalog_status=archived`, `is_active=0`으로 내려간다. 이번 단계의 DB 적용은 백업 후 별도 apply PR로 진행한다. 검증은 `../05_QA_Validation/33_DEMO_INSURANCE_PRODUCTS_RETIREMENT_2026_05_30.md`에 둔다.

| 단계 | 개수 | 의미 |
|---|---:|---|
| 보험다모아 P0 샘플 | 56개 | 암보험, 실손의료보험, 유병력자실손, 질병보험, 간병/치매보험 원천 후보 |
| 공식 상품 URL 보유 | 47개 | 상품 페이지 후보 있음 |
| source catalog 후보 | 22개 | 7개 hash-backed + 15개 quote-only raw |
| 공식 문서 row | 22개 | 약관/요약서/사업방법서 hash 확인 후 source별 연결 |
| quote matrix row | 84개 | 나이/성별 조건별 보험료. 첫 snapshot 대상 12건 `approved`, 나머지 72건 `needs_review` |
| quote-only raw source 후보 | 15개 | 보험다모아 quote matrix product code 연결용. 일부 공식 문서 hash 확보 |
| seed source 후보 총계 | 22개 | 7개 hash-backed + 15개 quote-only raw |
| 매칭 키워드/caveat 정리 완료 source | 5개 | KDB생명, 한화생명, 교보라이프플래닛 암보험 후보. 한화 2개는 가격 blocker |
| 첫 snapshot seed 반영 후보 | 3개 | KDB생명 1개, 교보라이프플래닛 2개. source status/quote 승인/USDC 환산 포함 |
| source-backed 추천 매칭 가능 상품 | 3개 | 운영 DB에 적용된 실제 source-backed active 상품 |

다음 단계는 운영 DB 백업 후 legacy demo 상품 5건을 archive 처리하고, 추천 카드에서 대표 보험료와 조건별 approved quote matrix를 분리 표시하는 것이다. 신한라이프 일반형 문서 endpoint 탐색과 한화생명 0원 quote 해소는 별도 트랙으로 유지한다.

---

## 9. QA 체크리스트

보험상품을 추천 snapshot으로 발행하기 전 아래 질문에 답한다.

1. 이 상품은 어떤 질병/담보를 보장하는가?
2. DNA risk key와 직접 연결되는가, 아니면 baseline 보장인가?
3. `risk_targets`가 상품 보장 범위를 과장하지 않는가?
4. 특정암/소액암/유사암처럼 급부 차이가 caveat에 기록됐는가?
5. 실손의료보험을 특정 질병 위험 추천으로 오해하게 만들지 않았는가?
6. 보험료가 대표 비교 조건인지, 사용자 조건별 quote인지 구분됐는가?
7. 출처 URL, 문서 hash, 확인일이 남아 있는가?
8. source row와 recommendation snapshot row가 분리되어 있으며, FK가 올바른가?
9. `catalog_status=approved`와 `is_active=1`이 실제 추천 노출 의도와 일치하는가?
10. 문서 hash가 바뀌었을 때 `catalog_status=needs_review`로 되돌릴 기준이 있는가?

---

## 10. 365 Rubric 영향

| Rubric | 영향 |
|---|---|
| Functionality | DNA risk key와 보험상품 보장 키워드의 결정론적 매칭 정확도를 높인다 |
| Potential Impact | 한국 질병 보험상품 전체 universe로 확장할 때 데이터 품질 기준이 된다 |
| Novelty | 유전자 위험 분석과 공식 보험 공시자료를 직접 연결하는 구조를 명확히 한다 |
| UX | 사용자는 추천 이유, 보장 근거, caveat를 함께 확인해 오해를 줄일 수 있다 |
| Open-source | 보험상품 수집 프로젝트가 재사용할 수 있는 matching taxonomy 기준을 제공한다 |
| Business Plan | 잘못된 추천 리스크를 줄여 보험 비교/중개형 서비스로 확장 가능한 기반을 만든다 |

---

## 11. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](./01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Catalog Schema Extension](./02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - source table과 recommendation snapshot 스키마
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 적용 트랙
- **Logic_Progress**: [AI Matching Pipeline](../04_Logic_Progress/AI_MATCHING_PIPELINE.md) - DNA 분석 결과와 DB 상품 추천의 경계
- **QA_Validation**: [Source-aware Seed Policy QA](../05_QA_Validation/10_SOURCE_AWARE_SEED_POLICY_2026_05_28.md) - PR #7 seed 후보 반영 검증
- **QA_Validation**: [Source Catalog Quote Expansion](../05_QA_Validation/18_SOURCE_CATALOG_QUOTE_EXPANSION_2026_05_29.md) - quote-only raw source 후보 15개 확장 검증
- **QA_Validation**: [KDB Source Document DB Apply](../05_QA_Validation/28_KDB_SOURCE_DOCUMENTS_DB_APPLY_2026_05_30.md) - KDB source document 2건 DB 적용 검증
- **QA_Validation**: [Matching Keyword Caveat Review](../05_QA_Validation/30_MATCHING_KEYWORD_CAVEAT_REVIEW_2026_05_30.md) - 첫 추천 snapshot 전 매칭 키워드와 caveat 검수
- **QA_Validation**: [Demo Insurance Products Retirement](../05_QA_Validation/33_DEMO_INSURANCE_PRODUCTS_RETIREMENT_2026_05_30.md) - legacy demo 상품 운영 추천 제거 검증
