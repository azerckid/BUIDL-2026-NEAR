# [QA] Quote-only Source 문서 Variant 검수
> Created: 2026-05-29 02:58
> Last Updated: 2026-05-29 02:58

- **레이어**: 05_QA_Validation
- **상태**: Partial Passed
- **범위**: quote-only raw source 중 공식 문서 hash가 확보된 암보험 후보의 상품 variant 검수
- **결론**: 한화생명 비흡연체형 1개와 교보라이프플래닛 비흡연체/표준체 2개는 `insurance_source_documents` seed 후보로 분리 가능하다. KDB생명은 2개 약관 PDF가 동시에 잡혀 variant가 미해결이고, 신한라이프는 표준형 source에 해약환급금 미지급형 문서가 매칭되어 차단한다. DB write는 하지 않았다.

---

## 1. 입력과 산출물

| 항목 | 파일 |
|---|---|
| 상품 페이지 probe | `data/insurance/latest_quote_only_product_document_probe.json` |
| carrier disclosure probe | `data/insurance/latest_quote_only_carrier_disclosure_probe.json` |
| variant 검수 JSON | `data/insurance/latest_quote_only_source_document_variant_review.json` |
| variant 검수 CSV | `data/insurance/latest_quote_only_source_document_variant_review.csv` |

이번 검수는 seed 적용 전 의사결정 자료다. `src/lib/db/seed.ts`와 Turso DB는 변경하지 않는다.

---

## 2. 요약

| 항목 | 값 |
|---|---:|
| 검수 source 후보 | 5 |
| 검수 document row | 14 |
| seed 후보 source | 3 |
| seed 후보 document row | 8 |
| 차단 source | 2 |
| 차단 document row | 6 |
| DB write | 0 |

---

## 3. Seed 후보

| 보험사 | Source ID | Product code | 문서 | 판정 |
|---|---|---|---:|---|
| 한화생명 | `src_hanwha_life_e_cancer_nonsmoker_202604` | `L01C009000010` | 2 | `seed_candidate_with_shared_document_note` |
| 교보라이프플래닛 | `src_kyobo_lifeplanet_cancer_nonsmoker_202605` | `L43C009000022` | 3 | `seed_candidate_shared_disclosure_product` |
| 교보라이프플래닛 | `src_kyobo_lifeplanet_cancer_standard_202605` | `L43C009000019` | 3 | `seed_candidate_shared_disclosure_product` |

한화생명은 공식 PDF 제목에 비흡연체형 문구가 직접 드러나지 않지만, 보험다모아 source row와 같은 공식 상품 페이지에서 문서 hash가 확보됐다. 기존 표준체형 source와 동일 문서를 공유할 가능성이 높으므로, 문서 row는 추가하되 source/recommendation 상태는 `needs_review`로 유지해야 한다.

교보라이프플래닛은 공시실 상품 코드 `10054`가 비흡연체와 표준체 source에 공통 적용된다. 두 source는 보험료 quote row로 구분하고, 공식 문서는 shared disclosure document로 연결한다. 이 역시 추천 승격이 아니라 문서 근거 보강만 한다.

---

## 4. 차단 후보

| 보험사 | Source ID | Product code | 차단 이유 |
|---|---|---|---|
| KDB생명 | `src_kdb_life_direct_cancer_202605` | `L33C009000025` | `40869_policy`, `40870_policy` 두 약관 PDF가 동시에 잡혀 정확한 variant 미확정 |
| 신한라이프생명 | `src_shinhan_life_sol_cancer_standard_202605` | `L11C009000007` | quote-only source는 표준형처럼 보이나 공시 crawler 문서는 해약환급금 미지급형이고 match score가 0.5 |

KDB생명은 `40869_summary`와 `40869_policy`가 번호상 짝을 이루지만, `40870_policy`도 같은 페이지에서 hash됐다. PDF 표지 또는 KDB direct product API metadata를 확인하기 전에는 seed에 넣지 않는다.

신한라이프는 동일 문서가 이미 기존 `src_shinhan_life_sol_cancer_202601` source에 연결되어 있다. quote-only 표준형 source에 같은 문서를 재사용하면 variant 오연결 가능성이 있으므로, 표준형 문서 endpoint를 찾거나 두 source가 동일 상품임을 확인해야 한다.

---

## 5. 다음 작업

1. 한화생명 비흡연체형 2개 문서와 교보라이프플래닛 6개 문서를 `insurance_source_documents` seed 후보로 추가한다.
2. seed 적용 시 `insurance_product_sources.review_status`는 계속 `needs_review` 또는 `raw`로 유지하고, 추천 상품으로 승격하지 않는다.
3. KDB생명은 40869/40870 약관 variant를 PDF 표지나 API metadata로 확인한다.
4. 신한라이프는 표준형과 해약환급금 미지급형의 상품 코드/문서 관계를 재확인한다.

---

## 6. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | hash 확보와 seed 적용 사이에 variant gate를 추가해 잘못된 문서 연결을 막는다 |
| Potential Impact | quote-only source 확장을 안전하게 진행할 수 있는 반복 검수 단계를 만든다 |
| Novelty | 보험료 quote source와 공식 문서 source를 분리한 뒤 variant 단위로 재결합한다 |
| UX | 추천 전 근거 문서가 정확히 맞는 상품인지 확인해 사용자 오안내를 줄인다 |
| Open-source | JSON/CSV manifest로 다음 seed PR의 입력을 재현 가능하게 남긴다 |
| Business Plan | 실제 보험상품 universe 확장을 운영 가능한 검수 비용 단위로 쪼갠다 |

---

## 7. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - raw/needs_review/approved 의미
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Quote-only Source 공식 문서 Probe 검증](./20_QUOTE_ONLY_SOURCE_DOCUMENT_PROBE_2026_05_29.md) - quote-only product-code probe 1차 결과
- **QA_Validation**: [교보라이프플래닛 공시 Adapter 검증](./21_LIFEPLANET_DISCLOSURE_ADAPTER_2026_05_29.md) - 교보 공식 문서 hash 확보
- **Data**: [Quote-only Source Document Variant Review JSON](../../data/insurance/latest_quote_only_source_document_variant_review.json) - 구조화 검수 결과
- **Data**: [Quote-only Source Document Variant Review CSV](../../data/insurance/latest_quote_only_source_document_variant_review.csv) - 검수 요약
