# [QA] 농협손보 공시 Adapter Probe 검증
> Created: 2026-05-31 19:26
> Last Updated: 2026-05-31 19:26

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 농협손보 `src_nh_fire_medical_202605` 공식 약관 다운로드 adapter 검증
- **결론**: 농협손보 상품 페이지의 `fnPdtFileDownload(fileId, afileSeqn, afileNm)` 호출을 파싱해 공식 약관 PDF 1건을 hash했다. 이번 작업은 DB write 없이 crawler와 산출물만 갱신했다.

---

## 1. 실행 명령

```bash
node scripts/insurance/collect-carrier-disclosures.mjs --product-probe data/insurance/latest_remaining_raw_source_product_document_probe.json --out data/insurance/latest_nh_fire_disclosure_adapter_probe.json --timeout-ms 30000
```

---

## 2. 코드 변경 요약

| 항목 | 내용 |
|---|---|
| 신규 carrier profile | `농협손보` |
| 신규 search kind | `nhfire_product_page_downloads` |
| source page | `https://www.nhfire.co.kr/product/retrieveProduct.nhfire?pdtCd=D711117` |
| 다운로드 추적 방식 | 상품 페이지 HTML의 `fnPdtFileDownload('F004074317', '1', '...약관.pdf')` 호출 파싱 |
| 실제 PDF endpoint | `https://www.nhfire.co.kr/imageView/downloadFile.ajax?fileId=F004074317&afileSeqn=1` |

기존 product page probe는 `.pdf` 문자열 URL만 따라가서 HTML 안내 응답을 받았다. 이번 adapter는 페이지의 실제 다운로드 함수 인자를 추출해 `/imageView/downloadFile.ajax` endpoint로 연결한다.

---

## 3. 실행 결과

| 항목 | 값 |
|---|---:|
| targets | 7 |
| carrier_pages | 2 |
| accessible_pages | 2 |
| hashed_documents | 1 |
| 농협손보 best_match_score | 1 |

농협손보 document candidate:

| 항목 | 값 |
|---|---|
| source | `src_nh_fire_medical_202605` |
| document_type | `terms` |
| status | `hashed` |
| sha256 | `0306fb42f84fa976ff9680aadf6a1b348e87d5c99cd503e85b1e82b9bf728048` |
| content_length_bytes | `3065859` |
| content_type | `application/octet-stream;charset=UTF-8` |

---

## 4. 산출물

| 파일 | 내용 |
|---|---|
| `../../data/insurance/latest_nh_fire_disclosure_adapter_probe.json` | 농협손보 adapter 재실행 결과 |
| `../../data/insurance/latest_nh_fire_disclosure_adapter_probe_summary.csv` | 농협손보 hash 확보 요약 |

---

## 5. 판단

농협손보 실손의료보험은 공식 약관 hash가 확보됐으므로 raw source에서 다음 단계로 이동할 수 있다. 다만 아직 매칭 키워드와 caveat 정리가 끝나지 않았고 `insurance_source_documents`에도 DB 적용되지 않았으므로 사용자 추천에는 노출하지 않는다.

다음 PR은 아래 순서를 따른다.

1. 농협손보 실손의료보험 `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]` 기준 검수.
2. 약관 hash를 `insurance_source_documents` seed 후보로 추가.
3. quote 4건과 caveat를 확인한 뒤 source approval과 baseline snapshot seed 여부 결정.

---

## 6. 안전성

- 운영 DB write 없음.
- 신규 hash는 공식 농협손보 다운로드 endpoint에서 직접 계산했다.
- source는 여전히 raw이며 추천 UI에 노출되지 않는다.
- 보험다모아 원천명과 농협손보 공식 상품명이 다르므로 `헤아림실손의료비보험2605` alias를 match text에 포함했다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | JS onclick 기반 다운로드를 crawler가 따라갈 수 있게 됐다 |
| Potential Impact | 실손 baseline 추천 후보를 1개 더 확장할 수 있는 근거를 확보했다 |
| Novelty | 직접 상품 페이지와 다운로드 함수 인자를 공식 문서 evidence로 연결했다 |
| UX | 근거 없는 raw 상품 노출을 막고, 출처가 확보된 상품만 다음 단계로 넘긴다 |
| Open-source | 다른 보험사 onclick/downloadFile 패턴 adapter 작성 기준으로 재사용 가능하다 |
| Business Plan | 실제 판매 상품 커버리지를 늘리는 반복 가능한 수집 단위를 확보했다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Remaining Raw Source Document Probe](./60_REMAINING_RAW_SOURCE_DOCUMENT_PROBE_2026_05_31.md) - 직전 raw source probe 결과
