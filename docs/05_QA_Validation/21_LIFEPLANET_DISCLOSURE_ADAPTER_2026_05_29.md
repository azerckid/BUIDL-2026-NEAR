# [QA] 교보라이프플래닛 공시 Adapter 검증
> Created: 2026-05-29 02:26
> Last Updated: 2026-05-29 02:26

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: quote-only raw source 후보 중 교보라이프플래닛 비갱신암보험 2개 상품의 공식 공시 문서 hash 확보
- **결론**: 교보라이프플래닛 공시실 `HPDA01S0` 화면의 `ProdMainList` JSON과 `FileDownload.dev` 규칙을 adapter로 연결해, `L43C009000022`, `L43C009000019` 두 상품 모두 match score 1.0과 공식 문서 3종 hash를 확보했다. DB write는 하지 않았다.

---

## 1. 변경 범위

| 파일 | 변경 |
|---|---|
| `scripts/insurance/collect-carrier-disclosures.mjs` | `교보라이프플래닛` carrier profile 추가 |
| `scripts/insurance/collect-carrier-disclosures.mjs` | `lifeplanet_disclosure_good` API search kind 추가 |
| `data/insurance/latest_quote_only_carrier_disclosure_probe.json` | 새 adapter 반영 후 probe 산출물 갱신 |

공식 문서 다운로드는 다음 규칙을 사용한다.

| 공시 필드 | 문서 타입 | 다운로드 타입 |
|---|---|---:|
| `prdSryPat` | `summary` | `1` |
| `prdMdPat` | `business_method` | `2` |
| `insTxtPat` | `terms` | `0` |

---

## 2. 실행 명령

개별 검증:

```bash
npm run collect:insurance:docs -- --product-codes L43C009000022,L43C009000019 --out /private/tmp/lifeplanet_product_probe.json --timeout-ms 30000
npm run collect:insurance:disclosures -- --product-probe /private/tmp/lifeplanet_product_probe.json --out /private/tmp/lifeplanet_disclosure_probe.json --limit 2 --timeout-ms 30000
```

최신 quote-only probe 갱신:

```bash
npm run collect:insurance:disclosures -- --product-probe data/insurance/latest_quote_only_product_document_probe.json --out data/insurance/latest_quote_only_carrier_disclosure_probe.json --limit 15 --timeout-ms 30000
```

---

## 3. 결과

| 항목 | 결과 |
|---|---:|
| 개별 교보 대상 product code | 2 |
| 교보 matched product | 2 |
| 교보 match score | 1.0 |
| 교보 hashed document | 6 |
| 전체 carrier disclosure target | 10 |
| 전체 accessible carrier page | 3 |
| 전체 carrier disclosure hashed document | 9 |

교보라이프플래닛에서 확보한 고유 문서 hash:

| 문서 | URL 규칙 | SHA-256 |
|---|---|---|
| 상품요약서 | `FileDownload.dev?fileName=20260401_10054_01.pdf&downloadPathType=1` | `00e46751ef624c207f8a6aebee3b5768585216d8aeeecddf16b7d4c7bd947780` |
| 사업방법서 | `FileDownload.dev?fileName=20260401_10054_02.pdf&downloadPathType=2` | `7ab6f8dd927ef2b2ea95607f483cf8b6e34fe4a8c6d5844424515afc18c1cff2` |
| 보험약관 | `FileDownload.dev?fileName=20260401_10054_03.pdf&downloadPathType=0` | `a61c106f431fb98cf4d839694a1f02d282173b5732aefa62b08e17f47afaa30a` |

두 quote-only source가 같은 공시 상품 코드 `10054`를 공유한다.

| Product code | 상품명 | Match score | Hash 문서 |
|---|---|---:|---:|
| `L43C009000022` | `(무)교보라플 비갱신암보험(해약환급금 미지급형, 비흡연체)` | 1.0 | 3 |
| `L43C009000019` | `(무)교보라플 비갱신암보험(해약환급금 미지급형, 표준체)` | 1.0 | 3 |

---

## 4. 안전성

- 이번 작업은 수집 스크립트와 probe 산출물만 변경한다.
- `insurance_source_documents` seed와 Turso DB에는 아직 반영하지 않는다.
- 교보 후보도 `coverage_category`, `risk_targets`, `matching_strategy`, caveat 정리 전까지 사용자 추천으로 승격하지 않는다.
- hash는 공식 공시 문서 진위 근거이며, 상품 추천 승인은 매칭 키워드 검토 후 별도 PR에서 처리한다.

---

## 5. 남은 작업

1. 한화생명, KDB생명, 신한라이프, 교보라이프플래닛 hash 문서의 상품 variant를 seed 후보로 수동 정리한다.
2. 농협손보, 메리츠화재, 흥국화재, 미래에셋생명, 한화손보, DB생명 adapter를 계속 보강한다.
3. 공식 URL이 없는 롯데손보, 한화손보 실손, 동양생명은 공시실 검색 endpoint 또는 공식 상품 URL을 먼저 확보한다.
4. hash-backed 후보만 매칭 키워드 정리 queue에 올린다.

---

## 6. 365 Rubric 영향

| Rubric | 검증 의미 |
|---|---|
| Functionality | product page에 PDF 링크가 없어도 carrier disclosure adapter로 공식 문서 hash를 확보했다 |
| Potential Impact | quote-only source 15개 중 2개 상품을 hash-backed 검토 단계로 이동시켰다 |
| Novelty | 보험사 공시 화면의 embedded JSON과 다운로드 규칙을 재사용 가능한 adapter 패턴으로 일반화했다 |
| UX | 추천 후보 승격 전 공식 문서 근거를 강화해 잘못된 상품 안내 위험을 줄인다 |
| Open-source | 다른 carrier adapter가 따라갈 수 있는 API search kind 확장 패턴을 남겼다 |
| Business Plan | 실제 판매 상품 universe 확장에 필요한 공식 문서 확보 비용을 낮춘다 |

---

## 7. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 보험상품/보험료 수집 파이프라인
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - raw/needs_review/approved 의미
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 진행 상태
- **QA_Validation**: [Quote-only Source 공식 문서 Probe 검증](./20_QUOTE_ONLY_SOURCE_DOCUMENT_PROBE_2026_05_29.md) - product-code probe 1차 결과
- **QA_Validation**: [Source Catalog Quote DB Apply](./19_SOURCE_CATALOG_QUOTE_DB_APPLY_2026_05_29.md) - quote-only raw source DB 적용
