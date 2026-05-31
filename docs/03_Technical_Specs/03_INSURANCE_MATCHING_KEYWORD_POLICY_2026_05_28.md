# [기술 명세] 보험상품 매칭 키워드 정리 정책
> Created: 2026-05-28 03:56
> Last Updated: 2026-06-01 01:08

- **레이어**: 03_Technical_Specs
- **상태**: Draft v1.35
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

2026-05-30 16:26 KST 기준 위 archive를 운영 DB에 적용했다. 적용 후 legacy demo active 상품은 0건, active source-backed 상품은 3건이다. 검증은 `../05_QA_Validation/34_DEMO_PRODUCTS_ARCHIVE_DB_APPLY_2026_05_30.md`에 둔다.

2026-05-31 02:20 KST 기준 실손의료보험 baseline 후보 4개 source의 매칭 키워드와 caveat를 정리했다. DB손보, KB손보, 현대해상은 `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]`로 다음 baseline 추천 snapshot seed 후보가 될 수 있다. 삼성화재는 quote는 있지만 공식 문서 match score가 0.65이고 generic `realloss.pdf`라 상품 전용 문서 재탐색 전까지 snapshot에서 제외한다. 검증은 `../05_QA_Validation/46_MEDICAL_BASELINE_MATCHING_REVIEW_2026_05_31.md`에 둔다.

2026-05-31 02:49 KST 기준 DB손보, KB손보, 현대해상 3개 실손 baseline source의 추천 snapshot seed 준비를 완료했다. seed 적용 시 source 3건은 `approved`, quote row 12건은 `approved`, 신규 baseline `insurance_products` 3건은 `catalog_status=approved`, `is_active=1`로 들어간다. 대표 보험료는 보험다모아 `age34_female` 조건이며, `monthly_premium_usdc`는 고정 데모 환산율 `1 USDC = 1,350 KRW`로 계산한다. 이번 단계는 DB write 없이 seed/data/docs만 변경하며, 운영 반영은 백업 후 apply PR로 분리한다. 검증은 `../05_QA_Validation/47_MEDICAL_BASELINE_SNAPSHOT_SEED_2026_05_31.md`에 둔다.

2026-05-31 03:20 KST 기준 위 seed를 운영 Turso DB에 백업 후 적용했다. 적용 후 source-backed active 상품은 5개에서 8개로 늘었고, DB손보, KB손보, 현대해상 3개 실손 baseline source와 product snapshot이 모두 `approved`/active 상태다. 단, seed target quote 12건 중 당시 target ID로 매칭된 row는 여성 조건 6건뿐이라 quote approved는 20건에서 26건으로 증가했다. 당시 남성 조건 6건은 no-op으로 기록했다. 검증은 `../05_QA_Validation/48_MEDICAL_BASELINE_SNAPSHOT_DB_APPLY_2026_05_31.md`에 둔다.

2026-05-31 03:58 KST 기준 후속 읽기 전용 확인에서 남성 quote 6건은 운영 DB에 존재하지만 다른 `quote_hash_sha256` suffix ID로 저장되어 있음을 확인했다. 재적재가 아니라 `MEDICAL_BASELINE_APPROVED_QUOTE_IDS`를 actual DB ID로 교정한다. 이번 단계는 DB write 없이 seed/data/docs만 변경하며, 후속 apply 후 `insurance_premium_quotes.review_status=approved`는 26건에서 32건으로 증가해야 한다. 검증은 `../05_QA_Validation/49_MEDICAL_BASELINE_MALE_QUOTE_ID_CORRECTION_2026_05_31.md`에 둔다.

2026-05-31 04:49 KST 기준 위 교정을 운영 DB에 백업 후 적용했다. 실손 baseline target quote 12건은 모두 `approved` 상태이며, 전체 quote approval은 26건에서 32건으로 증가했다. source-backed active 상품은 8건으로 유지된다. 검증은 `../05_QA_Validation/50_MEDICAL_BASELINE_MALE_QUOTE_DB_APPLY_2026_05_31.md`에 둔다.

