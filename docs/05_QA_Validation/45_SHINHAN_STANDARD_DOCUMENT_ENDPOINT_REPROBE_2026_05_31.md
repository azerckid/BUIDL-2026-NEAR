# [QA] 신한라이프 일반형 공식 문서 Endpoint 재탐색
> Created: 2026-05-31 02:05
> Last Updated: 2026-05-31 02:05

- **레이어**: 05_QA_Validation
- **상태**: Passed with Blocker
- **범위**: 신한라이프 `L11C009000007` 표준형 source의 공식 일반형 상품요약서, 사업방법서, 판매약관 endpoint 재탐색
- **결론**: 신한라이프 공식 `wcms` endpoint를 전용 스크립트로 재조회했지만 `신한SOL암보험(무배당)(비갱신형)` 일반형 문서 row는 여전히 발견되지 않았다. 현재 target인 `신한SOL암보험`으로 확인되는 판매중 row는 해약환급금 미지급형 1건뿐이므로, `src_shinhan_life_sol_cancer_standard_202605`는 계속 `raw` 차단 상태로 유지한다. DB write와 `seed.ts` 변경은 하지 않았다.

---

## 1. 입력과 출력

| 항목 | 값 |
|---|---|
| 실행 명령 | `npm run collect:insurance:shinhan-standard-docs -- --timeout-ms 30000 --page-size 500 --max-pages 12` |
| 대상 source | `src_shinhan_life_sol_cancer_standard_202605` |
| 보험다모아 product code | `L11C009000007` |
| 대상 상품명 | `신한SOL암보험(무배당)(비갱신형)` |
| 공시 API endpoint | `https://shinhanlife.co.kr/co/wcms/nodeInfoListPage.pwkjson` |
| 공시 화면 referer | `https://shinhanlife.co.kr/hp/cdhi0030.do` |
| category id | `M160991914330045272` |
| 검수 JSON | `data/insurance/latest_shinhan_standard_document_endpoint_probe.json` |
| 검수 CSV | `data/insurance/latest_shinhan_standard_document_endpoint_probe.csv` |
| DB write | 0 |
| `seed.ts` 변경 | 0 |

이번 PR에서 `scripts/insurance/probe-shinhan-standard-documents.mjs`를 추가해 이전 수동 probe를 반복 가능한 작업으로 바꿨다.

---

## 2. 조회 결과 요약

| 항목 | 결과 |
|---|---:|
| query count | 18 |
| active rows scanned | 134 |
| historical rows scanned | 1,775 |
| target `신한SOL암보험` row | 1 |
| standard/general variant hit | 0 |
| no-refund variant hit | 1 |
| downloaded blocked no-refund documents | 3 |

조회 조건은 active keyword 8개, historical keyword 8개, active full catalog scan, historical full catalog scan으로 구성했다. `신한SOL`, `SOL암보험`, `암보험`까지 넓게 훑었지만, target인 `신한SOL암보험` 기준 일반형 row는 없었다.

---

## 3. Query Matrix

| Query | Row | Standard hit | No-refund hit |
|---|---:|---:|---:|
| active `신한SOL암보험` | 1 | 0 | 1 |
| active `신한SOL암보험(무배당)` | 0 | 0 | 0 |
| active `신한SOL암보험(무배당)(비갱신형)` | 0 | 0 | 0 |
| active `신한 SOL 암보험` | 0 | 0 | 0 |
| active `신한SOL 암보험` | 0 | 0 | 0 |
| active `SOL암보험` | 1 | 0 | 1 |
| active `신한SOL` | 17 | 0 | 1 |
| active `암보험` | 3 | 0 | 1 |
| historical `신한SOL암보험` | 1 | 0 | 1 |
| historical `신한SOL암보험(무배당)` | 0 | 0 | 0 |
| historical `신한SOL암보험(무배당)(비갱신형)` | 0 | 0 | 0 |
| historical `신한 SOL 암보험` | 0 | 0 | 0 |
| historical `신한SOL 암보험` | 0 | 0 | 0 |
| historical `SOL암보험` | 1 | 0 | 1 |
| historical `신한SOL` | 21 | 0 | 1 |
| historical `암보험` | 115 | 0 | 1 |
| active full catalog scan | 112 | 0 | 1 |
| historical full catalog scan | 1,637 | 0 | 1 |

`신한SOL`로 넓게 검색하면 다른 SOL 브랜드 상품은 여러 건 나오지만, `신한SOL암보험` target에 해당하지 않는다. 따라서 일반형 문서 후보로 사용하지 않는다.

