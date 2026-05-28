# [기술 명세] 보험상품 카탈로그 스키마 확장안
> Created: 2026-05-27 22:43
> Last Updated: 2026-05-28 19:28

- **레이어**: 03_Technical_Specs
- **상태**: Approved Design v1.3
- **범위**: 실제 한국 보험상품 수집 데이터, 공식 문서 hash, KRW 보험료, 실손의료보험, 서비스 추천 snapshot 스키마
- **결론**: 원천 수집 테이블과 서비스 추천 테이블을 분리한다. `insurance_product_sources`, `insurance_source_documents`, `insurance_premium_quotes`에 공식 출처와 조건별 보험료를 보존하고, 질병-보장 매핑과 매칭 키워드 정리가 끝난 상품만 확장된 `insurance_products`로 발행한다.

---

## 1. 결정 요약

Hash-backed 7개 상품의 매칭 키워드 정리 결과, 현재 `insurance_products`만으로는 실제 한국 보험상품과 조건별 보험료를 안전하게 담을 수 없다.

따라서 스키마 확장 방향은 다음과 같이 확정한다.

| 결정 | 내용 |
|---|---|
| 원천 데이터 저장 | `insurance_product_sources`, `insurance_source_documents`, `insurance_carriers`를 신설한다 |
| 서비스 추천 저장 | 기존 `insurance_products`는 매칭 키워드 정리가 끝난 추천 snapshot으로 유지하되 필드를 확장한다 |
| 실손의료보험 처리 | `coverage_category`에 `medical_expense`를 추가한다 |
| 매칭 방식 분리 | `matching_strategy`를 추가해 유전자 위험 매칭과 기본 의료비 보장을 분리한다 |
| 원화 보험료 | `monthly_premium_krw`, `premium_currency`, `premium_basis`를 추가한다 |
| 조건별 보험료 | 대표 보험료와 분리해 `insurance_premium_quotes` 테이블로 관리한다 |
| 출처 신뢰성 | `source_url`, `source_checked_at`, `primary_source_document_id` 또는 source table FK를 저장한다 |
| 보장 caveat | `coverage_details_json`, `coverage_caveats_json`으로 급부 차이와 제한사항을 보존한다 |

핵심 원칙은 “수집된 상품”과 “추천 매칭 가능한 상품”을 섞지 않는 것이다. 보험다모아/공시실에서 가져온 모든 상품은 먼저 원천 테이블에 들어가고, 질병-보장 매핑과 매칭 키워드 정리가 끝난 뒤에만 추천 snapshot이 된다. 여기서 `approved`는 외부 승인이나 보험상품 심사가 아니라 내부 추천 매칭 가능 상태를 뜻한다.

---

## 2. 현재 스키마 gap

| gap | 영향 |
|---|---|
| `monthly_premium_usdc`만 있음 | 한국 상품의 공식 KRW 보험료와 산정 기준을 보존할 수 없음 |
| `coverage_category`가 4개 질병군만 지원 | 실손의료보험을 넣을 수 없음 |
| `risk_targets`가 필수 | 실손처럼 특정 유전자 플래그에 직접 연결하면 안 되는 상품을 표현할 수 없음 |
| 출처 필드 없음 | 추천 결과에 공식 문서, 확인일, hash를 표시할 수 없음 |
| 급부 세부사항 없음 | 암보험의 일반암/소액암/유사암처럼 다른 보장 조건을 표현할 수 없음 |
| 매칭 준비 상태 필드 없음 | 수집 완료/매칭 키워드 정리 필요/추천 매칭 가능 상태를 구분할 수 없음 |

---

## 3. 확장 ERD

```text
insurance_carriers (1)
  ├──< insurance_product_sources (N)
  │       ├──< insurance_source_documents (N)
  │       ├──< insurance_premium_quotes (N, raw quote matrix)
  │       └──< insurance_products (0..N, matching-ready snapshots)
  │
insurance_products (N) >──< recommendation_carts (N:M, via cart_items JSON)
```

`insurance_product_sources`는 원천 카탈로그다. `insurance_products`는 사용자에게 추천 가능한 matching-ready snapshot이다.
`insurance_premium_quotes`는 나이/성별/납입기간/보장금액별 가격 matrix를 저장하는 raw quote 테이블이다.

---

## 4. 신규 테이블

### 4-1. `insurance_carriers`

