# [QA] Hash-backed 보험상품 수동 검수 결과
> Created: 2026-05-27 15:36
> Last Updated: 2026-05-28 02:28

- **레이어**: 05_QA_Validation
- **상태**: Manual Review v1 완료, v1.2 추가 검수 대기
- **범위**: v1 수동 검수는 공식 문서 hash가 확보된 3개 상품 기준으로 완료했다. 2026-05-28 crawler v1.2 이후 hash-backed row는 7개로 늘어났으며, 신규 4개는 아직 수동 검수 전이다.
- **결론**: v1 기준 현재 `insurance_products` 스키마에 바로 넣을 수 있는 상품은 0개다. 한화생명 e암보험은 출처 기반 카탈로그 후보로 승격 가능하지만, DB손보/삼성화재 실손의료보험은 `medical_expense` 계열 스키마가 먼저 필요하다. v1.2 신규 상품은 판매상태, 보험료 산정 기준, 보장 카테고리, risk_targets 검수 전까지 seed 후보로 승격하지 않는다.

---

## 1. 검수 입력

| 입력 | 파일 |
|---|---|
| 검수 대기열 | `data/insurance/latest_insurance_review_queue.csv` |
| 공식 상품 페이지/PDF probe | `data/insurance/latest_product_document_probe.json` |
| 보험사 공시실 crawler | `data/insurance/latest_carrier_disclosure_probe.json` |
| 다운로드 검수 위치 | `/private/tmp/insurance_review` |

검수 중 PDF 파일을 다시 내려받아 SHA-256을 확인했고, 기존 수집 JSON의 hash와 일치했다.

### 1-1. 2026-05-28 추가 검수 대기

보험사 공시실 crawler v1.2에서 아래 상품이 새로 `needs_human_review`에 포함됐다. 아직 PDF 내용 수동 검수와 카테고리 매핑을 완료하지 않았으므로 `latest_seed_candidate_review.*` 산출물에는 반영하지 않는다.

| 보험사 | 상품 | 확보 문서 | 현재 상태 |
|---|---|---|---|
| 신한라이프생명 | 신한SOL암보험(무배당, 해약환급금 미지급형)(비갱신형) | 상품요약서, 사업방법서, 판매약관 | `pending_manual_review` |
| KB손보 | KB손보 다이렉트실손의료비보장보험(무배당)(26.05) | 약관 | `pending_manual_review` |
| 현대해상 | (무)현대해상다이렉트실손의료비보장보험(갱신형)(Hi2605) | 약관 | `pending_manual_review` |
| 삼성생명 | 삼성 인터넷 입원 건강보험(2601)(무배당,무해약환급금형) | 통합약관 | `pending_manual_review` |

---

## 2. 상품별 판정

| 보험사 | 상품 | 공식 문서 | 수동 검수 판정 | 현재 DB seed 가능 여부 |
|---|---|---|---|---|
| 한화생명 | 한화생명 e암보험(비갱신형)(무)(표준체형) | 상품요약서, 약관 | `catalog_candidate` | 불가. 출처/보험료/보장 caveat 필드 필요 |
| DB손보 | (무)다이렉트 실손의료비보험2605(CM) | 약관, 사업방법서, 상품요약서 | `schema_extension_required` | 불가. `medical_expense` 카테고리 필요 |
| 삼성화재 | 무배당 삼성화재 다이렉트 실손의료비보험(2605.1) | 약관 | `schema_extension_required` | 불가. `medical_expense` 카테고리 필요 |

---

## 3. 핵심 근거

### 3-1. 한화생명 e암보험

공식 상품요약서에서 상품명과 암 진단자금 보장 성격을 확인했다. 따라서 `coverage_category=oncology` 후보로 볼 수 있다.

다만 현재 DB seed에는 바로 넣지 않는다.

- 보험다모아 수집값의 보험료가 `0원`이므로 실제 월 보험료로 사용할 수 없다.
- 현재 테이블에 `monthly_premium_krw`, `premium_basis`, `source_url`, `source_document_hash`, `source_checked_at`이 없다.
- 유방암/직결장암 등은 일반암과 다른 급부로 구분되므로, 단순 `risk_targets` 배열만으로는 보장 차이를 표현하기 어렵다.

임시 매핑 후보는 다음과 같다.

```json
{
  "coverage_category": "oncology",
  "risk_targets": [
    "pancreatic_cancer",
    "liver_cancer",
    "lung_cancer",
    "breast_cancer",
    "colon_cancer"
  ]
}
```

이 매핑은 추천 후보 노출용이며, 보장금액과 급부 차이를 설명하는 caveat 필드가 추가된 뒤에만 서비스 seed로 승격한다.

