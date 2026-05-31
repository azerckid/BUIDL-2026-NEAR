# [QA] 실손의료보험 조건별 Quote UI 표시 검증
> Created: 2026-05-31 11:50
> Last Updated: 2026-05-31 11:50

- **레이어**: 05_QA_Validation
- **상태**: Passed
- **범위**: Dashboard 추천 카드에서 DB손보, KB손보, 현대해상 실손의료보험 baseline 상품의 남성 조건 approved quote 표시
- **결론**: 로컬 임시 DB와 로컬 Next.js 서버로 대시보드 추천 화면을 검증했다. 남성 34세와 남성 44세 선택 시 3개 실손 baseline 추천 카드가 모두 `내 조건 예상 보험료`를 표시했고, `선택한 조건의 승인 보험료가 아직 없습니다.` fallback은 표시되지 않았다.

---

## 1. 검증 목적

PR #53 적용 후 운영 DB 기준 실손 baseline target quote 12건은 모두 `approved` 상태다. 이 검증은 DB 적용 결과가 실제 Dashboard UI에서 사용자 나이/성별 선택과 연결되는지 확인한다.

검증 대상은 다음 3개 active source-backed baseline 상품이다.

| 상품 | Source ID | Product ID |
|---|---|---|
| DB손보 다이렉트 실손의료비보험 | `src_db_direct_medical_202605` | `prod_db_direct_medical_202605` |
| KB손보 다이렉트실손의료비보장보험 | `src_kb_direct_medical_202605` | `prod_kb_direct_medical_202605` |
| 현대해상다이렉트실손의료비보장보험 | `src_hyundai_direct_medical_202605` | `prod_hyundai_direct_medical_202605` |

---

## 2. 검증 환경

운영 DB에는 write하지 않았다. 검증은 `/private/tmp/buidl_near_quote_ui_test.db` 로컬 SQLite/libSQL 파일에 migration, seed, quote row를 재생성한 뒤 수행했다.

| 항목 | 값 |
|---|---|
| 작업 브랜치 | `medical-baseline-quote-ui-verification` |
| Local DB | `/private/tmp/buidl_near_quote_ui_test.db` |
| Local server | `http://localhost:3001` |
| Dashboard URL | `/ko/dashboard?sid=11111111-1111-4111-8111-111111111111&wallet=guest-uiquote.testnet` |
| Test session | 완료 상태 analysis result, 추천 product 3건 |
| DB URL/token 노출 | 없음 |

로컬 DB는 빈 DB에서 시작했기 때문에 운영 DB의 과거 quote apply 이력을 그대로 갖고 있지 않다. 따라서 다음 순서로 운영 상태를 재현했다.

1. `drizzle/*.sql` migration 적용
2. `src/lib/db/seed.ts` 실행
3. `scripts/insurance/apply-premium-quotes.mjs --apply`로 quote row 84건 로컬 적재
4. `src/lib/db/seed.ts` 재실행
5. 실손 남성 quote 6건은 운영 DB의 PR #53 상태를 의미 키 기준으로 맞추기 위해 로컬 DB에서만 `product_source_id + age + sex` 조건으로 `approved` 처리

5번은 운영 DB write가 아니다. 로컬 재생성 시 `latest_premium_quote_probe.json`의 과거 hash suffix ID가 생성되기 때문에, PR #52/#53에서 운영 DB actual row ID로 교정한 상태를 화면 검증용 로컬 DB에 맞춘 절차다.

---

## 3. 로컬 DB 검증

최종 로컬 검증 DB 상태:

| `insurance_premium_quotes.review_status` | Count |
|---|---:|
| `approved` | 32 |
| `needs_review` | 52 |
| `rejected` | 8 |

실손 baseline approved quote:

| Source ID | Age | Sex | KRW |
|---|---:|---|---:|
| `src_db_direct_medical_202605` | 34 | female | 6,854 |
| `src_db_direct_medical_202605` | 34 | male | 6,219 |
| `src_db_direct_medical_202605` | 44 | female | 11,030 |
| `src_db_direct_medical_202605` | 44 | male | 9,320 |
| `src_kb_direct_medical_202605` | 34 | female | 6,439 |
| `src_kb_direct_medical_202605` | 34 | male | 6,400 |
| `src_kb_direct_medical_202605` | 44 | female | 10,323 |
| `src_kb_direct_medical_202605` | 44 | male | 9,074 |
| `src_hyundai_direct_medical_202605` | 34 | female | 6,545 |
| `src_hyundai_direct_medical_202605` | 34 | male | 6,740 |
| `src_hyundai_direct_medical_202605` | 44 | female | 9,949 |
| `src_hyundai_direct_medical_202605` | 44 | male | 9,190 |