| 단계 | 개수 | 의미 |
|---|---:|---|
| 보험다모아 P0 샘플 | 56개 | 암보험, 실손의료보험, 유병력자실손, 질병보험, 간병/치매보험 원천 후보 |
| 공식 상품 URL 보유 | 47개 | 상품 페이지 후보 있음 |
| source catalog 후보 | 22개 | 7개 hash-backed + 15개 quote-only raw |
| quote-only raw source 후보 | 15개 | 보험다모아 quote matrix product code 연결용. 일부 공식 문서 hash 확보 |
| seed source 후보 총계 | 22개 | 7개 hash-backed + 15개 quote-only raw |
| 공식 문서 row | 26개 | 약관/요약서/사업방법서 hash 확인 후 source별 연결 |
| quote matrix row | 92개 | 나이/성별 조건별 보험료. 현재 KDB/교보/한화/신한 24건 + 실손 baseline 24건, 총 48건 `approved` |
| 매칭 키워드/caveat 정리 완료 source | 12개 | KDB/한화/교보/신한 암보험 6개 + DB/KB/현대/삼성/농협 실손 baseline 5개 + 메리츠화재 실손 baseline 1개 |
| source-backed 추천 매칭 가능 상품 | 12개 | 운영 DB에 적용된 실제 source-backed active 상품 |
| baseline active 상품 | 6개 | DB손보, KB손보, 삼성화재, 현대해상, 농협손보, 메리츠화재 실손의료보험 |
| 실손 남성 quote approval ID 적용 완료 | 6개 | 운영 DB actual row를 approved로 승격 완료 |
| 문서 특이성 blocker | 0개 | 삼성화재 실손의료보험은 직접 상품 상세 페이지와 PDF 텍스트 근거로 blocker 해소 |
| 미적용 baseline seed 후보 | 0개 | 메리츠화재 실손의료보험까지 운영 DB apply 완료 |

2026-05-31 11:50 KST 기준 로컬 Dashboard에서 사용자 조건별 보험료 UI가 실손 baseline 남성 quote를 정상 표시하는지 검증했다. 남성 34세와 44세 모두 DB손보, KB손보, 현대해상 3개 카드가 approved quote를 `내 조건 예상 보험료`로 표시했고, 승인 보험료 없음 fallback은 표시되지 않았다. 검증은 `../05_QA_Validation/51_MEDICAL_BASELINE_QUOTE_UI_VERIFICATION_2026_05_31.md`에 둔다.

2026-05-31 16:14 KST 기준 삼성화재 실손의 상품 전용 공식 문서 endpoint 재탐색을 완료했다. 직접 상품 상세 페이지가 상품명, 상품약관 링크, 2026년 5월 요율 개정, 2026년 5월 5세대 실손 출시 근거를 제공하고, 해당 `realloss.pdf`의 SHA-256은 기존 문서 row hash와 일치했다. PDF 텍스트에서도 `무배당 삼성화재 다이렉트 실손의료비보험(2605.1)` 및 일반형 조항이 확인되어 `baseline_blocked_document_specificity`를 `baseline_ready_snapshot_candidate`로 전환할 수 있다. 검증은 `../05_QA_Validation/53_SAMSUNG_FIRE_MEDICAL_DOCUMENT_REPROBE_2026_05_31.md`에 둔다.

2026-05-31 16:42 KST 기준 삼성화재 실손 baseline 추천 snapshot seed 준비를 완료했다. `seed.ts`는 적용 시 삼성화재 source 1건을 `approved`로 승격하고, 운영 DB 읽기 전용 확인으로 확정한 quote 4건을 `approved`로 바꾸며, baseline `insurance_products` snapshot 1건을 추가한다. DB write는 하지 않았고 운영 반영은 백업 후 apply PR로 분리한다. 검증은 `../05_QA_Validation/54_SAMSUNG_FIRE_BASELINE_SNAPSHOT_SEED_2026_05_31.md`에 둔다.

2026-05-31 17:26 KST 기준 삼성화재 실손 baseline 추천 snapshot을 운영 DB에 백업 후 적용했다. source-backed active 추천 상품은 9개, approved quote는 36개, baseline active 상품은 4개가 됐다. 검증은 `../05_QA_Validation/55_SAMSUNG_FIRE_BASELINE_DB_APPLY_2026_05_31.md`에 둔다.

