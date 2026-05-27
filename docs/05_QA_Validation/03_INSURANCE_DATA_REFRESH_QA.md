# [QA] 보험상품 데이터 정기 갱신 검증 체크리스트
> Created: 2026-05-27 03:14
> Last Updated: 2026-05-27 13:43

- **레이어**: 05_QA_Validation
- **상태**: Draft v1.4
- **범위**: 한국 보험상품 데이터 수집, PDF/API 원천 검증, 월간/분기 갱신 품질관리
- **기준 문서**: `docs/03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md`

---

## 1. 목적

보험상품 데이터는 판매상태, 약관, 보험료 기준, 상품명이 수시로 바뀔 수 있다. 따라서 한 번 수집한 seed 데이터로 운영하지 않고, 공식 출처를 주기적으로 확인하는 검증 절차를 둔다.

---

## 2. 주간 체크

| 항목 | PASS 기준 | 기록 |
|---|---|---|
| 생명보험협회 공시실 접근 | 상품비교공시 페이지 접근 가능 | 확인일, 상태코드 |
| 손해보험협회 공시실 접근 | 상품비교공시/실손 공시 페이지 접근 가능 | 확인일, 상태코드 |
| 보험다모아 접근 | 상품 검색/카테고리 페이지 접근 가능 | 확인일, 상태코드 |
| 우체국금융 OpenAPI 상태 | 인증키가 있으면 샘플 호출 정상 | 응답 코드, 응답 포맷 |
| 다운로드 실패 목록 | 전주 대비 신규 실패 원인 분류 | URL, 원인, 조치 |

주간 공식 출처 접근성 확인은 Collector v1로 먼저 실행한다.

```bash
npm run collect:insurance
```

PASS 기준은 `data/insurance/latest_official_sources_snapshot.json`의 `source_status` 항목이 공식 출처별로 `accessible`이며, 생명보험사/손해보험사/보험다모아 P0 상품군 샘플 수가 0이 아닌 것이다. 2026-05-27 기준 최소 기대값은 암보험, 실손의료보험, 유병력자실손의료보험, 질병보험, 간병/치매보험 5개 카테고리와 총 20개 이상 상품 row다.

대표 상품 공식 문서/PDF probe는 다음 명령으로 실행한다.

```bash
npm run collect:insurance:docs
```

PASS 기준은 대표 상품 공식 페이지가 접근 가능하고, PDF가 발견된 문서는 `sha256` hash가 기록되는 것이다. direct landing page에서 PDF가 발견되지 않은 상품은 실패가 아니라 `보험사 공시실 crawler 필요`로 분류한다.

보험사 공시실/PDF crawler는 다음 명령으로 실행한다.

```bash
npm run collect:insurance:disclosures
```

PASS 기준은 공시실 profile이 있는 보험사 페이지가 접근 가능하고, 상품명 매칭이 임계값을 통과한 PDF 문서에만 `sha256` hash가 기록되는 것이다. 유사 상품명 false positive는 hash 대상에서 제외한다.

공식 출처와 문서 hash 결과를 사람이 검수할 CSV로 합치는 작업은 다음 명령으로 실행한다.

```bash
npm run collect:insurance:review
```

PASS 기준은 `latest_insurance_review_queue.csv`가 생성되고, `latest_insurance_review_queue_summary.json`에 전체 row 수와 `needs_human_review`, `needs_source_document`, `needs_official_product_url` 수가 기록되는 것이다.

---

## 3. 월간 체크

| 항목 | PASS 기준 | 기록 |
|---|---|---|
| P0 상품군 신규 상품 확인 | 암, 질병, 실손, 간병/치매 상품 신규 여부 기록 | 신규 상품명, 보험사 |
| 판매중지/개정 상품 확인 | 기존 상품의 판매상태 변경 기록 | 이전 상태, 변경 상태 |
| PDF hash 변경 감지 | hash 변경 문서는 재파싱 대상으로 표시 | 이전 hash, 신규 hash |
| 상품요약서/약관/사업방법서 세트 확인 | 상품별 필수 문서 누락 여부 확인 | 누락 문서 |
| `coverage_category` 매핑 검토 | 자동 매핑 결과가 상품군과 일치 | 승인자, 승인일 |
| `risk_targets` 매핑 검토 | 보장명과 유전자 위험 플래그 연결이 과장되지 않음 | 승인자, 근거 |
| 보험료 기준 확인 | 나이, 성별, 납입기간, 보장금액 기준이 기록됨 | `premium_basis` |

