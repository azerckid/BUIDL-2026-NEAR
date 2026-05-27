# [QA] Hash-backed 보험상품 수동 검수 결과
> Created: 2026-05-27 15:36
> Last Updated: 2026-05-28 02:36

- **레이어**: 05_QA_Validation
- **상태**: Manual Review v1.2 완료
- **범위**: 공식 문서 hash가 확보된 7개 상품을 기준으로 판매상태, 보험료 기준, 보장 카테고리, 매칭 전략을 수동 검수했다.
- **결론**: 현재 `insurance_products` seed에 바로 넣을 상품은 0개다. 암보험 2개는 `catalog_candidate`, 실손의료보험 4개는 `baseline_candidate`, 삼성생명 입원 건강보험 1개는 `schema_extension_required`로 분류한다. 서비스 seed 승격 전에는 보험료 기준, 판매상태, 보장 caveat, source row 삽입 방식을 추가 승인해야 한다.

---

## 1. 검수 입력

| 입력 | 파일 |
|---|---|
| 검수 대기열 | `data/insurance/latest_insurance_review_queue.csv` |
| 공식 상품 페이지/PDF probe | `data/insurance/latest_product_document_probe.json` |
| 보험사 공시실 crawler | `data/insurance/latest_carrier_disclosure_probe.json` |
| 다운로드 검수 위치 | `/private/tmp/insurance_review_v12` |

검수 중 PDF 파일을 다시 내려받아 SHA-256을 확인했고, 기존 수집 JSON의 hash와 일치했다.

### 1-1. v1.2 검수 요약

`latest_seed_candidate_review.*` 산출물은 아래 7개 상품의 구조화 검수 결과를 포함한다.

| 분류 | 개수 | 해석 |
|---|---:|---|
| `catalog_candidate` | 2개 | 암보험으로 `risk_target` 매칭 후보이나, 보험료 기준과 보장 caveat 승인 전까지 seed에 넣지 않는다 |
| `baseline_candidate` | 4개 | 실손의료보험으로 `medical_expense` + `baseline` 추천 후보이나, 유전자 질병 특화 추천으로 쓰지 않는다 |
| `schema_extension_required` | 1개 | 삼성생명 입원 건강보험은 `hospitalization` 또는 `general_health` 계열 카테고리 결정이 필요하다 |
| `current_insurance_products_seed_ready` | 0개 | 사용자 서비스 seed로 바로 승격할 상품은 없다 |

---

## 2. 상품별 판정

| 보험사 | 상품 | 공식 문서 | 수동 검수 판정 | 추천 카테고리/전략 | 현재 DB seed 가능 여부 |
|---|---|---|---|---|---|
| 한화생명 | 한화생명 e암보험(비갱신형)(무)(표준체형) | 상품요약서, 약관 | `catalog_candidate` | `oncology` / `risk_target` | 불가. 보험료 0원 값, 보장 caveat, source row 승인 필요 |
| 신한라이프생명 | 신한SOL암보험(무배당, 해약환급금 미지급형)(비갱신형) | 상품요약서, 사업방법서, 판매약관 | `catalog_candidate` | `oncology` / `risk_target` | 불가. 90일 면책과 암 급부 caveat 승인 필요 |
| DB손보 | (무)다이렉트 실손의료비보험2605(CM) | 약관, 사업방법서, 상품요약서 | `baseline_candidate` | `medical_expense` / `baseline` | 불가. 보험료 기준과 baseline 노출 방식 승인 필요 |
| KB손보 | KB손보 다이렉트실손의료비보장보험(무배당)(26.05) | 약관 | `baseline_candidate` | `medical_expense` / `baseline` | 불가. 보험료 기준과 baseline 노출 방식 승인 필요 |
| 삼성화재 | 무배당 삼성화재 다이렉트 실손의료비보험(2605.1) | 약관 | `baseline_candidate` | `medical_expense` / `baseline` | 불가. 판매상태와 보험료 기준 승인 필요 |
| 현대해상 | (무)현대해상다이렉트실손의료비보장보험(갱신형)(Hi2605) | 약관 | `baseline_candidate` | `medical_expense` / `baseline` | 불가. 갱신형 caveat와 보험료 기준 승인 필요 |
| 삼성생명 | 삼성 인터넷 입원 건강보험(2601)(무배당,무해약환급금형) | 통합약관 | `schema_extension_required` | `hospitalization_general_health_required` / `baseline_or_manual` | 불가. 카테고리 또는 수동 카탈로그 처리 결정 필요 |

---

## 3. 핵심 근거

### 3-1. 암보험 catalog 후보

