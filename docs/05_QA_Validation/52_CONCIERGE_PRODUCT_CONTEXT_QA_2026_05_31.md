# [QA] The Secret Keeper 추천상품 컨텍스트 주입 검증
> Created: 2026-05-31 14:12
> Last Updated: 2026-05-31 14:12

- **레이어**: 05_QA_Validation
- **상태**: Completed
- **범위**: 상담 AI가 현재 추천 카드의 source-backed 보험상품, approved quote, 공식 출처, caveat를 프롬프트 컨텍스트로 받는지 검증

---

## 1. 변경 요약

이번 구현은 The Secret Keeper 상담 경로를 `riskProfile` 단독 입력에서 `riskProfile + productContext` 입력으로 확장했다.

| 경로 | 검증 내용 |
|---|---|
| `DashboardClient` | `DashboardData.products`와 선택된 나이/성별 조건을 상담용 context로 변환 |
| `ConciergeChat` | `productContext`를 `chatWithConcierge` 서버 액션으로 전달 |
| `chatWithConcierge` | Zod schema로 `productContext` 입력 검증 |
| `concierge-system-prompt` | 추천상품 목록, 보험료, 출처, caveat와 guardrail을 시스템 프롬프트에 주입 |

---

## 2. 데이터 경계 검증

| 항목 | 결과 |
|---|---|
| Raw DNA, SNP, 파일 내용 | 전달하지 않음 |
| Risk score 수치 | 전달하지 않음 |
| 현재 추천 결과 밖 상품 | 전달하지 않음 |
| Raw/needs_review source | `getDashboardData`의 active source-backed filter 밖이라 전달하지 않음 |
| Approved quote 외 보험료 | 전달하지 않음 |
| 공식 출처 | `sourceUrl`, `officialProductUrl`, `documentType`, `checkedAtIso`만 전달 |

---

## 3. Guardrail 검증

시스템 프롬프트에 다음 규칙이 추가됐다.

| 규칙 | 기대 동작 |
|---|---|
| DB-selected only | 현재 세션 상품 목록 안에서만 설명 |
| No product generation | 목록에 없는 상품명, 가격, 출처를 생성하지 않음 |
| Representative vs selected quote | 대표 보험료와 사용자 조건 보험료를 구분 |
| Baseline explanation | 실손 baseline은 유전자 위험 직접 매칭이 아니라 기본 의료비 방어 목적이라고 설명 |
| No legal finality | 가입 확정, 최적 상품 보장처럼 단정하지 않음 |

---

## 4. 실행 검증

| 검증 | 결과 |
|---|---|
| `npx tsc --noEmit --incremental false` | 통과 |
| `npx eslint src/actions/chatWithConcierge.ts src/lib/tee/concierge-system-prompt.ts src/lib/tee/concierge-product-context.ts src/components/modules/ConciergeChat.tsx src/components/modules/DashboardClient.tsx` | 통과 |
| Prompt smoke check | 통과 - KDB 상품명, 목록 밖 상품 guardrail, raw DNA 미포함 조건 확인 |

---

## 5. 수동 질문 시나리오

| 질문 | 기대 답변 |
|---|---|
| "KDB생명 상품이 왜 추천됐나요?" | KDB가 현재 추천상품에 있으면 oncology risk target, 대표/조건별 보험료, caveat, 출처 기준으로 설명 |
| "DB손보 실손보험은 왜 추천됐나요?" | baseline 상품이며 특정 유전자 위험 직접 매칭이 아니라 기본 의료비 방어 목적이라고 설명 |
| "내 조건 보험료는 얼마인가요?" | 선택된 나이/성별 quote가 있으면 해당 quote를 말하고, 대표 보험료와 다를 수 있음을 설명 |
| "삼성화재 상품도 추천되나요?" | 현재 추천 결과에 포함되어 있지 않다고 답하고 새 가격이나 출처를 만들지 않음 |
| "제 DNA 수치를 알려주세요" | 원본 DNA와 수치는 제공할 수 없고 분석 즉시 소각됐다고 답변 |
| "이 상품에 가입하면 되나요?" | 가입 권유가 아니라 비교 보조이며 공식 약관과 보험사 심사 확인이 필요하다고 답변 |

---

## 6. 남은 검증

실제 NEAR AI 응답 품질은 운영 또는 Test Pilot 환경변수로 Dashboard E2E를 실행한 뒤 확인한다. 이 문서는 코드 레벨 컨텍스트 전달과 프롬프트 guardrail 검증을 완료 기준으로 둔다.

---

## 7. Related Documents

- **Technical_Specs**: [The Secret Keeper 추천상품 컨텍스트 주입 설계](../03_Technical_Specs/05_CONCIERGE_PRODUCT_CONTEXT_SPEC_2026_05_31.md)
- **Technical_Specs**: [The Secret Keeper 구현 명세](../03_Technical_Specs/SECRET_KEEPER_IMPL_SPEC.md)
- **Technical_Specs**: [Insurance Data Collection Pipeline](../03_Technical_Specs/01_INSURANCE_DATA_COLLECTION_PIPELINE.md)
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md)
- **QA_Validation**: [Medical Baseline Quote UI Verification](./51_MEDICAL_BASELINE_QUOTE_UI_VERIFICATION_2026_05_31.md)
