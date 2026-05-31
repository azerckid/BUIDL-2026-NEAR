# [QA] 미래에셋생명 공시 Adapter Probe 검증
> Created: 2026-06-01 00:15
> Last Updated: 2026-06-01 00:15

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 미래에셋생명 `src_miraeasset_online_cancer_basic_202605`, `src_miraeasset_online_cancer_no_refund_202605` 공식 공시 문서 hash 검증
- **결론**: 미래에셋생명 상품공시 Ajax와 파일 다운로드 endpoint를 재현해 온라인 암보험 무배당 공식 PDF 3종을 hash했다. 이번 작업은 DB write 없이 crawler와 산출물만 갱신했다.

---

## 1. 실행 명령

```bash
node scripts/insurance/collect-carrier-disclosures.mjs --product-probe data/insurance/latest_remaining_raw_source_product_document_probe.json --out data/insurance/latest_miraeasset_life_disclosure_adapter_probe.json --timeout-ms 30000 --max-documents-per-product 5
```

---

## 2. 코드 변경 요약

| 항목 | 내용 |
|---|---|
| 신규 carrier profile | `미래에셋생명` |
| 신규 search kind | `miraeasset_disclosure_product_list` |
| source page | `https://life.miraeasset.com/micro/disclosure/product/PC-HO-080301-000000.do` |
| search endpoint | `https://life.miraeasset.com/micro/disclosure/selectWorkDvsnDataPaging.do` |
| download endpoint | `https://life.miraeasset.com/micro/cmmnFileDown.do` |
| 검색 조건 | `workDvsn=D`, `text1=판매중인상품`, `text2=온라인`, `text3=온라인 암보험` |

상품공시 화면은 `COMEXCEL.fn_getWorkDvsnDataPaging`으로 검색 결과를 받고, 각 row의 `cell4`, `cell5`, `cell6`, `cell7`로 상품요약서, 약관, 사업방법서 다운로드 링크를 만든다. adapter는 동일한 검색 endpoint와 `cmmnFileDown.do` query를 재현한다.

---

## 3. 실행 결과

| 항목 | 값 |
|---|---:|
| targets | 7 |
| carrier_pages | 5 |
| accessible_pages | 5 |
| 전체 hashed_documents | 11 |
| 미래에셋생명 matched_product_count | 2 |
| 미래에셋생명 hashed_documents | 6 |
| 미래에셋생명 unique document hash | 3 |

전체 hash 11건은 기존 농협손보 약관 1건, 메리츠화재 문서 3건, 흥국화재 약관 1건, 이번 미래에셋생명 문서 6건의 합계다. 미래에셋생명 6건은 기본형과 해약환급금이없는유형 source가 같은 공식 문서 3종을 공유하므로 unique hash 기준으로는 3건이다.

미래에셋생명 document candidate:

| document_type | source_context | content_length_bytes | sha256 |
|---|---|---:|---|
| `summary` | `온라인 암보험 무배당 상품요약서 온라인 암보험 무배당_상품요약서_20260401.pdf` | 3,945,603 | `133a9d91d3547e04ed25717275ce350ae0988c480ddde008346dd109255e722f` |
| `terms` | `온라인 암보험 무배당 보험약관 온라인 암보험 무배당_약관_20260501.pdf` | 11,732,601 | `8d4a162186b510c576e7333e4ae75e72b6c785a089798688d0d490e267c14378` |
| `business_method` | `온라인 암보험 무배당 사업방법서 온라인 암보험 무배당_사업방법서_20260201.pdf` | 2,676,313 | `be8d5a3ec858875dbeb06c4b467ba4633928cb74475aa2cf159ed53ad508b71f` |

---

## 4. 산출물

| 파일 | 내용 |
|---|---|
| `../../data/insurance/latest_miraeasset_life_disclosure_adapter_probe.json` | 미래에셋생명 adapter 재실행 결과 |
| `../../data/insurance/latest_miraeasset_life_disclosure_adapter_probe_summary.csv` | raw source별 hash 확보 요약 |

---

## 5. 판단

미래에셋생명 온라인 암보험 2개 source는 공식 문서 evidence gate를 통과했다. 다만 사용자 추천에는 아직 노출하지 않는다.

다음 PR은 아래 순서를 따른다.

1. 기본형과 해약환급금이없는유형이 2026-05-01 공통 약관/요약서/사업방법서를 공유해도 되는지 문서 variant를 검수한다.
2. `coverage_category=oncology`, `matching_strategy=risk_target`, `risk_targets`와 caveat를 정리한다.
3. quote row 8건의 숫자 KRW 조건을 확인한 뒤 source document seed, quote approval, `insurance_products` snapshot 발행 여부를 결정한다.

---

## 6. 안전성

- 운영 DB write 없음.
- 신규 hash는 미래에셋생명 공식 상품공시 endpoint와 공식 `cmmnFileDown.do` 다운로드에서 직접 계산했다.
- 미래에셋생명 source 2건은 계속 `raw`이며 추천 UI에 노출되지 않는다.
- 두 source가 동일 문서 hash를 공유하므로 후속 seed PR에서는 source별 row ID와 `product_source_id`를 분리하되, 문서 variant 근거를 명시해야 한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 미래에셋생명 상품공시 Ajax와 파일 다운로드 흐름을 crawler가 재현했다 |
| Potential Impact | 암보험 추천 후보를 2개 더 확장할 수 있는 공식 문서 근거를 확보했다 |
| Novelty | 보험다모아 상품 후보와 보험사 공시 Excel-derived API row를 연결했다 |
| UX | 공식 문서 hash가 확보된 상품만 다음 매칭 단계로 넘겨 추천 근거 품질을 유지한다 |
| Open-source | JavaScript 공시 페이지의 Ajax/다운로드 adapter 작성 패턴으로 재사용 가능하다 |
| Business Plan | 실제 판매 암보험 커버리지 확대를 위한 반복 가능한 수집 단위를 확보했다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Remaining Raw Source Document Probe](./60_REMAINING_RAW_SOURCE_DOCUMENT_PROBE_2026_05_31.md) - raw source probe 결과
- **QA_Validation**: [Heungkuk Fire Baseline DB Apply](./72_HEUNGKUK_FIRE_BASELINE_DB_APPLY_2026_05_31.md) - 직전 추천 snapshot 적용 상태
