# [QA] 동양생명 암보험 공시 Adapter Probe 검증
> Created: 2026-06-01 12:51
> Last Updated: 2026-06-01 12:51

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: `src_tongyang_wooriwon_cancer_202605` 공식 공시 페이지, POST 다운로드 endpoint, PDF SHA-256 hash 검증
- **결론**: 동양생명 공시실 판매상품 페이지에서 `무배당우리WON하는실속하나로암보험` 2026.03.01 row를 확인했고, `MasFiledownload` 기반 POST 다운로드를 재현해 상품요약서, 사업방법서, 보험약관 3건을 hash했다. 이번 작업은 DB write 없이 crawler와 산출물만 갱신했다.

---

## 1. 실행 명령

```bash
npm run collect:insurance:disclosures -- --product-probe /private/tmp/tongyang_life_product_probe.json --out data/insurance/latest_tongyang_life_cancer_disclosure_adapter_probe.json --limit 1 --max-documents-per-product 3
```

`/private/tmp/tongyang_life_product_probe.json`은 `data/insurance/latest_remaining_raw_source_product_document_probe.json`의 `skipped_products` 중 동양생명 target 1건만 분리하고, 재탐색으로 찾은 공식 공시 URL을 임시로 주입한 입력이다. 저장소 산출물에는 원본 데이터 기준과 재탐색 URL을 함께 기록한다.

---

## 2. 대상 Source

| 항목 | 값 |
|---|---|
| source id | `src_tongyang_wooriwon_cancer_202605` |
| 보험사 | 동양생명 |
| 원천 상품명 | `(무)우리WON하는실속하나로암보험` |
| 보험다모아 product code | `L74C009000006` |
| 상품군 | 암보험 |
| 현재 상태 | `raw` |
| quote row | 4건, `needs_review` |

---

## 3. 코드 변경 요약

| 항목 | 내용 |
|---|---|
| 보강 carrier profile | `동양생명` |
| 신규 search kind | `tongyang_disclosure_sale_products` |
| source page | `https://pbano.myangel.co.kr/paging/WE_AC_WEPAAP020100L` |
| download endpoint | `https://pbano.myangel.co.kr/process/CO_ComDownload` |
| 다운로드 방식 | `POST _biz_op_code=FDL&FILE_GRP_ID={id}` |
| 검색 대상 | `무배당우리WON하는실속하나로암보험`, `2026.03.01` |

동양생명 공시실은 GET PDF URL을 직접 노출하지 않고 `MasFiledownload('_N', FILE_GRP_ID)` JavaScript 호출을 사용한다. adapter는 상품 row에서 `FILE_GRP_ID`를 추출한 뒤 동일 endpoint에 form POST를 보내 공식 PDF를 hash한다.

---

## 4. 실행 결과

| 항목 | 값 |
|---|---:|
| targets | 1 |
| carrier_pages | 1 |
| accessible_pages | 1 |
| disclosure_record_count | 12 |
| matched_product_count | 1 |
| hashed_documents | 3 |
| best_match_score | 1.0 |

Document candidates:

| document_type | file_group_id | content_length_bytes | sha256 |
|---|---|---:|---|
| `summary` | `34D0mcpfsYQVpsLLoUEpB3x1Cudfk83B` | 355,923 | `960aae81795907c539b11667d3804534dc2b3b04c1da2df4f2b4e6d4381097b5` |
| `business_method` | `34D0mcpfsYQVpsLLoUEpBzxfPnWb7yTo` | 99,967 | `4d67901f7df9d4bc631b6cd8d4c371cdb68e4a4b15a01f952f43a3ebf751b18f` |
| `terms` | `34D0mcpfsYQVpsLLoUEpBwjPN9vaY11S` | 6,512,683 | `882cb3784644e040027c16c984ae8c8c84bd3a12507949063967c618fdc81cb2` |

---

## 5. PDF 텍스트 확인

| 문서 | 확인 내용 |
|---|---|
| 상품요약서 | `무배당우리 WON 하는실속하나로암보험`, `상품요약서`, `제작일자: 2026.03.01`, 고액치료비관련 암/암/소액암 보장 설명 |
| 사업방법서 | `무배당우리 WON 하는실속하나로암보험`, 사업방법서 별지 |
| 보험약관 | `무배당우리WON하는실속하나로암보험`, 암 관련 특약명 반복 |

PDF metadata는 2026-02~03 생성 계열로 확인되어, target source의 2026.03.01 판매상품 row와 시점이 맞는다.

---

## 6. 판단

동양생명 `src_tongyang_wooriwon_cancer_202605` source는 공식 문서 evidence gate를 통과했다. 다만 사용자 추천에는 아직 노출하지 않는다.

다음 PR은 아래 순서를 따른다.

1. 상품요약서와 약관 텍스트 기준으로 `coverage_category=oncology`, `matching_strategy=risk_target`, `risk_targets`를 정리한다.
2. 면책기간, 감액기간, 갱신/비갱신 여부, 소액암/일반암/고액암 구분을 caveat로 정리한다.
3. quote row 4건의 숫자 KRW 조건을 확인한 뒤 source document seed, quote approval, `insurance_products` snapshot 발행 여부를 결정한다.

---

## 7. 산출물

| 파일 | 내용 |
|---|---|
| `../../data/insurance/latest_tongyang_life_cancer_disclosure_adapter_probe.json` | 동양생명 adapter 실행 결과 |
| `../../data/insurance/latest_tongyang_life_cancer_disclosure_adapter_probe_summary.csv` | 동양생명 hash 확보 요약 |

---

## 8. 안전성

- 운영 DB write를 수행하지 않았다.
- 신규 hash는 동양생명 공식 공시실 판매상품 페이지와 공식 파일 다운로드 endpoint에서 직접 계산했다.
- DB URL, auth token, 운영 환경변수는 문서와 산출물에 기록하지 않았다.
- 동양생명 source는 계속 `raw`이며 추천 UI와 상담 AI에 노출되지 않는다.

---

## 9. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | POST 기반 공시 문서 다운로드 조건을 crawler가 재현했다 |
| Potential Impact | 남은 암보험 raw source 1건을 추천 snapshot 후보로 넘길 공식 문서 근거를 확보했다 |
| Novelty | 보험다모아 quote-only 후보와 보험사 공시실의 POST 문서 다운로드를 source-aware evidence로 연결했다 |
| UX | 공식 문서 hash가 확보된 상품만 매칭 키워드 정리 단계로 넘겨 추천 근거 품질을 유지한다 |
| Open-source | `MasFiledownload`/`FILE_GRP_ID` 기반 공시 다운로드 adapter 패턴을 명시했다 |
| Business Plan | 실제 판매 암보험 카탈로그 확장을 위한 반복 가능한 수집 단위를 확보했다 |

---

## 10. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Remaining Raw Source Document Probe](./60_REMAINING_RAW_SOURCE_DOCUMENT_PROBE_2026_05_31.md) - 동양생명 공식 URL 미확보 상태의 선행 probe
- **QA_Validation**: [Hanwha General Medical Disclosure Probe](./89_HANWHA_GENERAL_MEDICAL_DISCLOSURE_PROBE_2026_06_01.md) - 직전 raw source variant 차단 검증