---

## 4. 반환된 Target Row

공식 공시 API에서 target 문자열 `신한SOL암보험`으로 확인되는 판매중 row는 아래 1건이다.

| 필드 | 값 |
|---|---|
| title | `신한SOL암보험(무배당, 해약환급금 미지급형)_판매중_03` |
| channel | `인터넷모바일` |
| meta05 | `신한SOL암보험(무배당, 해약환급금 미지급형)` |
| sale status | `TRUE` |
| sale start | `20260101000000` |
| sale end | `99991231235959` |
| 판정 | 표준형 source 연결 차단 |

이 row는 보험다모아 표준형 source `신한SOL암보험(무배당)(비갱신형)`와 이름이 다르며, 해약환급금 미지급형 variant다.

---

## 5. 차단 유지 문서 Hash

아래 3개 문서는 이번 재조회에서도 hash가 유지됐지만 모두 해약환급금 미지급형 문서다.

| 문서 | Hash | Content length | 판정 |
|---|---|---:|---|
| 상품요약서 | `d557ed911adc877976863155e45fec5217ebfe485aed8f0c685797d0d7314c03` | 153,356 | 표준형 source 연결 차단 |
| 사업방법서 | `9aa1ed61e51a9c67a339430266f8551cd6739bcb48d725bf298e3742fe3797ea` | 95,659 | 표준형 source 연결 차단 |
| 판매약관 | `fcd915ee2e5440cf9542711dabd1c3014a1f5f3efef9c0a1f8fc88ed7ca40ffa` | 2,940,426 | 표준형 source 연결 차단 |

이 3개 문서는 기존 no-refund source인 `src_shinhan_life_sol_cancer_202601`에 이미 연결된 문서와 동일하므로, 표준형 source에는 재사용하지 않는다.

---

## 6. 안전성 판단

- 운영 DB, `.env.local`, Turso URL/token은 사용하거나 수정하지 않았다.
- `seed.ts`는 변경하지 않았다.
- `insurance_product_sources.review_status`는 변경하지 않는다.
- `insurance_source_documents` seed 후보를 추가하지 않는다.
- `insurance_products` 추천 snapshot 발행 대상에 포함하지 않는다.
- 신한라이프 표준형 source는 공식 일반형 문서 endpoint가 발견되기 전까지 계속 `raw` 상태로 유지한다.

---

## 7. 남은 작업

1. 신한라이프 표준형 source는 이번 재탐색 기준으로도 unblock하지 않는다.
2. `needs_review=6`, `raw=11` source 중 공식 문서와 보험료 근거가 명확한 상품부터 매칭 키워드와 caveat를 정리한다.
3. 신한라이프는 보험다모아 product code와 공식 상품 페이지 관계를 별도 루트로 확인하기 전까지 추천 snapshot에서 제외한다.

---

## 8. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | 표준형 source에 no-refund 문서를 오연결하지 않도록 차단 근거를 재확인했다 |
| Potential Impact | 추천 후보 확대 전에 데이터 품질 게이트를 유지했다 |
| Novelty | 보험다모아 상품 코드와 보험사 공시 variant mismatch를 반복 가능한 probe로 검증했다 |
| UX | 사용자에게 잘못된 약관 기반 추천이 노출될 위험을 줄였다 |
| Open-source | 신한라이프 endpoint 탐색을 스크립트와 JSON/CSV 산출물로 재현 가능하게 만들었다 |
| Business Plan | 실제 상품 추천의 신뢰성을 높이는 운영 검수 절차를 강화했다 |

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - 추천 snapshot 발행 기준
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 현재 구현 순서와 다음 작업
- **QA_Validation**: [신한라이프 일반형 공식 문서 Endpoint 탐색](./29_SHINHAN_STANDARD_DOCUMENT_ENDPOINT_PROBE_2026_05_30.md) - 이전 수동 probe 기록
- **QA_Validation**: [KDB/신한 Source 문서 Variant 재검수](./26_KDB_SHINHAN_VARIANT_REVIEW_2026_05_29.md) - 기존 신한 차단 근거
- **Data**: [Shinhan Standard Document Endpoint Probe JSON](../../data/insurance/latest_shinhan_standard_document_endpoint_probe.json) - 구조화 endpoint 재탐색 결과
- **Data**: [Shinhan Standard Document Endpoint Probe CSV](../../data/insurance/latest_shinhan_standard_document_endpoint_probe.csv) - target row 요약