한화생명 e암보험과 신한SOL암보험은 공식 문서에서 상품명과 암보험 성격을 확인했다. 따라서 `coverage_category=oncology`, `matching_strategy=risk_target` 후보로 볼 수 있다.

다만 현재 DB seed에는 바로 넣지 않는다.

- 한화생명 보험다모아 수집값의 보험료가 `0원`이므로 실제 월 보험료로 사용할 수 없다.
- 신한SOL암보험은 상품요약서 기준 비갱신형 인터넷 암보험으로 확인되지만, 암 급부 차이와 90일 면책 caveat를 사용자에게 함께 보여야 한다.
- 유방암/직결장암 등은 일반암과 다른 급부로 구분될 수 있으므로, 단순 `risk_targets` 배열만으로는 보장 차이를 표현하기 어렵다.
- source table 삽입 방식과 보험료 산정 기준을 승인하기 전까지 서비스 seed로 승격하지 않는다.

임시 매핑 후보는 다음과 같다.

```json
{
  "coverage_category": "oncology",
  "matching_strategy": "risk_target",
  "risk_targets": [
    "pancreatic_cancer",
    "liver_cancer",
    "lung_cancer",
    "breast_cancer",
    "colon_cancer"
  ]
}
```

이 매핑은 추천 후보 노출용이며, 보장금액과 급부 차이를 설명하는 caveat 필드가 승인된 뒤에만 서비스 seed로 승격한다.

### 3-2. 실손의료보험 baseline 후보

DB손보, KB손보, 삼성화재, 현대해상 실손의료보험은 공식 약관 또는 공시 문서 hash를 확인했다. 현재 스키마는 이미 `medical_expense`와 `matching_strategy=baseline`을 지원한다.

그러나 이 상품군은 암/심혈관/대사/신경계처럼 특정 유전자 위험 플래그와 직접 연결되는 상품이 아니라, 질병 및 상해 치료비를 폭넓게 보상하는 baseline 보장이다.

따라서 `risk_targets`에 특정 유전자 위험 플래그를 넣으면 과장 추천이 된다. 서비스에서 쓰려면 `risk_targets=[]`, `matching_strategy=baseline`으로 두고, "유전자 위험 특화 추천"이 아니라 "기본 의료비 방어"로 표시해야 한다.

### 3-3. 삼성생명 입원 건강보험

삼성생명 인터넷 입원 건강보험은 공식 통합약관 hash와 상품명을 확인했다. 다만 이 상품은 현재 enum의 `oncology`, `cardiovascular`, `metabolic`, `neurological`, `medical_expense` 중 어디에도 자연스럽게 들어가지 않는다.

선택지는 두 가지다.

1. `hospitalization` 또는 `general_health` 카테고리를 추가해 baseline 건강보험 후보로 관리한다.
2. 추천 seed가 아니라 source-aware catalog에만 보관하고, 유전자 매칭 추천에는 노출하지 않는다.

이 결정 전에는 seed 후보로 승격하지 않는다.

---

## 4. 산출물

| 파일 | 역할 |
|---|---|
| `data/insurance/latest_seed_candidate_review.json` | hash-backed 7개 상품의 수동 검수 결과와 문서 hash |
| `data/insurance/latest_seed_candidate_review.csv` | 사람이 빠르게 볼 수 있는 승격/차단 요약 |

이번 산출물은 서비스 DB seed가 아니다. 다음 PR에서 승인된 상품만 source-aware seed 후보로 옮기되, 보험료 기준과 판매상태가 확정되지 않은 상품은 `needs_review` 상태로 유지한다.

---

## 5. 다음 결정

2026-05-28 02:36 KST 기준 스키마 확장과 DB migration은 완료됐다. 다음 결정은 seed 승격 정책이다.

1. 한화생명/신한라이프 암보험을 `catalog_candidate`에서 `needs_review` seed 후보로 옮길지 결정한다.
2. DB손보/KB손보/삼성화재/현대해상 실손의료보험을 `baseline` 추천으로 노출할지 결정한다.
3. 삼성생명 입원 건강보험을 위해 `hospitalization`/`general_health` 카테고리를 추가할지, source catalog 전용으로 둘지 결정한다.
4. 보험다모아 보험료의 산정 기준을 seed에 어떤 문구로 기록할지 확정한다.
5. 각 상품의 source row와 source document row 삽입 기준을 확정한다.

---

## 6. 365 Rubric 영향

| Rubric | 검수 영향 |
|---|---|
| Functionality | mock seed를 실제 상품으로 교체하기 전에 필요한 seed 승인 기준을 상품별로 분리했다 |
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
