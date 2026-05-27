# [QA] 보험상품 데이터 수집 PoC 결과
> Created: 2026-05-27 03:30
> Last Updated: 2026-05-27 13:43

- **레이어**: 05_QA_Validation
- **상태**: PoC 완료
- **범위**: 생명보험협회/손해보험협회 회원사 목록, 보험다모아 암보험 상품비교, 우체국보험 OpenAPI 안내, 대표 보험사 PDF 접근성
- **결론**: 공식 출처 기반으로 보험사 목록과 일부 P0 상품 데이터를 실제 수집할 수 있다. 다만 서비스 DB 반영 전에는 상품별 판매상태, 보험료 기준, 보장 범위, `risk_targets` 검수가 필요하다.

---

## 1. 검증 목적

현재 서비스의 보험상품 데이터는 mock seed 중심이다. 실제 유저에게 맞는 보험을 정리하려면 한국 보험사 전체 universe와 공식 상품 데이터 수집 가능성을 먼저 확인해야 한다.

이번 PoC는 자동 크롤러 구현 전 단계로, 다음 질문에 답하기 위해 수행했다.

1. 생명보험사와 손해보험사 목록을 공식 출처에서 가져올 수 있는가.
2. 보험다모아에서 실제 상품명, 보험사, 보험료를 구조적으로 추출할 수 있는가.
3. PDF와 OpenAPI 방식도 후속 파이프라인에 포함할 수 있는가.

---

## 2. 검증 결과 요약

| 대상 | URL | 결과 | 판단 |
|---|---|---|---|
| 생명보험협회 회원사 | `https://www.klia.or.kr/klia/company/member/list.do` | 보험사명과 홈페이지 링크 추출 가능 | PASS |
| 손해보험협회 회원사 | `https://www.knia.or.kr/about/partner/partner01` | 보험사명, 주소, 전화, 홈페이지 버튼 추출 가능 | PASS |
| 손해보험협회 공시실 | `https://kpub.knia.or.kr/productDisc/lostHealth/lostHealthDisclosure.do` | 실손의료보험 공시 페이지 접근 및 보험사 필터 일부 확인 | PASS |
| 보험다모아 암보험 | `https://e-insmarket.or.kr/m/cancerIns/cancerInsList.knia?...` | 상품명, 보험사, 보험료 추출 가능 | PASS |
| 우체국금융 OpenAPI 안내 | `https://www.epostlife.go.kr/IPUIOP0000.do` | 보험상품정보/1회 보험료 조회 API 엔드포인트 확인 | PARTIAL |
| 삼성생명 PDF | `https://www.samsunglife.com/dcms/down/w3sli/disclosure/disclosure_guide.pdf` | PDF HEAD 200, `application/pdf`, 약 11.3MB | PASS |

우체국금융은 API 안내와 엔드포인트는 확인했지만, 실제 호출은 `data.go.kr` 서비스키가 필요하므로 PARTIAL로 둔다.

---

## 3. 보험사 Universe PoC

### 3-1. 생명보험사

생명보험협회 회원사 페이지에서 다음 1차 수집 대상 생명보험사를 확인했다.

| 구분 | 보험사 |
|---|---|
| 생명보험사 | 한화생명, ABL생명, 삼성생명, 흥국생명, 교보생명, iM라이프, 미래에셋생명, KDB생명, DB생명, 동양생명, 메트라이프생명, KB라이프생명보험, 신한생명, 처브라이프생명, 하나생명, BNP파리바카디프생명, 푸본현대생명, 라이나생명, AIA생명, NH농협생명, IBK연금보험, 교보라이프플래닛 |
| 보조/비추천 대상 | 코리안리재보험, RGA재보험 한국지점, 한화생명금융서비스, 미래에셋금융서비스, 한화라이프랩, KB라이프파트너스, 동양생명금융서비스 |

재보험사와 금융서비스/대리점 계열사는 보험상품 추천 DB의 1차 대상에서 제외하고, carrier universe에는 별도 타입으로 보존하는 것이 적절하다.

### 3-2. 손해보험사

손해보험협회 회원사 페이지에서 다음 1차 수집 대상 손해보험사를 확인했다.