2026-05-31 17:57 KST 기준 남은 non-approved source 13개의 처리 큐를 확정했다. 신한라이프 해약환급금 미지급형 암보험 1개는 공식 문서 3건과 quote 4건이 있어 다음 매칭 키워드/caveat 검수 후보로 둔다. raw source 10개는 공식 문서 hash가 없어 문서 probe를 먼저 수행한다. 삼성생명 입원 건강보험 1개는 `coverage_category` 정책 결정 전까지 snapshot 발행을 보류하고, 신한라이프 표준형 1개는 일반형 문서 endpoint 발견 전까지 blocker로 유지한다. 상세 검증은 `../05_QA_Validation/56_REMAINING_SOURCE_CANDIDATE_TRIAGE_2026_05_31.md`에 둔다.

2026-05-31 18:09 KST 기준 신한라이프 해약환급금 미지급형 암보험의 매칭 키워드와 caveat 정리를 완료했다. 공식 문서 3건의 SHA-256을 재다운로드 기준으로 확인했고, 주계약 암진단급여금 구조를 근거로 `coverage_category=oncology`, `matching_strategy=risk_target`, 암 관련 5개 `risk_targets`로 분류한다. 여성유방암/전립선암 급부 차이, 소액암 분류, 90일 면책, 1년 미만 감액, 해약환급금 미지급형 caveat를 추천 카드와 상담 AI context에 포함해야 한다. 검증은 `../05_QA_Validation/57_SHINHAN_NO_REFUND_MATCHING_REVIEW_2026_05_31.md`에 둔다.

2026-05-31 18:23 KST 기준 신한라이프 해약환급금 미지급형 source approval, quote 4건 approval, active product snapshot 1건을 `seed.ts`에 준비했다. 이번 단계는 DB write 없이 seed만 준비하며, 운영 DB apply 후 source-backed active 추천 상품은 10개가 된다. 검증은 `../05_QA_Validation/58_SHINHAN_NO_REFUND_SNAPSHOT_SEED_2026_05_31.md`에 둔다.

2026-05-31 18:51 KST 기준 위 seed를 운영 DB에 백업 후 적용했다. source-backed active 추천 상품은 10개, approved quote는 40개가 됐다. 검증은 `../05_QA_Validation/59_SHINHAN_NO_REFUND_DB_APPLY_2026_05_31.md`에 둔다.

2026-05-31 19:10 KST 기준 문서가 없는 raw source 10개의 공식 상품 페이지와 carrier disclosure probe를 실행했다. 상품 페이지 접근 가능 7개, 공식 상품 URL 없음 3개, PDF 후보 2개, hash 확보 0건으로 확인됐다. 따라서 이번 단계에서 매칭 키워드/caveat 정리로 넘어갈 수 있는 신규 source는 없고, 추천 snapshot 수는 10개로 유지한다. 검증은 `../05_QA_Validation/60_REMAINING_RAW_SOURCE_DOCUMENT_PROBE_2026_05_31.md`에 둔다.

2026-05-31 19:26 KST 기준 농협손보 실손의료보험 공시 adapter로 공식 약관 PDF 1건을 hash했다. `src_nh_fire_medical_202605`는 문서 evidence gate를 통과했지만, 아직 `coverage_category=medical_expense`, `matching_strategy=baseline`, caveat 정리와 source document seed 적용이 남아 있으므로 추천 snapshot 수는 10개로 유지한다. 검증은 `../05_QA_Validation/61_NH_FIRE_DISCLOSURE_ADAPTER_PROBE_2026_05_31.md`에 둔다.

2026-05-31 19:33 KST 기준 농협손보 실손의료보험 매칭 키워드/caveat 정리를 완료했다. 이 source는 `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]`를 사용한다. 공식 약관 파일명에 `전환계약용`이 포함되므로 추천 카드와 상담 AI context에는 variant caveat를 남긴다. 이번 단계는 DB write 없이 data/docs 산출물만 추가하며, 검증은 `../05_QA_Validation/62_NH_FIRE_MEDICAL_MATCHING_REVIEW_2026_05_31.md`에 둔다.

2026-05-31 19:49 KST 기준 농협손보 source document seed 후보 추가, source/quote approval, baseline `insurance_products` snapshot seed 준비를 완료했다. 적용 전 운영 DB 읽기 전용 확인에서 농협손보 source는 `raw`, quote 4건은 `needs_review`, source document는 0건이었다. 이번 seed 적용 후에는 source-backed active 추천 상품이 10건에서 11건으로 늘어나야 한다. 검증은 `../05_QA_Validation/63_NH_FIRE_BASELINE_SNAPSHOT_SEED_2026_05_31.md`에 둔다.

