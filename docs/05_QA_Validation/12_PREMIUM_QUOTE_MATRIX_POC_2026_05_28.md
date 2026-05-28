# [QA] 보험료 Quote Matrix 재조회 PoC
> Created: 2026-05-28 15:02
> Last Updated: 2026-05-28 15:02

- **레이어**: 05_QA_Validation
- **상태**: Completed - Partial Pass
- **범위**: 보험다모아 모바일 비교 화면의 나이/성별 조건별 보험료 재조회 가능성 확인
- **결론**: 조건별 보험료 재조회는 일부 가능하다. 암보험은 나이/성별 matrix 재조회가 가능했고, 실손의료보험은 남성 나이별 재조회가 가능했다. 다만 실손의료보험 여성 조건은 현재 파라미터로 HTTP 500을 반환해 추가 파라미터 확인이 필요하다.

---

## 1. 목적

보험 추천 서비스가 사용자 DNA 분석 결과와 함께 실제 상품을 소개하려면, 보험료를 단일 대표값으로만 다루면 안 된다. 보험료는 나이, 성별, 보장금액, 납입기간, 특약 조합에 따라 달라지기 때문이다.

이번 PoC는 `insurance_premium_quotes` 테이블을 설계하기 전에, 공식 비교 출처에서 최소한 나이/성별 기준으로 같은 상품의 보험료를 다시 조회할 수 있는지 확인한다.

---

## 2. 실행 방법

실행 명령:

```bash
npm run collect:insurance:quotes
```

생성 산출물:

| 항목 | 값 |
|---|---|
| 스크립트 | `scripts/insurance/probe-premium-quotes.mjs` |
| 결과 JSON | `data/insurance/latest_premium_quote_probe.json` |
| 실행 시각 | `2026-05-28T15:00:20.530+09:00` |
| source probe | 8건 |
| quote row | 66건 |
| QA 판정 | `quote_requery_possible: true` |

---

## 3. 조회 조건

| condition_id | 나이 | 성별 | 암보험 sex code | 실손 sex code |
|---|---:|---|---|---|
| `age34_male` | 34 | male | `1` | `M` |
| `age34_female` | 34 | female | `2` | `F` |
| `age44_male` | 44 | male | `1` | `M` |
| `age44_female` | 44 | female | `2` | `F` |

| 출처 | 방식 | 결과 |
|---|---|---|
| 보험다모아 암보험 모바일 | GET HTML | 4개 조건 모두 HTTP 200, 조건별 12개 상품 row 추출 |
| 보험다모아 실손의료보험 모바일 | POST HTML | 남성 34세/44세는 HTTP 200, 조건별 9개 상품 row 추출 |
| 보험다모아 실손의료보험 모바일 | POST HTML | 여성 34세/44세는 HTTP 500, 0개 상품 row |

---

## 4. 가격 변동 확인 결과

같은 `e_insmarket_product_code` 기준으로 조건별 보험료가 달라지는 상품이 확인됐다.

| 상품 코드 | 보험사 | 그룹 | 확인 조건 수 | 확인된 월 보험료 KRW |
|---|---|---|---:|---|
| `L11C009000006` | 신한라이프생명 | 암보험 | 4 | 6,750 / 7,320 / 8,530 / 10,030 |
| `N11G004000001G` | DB손보 | 실손의료보험 | 2 | 6,219 / 9,320 |
| `N10G004000002G` | KB손보 | 실손의료보험 | 2 | 6,400 / 9,074 |
| `N08G004000002G` | 삼성화재 | 실손의료보험 | 2 | 6,575 / 9,546 |
| `N09G004000001G` | 현대해상 | 실손의료보험 | 2 | 6,740 / 9,190 |

세부 예시는 다음과 같다.

| 그룹 | 조건 | 상품 코드 | 보험사 | 월 보험료 |
|---|---|---|---|---:|
| 암보험 | 34세 남성 | `L11C009000006` | 신한라이프생명 | 8,530 |
| 암보험 | 34세 여성 | `L11C009000006` | 신한라이프생명 | 6,750 |
| 암보험 | 44세 남성 | `L11C009000006` | 신한라이프생명 | 10,030 |
| 암보험 | 44세 여성 | `L11C009000006` | 신한라이프생명 | 7,320 |
| 실손의료보험 | 34세 남성 | `N10G004000002G` | KB손보 | 6,400 |
| 실손의료보험 | 44세 남성 | `N10G004000002G` | KB손보 | 9,074 |

한화생명 암보험 `L01C009000009`는 이번 조건에서 `0원`으로 표시되어 숫자형 월 보험료 변동 근거로 쓰지 않는다.

