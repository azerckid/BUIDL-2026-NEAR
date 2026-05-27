# [QA] 보험상품 공식 문서/PDF Probe 결과
> Created: 2026-05-27 12:49
> Last Updated: 2026-05-27 13:43

- **레이어**: 05_QA_Validation
- **상태**: PoC 완료
- **범위**: 보험다모아 P0 상품 row의 공식 상품 이동 URL, 대표 상품 8개 공식 페이지 접근성, PDF 후보/hash 수집
- **결론**: 보험다모아 row에서 공식 상품 이동 URL과 product code를 추출할 수 있다. 대표 8개 상품 공식 페이지 접근은 모두 성공했으며, 한화생명 암보험은 상품요약서/약관 PDF hash까지 확보했다. 다만 다수 보험사 direct landing page는 초기 HTML에 PDF 링크를 노출하지 않으므로 보험사 공시실 crawler가 필요하다.

---

## 1. 실행 명령

```bash
npm run collect:insurance
npm run collect:insurance:docs
```

출력 파일은 다음과 같다.

| 파일 | 역할 |
|---|---|
| `data/insurance/latest_official_sources_snapshot.json` | 보험다모아 상품 row, 공식 상품 이동 URL, product code 포함 |
| `data/insurance/latest_product_document_probe.json` | 대표 상품 공식 페이지 접근성, PDF 후보, PDF hash 결과 |

---

## 2. 대표 상품 Probe 결과

| 항목 | 결과 |
|---|---|
| 대표 상품 수 | 8개 |
| 공식 상품 페이지 접근 | 8개 성공 |
| PDF 후보 URL | 5개 |
| 실제 PDF hash | 2개 |
| hash 확보 상품 | 한화생명 e암보험(비갱신형)(무)(표준체형) |

대표 보험사 기준으로 삼성생명, 삼성화재, DB생명, DB손보, 한화생명, 현대해상, KB손보, 신한라이프생명을 우선 probe했다.

---

## 3. PDF Hash 확보 결과

| 보험사 | 상품 | 문서 유형 | 상태 |
|---|---|---|---|
| 한화생명 | 한화생명 e암보험(비갱신형)(무)(표준체형) | 상품요약서 PDF | hash 확보 |
| 한화생명 | 한화생명 e암보험(비갱신형)(무)(표준체형) | 약관 PDF | hash 확보 |

확보된 hash와 원문 URL은 `data/insurance/latest_product_document_probe.json`에 저장했다.

---

## 4. 한계

삼성생명, 삼성화재, DB생명, DB손보, 현대해상, KB손보, 신한라이프생명 direct landing page는 접근 가능했지만, 초기 HTML에서 PDF 링크가 발견되지 않았다. 이 경우 상품 페이지 내부 JavaScript/API 또는 보험사 공시실 별도 페이지에서 상품요약서/약관 URL을 찾아야 한다.

이번 결과만으로는 해당 상품을 서비스 추천 DB에 승격할 수 없다. 공식 문서 hash, 판매상태, 보험료 기준, `coverage_category`, `risk_targets` 검수 승인이 필요하다.

---

## 5. 다음 작업

1. 보험사별 공시실 crawler v1 결과를 바탕으로 JavaScript/API 검색 어댑터를 보강한다.
2. 삼성생명/현대해상/KB손보/신한라이프 상품요약서·약관 URL을 공시실에서 찾는다.
3. `latest_product_document_probe.json` 결과를 기반으로 검수 CSV 포맷을 만든다.
4. PDF hash가 확보된 상품만 `review_status=needs_review`로 승격한다.

---

## 6. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 수집/정규화 파이프라인 명세
- **QA_Validation**: [Insurance Data Acquisition PoC](./04_INSURANCE_DATA_ACQUISITION_POC_2026_05_27.md) - 보험상품 공식 출처 수집 가능성 검증
- **QA_Validation**: [Insurance Data Refresh QA](./03_INSURANCE_DATA_REFRESH_QA.md) - 정기 갱신 체크리스트
- **QA_Validation**: [Carrier Disclosure Crawler](./06_CARRIER_DISCLOSURE_CRAWLER_2026_05_27.md) - 보험사 공시실 crawler v1 검증 결과
- **QA_Validation**: [Insurance Review Queue](./07_INSURANCE_REVIEW_QUEUE_2026_05_27.md) - 검수 CSV 생성 결과
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 적용 전략
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 작업 일정
- **Data**: [Latest Product Document Probe](../../data/insurance/latest_product_document_probe.json) - 공식 페이지/PDF hash probe 결과