2026-05-31 20:13 KST 기준 농협손보 실손 baseline 추천 snapshot을 운영 DB에 적용했다. source-backed active 추천 상품은 10건에서 11건, approved quote는 40건에서 44건, baseline active product는 4건에서 5건이 됐다. 검증은 `../05_QA_Validation/64_NH_FIRE_BASELINE_DB_APPLY_2026_05_31.md`에 둔다.

2026-05-31 21:27 KST 기준 메리츠화재 실손의료비보험 공시 adapter로 공식 PDF 3건을 hash했다. `src_meritz_direct_medical_202605`는 문서 evidence gate를 통과했지만, 아직 파일명 `2408` variant와 session-bound encrypted download URL의 citation 저장 방식, `coverage_category=medical_expense`, `matching_strategy=baseline`, caveat 정리가 남아 있으므로 추천 snapshot 수는 11개로 유지한다. 검증은 `../05_QA_Validation/65_MERITZ_FIRE_DISCLOSURE_ADAPTER_PROBE_2026_05_31.md`에 둔다.

2026-05-31 21:39 KST 기준 메리츠화재 실손의료비보험 매칭 키워드/caveat 정리를 완료했다. 이 source는 `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]`를 사용한다. 사업방법서와 상품요약서 파일명에는 `2408`이 포함되지만, 2026-05-31 기준 공식 상품 페이지의 `6ADGE` PDF 목록 API가 같은 상품명으로 제공한 문서다. session-bound encrypted download URL은 장기 citation으로 저장하지 않고 공식 상품 페이지와 adapter 재검증 절차를 caveat로 남긴다. 이번 단계는 DB write 없이 data/docs 산출물만 추가하며, 검증은 `../05_QA_Validation/66_MERITZ_FIRE_MEDICAL_MATCHING_REVIEW_2026_05_31.md`에 둔다.

2026-05-31 21:52 KST 기준 메리츠화재 실손 baseline 추천 snapshot seed 준비를 완료했다. `seed.ts`는 적용 시 메리츠화재 source document 3건을 추가하고, source를 `approved`로 승격하며, quote 4건을 `approved`로 바꾸고, `prod_meritz_direct_medical_202605` snapshot 1건을 추가한다. 운영 DB 읽기 전용 확인 결과 현재 메리츠화재 source는 `raw`, quote 4건은 `needs_review`, source document는 0건이다. 이번 단계는 DB write 없이 seed/data/docs만 변경하며, 검증은 `../05_QA_Validation/67_MERITZ_FIRE_BASELINE_SNAPSHOT_SEED_2026_05_31.md`에 둔다. 다음 작업은 운영 DB 백업 후 seed apply PR이다. 적용 완료 후 source-backed active 추천 상품은 11개에서 12개로 늘어난다.

2026-05-31 22:01 KST 기준 메리츠화재 실손 baseline 추천 snapshot을 운영 DB에 적용했다. source-backed active 추천 상품은 11건에서 12건, approved quote는 44건에서 48건, baseline active product는 5건에서 6건이 됐다. 검증은 `../05_QA_Validation/68_MERITZ_FIRE_BASELINE_DB_APPLY_2026_05_31.md`에 둔다.

2026-05-31 22:22 KST 기준 흥국화재 실손의료비보험 공시 adapter로 공식 약관 PDF 1건을 hash했다. `src_heungkuk_fire_direct_medical_202605`는 문서 evidence gate를 통과했지만, 아직 파일명 `next` suffix variant와 `coverage_category=medical_expense`, `matching_strategy=baseline`, caveat 정리가 남아 있으므로 추천 snapshot 수는 12개로 유지한다. 검증은 `../05_QA_Validation/69_HEUNGKUK_FIRE_DISCLOSURE_ADAPTER_PROBE_2026_05_31.md`에 둔다.

2026-05-31 22:34 KST 기준 흥국화재 실손의료비보험을 `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]` 기준의 baseline-ready 후보로 정리했다. 공식 문서 seed 후보는 약관 1건이며, 보험다모아 quote 4건은 모두 숫자 KRW 값이다. 단, 공식 약관 파일명이 `eYou_mdca_term_next.pdf`이므로 seed/apply 전 adapter hash refresh caveat를 유지한다. 이번 단계는 data/docs만 변경하며 추천 snapshot 수는 12개로 유지한다. 검증은 `../05_QA_Validation/70_HEUNGKUK_FIRE_MEDICAL_MATCHING_REVIEW_2026_05_31.md`에 둔다.

