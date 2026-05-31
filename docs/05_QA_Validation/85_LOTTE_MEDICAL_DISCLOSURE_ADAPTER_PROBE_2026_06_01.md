# [QA] 롯데손보 실손의료보험 공시 Adapter Probe 검증
> Created: 2026-06-01 04:16
> Last Updated: 2026-06-01 04:16

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: 롯데손보 `src_lotte_direct_medical_202605` source의 공식 상품 페이지 접근성, 공식 약관 PDF URL, SHA-256 hash 검증
- **결론**: 롯데손보 공식 상품 페이지 `prdtseq=11`에서 `무배당 let:care 실손의료보험Ⅴ(2605)` 약관 PDF 1건을 확인했다. 약관 PDF는 공식 `/upload/C/let_care_sil_2605_yak.pdf` 경로에서 다운로드 가능하며 SHA-256은 `593987e051e2ec7e04292740aeda4448a6a0a60da7d2fc56287c8746322e7168`이다. 이번 PR은 DB write와 추천 snapshot 변경 없이 crawler profile, probe output, QA 문서만 추가한다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 대상 source | `src_lotte_direct_medical_202605` |
| 상품명 | `무배당 let:care 실손의료보험Ⅴ(2605)` |
| 공식 상품 페이지 | `https://www.lotteins.co.kr/web/C/D/A/cda020.jsp?prdtseq=11` |
| 신규 probe JSON | `data/insurance/latest_lotte_medical_disclosure_adapter_probe.json` |
| 신규 요약 CSV | `data/insurance/latest_lotte_medical_disclosure_adapter_probe_summary.csv` |
| DB read-only check | 수행 |
| DB write | 0 |
| 추천 snapshot 변경 | 0 |

---

## 2. 공식 문서 Hash

| document type | URL | SHA-256 | bytes | content type |
|---|---|---|---:|---|
| `terms` | `https://www.lotteins.co.kr/upload/C/let_care_sil_2605_yak.pdf` | `593987e051e2ec7e04292740aeda4448a6a0a60da7d2fc56287c8746322e7168` | 3,867,788 | `application/pdf` |

PDF 텍스트 앞부분에서 `무배당 let:care 실손의료보험Ⅴ(2605) 약관` 문구가 확인됐다. 따라서 이 약관은 `src_lotte_direct_medical_202605` source의 primary `terms` document 후보로 사용할 수 있다.

---

## 3. Adapter 변경

`scripts/insurance/collect-carrier-disclosures.mjs`에 롯데손보 profile을 추가했다.

| 항목 | 값 |
|---|---|
| provider | `롯데손보` |
| source_url | `https://www.lotteins.co.kr/web/C/D/A/cda020.jsp?prdtseq=11` |
| profile 방식 | `seed_documents` |
| matching score | 0.65 |
| page charset | `EUC-KR` |

공식 상품 페이지는 EUC-KR HTML이며, `약관보기` 버튼의 `onclick`에서 `/upload/C/let_care_sil_2605_yak.pdf`를 제공한다. 이번 pass에서는 상품요약서와 사업방법서의 별도 공식 다운로드 링크는 확인하지 못했다.

---

## 4. 운영 DB 현재 상태

운영 DB read-only 확인 기준 `src_lotte_direct_medical_202605`는 아직 추천 노출 대상이 아니다.

| 대상 | 현재 상태 |
|---|---|
| source | `raw`, `sale_status=unknown`, `official_product_url=null` |
| source document | 0건 |
| quote | 4건, 모두 `needs_review` |
| product snapshot | 0건 |

조건별 quote 4건은 이미 숫자 KRW로 존재한다.

| 조건 | 월 보험료 |
|---|---:|
| 34세 여성 | 15,675 KRW |
| 34세 남성 | 12,183 KRW |
| 44세 여성 | 21,254 KRW |
| 44세 남성 | 17,565 KRW |

---

## 5. 다음 작업

1. 롯데손보 실손의료보험 문서 variant와 baseline 매칭 키워드/caveat를 정리한다.
2. `coverage_category=medical_expense`, `matching_strategy=baseline`, `risk_targets=[]` 적용 가능 여부를 확인한다.
3. 통과 시 source document 1건, quote 4건 approval, active baseline product snapshot 1건을 seed에 준비한다.
4. 운영 DB apply는 별도 백업 후 진행한다.

---

## 6. 안전성

- 이번 PR은 운영 DB write를 하지 않는다.
- `.env.local`, Turso URL/token, Drizzle schema, migration은 수정하지 않았다.
- 공식 PDF hash는 64자 SHA-256이다.
- 추천 UI와 상담 AI에는 아직 노출하지 않는다. 노출은 매칭 검수와 seed/apply 이후에만 가능하다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 롯데손보 실손 source가 공식 약관 hash gate를 통과했다 |
| Potential Impact | 남은 non-approved source 중 실손 baseline 후보 1건을 추천 준비 흐름으로 이동시켰다 |
| Novelty | 보험사 공식 EUC-KR 상품 페이지의 약관 버튼을 재현 가능한 crawler profile로 고정했다 |
| UX | 후속 추천 카드에서 롯데손보 실손 상품의 공식 출처와 caveat를 표시할 기반이 생겼다 |
| Open-source | 공식 상품 페이지와 PDF hash를 data/docs로 남겨 반복 검증 가능하게 했다 |
| Business Plan | 실제 실손보험 비교 폭을 넓혀 테스트 사용자 피드백의 현실성을 높인다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - baseline 매칭과 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [DB Life Cancer DB Apply](./84_DB_LIFE_CANCER_DB_APPLY_2026_06_01.md) - 직전 추천 snapshot 적용 상태
- **QA_Validation**: [Medical Baseline Matching Review](./46_MEDICAL_BASELINE_MATCHING_REVIEW_2026_05_31.md) - 실손 baseline 매칭 검수 기준
- **Data**: [Lotte Medical Disclosure Adapter Probe JSON](../../data/insurance/latest_lotte_medical_disclosure_adapter_probe.json) - 구조화 probe 결과
- **Data**: [Lotte Medical Disclosure Adapter Probe CSV](../../data/insurance/latest_lotte_medical_disclosure_adapter_probe_summary.csv) - 요약 CSV
