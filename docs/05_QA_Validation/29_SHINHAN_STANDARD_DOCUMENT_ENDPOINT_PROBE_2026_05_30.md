# [QA] 신한라이프 일반형 공식 문서 Endpoint 탐색
> Created: 2026-05-30 14:08
> Last Updated: 2026-05-30 14:08

- **레이어**: 05_QA_Validation
- **상태**: Passed with Blocker
- **범위**: 신한라이프 `L11C009000007` 표준형 source의 공식 일반형 상품요약서, 사업방법서, 판매약관 endpoint 탐색
- **결론**: 신한라이프 공식 공시 `wcms` endpoint를 exact keyword, 표준형 상품명, 판매중 전체 scan, 과거 row sample 방식으로 재조회했지만 `신한SOL암보험(무배당)(비갱신형)` 일반형 문서 row는 찾지 못했다. 현재 endpoint가 반환하는 `신한SOL암보험` 판매중 row는 해약환급금 미지급형 1건뿐이므로, `src_shinhan_life_sol_cancer_standard_202605`는 계속 `raw` 차단 상태로 둔다. DB write와 `seed.ts` 변경은 하지 않았다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 대상 source | `src_shinhan_life_sol_cancer_standard_202605` |
| 보험다모아 product code | `L11C009000007` |
| 대상 상품명 | `신한SOL암보험(무배당)(비갱신형)` |
| 공시 API endpoint | `https://shinhanlife.co.kr/co/wcms/nodeInfoListPage.pwkjson` |
| 공시 화면 referer | `https://shinhanlife.co.kr/hp/cdhi0030.do` |
| category id | `M160991914330045272` |
| 신규 검수 JSON | `data/insurance/latest_shinhan_standard_document_endpoint_probe.json` |
| 신규 검수 CSV | `data/insurance/latest_shinhan_standard_document_endpoint_probe.csv` |
| DB write | 0 |
| `seed.ts` 변경 | 0 |

---

## 2. 조회 결과 요약

| 조회 | Row | 일반형 hit | 결론 |
|---|---:|---:|---|
| `title=신한SOL암보험`, `meta06=TRUE` | 1 | 0 | 해약환급금 미지급형만 반환 |
| `title=신한SOL암보험(무배당)`, `meta06=TRUE` | 0 | 0 | 표준형 row 없음 |
| `title=신한SOL암보험(무배당)(비갱신형)`, `meta06=TRUE` | 0 | 0 | 표준형 row 없음 |
| 판매중 전체 scan, `meta06=TRUE` | 112 | 0 | 판매중 전체 row에도 표준형 없음 |
| 과거 포함 sample, `meta06` blank/null | 1200 | 0 | 샘플 구간에도 표준형 없음 |

판매중 전체 scan에서는 SOL 또는 암보험 관련 row 23건이 확인됐지만, `신한SOL암보험(무배당)(비갱신형)` 또는 해약환급금 미지급형 문구가 없는 `신한SOL암보험(무배당)` row는 없었다.

---

## 3. 반환된 신한SOL암보험 Row

공식 공시 API에서 `신한SOL암보험` exact keyword로 확인되는 판매중 row는 아래 1건이다.

| 필드 | 값 |
|---|---|
| title | `신한SOL암보험(무배당, 해약환급금 미지급형)_판매중_03` |
| channel | `인터넷모바일` |
| meta05 | `신한SOL암보험(무배당, 해약환급금 미지급형)` |
| sale status | `TRUE` |
| sale start | `20260101000000` |
| sale end | `99991231235959` |

따라서 기존 crawler의 match score `0.5`는 기술적으로 문서를 찾은 것이지만, 상품 variant 기준으로는 표준형 source에 연결하면 안 되는 문서다.

---

## 4. 차단 유지 문서

아래 3개 문서는 이번 재조회에서도 hash가 유지됐지만 모두 해약환급금 미지급형 문서다.

| 문서 | Hash | Content length | 판정 |
|---|---|---:|---|
| 상품요약서 | `d557ed911adc877976863155e45fec5217ebfe485aed8f0c685797d0d7314c03` | 153356 | 표준형 source 연결 차단 |
| 사업방법서 | `9aa1ed61e51a9c67a339430266f8551cd6739bcb48d725bf298e3742fe3797ea` | 95659 | 표준형 source 연결 차단 |
| 판매약관 | `fcd915ee2e5440cf9542711dabd1c3014a1f5f3efef9c0a1f8fc88ed7ca40ffa` | 2940426 | 표준형 source 연결 차단 |

이 3개 문서는 기존 no-refund source인 `src_shinhan_life_sol_cancer_202601` 문서와 동일하므로, `src_shinhan_life_sol_cancer_standard_202605`에는 재사용하지 않는다.

---

## 5. 안전성 판단

- 운영 DB, `.env.local`, Turso URL/token, `seed.ts`는 수정하지 않았다.
- `insurance_product_sources.review_status`는 변경하지 않는다.
- `insurance_source_documents` seed 후보를 추가하지 않는다.
- `insurance_products` 추천 snapshot 발행 대상에 포함하지 않는다.
- 신한라이프 표준형 source는 공식 일반형 문서 endpoint가 발견되기 전까지 계속 `raw` 상태로 유지한다.

---

## 6. 남은 작업

1. 신한라이프 표준형 source는 이번 probe 기준으로 unblock하지 않는다.
2. 공식 문서 variant가 명확한 KDB, 한화생명, 교보라이프플래닛 후보를 우선 매칭 키워드/caveat 정리 대상으로 삼는다.
3. 신한라이프는 추후 보험다모아 product code와 신한라이프 공식 상품 페이지의 관계를 별도로 재확인한다.
4. 첫 실제 추천 snapshot 발행 PR은 [보험상품 매칭 키워드 정리 정책](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) 7절 기준을 적용한다.

---

## 7. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 표준형 source에 no-refund 문서를 오연결하지 않도록 차단 근거를 확정했다 |
| Potential Impact | 공식 문서 variant가 명확한 후보부터 추천 발행하는 우선순위를 세웠다 |
| Novelty | 보험다모아 quote source와 보험사 공시 row의 variant mismatch를 endpoint 수준에서 검증했다 |
| UX | 사용자에게 잘못된 상품 약관을 근거로 추천하는 위험을 줄인다 |
| Open-source | 공시 API 조회 조건, row count, 차단 판단을 구조화 산출물로 남겼다 |
| Business Plan | 실제 판매 상품 추천 전 데이터 품질 게이트를 강화한다 |

---

## 8. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [KDB/신한 Source 문서 Variant 재검수](./26_KDB_SHINHAN_VARIANT_REVIEW_2026_05_29.md) - 기존 신한 차단 근거
- **QA_Validation**: [KDB Source Document DB 적용 검증](./28_KDB_SOURCE_DOCUMENTS_DB_APPLY_2026_05_30.md) - 직전 Track A 완료 상태
- **Data**: [Shinhan Standard Document Endpoint Probe JSON](../../data/insurance/latest_shinhan_standard_document_endpoint_probe.json) - 구조화 endpoint 탐색 결과
- **Data**: [Shinhan Standard Document Endpoint Probe CSV](../../data/insurance/latest_shinhan_standard_document_endpoint_probe.csv) - 조회 조건별 요약