보험사 기준 테이블이다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | TEXT PK | 내부 보험사 ID |
| `name_ko` | TEXT NOT NULL | 보험사 한글명 |
| `name_en` | TEXT NULL | 영문명 |
| `carrier_type` | TEXT NOT NULL | `life`, `general`, `postal`, `reinsurance`, `other` |
| `association_source` | TEXT NOT NULL | `klia`, `knia`, `postal`, `manual` |
| `homepage_url` | TEXT NULL | 공식 홈페이지 |
| `disclosure_url` | TEXT NULL | 공시실 URL |
| `is_active` | INTEGER NOT NULL | 수집 대상 여부 |
| `last_checked_at` | INTEGER NULL | 마지막 확인 시각 |
| `created_at` | INTEGER NOT NULL | 생성 시각 |
| `updated_at` | INTEGER NOT NULL | 수정 시각 |

### 4-2. `insurance_product_sources`

보험다모아, 협회 공시, 보험사 공시실에서 수집한 원천 상품 row다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | TEXT PK | 원천 상품 ID |
| `carrier_id` | TEXT FK | `insurance_carriers.id` |
| `raw_product_name` | TEXT NOT NULL | 원문 상품명 |
| `normalized_product_name` | TEXT NOT NULL | 정규화 상품명 |
| `product_group` | TEXT NOT NULL | 암보험, 실손의료보험, 질병보험 등 |
| `e_insmarket_product_code` | TEXT NULL | 보험다모아 상품 코드 |
| `official_product_url` | TEXT NULL | 공식 상품 페이지 URL |
| `sale_status` | TEXT NOT NULL | `active`, `suspended`, `archived`, `unknown` |
| `sale_status_evidence` | TEXT NULL | 판매상태 확인 근거 |
| `premium_currency` | TEXT NOT NULL | 기본 `KRW` |
| `monthly_premium_krw` | INTEGER NULL | 표준 조건 월 보험료 |
| `premium_text` | TEXT NULL | 원문 보험료 문구 |
| `premium_basis` | TEXT NULL | 성별, 나이, 납입기간, 보장금액 등 산정 기준 |
| `renewal_type` | TEXT NULL | 갱신형, 비갱신형, 혼합 등 |
| `coverage_summary` | TEXT NULL | 주요 보장 요약 |
| `exclusions_summary` | TEXT NULL | 주요 면책/제한 요약 |
| `coverage_details_json` | TEXT NULL | 급부/담보/한도 구조화 JSON |
| `coverage_caveats_json` | TEXT NULL | 추천 표시 시 고지할 caveat JSON |
| `review_status` | TEXT NOT NULL | `raw`, `parsed`, `needs_review`, `approved`, `rejected` |
| `reviewed_at` | INTEGER NULL | 사람 검수 시각 |
| `last_verified_at` | INTEGER NULL | 마지막 출처 재검증 시각 |
| `created_at` | INTEGER NOT NULL | 생성 시각 |
| `updated_at` | INTEGER NOT NULL | 수정 시각 |

### 4-3. `insurance_source_documents`

원문 PDF, HTML, API 응답 hash를 보존하는 테이블이다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | TEXT PK | 문서 ID |
| `product_source_id` | TEXT FK | `insurance_product_sources.id` |
| `carrier_id` | TEXT FK | `insurance_carriers.id` |
| `source_type` | TEXT NOT NULL | `association`, `e_insmarket`, `carrier_disclosure`, `data_go_kr`, `postal_api`, `manual` |
| `document_type` | TEXT NOT NULL | `terms`, `summary`, `business_method`, `price_disclosure`, `product_page`, `api_response` |
| `source_url` | TEXT NOT NULL | 원문 URL |
| `file_hash_sha256` | TEXT NOT NULL | 다운로드 파일 또는 응답 본문 SHA-256 |
| `content_type` | TEXT NULL | HTTP content-type |
| `content_length_bytes` | INTEGER NULL | 파일 크기 |
| `retrieved_at` | INTEGER NOT NULL | 수집 시각 |
| `effective_date` | TEXT NULL | 약관/상품 적용일 |
| `published_at` | TEXT NULL | 게시일 또는 공시일 |
| `usage_status` | TEXT NOT NULL | `internal_only`, `link_only`, `public_metadata_allowed` |
| `parse_status` | TEXT NOT NULL | `not_parsed`, `parsed`, `parse_failed` |
| `extracted_text_hash` | TEXT NULL | 텍스트 추출 결과 hash |
| `created_at` | INTEGER NOT NULL | 생성 시각 |

