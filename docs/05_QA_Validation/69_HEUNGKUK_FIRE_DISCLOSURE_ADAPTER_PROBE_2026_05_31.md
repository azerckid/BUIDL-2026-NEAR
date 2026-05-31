# [QA] 흥국화재 공시 Adapter Probe 검증
> Created: 2026-05-31 22:22
> Last Updated: 2026-05-31 22:22

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 흥국화재 `src_heungkuk_fire_direct_medical_202605` 공식 약관 다운로드 adapter 검증
- **결론**: 흥국화재 다이렉트 실손 화면 `CMMOBDPRM4001`의 약관 다운로드 흐름을 재현해 공식 PDF 1건을 hash했다. 이번 작업은 DB write 없이 crawler와 산출물만 갱신했다.

---

## 1. 실행 명령

```bash
node scripts/insurance/collect-carrier-disclosures.mjs --product-probe data/insurance/latest_remaining_raw_source_product_document_probe.json --out data/insurance/latest_heungkuk_fire_disclosure_adapter_probe.json --timeout-ms 30000 --max-documents-per-product 5
```

---

## 2. 코드 변경 요약

| 항목 | 내용 |
|---|---|
| 신규 carrier profile | `흥국화재` |
| 신규 search kind | `heungkuk_direct_download_file` |
| source page | `https://direct.heungkukfire.co.kr/?ccid=0606001007#/CMMOBDPRM4001` |
| PDF endpoint | `https://direct.heungkukfire.co.kr/CM_COMM_FileDownload_ACT.do` |
| screen id | `CMMOBDPRM4001` |
| file type | `4` |
| terms file | `eYou_mdca_term_next.pdf` |

흥국화재 다이렉트 실손 화면의 약관 버튼은 번들 JS에서 `downloadFile(this, "4", "eYou_mdca_term_next.pdf")`를 호출한다. adapter는 같은 endpoint를 GET query로 재현해 공식 약관 PDF를 다운로드한다.

---

## 3. 실행 결과

| 항목 | 값 |
|---|---:|
| targets | 7 |
| carrier_pages | 4 |
| accessible_pages | 4 |
| 전체 hashed_documents | 5 |
| 흥국화재 hashed_documents | 1 |
| 흥국화재 best_match_score | 1 |

전체 hash 5건은 기존 농협손보 약관 1건, 메리츠화재 문서 3건, 이번 흥국화재 약관 1건의 합계다.

흥국화재 document candidate:

| document_type | source_context | content_length_bytes | sha256 |
|---|---|---:|---|
| `terms` | `(무)흥Good 다이렉트 실손의료보험(26.05) 보험약관 eYou_mdca_term_next.pdf` | 5,125,066 | `956b60ab796fec97397fc087b799ed487b47a9773fb780fe7ee529c131389756` |

---

## 4. 산출물

| 파일 | 내용 |
|---|---|
| `../../data/insurance/latest_heungkuk_fire_disclosure_adapter_probe.json` | 흥국화재 adapter 재실행 결과 |
| `../../data/insurance/latest_heungkuk_fire_disclosure_adapter_probe_summary.csv` | raw source별 hash 확보 요약 |

---

## 5. 판단

흥국화재 실손의료비보험은 공식 약관 hash 1건을 확보했으므로 문서 evidence gate를 통과했다. 다만 아직 사용자 추천에 노출하지 않는다.

다음 PR은 아래 순서를 따른다.

1. 흥국화재 실손의료비보험 문서 variant 검수.
2. `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]` 기준 매칭 키워드와 caveat 정리.
3. source document seed 후보, quote approval, baseline `insurance_products` snapshot seed 여부 결정.

---

## 6. 안전성

- 운영 DB write 없음.
- 신규 hash는 흥국화재 공식 다이렉트 실손 화면과 공식 `CM_COMM_FileDownload_ACT.do` endpoint에서 직접 계산했다.
- 흥국화재 source는 계속 `raw`이며 추천 UI에 노출되지 않는다.
- 약관 파일명은 `next` suffix를 사용하므로 후속 seed PR에서는 정기 hash refresh caveat를 유지해야 한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 흥국화재 SPA 약관 다운로드 흐름을 crawler가 재현했다 |
| Potential Impact | 실손 baseline 추천 후보를 1개 더 확장할 수 있는 공식 문서 근거를 확보했다 |
| Novelty | Vue bundle의 downloadFile 호출과 공식 PDF endpoint를 source evidence로 연결했다 |
| UX | 공식 문서 hash가 확보된 상품만 다음 매칭 단계로 넘겨 추천 근거 품질을 유지한다 |
| Open-source | 유사한 다이렉트 보험사 downloadFile adapter 작성 기준으로 재사용 가능하다 |
| Business Plan | 실제 판매 상품 커버리지 확대를 위한 반복 가능한 수집 단위를 하나 더 확보했다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Remaining Raw Source Document Probe](./60_REMAINING_RAW_SOURCE_DOCUMENT_PROBE_2026_05_31.md) - 직전 raw source probe 결과
- **QA_Validation**: [Meritz Fire Disclosure Adapter Probe](./65_MERITZ_FIRE_DISCLOSURE_ADAPTER_PROBE_2026_05_31.md) - 직전 raw source adapter 보강 패턴