---

## 4. 분기 체크

| 항목 | PASS 기준 | 기록 |
|---|---|---|
| 전체 보험사 목록 재확인 | 생보/손보 회원사 목록과 내부 carrier 목록 일치 | 추가/삭제/변경 |
| 보험사 공시실 URL 재확인 | 대표 보험사 공시실 링크가 유효 | 실패 URL |
| 이용약관/robots 정책 재확인 | 수집 방식 변경 필요 여부 판단 | 검토자, 메모 |
| 추천 샘플 QA | 샘플 유저 위험 프로필별 추천 상품이 실제 상품 DB에서만 나옴 | 세션 ID, 결과 |
| 출처 표시 QA | UI/API 응답에 출처 URL과 확인일이 포함됨 | 화면/API 캡처 |
| 법무 문구 QA | 보험료/가입 권유/의학적 판단 관련 고지가 표시됨 | 고지 버전 |

---

## 5. 이벤트 기반 체크

다음 이벤트가 발생하면 정기 주기와 별개로 긴급 점검한다.

- 금융당국 보험상품 비교·추천 규제 변경
- 보험협회 공시 시스템 개편
- 보험다모아 카테고리 또는 조회 방식 변경
- 대형 보험사 상품 개정 또는 판매중지 공지
- OpenAPI 응답 스키마 변경
- PDF 문서 구조 대규모 변경

---

## 6. 승인 기준

서비스 DB에 반영하려면 다음 조건을 모두 만족해야 한다.

- [ ] 공식 출처 URL이 있다.
- [ ] 수집일과 확인일이 기록되어 있다.
- [ ] 원문 파일 또는 응답 본문의 hash가 기록되어 있다.
- [ ] 상품명과 보험사명이 원문과 일치한다.
- [ ] 판매상태가 확인되었다.
- [ ] 보험료가 표시될 경우 산정 기준이 함께 기록되어 있다.
- [ ] `coverage_category`가 사람이 승인했다.
- [ ] `risk_targets`가 사람이 승인했다.
- [ ] 사용자에게 보여줄 출처/확인일/주의문구가 준비되어 있다.

---

## 7. 실패 처리

| 실패 유형 | 조치 |
|---|---|
| 출처 접근 실패 | 24시간 후 재시도. 3회 실패 시 수동 확인 |
| PDF 다운로드 실패 | 원문 페이지 링크만 보존하고 다운로드 보류 |
| 파싱 실패 | `needs_review`로 분류하고 사람이 수동 입력 |
| hash 변경 | 이전 승인값 유지, 신규 문서 재검수 후 교체 |
| 보험료 기준 불명확 | 보험료 표시 금지. 상품명/보장 요약만 사용 |
| 판매상태 불명확 | 추천 대상에서 제외하고 `needs_review` 처리 |

---

## 8. 365 Rubric Scorecard

| Rubric | 체크 포인트 |
|---|---|
| Functionality | 최신 상품만 추천되는가 |
| Potential Impact | 주요 생보/손보사 상품군을 빠짐없이 확장할 수 있는가 |
| Novelty | 유전자 위험 플래그와 공식 상품 공시자료 연결이 검증 가능한가 |
| UX | 출처와 확인일을 통해 유저가 추천을 신뢰할 수 있는가 |
| Open-source | 수집 실패/갱신 절차가 문서만 보고 재현 가능한가 |
| Business Plan | 운영 가능한 데이터 갱신 주기가 정의되어 있는가 |

---

## 9. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 수집/정규화 기술 명세
- **QA_Validation**: [Insurance Data Acquisition PoC](./04_INSURANCE_DATA_ACQUISITION_POC_2026_05_27.md) - 공식 출처 수집 가능성 검증 결과
- **QA_Validation**: [Product Document Probe](./05_PRODUCT_DOCUMENT_PROBE_2026_05_27.md) - 대표 상품 공식 문서/PDF hash 검증 결과
- **QA_Validation**: [Carrier Disclosure Crawler](./06_CARRIER_DISCLOSURE_CRAWLER_2026_05_27.md) - 보험사 공시실 crawler v1 검증 결과
- **QA_Validation**: [Insurance Review Queue](./07_INSURANCE_REVIEW_QUEUE_2026_05_27.md) - 검수 CSV 생성 결과
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 적용 전략
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 작업 우선순위와 일정
- **Technical_Specs**: [DB Schema](../03_Technical_Specs/DB_SCHEMA.md) - 상품 카탈로그 저장 구조