| 구분 | 보험사 |
|---|---|
| 손해보험사 | 메리츠화재, 한화손해보험, 롯데손해보험, 흥국화재, 삼성화재, 현대해상, KB손해보험, DB손해보험, AXA손해보험, AIG손해보험, 하나손해보험, 농협손해보험, 카카오페이손해보험, MG손해보험 |
| 보조/별도 분류 | 코리안리재보험, 서울보증보험, 외국계 재보험/특수보험 지점 |

P0 상품군인 암, 질병, 실손, 간병/치매 추천에는 위 손해보험사 중 건강/장기보험 상품을 판매하는 회사를 우선 적용한다.

---

## 4. 보험다모아 암보험 샘플 파싱

보험다모아 모바일 암보험 비교 URL에서 상품명, 보험사, 보험료 텍스트가 HTML로 추출됐다. 기준 파라미터는 `age=34`, `sex=2`, `enterType=A`, `indemnityTypeA=1`, `prdtSmlClsCd=D001`, `renewTypeA=C1`이다.

| 순위 | 보험사 | 상품명 | 보험료 |
|---|---|---|---|
| 1 | 한화생명 | 한화생명 e암보험(비갱신형)(무)(표준체형) | 0원 |
| 2 | 한화생명 | 한화생명 e암보험(비갱신형)(무)(비흡연체형) | 0원 |
| 3 | 미래에셋생명 | 온라인 암보험 무배당 [기본형] | 4,510원 |
| 4 | 미래에셋생명 | 온라인 암보험 무배당 [해약환급금이없는유형] | 6,490원 |
| 5 | 신한라이프생명 | 신한SOL암보험(무배당, 해약환급금 미지급형)(비갱신형) | 6,750원 |
| 6 | 신한라이프생명 | 신한SOL암보험(무배당)(비갱신형) | 7,870원 |
| 7 | KDB생명 | KDB다이렉트 암보험(해약환급금 미지급형III)(무) | 8,020원 |
| 8 | 교보라이프플래닛 | (무)교보라플 비갱신암보험(해약환급금 미지급형, 비흡연체) | 8,410원 |
| 9 | 교보라이프플래닛 | (무)교보라플 비갱신암보험(해약환급금 미지급형, 표준체) | 8,490원 |
| 10 | DB생명 | (무)e로운 암보험(해약환급금 미지급형)(2601) | 9,700원 |
| 11 | 동양생명 | (무)우리WON하는실속하나로암보험 | 11,000원 |
| 12 | 한화손보 | 한화 다이렉트 내가고른 암보험 무배당2604 | 12,204원 |

주의할 점은 `0원` 보험료가 실제 무료 상품이라고 단정할 수 없다는 것이다. 보험료 기준, 보장금액, 특약 조건, 화면 조건값을 함께 검수해야 한다.

---

## 5. PDF/API 판단

PDF 방식은 사용할 수 있다. 삼성생명 공개 PDF URL은 `HEAD` 요청에서 `200 OK`, `application/pdf`, `Content-Length: 11332054`로 확인됐다. 다만 이번 URL은 상품별 약관이 아니라 공개 PDF 접근성 확인용이므로, 다음 단계에서는 상품별 약관/상품요약서/사업방법서 URL을 찾아 `source_url + hash`로 보존해야 한다.

API 방식도 일부 가능하다. 우체국금융 OpenAPI 안내 페이지에서 다음 엔드포인트를 확인했다.

| API | 엔드포인트 | 상태 |
|---|---|---|
| 보험상품정보 조회 | `http://apis.data.go.kr/1721301/KpostInsuranceProductView/insuranceGoods` | 서비스키 필요 |
| 1회 보험료 조회 | `http://apis.data.go.kr/1721301/KpostInsuranceFeeCalculationView/insuranceFee` | 서비스키 필요 |

즉, API-only 전략은 부족하지만, 보험다모아/협회 HTML + 보험사 PDF + 우체국 OpenAPI를 섞는 하이브리드 수집 전략은 현실적이다.

---

## 6. QA 판정

