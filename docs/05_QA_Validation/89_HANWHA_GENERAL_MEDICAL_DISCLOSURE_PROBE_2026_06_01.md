# [QA] 한화손보 실손의료보험 공식 문서 Probe 검증
> Created: 2026-06-01 12:14
> Last Updated: 2026-06-01 12:14

- **레이어**: 05_QA_Validation
- **상태**: Blocked
- **범위**: `src_hanwha_general_direct_medical_202605`의 공식 상품 URL, 약관 PDF endpoint, SHA-256 hash, 상품 variant 일치 여부 검증
- **결론**: 한화손보 공식 페이지와 PDF는 접근 가능하고 hash도 확보했지만, 문서가 `갱신형 III_TM`/2021 계열로 확인되어 target source인 `갱신형 V 무배당`에는 연결하지 않는다. 이 source는 현재 `raw` 상태를 유지한다.

---

## 1. 대상 Source

| 항목 | 값 |
|---|---|
| source id | `src_hanwha_general_direct_medical_202605` |
| 보험사 | 한화손보 |
| 원천 상품명 | `한화다이렉트실손의료보험(갱신형)Ⅴ 무배당` |
| 보험다모아 product code | `N02G004000001G` |
| 상품군 | 실손의료보험 |
| 현재 상태 | `raw` |
| quote row | 4건, `needs_review` |

---

## 2. Probe 결과

공식 상품 페이지는 브라우저 User-Agent를 포함하면 HTTP 200으로 접근된다.

| 항목 | 값 |
|---|---|
| 공식 후보 URL | `https://mall.hwgeneralins.com/ins/ltr/meditm_features_01.do` |
| HTTP 상태 | 200 |
| HTML 크기 | 185,048 bytes |
| hidden `gdCsfcd` | `LA02039001` |
| hidden `productNm` | `한화실손의료보험갱신형Ⅲ_TM` |
| visible product | `(무)한화실손의료보험(갱신형)III_TM` |
| 약관 버튼 | `bizCommon.mobileDown('LA02039001.pdf')` |
| 다운로드 함수 | `/common/bizCommon.js`의 `mobileDown`이 `/upload/product/{file}`을 호출 |

---

## 3. PDF Hash

`mobileDown` 함수가 가리키는 공식 PDF는 정상 다운로드된다. 다만 아래 hash는 target source에 seed하지 않는다.

| 항목 | 값 |
|---|---|
| 다운로드 URL | `https://mall.hwgeneralins.com/upload/product/LA02039001.pdf` |
| redirect URL | `http://www.hanwhadirect.com/upload/product/LA02039001.pdf` |
| Content-Type | `application/pdf;charset=UTF-8` |
| Last-Modified | `Tue, 28 Sep 2021 09:02:28 GMT` |
| 파일 크기 | 2,826,626 bytes |
| SHA-256 | `10ee12c4218099f34df16f195ad0d5eb968750ab2b35fa56b6f93aaeb24f497a` |
| PDF pages | 203 |
| PDF metadata created | 2021-06-28 14:09 KST |
| PDF metadata modified | 2021-09-27 14:49 KST |

PDF 텍스트에서는 `무배당 한화실손의료보험(갱신형)Ⅲ`가 반복 확인된다.

---

## 4. Variant 판단

| 비교 항목 | target source | 공식 페이지/PDF |
|---|---|---|
| 상품명 | `한화다이렉트실손의료보험(갱신형)Ⅴ 무배당` | `한화실손의료보험갱신형Ⅲ_TM` |
| version | `Ⅴ` | `Ⅲ` |
| 기준 시점 | 2026-05 quote-only 후보 | 2021-era PDF |
| 추천 seed 가능 여부 | 보류 | 보류 |

차단 이유:

1. target source는 `갱신형 V`인데 공식 페이지/PDF는 `갱신형 III`로 식별된다.
2. PDF metadata와 HTTP Last-Modified가 2021년 계열이다.
3. 페이지에는 `신상품 준비 중` 문구가 있어 현재 상품과 과거 문서가 혼재됐을 가능성이 있다.
4. 실손의료보험은 세대/개정 차이가 보장 구조와 보험료 caveat에 직접 영향을 주므로 version mismatch를 허용하지 않는다.

---

## 5. 결정

| 항목 | 결정 |
|---|---|
| source document seed | 하지 않음 |
| source approval | 하지 않음 |
| quote approval | 하지 않음 |
| `insurance_products` snapshot | 발행하지 않음 |
| DB write | 없음 |
| 추천 노출 | 없음 |
| source 상태 | `raw` 유지 |

다음 반복 작업에서는 한화손보 `갱신형 V` 공식 문서 endpoint를 더 찾거나, 한화손보 실손 source를 최종 blocker 목록으로 유지한다. 바로 이어갈 수 있는 추천 확대 후보는 동양생명 암보험 공식 URL 재탐색 또는 삼성생명 입원 건강보험 category 정책 결정이다.

---

## 6. 산출물

| 파일 | 내용 |
|---|---|
| `../../data/insurance/latest_hanwha_general_medical_disclosure_probe.json` | 한화손보 실손 공식 페이지/PDF probe 결과 |
| `../../data/insurance/latest_hanwha_general_medical_disclosure_probe.csv` | source별 요약 |

---

## 7. 안전성

- 운영 DB write를 수행하지 않았다.
- 확보한 PDF hash는 target source와 variant가 다르므로 `seed.ts`에 넣지 않는다.
- `insurance_premium_quotes`의 한화손보 실손 4건은 계속 `needs_review`로 둔다.
- 추천 UI와 상담 AI에는 이 source가 노출되지 않는다.
- DB URL 실제 값과 token은 문서에 기록하지 않았다.

---

## 8. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 공식 PDF가 있어도 상품 version이 다르면 추천 근거로 쓰지 않는 gate를 확인했다 |
| Potential Impact | 실손의료보험 세대/개정 오연결을 막아 추천 신뢰도를 유지한다 |
| Novelty | quote-only 후보에 대해 공식 문서 hash뿐 아니라 variant 일치까지 별도 검증한다 |
| UX | 사용자가 과거 약관 기반 추천을 받지 않도록 차단한다 |
| Open-source | 실패한 probe도 JSON/CSV/QA 문서로 남겨 다음 endpoint 탐색을 반복 가능하게 한다 |
| Business Plan | 보험사 제휴 전 단계에서 데이터 근거 품질 기준을 강화한다 |

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품 수집과 정규화 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Remaining Raw Source Document Probe](./60_REMAINING_RAW_SOURCE_DOCUMENT_PROBE_2026_05_31.md) - 한화손보 실손 공식 URL 미확보 상태의 선행 probe
- **QA_Validation**: [Lotte Medical Baseline DB Apply](./88_LOTTE_MEDICAL_BASELINE_DB_APPLY_2026_06_01.md) - 직전 source-backed baseline 적용 검증
