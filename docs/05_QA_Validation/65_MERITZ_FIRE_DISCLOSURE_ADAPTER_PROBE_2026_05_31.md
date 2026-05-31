# [QA] 메리츠화재 공시 Adapter Probe 검증
> Created: 2026-05-31 21:27
> Last Updated: 2026-05-31 21:27

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 메리츠화재 `src_meritz_direct_medical_202605` 공식 약관/사업방법서/상품요약서 다운로드 adapter 검증
- **결론**: 메리츠화재 공식 상품 페이지의 `pdClusPdf.downPdClus('6ADGE')` 호출과 `/json.smart` PDF 목록 API를 재현해 공식 PDF 3건을 hash했다. 이번 작업은 DB write 없이 crawler와 산출물만 갱신했다.

---

## 1. 실행 명령

```bash
node scripts/insurance/collect-carrier-disclosures.mjs --product-probe data/insurance/latest_remaining_raw_source_product_document_probe.json --out data/insurance/latest_meritz_fire_disclosure_adapter_probe.json --timeout-ms 30000 --max-documents-per-product 5
```

---

## 2. 코드 변경 요약

| 항목 | 내용 |
|---|---|
| 신규 carrier profile | `메리츠화재` |
| 신규 search kind | `meritz_direct_pdf_list` |
| source page | `https://store.meritzfire.com/health-and-kids/direct-medicalInfo.do` |
| PDF 목록 API | `https://store.meritzfire.com/json.smart` |
| service id | `f.cg.he.ct.tm.o.bc.CtrCnfBc.retrievePdfFileLst` |
| product code | `6ADGE` |
| 실제 PDF endpoint | `https://store.meritzfire.com/hp/fileDownload.do` |

메리츠화재 다운로드는 단순 고정 PDF URL이 아니다. 공식 상품 페이지의 약관 확인 버튼은 `pdClusPdf.downPdClus('6ADGE')`를 호출하고, `/json.smart` 응답의 암호화된 `atcFilePthNm#[E]` 값과 같은 세션 cookie를 `/hp/fileDownload.do`에 전달해야 PDF가 내려온다. adapter는 이 흐름을 재현하되 cookie 값은 산출물에 저장하지 않는다.

---

## 3. 실행 결과

| 항목 | 값 |
|---|---:|
| targets | 7 |
| carrier_pages | 3 |
| accessible_pages | 3 |
| 전체 hashed_documents | 4 |
| 메리츠화재 hashed_documents | 3 |
| 메리츠화재 best_match_score | 1 |

전체 hash 4건은 기존 농협손보 약관 1건과 이번 메리츠화재 문서 3건의 합계다.

메리츠화재 document candidates:

| document_type | source_context | content_length_bytes | sha256 |
|---|---|---:|---|
| `terms` | `(무) 메리츠 다이렉트 실손의료비보험2605 보험약관 6ADGE_20241002.pdf` | 2,776,323 | `bbbb86eb265233a01b71b0cc298748267531839a39bcf8aec79d442475274c0c` |
| `business_method` | `(무) 메리츠 다이렉트 실손의료비보험2605 사업방법서 001_6ADGE_무배당+메리츠+다이렉트+실손의료비보험2408_사업방법서별지_v1.0.pdf` | 95,371 | `2331cd4a07e8fabd5977e6a715a174d822a9ac495f5b956335d600b75b43d280` |
| `summary` | `(무) 메리츠 다이렉트 실손의료비보험2605 상품요약서 6ADGE_20240806_y_(무)+메리츠+다이렉트+실손의료비보험2408+요약서_크로스완.pdf` | 127,920 | `6b02df741bb07a565d5315c3a5ce1655bcd56bdded61e9531c1bcaad60ce661e` |

---

## 4. 산출물

| 파일 | 내용 |
|---|---|
| `../../data/insurance/latest_meritz_fire_disclosure_adapter_probe.json` | 메리츠화재 adapter 재실행 결과 |
| `../../data/insurance/latest_meritz_fire_disclosure_adapter_probe_summary.csv` | raw source별 hash 확보 요약 |

---

## 5. 판단

메리츠화재 실손의료비보험은 공식 문서 hash 3건을 확보했으므로 문서 evidence gate를 통과했다. 다만 아직 사용자 추천에 노출하지 않는다.

다음 PR은 아래 순서를 따른다.

1. 메리츠화재 실손의료비보험 문서 variant 검수.
2. 파일명이 `2408`을 포함하므로 보험다모아 source `2605`와 공식 문서 variant 관계 확인.
3. `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]` 기준 매칭 키워드와 caveat 정리.
4. source document seed 후보, quote approval, baseline `insurance_products` snapshot seed 여부 결정.

---

## 6. 안전성

- 운영 DB write 없음.
- 신규 hash는 메리츠화재 공식 상품 페이지와 공식 `/json.smart` API에서 직접 계산했다.
- 세션 cookie는 probe 실행 중 PDF 다운로드에만 사용하고 JSON/문서에 기록하지 않았다.
- 메리츠화재 source는 계속 `raw`이며 추천 UI에 노출되지 않는다.
- session-bound encrypted download URL은 장기 citation으로 부적합하므로 다음 seed PR에서는 source URL 표현 정책을 별도 확인해야 한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 세션 cookie와 암호화 file path가 필요한 보험사 PDF 다운로드를 crawler가 재현했다 |
| Potential Impact | 실손 baseline 추천 후보를 1개 더 확장할 수 있는 공식 문서 근거를 확보했다 |
| Novelty | SPA 버튼 handler, JSON API, session-bound 다운로드 endpoint를 하나의 source evidence로 연결했다 |
| UX | 공식 문서 hash가 확보된 상품만 다음 매칭 단계로 넘겨 추천 근거 품질을 유지한다 |
| Open-source | 유사한 session-bound 보험사 다운로드 adapter 작성 기준으로 재사용 가능하다 |
| Business Plan | 실제 판매 상품 커버리지 확대를 위한 반복 가능한 수집 단위를 하나 더 확보했다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Remaining Raw Source Document Probe](./60_REMAINING_RAW_SOURCE_DOCUMENT_PROBE_2026_05_31.md) - 직전 raw source probe 결과
- **QA_Validation**: [NH Fire Disclosure Adapter Probe](./61_NH_FIRE_DISCLOSURE_ADAPTER_PROBE_2026_05_31.md) - 같은 raw source adapter 보강 패턴