---

## 5. 해석

이번 PoC로 확인된 것은 "공식 비교 화면의 조건별 대표 보험료를 다시 조회할 수 있다"는 점이다. 이것은 사용자별 확정 견적이나 청약 심사 결과가 아니다.

따라서 UI와 DB에서는 다음 구분을 유지한다.

| 구분 | 의미 | 사용자 표시 |
|---|---|---|
| 대표 보험료 | source row에 저장된 공식 비교 조건 기준 예시 가격 | "공식 비교 기준 예시 보험료" |
| 조건별 예상 보험료 | 나이/성별 등 조건을 명시한 quote matrix row | "입력 조건 기준 예상 보험료" |
| 확정 보험료 | 보험사 인수심사와 청약 단계 이후 금액 | 현재 서비스 범위 밖 |

---

## 6. 미해결 블로커

| 블로커 | 영향 | 다음 확인 |
|---|---|---|
| 실손의료보험 여성 POST 파라미터가 HTTP 500 반환 | 실손 quote matrix를 성별 전체로 채울 수 없음 | 모바일 입력 폼 또는 공식 문서에서 여성 코드와 필수 hidden field 확인 |
| 보험다모아 파라미터 의미가 공식 API 문서로 검증되지 않음 | 수집 파라미터 해석이 화면 관찰 기반에 머무름 | `sex`, `sexDiv`, `realLossDivCd`, `joinScrtDivCd` 의미 문서화 |
| 보장금액, 납입기간, 특약 조합 미조회 | 실제 가격 matrix가 아직 최소 조건에 한정됨 | schema에 nullable column을 두고 후속 crawler에서 확장 |
| `quote_params_json`에 POST 중복 키 보존 필요 | `insrCmpyCd` 같은 반복 파라미터가 object 변환 시 유실될 수 있음 | 배열 기반 원문 파라미터 저장 유지 |

---

## 7. DB 설계 반영 사항

`insurance_premium_quotes` schema PR에서는 최소한 다음 필드를 반영해야 한다.

| 필드 | 이유 |
|---|---|
| `product_source_id` | source-aware 상품 후보와 quote row 연결 |
| `carrier_id` | 보험사별 가격 조회/필터링 |
| `age` | 보험료 산정 조건 |
| `sex` | 정규화 성별 값 |
| `source_sex_code` | 원문 파라미터 보존 |
| `premium_text` | 화면 표시 원문 |
| `monthly_premium_krw` | 숫자 비교와 정렬 |
| `quote_source_url` | 재현 가능한 출처 |
| `quote_params_json` | GET/POST 원문 파라미터 |
| `quote_hash_sha256` | 응답 중복 감지와 변경 추적 |
| `retrieved_at` | 가격 시점 관리 |
| `review_status` | raw quote와 노출 가능 quote 분리 |

이번 PoC 결과는 DB에 바로 적재하지 않는다. 다음 PR에서 schema와 migration을 먼저 만들고, 그 다음 crawler PR에서 P0 후보 quote row를 저장한다.

---

## 8. DoD 점검

| 항목 | 결과 |
|---|---|
| 공식 비교 출처에서 조건별 재조회 수행 | 완료 |
| 스크립트 반복 실행 경로 추가 | 완료 |
| 결과 JSON에 응답 hash와 조회 파라미터 기록 | 완료 |
| 같은 상품 코드의 보험료 변동 확인 | 완료 |
| 전체 matrix 수집 가능 여부 확정 | 부분 완료. 실손 여성 파라미터 확인 필요 |
| active 추천 상품 변경 | 수행하지 않음 |
| DB seed 또는 migration 변경 | 수행하지 않음 |

---

## 9. 다음 작업

1. 실손의료보험 여성 조회 파라미터를 공식 화면 기준으로 재확인한다.
2. `insurance_premium_quotes` Drizzle schema와 migration을 작성한다.
3. P0 암보험/실손의료보험 후보부터 quote matrix raw row를 수집한다.
4. UI에서 대표 보험료와 조건별 예상 보험료를 분리 표시하는 요구사항을 작성한다.

---

## 10. Related Documents

- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 트랙의 진행 상태
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 조건별 보험료 matrix 관리 방침
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 다음 작업
- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - 현재 보험 카탈로그 확장 스키마
- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 공식 출처 수집 파이프라인
- **QA_Validation**: [Source-aware Seed DB Apply](./11_SOURCE_AWARE_SEED_DB_APPLY_2026_05_28.md) - seed 적용 이후 quote matrix 이전 상태