---

## 4. UI 검증 결과

검증 절차:

1. 로컬 서버를 `TEST_PILOT_ENABLED=true`, `TEST_PILOT_SKIP_WALLET=true`, `TEST_PILOT_SKIP_PAYMENT=true` 상태로 실행
2. 완료 상태 테스트 session으로 Dashboard 진입
3. `추천 보험 (3)` 탭 진입
4. 조건 선택 UI에서 `남성` 선택
5. `34세`, `44세` 각각 선택 후 추천 카드의 `내 조건 예상 보험료` 영역 확인

검증 결과:

| 조건 | DB손보 | KB손보 | 현대해상 | Fallback |
|---|---:|---:|---:|---|
| 34세 남성 | 6,219 KRW | 6,400 KRW | 6,740 KRW | 없음 |
| 44세 남성 | 9,320 KRW | 9,074 KRW | 9,190 KRW | 없음 |

추가 확인:

| 항목 | 결과 |
|---|---|
| 추천 탭 상품 수 | `추천 보험 (3)` |
| 기본 선택 조건 | 34세 여성 |
| 남성 34세 선택 | 3개 카드 모두 `내 조건 예상 보험료 · 34세 · 남성` 표시 |
| 남성 44세 선택 | 3개 카드 모두 `내 조건 예상 보험료 · 44세 · 남성` 표시 |
| 대표 보험료와 조건별 보험료 분리 | 유지 |
| Checkout 합계 | 대표 snapshot 보험료 기준 유지. 결제 금액 개인화는 별도 정책 결정 필요 |

로컬 스크린샷은 `/private/tmp/medical-baseline-quote-ui-default.png`, `/private/tmp/medical-baseline-quote-ui-male44.png`에 저장했다. Git에는 포함하지 않는다.

---

## 5. 판정

Passed.

PR #53의 실손 baseline 남성 quote approval DB 적용 결과는 Dashboard UI에서 정상적으로 소비된다. 사용자가 남성 34세 또는 남성 44세를 선택해도 승인 quote가 없다는 fallback이 표시되지 않으며, 각 카드의 조건별 보험료가 approved quote matrix와 일치한다.

---

## 6. 남은 작업

1. 삼성화재 실손의료보험 상품 전용 문서 endpoint를 재탐색한다.
2. 남은 `raw`/`needs_review` source의 매칭 키워드, caveat, quote approval 기준을 계속 정리한다.
3. Checkout 합계를 사용자 조건별 quote로 바꿀지, 현재처럼 대표 snapshot 보험료로 유지할지 정책을 별도 결정한다.

---

## 7. Related Documents

- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 현재 추천 상품 수와 다음 작업 순서
- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - 실손 baseline source/quote pipeline
- **Technical_Specs**: [Insurance Matching Keyword Policy](../03_Technical_Specs/03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - baseline 매칭과 quote 표시 기준
- **QA_Validation**: [Premium Quote Personalization](./41_PREMIUM_QUOTE_PERSONALIZATION_2026_05_31.md) - 조건별 보험료 UI 1차 구현 검증
- **QA_Validation**: [Medical Baseline Snapshot DB Apply](./48_MEDICAL_BASELINE_SNAPSHOT_DB_APPLY_2026_05_31.md) - 실손 baseline 추천 snapshot 운영 DB 적용 검증
- **QA_Validation**: [Medical Baseline Male Quote ID Correction](./49_MEDICAL_BASELINE_MALE_QUOTE_ID_CORRECTION_2026_05_31.md) - 남성 quote actual ID 교정 검증
- **QA_Validation**: [Medical Baseline Male Quote DB Apply](./50_MEDICAL_BASELINE_MALE_QUOTE_DB_APPLY_2026_05_31.md) - 남성 quote approval 운영 DB 적용 검증