2026-05-31 23:03 KST 기준 흥국화재 source document seed, quote approval, baseline snapshot seed를 준비했다. 적용 시 `doc_heungkuk_fire_direct_medical_terms_202605`, quote 4건, `prod_heungkuk_fire_direct_medical_202605`가 운영 추천 경로로 들어가며 source-backed active 추천 상품은 12건에서 13건으로 늘어난다. 이번 단계는 DB write 없이 seed/data/docs만 변경하고, 운영 반영은 백업 후 apply PR에서 진행한다. 검증은 `../05_QA_Validation/71_HEUNGKUK_FIRE_BASELINE_SNAPSHOT_SEED_2026_05_31.md`에 둔다.

2026-05-31 23:25 KST 기준 흥국화재 실손 baseline 추천 snapshot을 운영 DB에 적용했다. source-backed active 추천 상품은 12건에서 13건, approved quote는 48건에서 52건, baseline active product는 6건에서 7건이 됐다. 검증은 `../05_QA_Validation/72_HEUNGKUK_FIRE_BASELINE_DB_APPLY_2026_05_31.md`에 둔다.

2026-06-01 00:15 KST 기준 미래에셋생명 온라인 암보험 공시 adapter로 기본형과 해약환급금이없는유형 source 2건의 공식 PDF 3종을 hash했다. 두 source는 같은 2026-05-01 공시 row와 문서 hash를 공유하므로, 후속 PR에서 문서 variant 공유 가능 여부를 먼저 검수한 뒤 `coverage_category=oncology`, `matching_strategy=risk_target`, caveat를 정리한다. 이번 단계는 crawler/data/docs만 변경하며 추천 snapshot 수는 13개로 유지한다. 검증은 `../05_QA_Validation/73_MIRAEASSET_LIFE_DISCLOSURE_ADAPTER_PROBE_2026_06_01.md`에 둔다.

2026-06-01 00:31 KST 기준 미래에셋생명 온라인 암보험 기본형/해약환급금이없는유형의 문서 variant와 매칭 키워드/caveat를 정리했다. 약관이 `온라인 암보험 무배당 [기본형/해약환급금이 없는 유형]`과 상품코드 21279/21280을 명시하므로 source별 문서 row는 분리하되 공식 hash 3종을 공유할 수 있다. 두 source는 `coverage_category=oncology`, `matching_strategy=risk_target`, 공통 5개 암 risk target 기준의 snapshot 후보이며, 숫자 KRW quote 8건이 있다. 이번 단계는 data/docs만 변경하며 추천 snapshot 수는 13개로 유지한다. 검증은 `../05_QA_Validation/74_MIRAEASSET_LIFE_CANCER_MATCHING_REVIEW_2026_06_01.md`에 둔다.

2026-06-01 00:48 KST 기준 미래에셋생명 온라인 암보험 기본형/해약환급금이없는유형의 추천 snapshot seed 준비를 완료했다. `seed.ts`는 적용 시 source document 6건을 추가하고, 두 source를 `approved`로 승격하며, quote 8건을 `approved`로 바꾸고, `insurance_products` snapshot 2건을 추가한다. 적용 후 source-backed active 추천 상품은 13건에서 15건, oncology active 상품은 6건에서 8건으로 늘어나야 한다. 검증은 `../05_QA_Validation/75_MIRAEASSET_LIFE_CANCER_SNAPSHOT_SEED_2026_06_01.md`에 둔다.

2026-06-01 01:08 KST 기준 위 seed를 운영 DB에 백업 후 적용했다. source-backed active 추천 상품은 15건, oncology active 상품은 8건, approved quote는 60건이 됐다. 검증은 `../05_QA_Validation/76_MIRAEASSET_LIFE_CANCER_DB_APPLY_2026_06_01.md`에 둔다.