### 4-4. `insurance_premium_quotes`

현재 `insurance_product_sources.monthly_premium_krw`와 `insurance_products.monthly_premium_krw`는 대표 보험료 1개만 보존한다. 나이, 성별, 납입기간, 보장금액에 따라 달라지는 보험료는 같은 상품에 여러 row가 생기므로 별도 quote table로 분리한다.

2026-05-28 quote matrix PoC 이후 `src/lib/db/schema.ts`와 `drizzle/0006_real_war_machine.sql`에 schema/migration을 추가했다. 이 PR에서는 테이블 구조와 migration 파일만 생성하고, 운영 Turso DB 적용과 quote row 적재는 별도 단계로 진행한다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `id` | TEXT PK | quote row ID |
| `product_source_id` | TEXT FK | `insurance_product_sources.id` |
| `carrier_id` | TEXT FK | `insurance_carriers.id` |
| `age` | INTEGER NULL | 조회 기준 나이 |
| `sex` | TEXT NULL | `male`, `female`, `source_unknown` 등 정규화 값 |
| `source_sex_code` | TEXT NULL | 원문 파라미터. 예: `M`, `2` |
| `payment_cycle` | TEXT NULL | 월납, 연납 등 |
| `payment_period_years` | INTEGER NULL | 납입기간 |
| `insurance_period_years` | INTEGER NULL | 보험기간 |
| `coverage_amount_krw` | INTEGER NULL | 기준 가입금액 또는 보장금액 |
| `plan_name` | TEXT NULL | 기본형/표준체/비흡연체/해약환급금 미지급형 등 |
| `renewal_type` | TEXT NULL | 갱신형, 비갱신형, 혼합 |
| `riders_json` | TEXT NULL | 특약 조합 JSON |
| `premium_currency` | TEXT NOT NULL | 기본 `KRW` |
| `monthly_premium_krw` | INTEGER NULL | 조건별 월 보험료 |
| `premium_text` | TEXT NULL | 원문 표시값 |
| `quote_source_type` | TEXT NOT NULL | `e_insmarket`, `carrier_quote`, `association`, `manual` |
| `quote_source_url` | TEXT NULL | 조회 URL |
| `quote_params_json` | TEXT NULL | 조회 파라미터 원문 JSON |
| `quote_hash_sha256` | TEXT NULL | 응답 본문 또는 가격 원문 hash |
| `retrieved_at` | INTEGER NOT NULL | 수집 시각 |
| `review_status` | TEXT NOT NULL | `raw`, `needs_review`, `approved`, `rejected` |
| `created_at` | INTEGER NOT NULL | 생성 시각 |

인덱스는 다음과 같이 구현한다.

| 인덱스 | 목적 |
|---|---|
| `premium_quotes_product_condition_idx` | `(product_source_id, age, sex)` 조건별 quote 조회 |
| `premium_quotes_product_review_idx` | `(product_source_id, review_status)` 승인된 quote만 노출 |
| `premium_quotes_hash_idx` | `quote_hash_sha256` 응답 중복/변경 추적 |

---

## 5. `insurance_products` 확장

기존 테이블은 추천 매칭 가능한 snapshot으로 유지한다. 다만 실제 한국 상품을 표시하기 위해 다음 필드를 추가한다.

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `product_source_id` | TEXT NULL | 매칭 키워드 정리가 끝난 원천 상품 FK |
| `monthly_premium_krw` | INTEGER NULL | 공식 KRW 월 보험료 |
| `premium_currency` | TEXT NOT NULL DEFAULT `KRW` | 원 보험료 통화 |
| `premium_basis` | TEXT NULL | 보험료 산정 기준 |
| `matching_strategy` | TEXT NOT NULL DEFAULT `risk_target` | `risk_target`, `baseline`, `manual` |
| `coverage_details_json` | TEXT NULL | 급부/담보 구조 |
| `coverage_caveats_json` | TEXT NULL | 제한사항 및 UI 고지 |
| `source_checked_at` | INTEGER NULL | 추천 snapshot 기준 출처 확인일 |
| `primary_source_document_id` | TEXT NULL | 대표 문서 FK |
| `catalog_status` | TEXT NOT NULL DEFAULT `approved` | `approved`, `needs_review`, `archived` |