| 항목 | 판정 | 메모 |
|---|---|---|
| 공식 보험사 목록 확보 가능성 | PASS | 생보/손보 협회에서 가능 |
| 상품명/보험사/보험료 추출 가능성 | PASS | 보험다모아 암보험 샘플 12개 추출 |
| PDF 다운로드 가능성 | PASS | 대표 PDF 접근 확인 |
| OpenAPI 사용 가능성 | PARTIAL | 우체국보험 API는 서비스키 확보 후 실제 호출 필요 |
| 서비스 DB 즉시 반영 | FAIL | 판매상태, 보험료 기준, 보장 범위, `risk_targets` 검수 전에는 불가 |

---

## 7. Collector v1 실행 결과

PoC 결과를 반복 실행할 수 있도록 `scripts/insurance/collect-official-sources.mjs`를 추가했다. 2026-05-27 04:32 KST 기준으로 Collector v1은 암보험 단일 수집기에서 보험다모아 P0 다중 상품군 수집기로 확장됐다. 실행 명령은 다음과 같다.

```bash
npm run collect:insurance
```

2026-05-27 04:32 KST 기준 실행 결과는 다음과 같다.

| 항목 | 결과 |
|---|---|
| 출력 파일 | `data/insurance/latest_official_sources_snapshot.json` |
| 생명보험협회 회원사 | 생명보험사 22개, 비주요 회원 별도 분류 |
| 손해보험협회 회원사 | 손해보험사/화재보험사 17개, 비주요 회원 별도 분류 |
| 보험다모아 P0 상품군 | 5개 카테고리, 상품 row 56개 |
| 보험다모아 상세 | 암보험 12개, 실손의료보험 9개, 유병력자실손 3개, 질병보험 31개, 간병/치매보험 1개 |
| 우체국금융 OpenAPI 후보 | 3개 |
| 삼성생명 PDF HEAD | 200 OK, `application/pdf` |

샌드박스 네트워크에서는 `fetch failed`가 발생할 수 있다. 공식 출처 갱신 작업은 네트워크 권한이 있는 환경에서 실행해야 한다.

---

## 8. 다음 작업

1. hash-backed 3개 row를 사람이 먼저 검수한다.
2. 보험사별 공시실 JavaScript/API 검색 어댑터를 보강한다.
3. 검수 CSV 이후 admin workflow를 설계한다.
4. 우체국보험 OpenAPI 호출을 위해 `data.go.kr` 서비스키를 준비한다.
5. `coverage_category`와 `risk_targets`는 자동 추출 후 사람 검수 승인 전까지 추천 결과에 사용하지 않는다.
6. 승인된 상품만 `insurance_product_sources` 또는 향후 seed 후보로 승격한다.

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 수집/정규화 파이프라인 명세
- **QA_Validation**: [Insurance Data Refresh QA](./03_INSURANCE_DATA_REFRESH_QA.md) - 정기 갱신 체크리스트
- **QA_Validation**: [Product Document Probe](./05_PRODUCT_DOCUMENT_PROBE_2026_05_27.md) - 대표 상품 공식 문서/PDF hash 검증 결과
- **QA_Validation**: [Carrier Disclosure Crawler](./06_CARRIER_DISCLOSURE_CRAWLER_2026_05_27.md) - 보험사 공시실 crawler v1 검증 결과
- **QA_Validation**: [Insurance Review Queue](./07_INSURANCE_REVIEW_QUEUE_2026_05_27.md) - 검수 CSV 생성 결과
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 적용 전략
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 작업 일정
- **Data**: [Official Sources PoC JSON](../../data/insurance/official_sources_poc_2026_05_27.json) - 이번 PoC의 구조화 근거 데이터
- **Data**: [Latest Official Sources Snapshot](../../data/insurance/latest_official_sources_snapshot.json) - Collector v1 최신 실행 결과
- **Data**: [Latest Product Document Probe](../../data/insurance/latest_product_document_probe.json) - 공식 페이지/PDF hash probe 결과
- **Data**: [Latest Carrier Disclosure Probe](../../data/insurance/latest_carrier_disclosure_probe.json) - 공시실 crawler v1 실행 결과
- **Data**: [Latest Insurance Review Queue](../../data/insurance/latest_insurance_review_queue.csv) - 검수 CSV