다음 단계는 Dashboard와 상담 AI에서 미래에셋생명 카드 설명을 수동 확인하거나, 한화손보 adapter를 순차 추가해 공식 문서 hash를 확보하는 것이다. 아직 source 후보로 구조화하지 못한 보험다모아 P0 샘플 34개는 공식 URL, source row, 문서 hash 순서로 별도 확장한다.

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
- **QA_Validation**: [Demo Products Archive DB Apply](../05_QA_Validation/34_DEMO_PRODUCTS_ARCHIVE_DB_APPLY_2026_05_30.md) - legacy demo 상품 archive 운영 DB 적용 검증
- **QA_Validation**: [Medical Baseline Matching Review](../05_QA_Validation/46_MEDICAL_BASELINE_MATCHING_REVIEW_2026_05_31.md) - 실손의료보험 baseline 후보 매칭 키워드와 caveat 검수
- **QA_Validation**: [Medical Baseline Snapshot Seed](../05_QA_Validation/47_MEDICAL_BASELINE_SNAPSHOT_SEED_2026_05_31.md) - 실손 baseline 추천 snapshot seed 준비 검증
- **QA_Validation**: [Medical Baseline Snapshot DB Apply](../05_QA_Validation/48_MEDICAL_BASELINE_SNAPSHOT_DB_APPLY_2026_05_31.md) - 실손 baseline 추천 snapshot 운영 DB 적용 검증
- **QA_Validation**: [Medical Baseline Male Quote ID Correction](../05_QA_Validation/49_MEDICAL_BASELINE_MALE_QUOTE_ID_CORRECTION_2026_05_31.md) - 실손 baseline 남성 quote approval ID 교정 검증
- **QA_Validation**: [Medical Baseline Male Quote DB Apply](../05_QA_Validation/50_MEDICAL_BASELINE_MALE_QUOTE_DB_APPLY_2026_05_31.md) - 실손 baseline 남성 quote approval 운영 DB 적용 검증
- **QA_Validation**: [Medical Baseline Quote UI Verification](../05_QA_Validation/51_MEDICAL_BASELINE_QUOTE_UI_VERIFICATION_2026_05_31.md) - 실손 baseline 남성 조건 quote UI 표시 검증
- **QA_Validation**: [Samsung Fire Medical Document Reprobe](../05_QA_Validation/53_SAMSUNG_FIRE_MEDICAL_DOCUMENT_REPROBE_2026_05_31.md) - 삼성화재 실손 상품 전용 문서 재탐색 검증
- **QA_Validation**: [Samsung Fire Baseline Snapshot Seed](../05_QA_Validation/54_SAMSUNG_FIRE_BASELINE_SNAPSHOT_SEED_2026_05_31.md) - 삼성화재 실손 baseline 추천 snapshot seed 검증
- **QA_Validation**: [Samsung Fire Baseline DB Apply](../05_QA_Validation/55_SAMSUNG_FIRE_BASELINE_DB_APPLY_2026_05_31.md) - 삼성화재 실손 baseline 추천 snapshot 운영 DB 적용 검증
- **QA_Validation**: [Remaining Source Candidate Triage](../05_QA_Validation/56_REMAINING_SOURCE_CANDIDATE_TRIAGE_2026_05_31.md) - 남은 source 후보 처리 순서 검증
- **QA_Validation**: [Shinhan No-refund Matching Review](../05_QA_Validation/57_SHINHAN_NO_REFUND_MATCHING_REVIEW_2026_05_31.md) - 신한라이프 해약환급금 미지급형 암보험 매칭 키워드 검증
- **QA_Validation**: [Shinhan No-refund Snapshot Seed](../05_QA_Validation/58_SHINHAN_NO_REFUND_SNAPSHOT_SEED_2026_05_31.md) - 신한라이프 해약환급금 미지급형 추천 snapshot seed 검증
- **QA_Validation**: [Shinhan No-refund DB Apply](../05_QA_Validation/59_SHINHAN_NO_REFUND_DB_APPLY_2026_05_31.md) - 신한라이프 해약환급금 미지급형 추천 snapshot 운영 DB 적용 검증
- **QA_Validation**: [Remaining Raw Source Document Probe](../05_QA_Validation/60_REMAINING_RAW_SOURCE_DOCUMENT_PROBE_2026_05_31.md) - 남은 raw source 공식 문서 probe 검증
- **QA_Validation**: [NH Fire Disclosure Adapter Probe](../05_QA_Validation/61_NH_FIRE_DISCLOSURE_ADAPTER_PROBE_2026_05_31.md) - 농협손보 실손의료보험 공식 약관 hash 검증
- **QA_Validation**: [NH Fire Medical Matching Review](../05_QA_Validation/62_NH_FIRE_MEDICAL_MATCHING_REVIEW_2026_05_31.md) - 농협손보 실손 baseline 매칭 키워드 검수
- **QA_Validation**: [NH Fire Baseline Snapshot Seed](../05_QA_Validation/63_NH_FIRE_BASELINE_SNAPSHOT_SEED_2026_05_31.md) - 농협손보 실손 baseline 추천 snapshot seed 검증
- **QA_Validation**: [NH Fire Baseline DB Apply](../05_QA_Validation/64_NH_FIRE_BASELINE_DB_APPLY_2026_05_31.md) - 농협손보 실손 baseline 추천 snapshot 운영 DB 적용 검증
- **QA_Validation**: [Meritz Fire Disclosure Adapter Probe](../05_QA_Validation/65_MERITZ_FIRE_DISCLOSURE_ADAPTER_PROBE_2026_05_31.md) - 메리츠화재 실손의료비보험 공식 문서 hash 검증
- **QA_Validation**: [Meritz Fire Medical Matching Review](../05_QA_Validation/66_MERITZ_FIRE_MEDICAL_MATCHING_REVIEW_2026_05_31.md) - 메리츠화재 실손 baseline 매칭 키워드 검수
- **QA_Validation**: [Meritz Fire Baseline Snapshot Seed](../05_QA_Validation/67_MERITZ_FIRE_BASELINE_SNAPSHOT_SEED_2026_05_31.md) - 메리츠화재 실손 baseline 추천 snapshot seed 검증
- **QA_Validation**: [Meritz Fire Baseline DB Apply](../05_QA_Validation/68_MERITZ_FIRE_BASELINE_DB_APPLY_2026_05_31.md) - 메리츠화재 실손 baseline 추천 snapshot 운영 DB 적용 검증
- **QA_Validation**: [Heungkuk Fire Disclosure Adapter Probe](../05_QA_Validation/69_HEUNGKUK_FIRE_DISCLOSURE_ADAPTER_PROBE_2026_05_31.md) - 흥국화재 실손의료비보험 공식 약관 hash 검증
- **QA_Validation**: [Heungkuk Fire Medical Matching Review](../05_QA_Validation/70_HEUNGKUK_FIRE_MEDICAL_MATCHING_REVIEW_2026_05_31.md) - 흥국화재 실손 baseline 매칭 키워드 검수
- **QA_Validation**: [Heungkuk Fire Baseline Snapshot Seed](../05_QA_Validation/71_HEUNGKUK_FIRE_BASELINE_SNAPSHOT_SEED_2026_05_31.md) - 흥국화재 실손 baseline 추천 snapshot seed 검증
- **QA_Validation**: [Heungkuk Fire Baseline DB Apply](../05_QA_Validation/72_HEUNGKUK_FIRE_BASELINE_DB_APPLY_2026_05_31.md) - 흥국화재 실손 baseline 추천 snapshot 운영 DB 적용 검증
- **QA_Validation**: [Mirae Asset Life Disclosure Adapter Probe](../05_QA_Validation/73_MIRAEASSET_LIFE_DISCLOSURE_ADAPTER_PROBE_2026_06_01.md) - 미래에셋생명 온라인 암보험 공식 문서 hash 검증
- **QA_Validation**: [Mirae Asset Life Cancer Matching Review](../05_QA_Validation/74_MIRAEASSET_LIFE_CANCER_MATCHING_REVIEW_2026_06_01.md) - 미래에셋생명 온라인 암보험 매칭 키워드와 caveat 검수
- **QA_Validation**: [Mirae Asset Life Cancer Snapshot Seed](../05_QA_Validation/75_MIRAEASSET_LIFE_CANCER_SNAPSHOT_SEED_2026_06_01.md) - 미래에셋생명 온라인 암보험 추천 snapshot seed 검증
- **QA_Validation**: [Mirae Asset Life Cancer DB Apply](../05_QA_Validation/76_MIRAEASSET_LIFE_CANCER_DB_APPLY_2026_06_01.md) - 미래에셋생명 온라인 암보험 추천 snapshot 운영 DB 적용 검증
