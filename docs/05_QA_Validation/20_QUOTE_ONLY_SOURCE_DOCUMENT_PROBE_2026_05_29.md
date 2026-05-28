# [QA] Quote-only Source 공식 문서 Probe 검증
> Created: 2026-05-29 01:55
> Last Updated: 2026-05-29 01:55

- **레이어**: 05_QA_Validation
- **상태**: Partial Passed
- **범위**: quote-only raw source 후보 15개의 공식 상품 페이지 접근성, PDF/hash 1차 수집, 공시 crawler 후속 필요성 검증
- **결론**: 15개 quote-only 후보 중 12개는 보험다모아 snapshot의 공식 상품 URL로 접근 가능했고, 상품 페이지 직접 probe에서 2개 상품 5개 PDF hash를 확보했다. 기존 carrier disclosure crawler를 연결하면 신한라이프 후보 1개에서 3개 hash가 추가로 나오지만 매칭 점수 0.5라 수동 확인이 필요하다. 나머지 후보는 carrier별 공시/API adapter 보강이 필요하다.

---

## 1. 실행 대상

| 항목 | 값 |
|---|---|
| 입력 snapshot | `data/insurance/latest_official_sources_snapshot.json` |
| 대상 product code | quote-only raw source 후보 15개 |
| 상품 페이지 산출물 | `data/insurance/latest_quote_only_product_document_probe.json` |
| 공시 crawler 산출물 | `data/insurance/latest_quote_only_carrier_disclosure_probe.json` |
| 수집 스크립트 | `scripts/insurance/collect-product-documents.mjs`, `scripts/insurance/collect-carrier-disclosures.mjs` |

이번 검증은 DB write를 하지 않는다. `insurance_source_documents` 추가와 Turso DB 적용은 후속 PR에서 별도로 다룬다.

---

## 2. 스크립트 보강

`collect-product-documents.mjs`에 `--product-codes` 옵션을 추가했다.

| 변경 | 목적 |
|---|---|
| `--product-codes` | 대표 상품 1개씩이 아니라 특정 보험다모아 product code 목록을 직접 probe |
| `skipped_products` | snapshot에 공식 상품 URL이 없는 후보를 산출물에 남김 |
| PDF 요청 `Referer` | 일부 보험사 상품 페이지에서 발견한 PDF URL이 referer를 요구할 가능성에 대응 |

---

## 3. 상품 페이지 Probe 결과

명령:

```bash
npm run collect:insurance:docs -- --product-codes N71G004000001G,N03G004000001G,N01G004000002G,N02G004000001G,N05G004000001G,L43C009000022,L43C009000019,L74C009000006,L34C009000021,L34C009000022,L11C009000007,L01C009000010,N02C009000016,L71C009000006,L33C009000025 --out data/insurance/latest_quote_only_product_document_probe.json --timeout-ms 30000
```

결과:

| 항목 | 결과 |
|---|---:|
| 대상 product code | 15 |
| 공식 상품 URL 보유 | 12 |
| 공식 상품 URL 없음 | 3 |
| 접근 성공 페이지 | 12 |
| PDF 후보 | 10 |
| hashed PDF | 5 |

공식 상품 URL이 없는 후보:

| 보험사 | Product code | 상품명 |
|---|---|---|
| 롯데손보 | `N03G004000001G` | 무배당 let:care 실손의료보험Ⅴ(2605) |
| 한화손보 | `N02G004000001G` | 한화다이렉트실손의료보험(갱신형)Ⅴ 무배당 |
| 동양생명 | `L74C009000006` | (무)우리WON하는실속하나로암보험 |

상품 페이지에서 hash를 확보한 후보:

| 보험사 | Product code | 상품명 | Hash 문서 |
|---|---|---|---:|
| 한화생명 | `L01C009000010` | 한화생명 e암보험(비갱신형)(무)(비흡연체형) | 2 |
| KDB생명 | `L33C009000025` | KDB다이렉트 암보험(해약환급금 미지급형III)(무) | 3 |

---

## 4. 공시 Crawler 연결 결과

명령:

```bash
npm run collect:insurance:disclosures -- --product-probe data/insurance/latest_quote_only_product_document_probe.json --out data/insurance/latest_quote_only_carrier_disclosure_probe.json --limit 15 --timeout-ms 30000
```

결과:

| 항목 | 결과 |
|---|---:|
| carrier disclosure target | 10 |
| profile 적용 carrier | 2 |
| 접근 성공 carrier page | 2 |
| hashed document | 3 |

공시 crawler에서 추가 hash가 나온 후보:

| 보험사 | Product code | 상품명 | Match score | Hash 문서 | 판정 |
|---|---|---|---:|---:|---|
| 신한라이프생명 | `L11C009000007` | 신한SOL암보험(무배당)(비갱신형) | 0.5 | 3 | 상품명 변형 때문에 수동 확인 필요 |

---

## 5. 해석

이번 probe로 확인한 것은 다음이다.

- quote-only 후보 15개 중 최소 2개는 상품 페이지에서 직접 PDF hash를 확보할 수 있다.
- 신한라이프 후보는 공시 crawler가 3개 문서 hash를 확보했지만, 기존 adapter의 검색어가 해약환급금 미지급형 문서에 맞춰져 있어 현재 상품 코드와의 정확한 variant 매칭을 다시 확인해야 한다.
- 상품 페이지에 PDF 링크가 없는 후보가 많다. 특히 교보라이프플래닛, 미래에셋생명, 메리츠화재, 흥국화재, 한화손보, DB생명은 carrier별 JavaScript/API adapter가 필요하다.
- 롯데손보, 한화손보 실손, 동양생명은 보험다모아 snapshot 단계에서 공식 상품 URL이 비어 있어, 먼저 공식 상품 URL 또는 공시실 검색 endpoint를 찾아야 한다.

---

## 6. 추천 노출 안전성

- 이번 PR은 `insurance_products` active row를 변경하지 않는다.
- 새 hash는 probe 산출물에만 남긴다. 아직 `insurance_source_documents` seed나 운영 DB에 넣지 않는다.
- quote row 84건은 계속 `needs_review` 상태다.
- 문서 hash가 확보된 상품도 `coverage_category`, `risk_targets`, `matching_strategy`, caveat 정리 전까지 사용자 추천으로 승격하지 않는다.

---

## 7. 남은 작업

1. KDB생명과 한화생명 비흡연체형의 PDF variant를 수동 확인한 뒤 `insurance_source_documents` seed 후보로 정리한다.
2. 신한라이프 `L11C009000007` 문서가 표준형인지 해약환급금 미지급형인지 확인한다.
3. 교보라이프플래닛, 미래에셋생명, 메리츠화재, 흥국화재, 한화손보, DB생명 adapter를 보강한다.
4. 공식 URL이 비어 있는 롯데손보, 한화손보 실손, 동양생명은 공식 상품 URL 또는 공시실 검색 endpoint를 먼저 찾는다.
5. hash-backed 후보만 매칭 키워드 정리 queue에 올린다.

---

## 8. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | quote-only 후보를 product code 기준으로 반복 probe할 수 있게 됐다 |
| Potential Impact | 실제 상품 universe 확장 시 공식 문서 hash 확보 병목을 carrier별로 분해했다 |
| Novelty | 보험다모아 quote row와 보험사 공식 문서 hash를 분리 검증하는 파이프라인을 구체화했다 |
| UX | 공식 문서가 확인된 상품만 추천 후보로 승격해 잘못된 상품 안내를 줄인다 |
| Open-source | product-code 기반 probe 옵션과 산출물이 재사용 가능한 수집 패턴이 된다 |
| Business Plan | 보험 비교/중개형 서비스에 필요한 공식 문서 검증 비용과 남은 adapter 작업을 가시화했다 |

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Catalog Schema Extension](../03_Technical_Specs/02_INSURANCE_CATALOG_SCHEMA_EXTENSION_2026_05_27.md) - source-aware catalog와 source document 설계
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - raw/needs_review/approved 의미
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 적용 트랙
- **Logic_Progress**: [Premium Quote Policy](../04_Logic_Progress/04_INSURANCE_PREMIUM_QUOTE_POLICY_2026_05_28.md) - 조건별 보험료 matrix 정책
- **QA_Validation**: [Source Catalog Quote Expansion](./18_SOURCE_CATALOG_QUOTE_EXPANSION_2026_05_29.md) - quote-only raw source 후보 15개 확장 근거
- **QA_Validation**: [Source Catalog Quote DB Apply](./19_SOURCE_CATALOG_QUOTE_DB_APPLY_2026_05_29.md) - quote-only raw source 후보 DB 적용과 quote 84건 적재