### 3-2. DB손보 다이렉트 실손의료비보험

DB손보 공시 API에서 상품명, 판매중 기록, 약관/사업방법서/요약서 PDF hash를 확인했다. 상품 자체의 공식성은 가장 강하게 확인됐다.

그러나 이 상품은 암/심혈관/대사/신경계 중 하나가 아니라 질병 및 상해 치료비를 보상하는 실손의료보험이다. 현재 enum에는 이를 담을 `medical_expense` 또는 `general_health` 카테고리가 없다.

따라서 현재 `risk_targets`에 특정 유전자 위험 플래그를 넣으면 과장 추천이 된다. 스키마 확장 전에는 서비스 추천 DB에 넣지 않는다.

### 3-3. 삼성화재 다이렉트 실손의료비보험

삼성화재 공식 문서 경로에서 약관 PDF hash를 확인했고, 문서 내용상 실손의료비보험임을 확인했다.

DB손보와 같은 이유로 현재 enum에 직접 매핑하지 않는다. 또한 이번 검수에서는 상품요약서나 사업방법서까지 확보하지 못했으므로 판매상태와 보험료 기준 검수도 추가로 필요하다.

---

## 4. 산출물

| 파일 | 역할 |
|---|---|
| `data/insurance/latest_seed_candidate_review.json` | hash-backed 3개 상품의 수동 검수 결과와 문서 hash |
| `data/insurance/latest_seed_candidate_review.csv` | 사람이 빠르게 볼 수 있는 승격/차단 요약 |

이번 산출물은 서비스 DB seed가 아니다. 다음 PR에서 스키마 확장과 출처 필드를 먼저 반영한 뒤, 승인된 상품만 seed 후보로 옮긴다.

---

## 5. 다음 결정

2026-05-27 22:43 KST 기준 다음 결정은 완료됐다.

1. `insurance_product_sources`, `insurance_source_documents`, `insurance_carriers`를 신설한다.
2. `insurance_products.coverage_category`에 `medical_expense`를 추가한다.
3. `matching_strategy`를 추가해 `risk_target` 추천과 `baseline` 추천을 분리한다.
4. 국내 상품의 원화 보험료를 위해 `monthly_premium_krw`, `premium_basis`, `premium_currency`를 추가한다.
5. 추천 신뢰성을 위해 source table FK와 `source_checked_at`을 추가한다.
6. 암보험처럼 보장 급부가 세분화되는 상품을 위해 `coverage_caveats_json`, `coverage_details_json`을 추가한다.

상세 확정안은 `02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md`를 기준으로 한다.

---

## 6. 365 Rubric 영향

| Rubric | 검수 영향 |
|---|---|
| Functionality | mock seed를 실제 상품으로 교체하기 전에 필요한 스키마 gap을 발견했다 |
| Potential Impact | 실손의료보험까지 다루려면 유전자 특화 보장과 일반 의료비 보장을 분리해야 한다 |
| Novelty | 실제 공시 hash와 유전자 위험 매칭을 연결하는 검증형 카탈로그 구조로 전환한다 |
| UX | 사용자에게 추천 이유뿐 아니라 보험료 기준, 출처, 보장 caveat를 표시해야 한다 |
| Open-source | 공식 문서 hash 기반 검수 흐름을 재현 가능한 데이터 파이프라인으로 남겼다 |
| Business Plan | 보험상품 중개/비교 신뢰성을 위해 출처 필드와 판매상태 검수가 필수임을 확인했다 |

---

## 7. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 수집/검수/승격 파이프라인 명세
- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - 수동 검수 이후 확정한 스키마 확장안
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 상품 카탈로그 적용 트랙
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 다음 작업
- **QA_Validation**: [Insurance Review Queue](./07_INSURANCE_REVIEW_QUEUE_2026_05_27.md) - 수동 검수 전 대기열 생성 결과
- **QA_Validation**: [Carrier Disclosure Crawler](./06_CARRIER_DISCLOSURE_CRAWLER_2026_05_27.md) - 삼성화재/DB손보/KB손보/삼성생명/현대해상/신한라이프 문서 hash 확보 결과
- **QA_Validation**: [Product Document Probe](./05_PRODUCT_DOCUMENT_PROBE_2026_05_27.md) - 한화생명 상품요약서/약관 hash 확보 결과
- **Data**: [Latest Seed Candidate Review JSON](../../data/insurance/latest_seed_candidate_review.json) - 수동 검수 구조화 결과
- **Data**: [Latest Seed Candidate Review CSV](../../data/insurance/latest_seed_candidate_review.csv) - 수동 검수 요약
