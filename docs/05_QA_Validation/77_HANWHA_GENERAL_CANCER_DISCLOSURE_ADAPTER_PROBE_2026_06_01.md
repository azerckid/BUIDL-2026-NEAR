# [QA] 한화손보 암보험 공시 Adapter Probe 검증
> Created: 2026-06-01 01:57
> Last Updated: 2026-06-01 01:57

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 한화손보 `src_hanwha_general_direct_cancer_202604` 공식 약관 PDF hash 검증
- **결론**: 한화손보 다이렉트 내가고른 암보험 화면의 JavaScript 약관 다운로드 경로를 재현해 공식 약관 PDF 1건을 hash했다. 이번 작업은 DB write 없이 crawler와 산출물만 갱신했다.

---

## 1. 실행 명령

```bash
node scripts/insurance/collect-carrier-disclosures.mjs --product-probe data/insurance/latest_remaining_raw_source_product_document_probe.json --out data/insurance/latest_hanwha_general_cancer_disclosure_adapter_probe.json --timeout-ms 30000 --max-documents-per-product 5
```

---

## 2. 코드 변경 요약

| 항목 | 내용 |
|---|---|
| 신규 carrier profile | `한화손보` |
| 신규 search kind | `hanwha_direct_terms_pdf` |
| source page | `https://www.hanwhadirect.com/` |
| 공식 JS | `https://www.hanwhadirect.com/resource/inspl/ltr/cncr/js/main.js?sid=20260601` |
| 공식 PDF | `https://www.hanwhadirect.com/clapdf/LA02969001.pdf` |
| 검색 대상 | `한화 다이렉트 내가고른 암보험 무배당 2604` |

한화손보 `landing.do` 경로는 세션 쿠키나 브라우저 조건이 없으면 error page 또는 IE update page로 이동할 수 있다. adapter는 공식 화면의 약관 다운로드 버튼이 호출하는 `main.js`의 `downPdf('/clapdf/LA02969001.pdf')`를 재현하고, PDF 요청에는 실제 브라우저 User-Agent와 Referer를 함께 전달한다.

---

## 3. 실행 결과

| 항목 | 값 |
|---|---:|
| targets | 7 |
| carrier_pages | 6 |
| accessible_pages | 6 |
| 전체 hashed_documents | 12 |
| 한화손보 matched_product_count | 1 |
| 한화손보 hashed_documents | 1 |

한화손보 document candidate:

| document_type | source_context | content_length_bytes | sha256 |
|---|---|---:|---|
| `terms` | `한화 다이렉트 내가고른 암보험 무배당 2604 보험약관 LA02969001.pdf` | 2,071,737 | `ca8dd26a25c1aa60cefb4c298c8df843f8a35d5bf0ff758a0624e37ddaf15ca0` |

---

## 4. 산출물

| 파일 | 내용 |
|---|---|
| `../../data/insurance/latest_hanwha_general_cancer_disclosure_adapter_probe.json` | 한화손보 adapter 재실행 결과 |
| `../../data/insurance/latest_hanwha_general_cancer_disclosure_adapter_probe_summary.csv` | raw source별 hash 확보 요약 |

---

## 5. 판단

한화손보 암보험 source는 공식 약관 evidence gate를 통과했다. 다만 사용자 추천에는 아직 노출하지 않는다.

다음 PR은 아래 순서를 따른다.

1. `LA02969001.pdf`가 보험다모아 source `N02C009000016`과 동일한 상품 variant인지 확인한다.
2. `coverage_category=oncology`, `matching_strategy=risk_target`, `risk_targets`와 caveat를 정리한다.
3. quote row 4건의 숫자 KRW 조건을 확인한 뒤 source document seed, quote approval, `insurance_products` snapshot 발행 여부를 결정한다.

---

## 6. 안전성

- 운영 DB write 없음.
- 신규 hash는 한화손보 공식 다이렉트 JS와 공식 `clapdf` PDF 경로에서 직접 계산했다.
- 한화손보 source는 계속 `raw`이며 추천 UI에 노출되지 않는다.
- 한화손보 실손 source는 공식 상품 URL이 아직 없어 이번 PR 범위에서 제외한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 한화손보 다이렉트 JS 기반 약관 다운로드 흐름을 crawler가 재현했다 |
| Potential Impact | 남은 암보험 raw source 1건을 추천 snapshot 후보로 넘길 공식 문서 근거를 확보했다 |
| Novelty | 보험다모아 source와 보험사 다이렉트 화면의 동적 약관 다운로드 경로를 연결했다 |
| UX | 공식 약관 hash가 확보된 상품만 다음 매칭 단계로 넘겨 추천 근거 품질을 유지한다 |
| Open-source | 세션 의존 랜딩 페이지 대신 공식 JS 다운로드 경로를 검증하는 adapter 패턴을 추가했다 |
| Business Plan | 실제 판매 암보험 카탈로그 확장을 위한 반복 가능한 수집 단위를 확보했다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Remaining Raw Source Document Probe](./60_REMAINING_RAW_SOURCE_DOCUMENT_PROBE_2026_05_31.md) - raw source probe 결과
- **QA_Validation**: [Mirae Asset Life Cancer DB Apply](./76_MIRAEASSET_LIFE_CANCER_DB_APPLY_2026_06_01.md) - 직전 추천 snapshot 적용 상태
