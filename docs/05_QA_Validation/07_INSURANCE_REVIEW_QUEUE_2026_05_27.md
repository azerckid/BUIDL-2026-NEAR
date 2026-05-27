# [QA] 보험상품 검수 CSV 생성 결과
> Created: 2026-05-27 13:43
> Last Updated: 2026-05-28 02:36

- **레이어**: 05_QA_Validation
- **상태**: Review Queue v1.2 완료
- **범위**: 보험다모아 P0 상품 row, 공식 상품 페이지 probe, 보험사 공시실 crawler 결과를 결합해 사람이 검수할 CSV 생성
- **결론**: 총 56개 상품 row 중 공식 상품 URL이 있는 row는 47개이고, 공식 문서 hash가 확보된 검수 우선 row는 7개다. 이 CSV는 서비스 DB seed가 아니라 사람 검수 대기열이다.

---

## 1. 실행 명령

```bash
npm run collect:insurance:review
```

출력 파일은 다음과 같다.

| 파일 | 역할 |
|---|---|
| `data/insurance/latest_insurance_review_queue.csv` | 사람이 검수할 상품 row별 작업표 |
| `data/insurance/latest_insurance_review_queue_summary.json` | CSV 생성 요약과 QA blocker |

---

## 2. 생성 결과

| 항목 | 결과 |
|---|---|
| 전체 검수 row | 56개 |
| 공식 상품 URL 보유 row | 47개 |
| 공식 문서 hash 보유 row | 7개 |
| hash 문서 수 | 12개 |
| `needs_human_review` | 7개 |
| `needs_source_document` | 40개 |
| `needs_official_product_url` | 9개 |

---

## 3. 우선 검수 대상

| 보험사 | 상품 | 확보 문서 | 상태 |
|---|---|---|---|
| 한화생명 | 한화생명 e암보험(비갱신형)(무)(표준체형) | 상품요약서, 약관 | `needs_human_review` |
| 신한라이프생명 | 신한SOL암보험(무배당, 해약환급금 미지급형)(비갱신형) | 상품요약서, 사업방법서, 판매약관 | `needs_human_review` |
| DB손보 | (무)다이렉트 실손의료비보험2605(CM) | 약관, 사업방법서, 상품요약서 | `needs_human_review` |
| KB손보 | KB손보 다이렉트실손의료비보장보험(무배당)(26.05) | 약관 | `needs_human_review` |
| 삼성화재 | 무배당 삼성화재 다이렉트 실손의료비보험(2605.1) | 약관 | `needs_human_review` |
| 현대해상 | (무)현대해상다이렉트실손의료비보장보험(갱신형)(Hi2605) | 약관 | `needs_human_review` |
| 삼성생명 | 삼성 인터넷 입원 건강보험(2601)(무배당,무해약환급금형) | 통합약관 | `needs_human_review` |

`needs_human_review`는 서비스 추천에 사용 가능하다는 뜻이 아니다. 사람이 다음 항목을 승인해야 한다.

- 상품명과 보험사명이 공식 문서와 같은지
- 판매상태가 현재 판매중인지
- 보험료 산정 기준이 보험다모아 조건과 맞는지
- `coverage_category`가 기존 enum과 맞는지
- `risk_targets`가 유전자 위험 플래그와 과장 없이 연결되는지

---

## 4. 다음 작업

1. 수동 검수 완료된 7개 row를 기준으로 source-aware seed 승격 정책을 확정한다.
2. 한화생명/신한라이프 암보험은 `catalog_candidate`로 관리하되, 보험료 기준과 보장 caveat 승인 전까지 seed에 바로 넣지 않는다.
3. DB손보/KB손보/삼성화재/현대해상 실손의료보험은 `medical_expense` + `baseline` 후보로 관리한다.
4. 삼성생명 입원 건강보험은 `hospitalization`/`general_health` 카테고리 추가 또는 source catalog 전용 처리 중 하나를 결정한다.
5. `needs_source_document` 40개는 보험사별 JS/API adapter를 추가해 문서 hash를 확보한다.
6. `needs_official_product_url` 9개는 보험다모아 row의 공식 이동 URL 추출 실패 원인을 재확인한다.

---

## 5. Related Documents

- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 수집 파이프라인과 검수 CSV 생성 명세
- **QA_Validation**: [Carrier Disclosure Crawler](./06_CARRIER_DISCLOSURE_CRAWLER_2026_05_27.md) - 공시실 crawler와 보험사 API adapter 검증 결과
- **QA_Validation**: [Hash-backed Product Manual Review](./08_HASH_BACKED_PRODUCT_MANUAL_REVIEW_2026_05_27.md) - hash-backed 7개 상품 수동 검수 결과와 seed 차단 사유
- **QA_Validation**: [Product Document Probe](./05_PRODUCT_DOCUMENT_PROBE_2026_05_27.md) - 공식 상품 페이지/PDF hash 1차 검증
- **QA_Validation**: [Insurance Data Refresh QA](./03_INSURANCE_DATA_REFRESH_QA.md) - 정기 갱신 체크리스트
- **Logic_Progress**: [Two Pillars Service Update](../04_Logic_Progress/03_SERVICE_UPDATE_TWO_PILLARS_2026_05.md) - 실제 보험상품 카탈로그 적용 전략
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - Track A 작업 일정
- **Data**: [Latest Insurance Review Queue](../../data/insurance/latest_insurance_review_queue.csv) - 검수 CSV
- **Data**: [Latest Insurance Review Queue Summary](../../data/insurance/latest_insurance_review_queue_summary.json) - 검수 CSV 요약
