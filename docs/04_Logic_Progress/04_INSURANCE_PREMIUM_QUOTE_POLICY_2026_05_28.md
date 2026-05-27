# [정책] 조건별 보험료 Quote Matrix 관리 방침
> Created: 2026-05-28 03:00
> Last Updated: 2026-05-28 03:00

- **레이어**: 04_Logic_Progress
- **상태**: Draft v1
- **범위**: 보험다모아/보험사 공시에서 수집한 보험료의 해석, 조건별 보험료 matrix 수집, seed 승격 정책
- **결론**: 현재 수집된 `premium_text`는 특정 비교 조건의 대표 보험료일 뿐이다. 나이, 성별, 납입기간, 보장금액별 보험료 변화는 별도 `insurance_premium_quotes` 테이블과 재조회 파이프라인으로 관리해야 한다.

---

## 1. 배경

PR #5 이후 공식 문서 hash가 확보된 상품 7개를 수동 검수했지만, 보험료는 대부분 보험다모아 비교 화면에서 추출한 `premium_text` 값이다.

이 값에는 가격 자체는 들어 있지만, 다음 질문에 답할 수 있는 데이터는 아직 없다.

- 34세 남성 기준 가격인지, 34세 여성 기준 가격인지
- 40세, 50세로 나이가 바뀌면 보험료가 어떻게 바뀌는지
- 월납/연납, 10년납/20년납, 갱신형/비갱신형 조건에 따른 차이가 무엇인지
- 보장금액이나 특약 구성이 바뀌면 보험료가 어떻게 변하는지
- 보험사가 실제 청약 심사 후 산출하는 최종 보험료와 얼마나 차이가 있는지

따라서 현재 가격은 "개인 맞춤 확정 견적"이 아니라 "공식 비교 조건 기준 대표 보험료"로만 사용한다.

---

## 2. 현재 DB가 담을 수 있는 것

현재 스키마는 대표 보험료를 담을 수 있다.

| 테이블 | 필드 | 의미 |
|---|---|---|
| `insurance_product_sources` | `premium_text` | 원문 표시 보험료. 예: `6,400원` |
| `insurance_product_sources` | `monthly_premium_krw` | 대표 월 보험료 숫자값. 예: `6400` |
| `insurance_product_sources` | `premium_basis` | 해당 보험료가 나온 조건 설명 |
| `insurance_products` | `monthly_premium_krw` | 추천 snapshot에 표시할 대표 KRW 보험료 |
| `insurance_products` | `monthly_premium_usdc` | 결제 데모/USDC 정산용 환산값 |
| `insurance_products` | `premium_basis` | 사용자에게 함께 표시할 산정 기준 |

이 구조는 한 상품의 대표 가격을 보여주기에는 충분하다. 하지만 조건별 가격표를 저장하기에는 부족하다.

---

## 3. 현재 DB가 아직 담지 못하는 것

아래 정보는 상품 row 하나에 컬럼을 계속 추가해서 해결하면 안 된다. 같은 상품에 대해 여러 조건의 가격이 생기기 때문이다.

| 필요한 정보 | 이유 |
|---|---|
| `age` | 보험료 산정의 핵심 조건 |
| `sex` | 보험료 산정의 핵심 조건 |
| `payment_period_years` | 납입기간별 보험료 차이 |
| `insurance_period_years` | 보험기간별 보험료 차이 |
| `coverage_amount_krw` | 가입금액/보장금액별 보험료 차이 |
| `plan_name` | 기본형, 해약환급금 미지급형, 표준체/비흡연체 등 플랜 차이 |
| `riders_json` | 특약 선택 조합 |
| `quote_params_json` | 보험다모아/보험사 조회 파라미터 원문 |
| `quote_source_url` | 가격을 산출한 원문 URL 또는 API |
| `retrieved_at` | 가격 조회 시점 |
| `review_status` | 수집 가격의 검수 상태 |

---

## 4. 제안 테이블: `insurance_premium_quotes`

조건별 보험료를 다루려면 별도 테이블을 추가한다.

| 컬럼 | 타입 후보 | 설명 |
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

인덱스 후보는 다음과 같다.

| 인덱스 | 목적 |
|---|---|
| `(product_source_id, age, sex)` | 특정 상품의 나이/성별별 보험료 조회 |
| `(product_source_id, review_status)` | 승인된 quote만 노출 |
| `(quote_hash_sha256)` | 동일 가격 응답 중복 감지 |

---

## 5. Seed 승격 정책

다음 source-aware seed PR에서는 조건별 보험료 matrix를 아직 seed에 넣지 않는다. 대신 대표 보험료를 다음 규칙으로만 사용한다.

1. `premium_text`가 있는 상품만 대표 가격 후보로 둔다.
2. `monthly_premium_krw`는 `premium_text`에서 숫자를 정규화한 값으로 저장한다.
3. `premium_basis`에는 원문 기준을 명시한다.
4. `premium_basis`가 불명확한 상품은 `catalog_status=needs_review` 또는 `review_status=needs_review`로 둔다.
5. 사용자 화면에는 "확정 견적"이 아니라 "공식 비교 조건 기준 예시 보험료"로 표시한다.
6. 결제 데모용 `monthly_premium_usdc`는 환산 기준일과 함께 별도 caveat를 붙인다.

권장 문구:

```text
보험다모아 비교 조건 기준 월 보험료입니다. 실제 보험료는 나이, 성별, 가입금액, 납입기간, 갱신 여부, 특약, 인수심사 결과에 따라 달라질 수 있습니다.
```

---

## 6. 다음 구현 순서

| 순서 | 작업 | PR 성격 |
|---:|---|---|
| 1 | source-aware seed 정책에 대표 보험료와 `premium_basis` 문구 반영 | 현재 seed 정책 PR |
| 2 | 보험다모아/보험사 페이지에서 age/sex 파라미터 재조회 가능성 확인 | 조사/PoC PR |
| 3 | `insurance_premium_quotes` Drizzle schema와 migration 설계 | DB schema PR |
| 4 | P0 상품 3~5개의 조건별 quote matrix 수집 | crawler PR |
| 5 | UI에서 "대표 보험료"와 "조건별 예상 보험료"를 분리 표시 | UI PR |

---

## 7. 365 Rubric 영향

| Rubric | 영향 |
|---|---|
| Functionality | 대표 보험료와 조건별 예상 보험료를 분리해 잘못된 견적 표시를 방지한다 |
| Potential Impact | 사용자 조건 기반 보험료 비교가 가능해지면 실제 구매 전환 가능성이 높아진다 |
| Novelty | 유전자 위험 추천과 공식 가격 matrix를 함께 검증하는 보험 카탈로그가 된다 |
| UX | 사용자는 "내 조건의 예상 가격"과 "공식 비교 기준 가격"의 차이를 이해할 수 있다 |
| Open-source | 보험료 quote matrix 수집/검수 구조를 다른 보험 데이터 프로젝트가 재사용할 수 있다 |
| Business Plan | 중개/비교 서비스로 전환하려면 조건별 보험료와 견적 caveat가 필수다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - 현재 대표 보험료 필드와 향후 quote matrix 테이블 설계
- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험료 수집/검수 파이프라인
- **Logic_Progress**: [Two Pillars Service Update](./03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 적용 트랙
- **Logic_Progress**: [Roadmap](./ROADMAP.md) - Track A 다음 작업
- **QA_Validation**: [Hash-backed Product Manual Review](../05_QA_Validation/08_HASH_BACKED_PRODUCT_MANUAL_REVIEW_2026_05_27.md) - seed 승격 전 보험료 기준 미승인 근거