`monthly_premium_usdc`는 계속 `NOT NULL`로 유지한다. 한국 공식 원천 가격은 `monthly_premium_krw`와 `premium_basis`에 보존하지만, 현재 checkout/demo 정산 경로와 Confidential Intents + USDC 결제 설계는 USDC 금액을 기준으로 동작하기 때문이다. 따라서 KRW-only 원천 상품을 추천 snapshot으로 발행할 때는 매칭 키워드 정리 시점의 환산 USDC 값을 함께 저장한다.

`monthly_premium_krw`와 `premium_basis`는 대표 보험료 snapshot이다. 사용자의 나이/성별에 따라 동적으로 바뀌는 보험료로 해석하면 안 된다. 조건별 보험료 비교가 필요해지면 `insurance_premium_quotes`에서 조건별 산정 기준이 정리된 quote row를 조회한다.

`coverage_category` enum은 다음처럼 확장한다.

```typescript
[
  "oncology",
  "cardiovascular",
  "metabolic",
  "neurological",
  "medical_expense"
]
```

`risk_targets`는 계속 JSON 배열로 보존하되, `matching_strategy=baseline`인 상품은 빈 배열을 허용한다. 실손의료보험은 특정 유전자 위험 플래그에 직접 매칭하지 않고, 별도의 기본 의료비 보장 lane에서 표시한다.

---

## 6. 매칭 규칙

| 상품 유형 | `coverage_category` | `matching_strategy` | `risk_targets` | 추천 위치 |
|---|---|---|---|---|
| 암보험 | `oncology` | `risk_target` | 암 관련 플래그 | 유전자 위험 기반 추천 |
| 심혈관/대사/신경계 질병보험 | 기존 3개 카테고리 | `risk_target` | 관련 플래그 | 유전자 위험 기반 추천 |
| 실손의료보험 | `medical_expense` | `baseline` | 빈 배열 허용 | 기본 의료비 보장 후보 |
| 매칭 키워드 정리 필요 상품 | 원천 상품군 유지 | 없음 | 없음 | 추천 미노출 |

`matchProducts`의 결정론적 매칭은 유지한다. 단, `baseline` 상품은 위험 플래그 교집합 점수에 넣지 않고 별도 섹션으로 노출한다.

```text
risk_target 상품:
  riskProfile.flags ∩ insurance_products.risk_targets > 0 이면 추천 후보

baseline 상품:
  사용자의 위험 플래그와 무관하게 "기본 의료비 보장 후보"로 표시
```

---

## 7. 추천 snapshot 발행 워크플로우

```text
1. Collector/Crawler가 raw product row와 source document hash를 저장
2. Parser가 보험료, 보장 요약, caveat 후보를 추출
3. 질병-보장 매핑과 coverage_category, risk_targets, matching_strategy를 정리
4. 대표 보험료의 premium_basis가 불명확하면 matching-ready snapshot으로 발행하지 않음
5. review_status=approved인 원천 상품만 insurance_products snapshot으로 발행
6. source document hash가 변경되면 catalog_status=needs_review로 되돌림
7. 매칭 키워드 재정리 후 snapshot을 갱신하거나 archived 처리
```

서비스 화면은 `insurance_products`만 읽고, 상세 출처/감사 화면은 source tables를 참조한다.

---

## 8. hash-backed 매칭 키워드 정리 상품 적용 판정

| 상품 | 원천 테이블 저장 | 추천 snapshot 발행 | 이유 |
|---|---|---|---|
| 한화생명 e암보험 | 가능 | 보류 | `oncology/risk_target` 후보이나 `0원` 보험료와 암 급부 caveat 정리 필요 |
| 신한SOL암보험 | 가능 | 보류 | `oncology/risk_target` 후보이나 90일 면책, 암 급부 차이, premium_basis 정리 필요 |
| DB손보 다이렉트 실손 | 가능 | 보류 | `medical_expense/baseline` 후보이나 premium_basis 정리 필요 |
| KB손보 다이렉트 실손 | 가능 | 보류 | `medical_expense/baseline` 후보이나 premium_basis 정리 필요 |
| 삼성화재 다이렉트 실손 | 가능 | 보류 | `medical_expense/baseline` 후보이나 판매상태와 premium_basis 확인 필요 |
| 현대해상 다이렉트 실손 | 가능 | 보류 | `medical_expense/baseline` 후보이나 갱신형 caveat와 premium_basis 정리 필요 |
| 삼성생명 인터넷 입원 건강보험 | 가능 | 보류 | `hospitalization` 또는 `general_health` 카테고리 결정 필요 |

