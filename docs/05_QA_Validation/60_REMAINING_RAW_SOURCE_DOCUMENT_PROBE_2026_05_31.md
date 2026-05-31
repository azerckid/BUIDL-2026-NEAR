# [QA] 남은 Raw Source 공식 문서 Probe 검증
> Created: 2026-05-31 19:10
> Last Updated: 2026-05-31 19:10

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 남은 raw source 10개에 대한 공식 상품 페이지 probe와 carrier disclosure crawler 재실행
- **결론**: 이번 자동 probe로 seed 가능한 공식 문서 hash는 0건이다. 7개는 공식 상품 페이지 접근이 가능하지만 PDF hash가 확보되지 않았고, 3개는 공식 상품 URL 자체가 snapshot에 없었다. 다음 작업은 보험사별 공시/API adapter 보강이다.

---

## 1. 실행 명령

```bash
node scripts/insurance/collect-product-documents.mjs --product-codes N71G004000001G,N03G004000001G,N01G004000002G,N02G004000001G,N05G004000001G,L71C009000006,L74C009000006,L34C009000021,L34C009000022,N02C009000016 --out data/insurance/latest_remaining_raw_source_product_document_probe.json --timeout-ms 30000
```

```bash
node scripts/insurance/collect-carrier-disclosures.mjs --product-probe data/insurance/latest_remaining_raw_source_product_document_probe.json --out data/insurance/latest_remaining_raw_source_carrier_disclosure_probe.json --timeout-ms 30000
```

---

## 2. 산출물

| 파일 | 내용 |
|---|---|
| `../../data/insurance/latest_remaining_raw_source_product_document_probe.json` | 직접 상품 페이지 probe 결과 |
| `../../data/insurance/latest_remaining_raw_source_carrier_disclosure_probe.json` | carrier disclosure crawler 결과 |
| `../../data/insurance/latest_remaining_raw_source_document_probe_summary.csv` | source별 요약과 다음 action |

---

## 3. 결과 요약

| 항목 | 개수 |
|---|---:|
| 대상 raw source | 10 |
| 공식 상품 페이지 접근 가능 | 7 |
| 공식 상품 URL 없음 | 3 |
| product page PDF 후보 | 2 |
| hash 확보 PDF | 0 |
| carrier disclosure profile 있음 | 1 |
| carrier disclosure hash 확보 | 0 |

product document probe 출력:

```text
selected_products=7 pages_accessible=7 pdf_candidates=2 hashed_pdfs=0
```

carrier disclosure probe 출력:

```text
targets=7 carrier_pages=1 accessible_pages=1 hashed_documents=0
```

---

## 4. Source별 판단

| source id | 보험사 | 상품군 | 판단 | 다음 작업 |
|---|---|---|---|---|
| `src_nh_fire_medical_202605` | 농협손보 | 실손의료보험 | 상품 페이지 접근 가능. PDF 후보 2개는 HTML 응답으로 hash 실패 | 농협손보 공시 adapter 필요 |
| `src_lotte_direct_medical_202605` | 롯데손보 | 실손의료보험 | 공식 상품 URL 없음 | 공식 상품 URL 재탐색 |
| `src_meritz_direct_medical_202605` | 메리츠화재 | 실손의료보험 | 상품 페이지 접근 가능. PDF 링크 없음 | 메리츠화재 공시 adapter 필요 |
| `src_hanwha_general_direct_medical_202605` | 한화손보 | 실손의료보험 | 공식 상품 URL 없음 | 공식 상품 URL 재탐색 |
| `src_heungkuk_fire_direct_medical_202605` | 흥국화재 | 실손의료보험 | 상품 페이지 접근 가능. PDF 링크 없음 | 흥국화재 공시 adapter 필요 |
| `src_db_life_eroun_cancer_202601` | DB생명 | 암보험 | 상품 페이지 접근 가능. DB생명 공시 페이지 접근 가능하나 match score 0.3333으로 threshold 미달 | DB생명 matching 개선 또는 수동 endpoint 확인 |
| `src_tongyang_wooriwon_cancer_202605` | 동양생명 | 암보험 | 공식 상품 URL 없음 | 공식 상품 URL 재탐색 |
| `src_miraeasset_online_cancer_basic_202605` | 미래에셋생명 | 암보험 | 상품 페이지 접근 가능. PDF 링크 없음 | 미래에셋생명 공시 adapter 필요 |
| `src_miraeasset_online_cancer_no_refund_202605` | 미래에셋생명 | 암보험 | 상품 페이지 접근 가능. PDF 링크 없음 | 미래에셋생명 공시 adapter 필요 |
| `src_hanwha_general_direct_cancer_202604` | 한화손보 | 암보험 | 상품 페이지 접근 가능. PDF 링크 없음 | 한화손보 공시 adapter 필요 |

---

## 5. 다음 작업 순서

1. 농협손보 실손의료보험부터 공시 adapter를 추가한다. 상품 페이지에서 PDF처럼 보이는 URL이 HTML 응답을 반환하므로 실제 다운로드 endpoint 추적이 필요하다.
2. 메리츠화재, 흥국화재, 미래에셋생명, 한화손보는 carrier profile이 없어 공시/API adapter를 신규 작성한다.
3. 롯데손보, 한화손보 실손, 동양생명은 공식 상품 URL부터 다시 찾아야 한다.
4. DB생명은 profile은 있으나 match threshold 미달이므로 상품명 token/matching 규칙을 보강하거나 공식 endpoint를 수동 확인한다.

---

## 6. 안전성

- 이번 작업은 DB write를 수행하지 않았다.
- hash가 0건이므로 `seed.ts`에 source document를 추가하지 않는다.
- raw source는 추천 UI에 노출하지 않는다.
- 공식 URL이 없는 3개는 URL 확인 전까지 source document 후보로 승격하지 않는다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 남은 raw source의 병목이 직접 페이지가 아니라 carrier adapter 부족임을 확인했다 |
| Potential Impact | 다음 개발 단위를 보험사별 adapter 보강으로 좁혔다 |
| Novelty | 공식 상품 URL, 공시실 profile, PDF hash를 별도 gate로 분리한다 |
| UX | 근거 없는 raw 상품이 추천에 섞이지 않도록 차단 상태를 유지한다 |
| Open-source | 실패한 probe도 산출물로 남겨 반복 수집 개선에 사용한다 |
| Business Plan | 보험사별 문서 확보 자동화 범위를 명확히 한다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Remaining Source Candidate Triage](./56_REMAINING_SOURCE_CANDIDATE_TRIAGE_2026_05_31.md) - 남은 source 후보 처리 순서
- **QA_Validation**: [Shinhan No-refund DB Apply](./59_SHINHAN_NO_REFUND_DB_APPLY_2026_05_31.md) - 직전 추천 상품 확대 적용 검증
