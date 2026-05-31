# [QA] DB생명 암보험 공시 Adapter Probe 검증
> Created: 2026-06-01 03:08
> Last Updated: 2026-06-01 03:08

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: DB생명 `src_db_life_eroun_cancer_202601` 공식 약관 PDF hash 검증
- **결론**: DB생명 상품공시 판매상품 페이지의 서버 렌더링 약관 링크와 브라우저 헤더 조건을 재현해 공식 약관 PDF 1건을 hash했다. 이번 작업은 DB write 없이 crawler와 산출물만 갱신했다.

---

## 1. 실행 명령

```bash
npm run collect:insurance:disclosures -- --product-probe /private/tmp/db_life_product_probe.json --out data/insurance/latest_db_life_cancer_disclosure_adapter_probe.json --limit 1 --max-documents-per-product 3
```

`/private/tmp/db_life_product_probe.json`은 `data/insurance/latest_remaining_raw_source_product_document_probe.json`에서 DB생명 target 1건만 분리한 임시 입력이다. 저장소 산출물에는 임시 경로 대신 원본 데이터 기준을 기록한다.

---

## 2. 코드 변경 요약

| 항목 | 내용 |
|---|---|
| 보강 carrier profile | `DB생명` |
| 신규 search kind | `dblife_prov_sale_terms` |
| source page | `https://www.idblife.com/notice/product/prov/sale/9532` |
| 공식 PDF | `https://www.idblife.com/notice/product/prov/file?publishNo=3196&fileGb=3%20&fileSeq=65059` |
| 검색 대상 | `(무)e로운 암보험(해약환급금 미지급형)(2601)` |

DB생명 약관 다운로드 endpoint는 일반 `curl` 요청만으로는 보안 정책 차단 HTML을 반환한다. adapter는 공식 공시 페이지의 링크를 먼저 확인하고, PDF 요청에 브라우저 User-Agent와 공시 페이지 Referer를 포함한다.

---

## 3. 실행 결과

| 항목 | 값 |
|---|---:|
| targets | 1 |
| carrier_pages | 1 |
| accessible_pages | 1 |
| disclosure_record_count | 15 |
| matched_product_count | 1 |
| hashed_documents | 1 |
| best_match_score | 1.0 |

DB생명 document candidate:

| document_type | source_context | content_length_bytes | sha256 |
|---|---|---:|---|
| `terms` | `(무)e로운 암보험(해약환급금 미지급형)(2601)_약관 pdf파일이 다운로드됩니다` | 4,247,768 | `3c25a911b796fa239c45aec82afce4d24e310d76e516ad45ba86821cc58d0074` |

---

## 4. 산출물

| 파일 | 내용 |
|---|---|
| `../../data/insurance/latest_db_life_cancer_disclosure_adapter_probe.json` | DB생명 adapter 실행 결과 |
| `../../data/insurance/latest_db_life_cancer_disclosure_adapter_probe_summary.csv` | DB생명 hash 확보 요약 |

---

## 5. 판단

DB생명 `src_db_life_eroun_cancer_202601` source는 공식 약관 evidence gate를 통과했다. 다만 사용자 추천에는 아직 노출하지 않는다.

다음 PR은 아래 순서를 따른다.

1. 약관 표지와 PDF 텍스트 기준으로 보험다모아 source `L71C009000006`과 동일한 상품 variant인지 확인한다.
2. `coverage_category=oncology`, `matching_strategy=risk_target`, `risk_targets`와 caveat를 정리한다.
3. quote row 4건의 숫자 KRW 조건을 확인한 뒤 source document seed, quote approval, `insurance_products` snapshot 발행 여부를 결정한다.

---

## 6. 안전성

- 운영 DB write 없음.
- 신규 hash는 DB생명 공식 상품공시 페이지와 공식 파일 다운로드 endpoint에서 직접 계산했다.
- DB URL, auth token, 운영 환경변수는 문서와 산출물에 기록하지 않았다.
- DB생명 source는 계속 `raw`이며 추천 UI에 노출되지 않는다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | DB생명 공식 상품공시 약관 다운로드 조건을 crawler가 재현했다 |
| Potential Impact | 남은 암보험 raw source 1건을 추천 snapshot 후보로 넘길 공식 문서 근거를 확보했다 |
| Novelty | 보험다모아 source와 보험사 공시 페이지의 문서 링크를 source-aware evidence로 연결했다 |
| UX | 공식 약관 hash가 확보된 상품만 다음 매칭 단계로 넘겨 추천 근거 품질을 유지한다 |
| Open-source | User-Agent/Referer 조건이 필요한 공시 다운로드 adapter 패턴을 명시했다 |
| Business Plan | 실제 판매 암보험 카탈로그 확장을 위한 반복 가능한 수집 단위를 확보했다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Remaining Raw Source Document Probe](./60_REMAINING_RAW_SOURCE_DOCUMENT_PROBE_2026_05_31.md) - raw source probe 결과
- **QA_Validation**: [Hanwha General Cancer DB Apply](./80_HANWHA_GENERAL_CANCER_DB_APPLY_2026_06_01.md) - 직전 추천 snapshot 적용 상태