---

## 9. 구현 순서

1. [x] Drizzle schema에 신규 3개 테이블을 추가한다.
2. [x] `insurance_products`에 source/premium/matching/caveat 필드를 추가한다.
3. [x] Zod schema에서 `coverage_category`에 `medical_expense`를 추가한다.
4. [x] `matching_strategy=baseline`일 때 `risk_targets=[]`를 허용한다.
5. [x] Drizzle migration SQL을 생성한다: `drizzle/0004_panoramic_firebird.sql`.
6. [ ] seed 교체 전, raw source seed와 recommendation snapshot seed를 분리한다.
7. [x] `matchProducts`에서 risk-target 추천과 baseline 추천을 분리한다.
8. [x] UI는 추천 카드에 출처, 확인일, 보험료 기준, caveat를 표시한다.
9. [x] Turso DB에 `0004_panoramic_firebird.sql`과 `0005_common_boom_boom.sql`을 백업 후 적용한다.
10. [x] 조건별 보험료 matrix를 `insurance_premium_quotes`로 별도 설계한다.
11. [ ] 백업 후 Turso DB에 `0006_real_war_machine.sql`을 적용한다.
12. [ ] P0 후보 quote row를 raw/needs_review 상태로 적재한다.

---

## 10. 비적용 범위

2026-05-28 19:28 KST 기준 `insurance_premium_quotes` schema와 `0006_real_war_machine.sql` migration 파일 생성까지 완료했다. 아직 다음 작업은 하지 않는다.

- `src/lib/db/seed.ts` 실제 상품 교체
- 보험료 KRW/USDC 환산 로직 구현
- `0006_real_war_machine.sql` Turso DB 실제 적용
- 나이/성별/납입기간별 보험료 matrix 수집

---

## 11. 365 Rubric 영향

| Rubric | 영향 |
|---|---|
| Functionality | 실제 보험상품을 수집하고 매칭 키워드를 정리해 추천 snapshot으로 발행하는 흐름을 구현 가능하게 한다 |
| Potential Impact | 실손의료보험과 암보험을 함께 다룰 수 있어 한국 시장 커버리지가 넓어진다 |
| Novelty | 공식 문서 hash와 유전자 위험 매칭을 분리해 검증 가능한 보험 추천을 만든다 |
| UX | 사용자는 추천 이유, 보험료 기준, 출처 확인일, caveat를 함께 볼 수 있다 |
| Open-source | 보험 공시자료 수집 파이프라인과 DB 설계를 다른 빌더가 재사용할 수 있다 |
| Business Plan | 보험 제휴, 중개, 구독 모델에 필요한 상품 신뢰성 기반을 만든다 |

---

## 12. Related Documents

- **Technical_Specs**: [DB Schema](./DB_SCHEMA.md) - 현재 구현 스키마와 기존 `insurance_products` 구조
- **Technical_Specs**: [Insurance Data Collection Pipeline](./01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 수집/매칭 키워드 정리/추천 snapshot 발행 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](./03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - DNA risk target과 보험상품 보장 키워드 매칭 기준
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 적용 트랙
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 조건별 보험료 matrix와 seed 발행 정책
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 다음 구현 단계
- **QA_Validation**: [Hash-backed Matching Keyword Review](../05_QA_Validation/08_HASH_BACKED_PRODUCT_MANUAL_REVIEW_2026_05_27.md) - 스키마 gap을 만든 매칭 키워드 정리 근거
- **QA_Validation**: [DB Migration 0004/0005 Validation](../05_QA_Validation/09_DB_MIGRATION_0004_0005_2026_05_28.md) - Turso 적용 및 검증 결과
- **QA_Validation**: [Premium Quote Matrix PoC](../05_QA_Validation/12_PREMIUM_QUOTE_MATRIX_POC_2026_05_28.md) - `insurance_premium_quotes`를 구현하게 된 재조회 근거
- **QA_Validation**: [Premium Quotes Schema Migration](../05_QA_Validation/13_PREMIUM_QUOTES_SCHEMA_MIGRATION_2026_05_28.md) - `0006` migration 생성 검증
