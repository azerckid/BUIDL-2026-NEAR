# [기술 명세] The Secret Keeper 추천상품 컨텍스트 주입 설계
> Created: 2026-05-31 13:46
> Last Updated: 2026-05-31 14:12

- **레이어**: 03_Technical_Specs
- **상태**: Implemented v1.1
- **범위**: 상담 AI가 현재 Dashboard에 노출된 source-backed 추천 보험상품을 DB 근거로 설명할 수 있도록 컨텍스트를 주입하는 설계
- **결론**: 상담 AI는 상품명을 생성하지 않는다. `getDashboardData`가 이미 조회한 추천 상품, approved quote, 공식 출처, caveat만 요약 컨텍스트로 받아 설명한다.

---

## 1. 문제 정의

현재 Dashboard 추천 카드는 운영 DB의 source-backed 상품을 보여준다. 그러나 The Secret Keeper 상담 화면은 `riskProfile`만 전달받는다.

현재 흐름:

```text
DashboardData.products
  -> 추천 카드 UI에서만 사용

ConciergeChat
  -> riskProfile만 chatWithConcierge에 전달

chatWithConcierge
  -> riskProfile만 system prompt에 주입
```

따라서 사용자가 아래처럼 질문하면 상담 AI는 DB 근거를 직접 알지 못한다.

- "KDB생명 상품이 왜 추천됐나요?"
- "한화생명과 교보라이프플래닛 암보험 차이가 뭔가요?"
- "DB손보 실손보험은 내 나이/성별 기준 보험료가 얼마인가요?"
- "공식 출처가 있는 상품인가요?"

이 기능의 목표는 상담 AI가 현재 추천된 상품을 설명하게 하되, AI가 새로운 상품명, 가격, 출처를 임의로 만들지 못하도록 제한하는 것이다.

---

## 2. 설계 원칙

| 원칙 | 내용 |
|---|---|
| DB-selected only | 상담 AI는 현재 session의 `DashboardData.products`에 포함된 상품만 설명한다 |
| No product generation | AI가 상품명, 보험료, 출처를 새로 생성하지 않는다 |
| Approved context only | `catalog_status=approved`, `is_active=1`, source-backed product와 `review_status=approved` quote만 전달한다 |
| Raw DNA exclusion | 원본 DNA, SNP, risk score, 파일 내용은 절대 포함하지 않는다 |
| No raw source expansion | `raw`, `needs_review` source 후보와 미승인 quote는 상담 컨텍스트에 넣지 않는다 |
| No legal finality | "가입 추천 확정", "최적 상품 보장"처럼 판매 권유 또는 확정 판단으로 들리는 답변을 금지한다 |
| Source caveat preservation | 보험료 기준, 공식 출처 확인일, caveat를 답변에 반영할 수 있게 한다 |

---

## 3. 목표 데이터 흐름

```text
getDashboardData(sessionId, walletAddress)
        │
        ├─ riskProfile
        └─ products: DashboardProduct[]
              ├─ insurance_products snapshot
              ├─ officialProductUrl/sourceUrl/sourceCheckedAtIso
              └─ approvedQuotes[]
        │
        ▼
DashboardClient
        │
        ▼
buildConciergeProductContext(products, selectedQuoteCondition)
        │
        ▼
ConciergeChat
        │
        ▼
chatWithConcierge({
  message,
  history,
  riskProfile,
  productContext
})
        │
        ▼
buildSystemPrompt(riskContext, productContext)
        │
        ▼
NEAR AI / Qwen response
```

중요한 경계는 `getDashboardData`다. 상담 AI가 DB를 직접 넓게 검색하지 않고, Dashboard가 이미 추천 결과로 확정한 상품만 설명한다.

---

## 4. 컨텍스트 스키마 초안

구현은 공유 스키마 파일 `src/lib/tee/concierge-product-context.ts`에 `ConciergeProductContext` Zod schema를 두고, `src/actions/chatWithConcierge.ts`가 서버 액션 입력에서 이를 검증한다. 클라이언트 컴포넌트는 type-only import만 사용해 Zod 런타임을 불필요하게 번들에 싣지 않는다.

```typescript
type ConciergeProductContext = {
  selectedQuoteCondition: {
    age: number;
    sex: "male" | "female";
  } | null;
  products: Array<{
    id: string;
    name: string;
    provider: string;
    coverageCategory: string;
    matchingStrategy: "risk_target" | "baseline" | "manual";
    riskTargets: string[];
    representativePremium: {
      monthlyKrw: number | null;
      monthlyUsdc: number;
      basis: string | null;
    };
    selectedQuote: {
      age: number | null;
      sex: "male" | "female" | "source_unknown" | null;
      monthlyKrw: number | null;
      premiumText: string | null;
      sourceType: "e_insmarket" | "carrier_quote" | "association" | "manual";
      retrievedAtIso: string | null;
    } | null;
    approvedQuoteSummary: Array<{
      age: number | null;
      sex: "male" | "female" | "source_unknown" | null;
      monthlyKrw: number | null;
      premiumText: string | null;
    }>;
    source: {
      officialProductUrl: string | null;
      sourceUrl: string | null;
      documentType: string | null;
      checkedAtIso: string | null;
    };
    caveats: string[];
  }>;
};
```

제한:

- `products`는 현재 Dashboard products만 사용한다.
- `products.length`는 12 이하로 제한한다.
- `approvedQuoteSummary`는 상품당 최대 4개 또는 현재 UI에 표시되는 조건만 포함한다.
- `coverageDetailsJson`, `coverageCaveatsJson`은 파싱 후 짧은 문자열 배열로 제한한다.
- PDF 본문, raw API response, 전체 약관 텍스트는 포함하지 않는다.

---

## 5. 프롬프트 정책

`buildSystemPrompt`는 두 종류의 컨텍스트를 받는다.

| 컨텍스트 | 용도 |
|---|---|
| `riskContext` | 사용자 유전자 위험 레이블 요약. 현재처럼 수치 없이 category/level/flags만 포함 |
| `productContext` | 현재 추천된 DB 상품 요약. 상품명, 보험사, 매칭 방식, 보험료 기준, 출처, caveat 포함 |

추가할 시스템 규칙:

```text
## 현재 추천된 보험상품 컨텍스트
아래 상품만 현재 세션의 추천 결과입니다.
목록에 없는 상품명, 가격, 출처는 추측하거나 생성하지 마세요.
사용자가 목록에 없는 상품을 물으면 "현재 추천 결과에는 해당 상품이 포함되어 있지 않습니다"라고 답하세요.
보험료는 공시/비교 조건 기준 예시이며 실제 가입 보험료가 아닐 수 있습니다.
baseline 상품은 특정 유전자 위험에 직접 대응하는 상품이 아니라 기본 의료비 방어 목적임을 설명하세요.
```

답변 방식:

- 질문이 상품명 중심이면 해당 상품의 DB 컨텍스트만 설명한다.
- 질문이 비교 중심이면 현재 `products` 안에서만 비교한다.
- 질문이 보험료 중심이면 `representativePremium`과 `selectedQuote`를 구분해 설명한다.
- 질문이 출처 중심이면 `source.checkedAtIso`, `source.documentType`, `sourceUrl` 존재 여부를 설명한다.
- 질문이 가입 가능성 중심이면 확정하지 않고 공식 상품설명서와 보험사 심사를 확인하라고 답한다.

---

## 6. 구현 대상 파일

| 파일 | 변경 내용 |
|---|---|
| `src/lib/tee/concierge-product-context.ts` | `ConciergeProductContext` Zod schema와 타입 정의 |
| `src/actions/chatWithConcierge.ts` | `productContext` Zod schema 추가, prompt builder 호출 인자 확장 |
| `src/lib/tee/concierge-system-prompt.ts` | `productContext` formatter와 guardrail 추가 |
| `src/components/modules/ConciergeChat.tsx` | props에 product context 추가 |
| `src/components/modules/DashboardClient.tsx` | `data.products`, `selectedQuoteCondition`에서 상담용 context 생성 후 전달 |
| `messages/ko.json`, `messages/en.json` | 필요 시 empty/help 문구 업데이트 |

DB schema 변경은 필요 없다. 이미 `getDashboardData`가 추천 상품과 approved quote를 한 번에 반환한다.

2026-05-31 14:12 KST 구현 결과:

- `DashboardClient`는 현재 Dashboard에 표시되는 `data.products` 최대 12개만 상담 컨텍스트로 변환한다.
- 상품별 approved quote summary는 최대 4개로 제한하고, 선택된 나이/성별 조건과 일치하는 quote를 별도 `selectedQuote`로 전달한다.
- `coverageCaveatsJson`과 `riskTargets`는 짧은 문자열 배열로 파싱하고 길이를 제한한다.
- `buildSystemPrompt`는 상품 목록 밖의 상품명, 가격, 출처를 생성하지 말라는 guardrail을 추가했다.
- 기존 `riskProfile`만 전달하던 상담 경로는 `riskProfile + productContext` 경로로 확장됐다.

---

## 7. QA 기준

구현 PR은 최소 아래 질문을 통과해야 한다.

| 테스트 | 기대 결과 |
|---|---|
| "KDB생명 상품이 왜 추천됐나요?" | 현재 추천상품에 KDB가 있으면 risk target, 보험료 기준, caveat를 근거로 설명 |
| "DB손보 실손보험은 왜 추천됐나요?" | baseline 상품이며 특정 유전자 암 위험 직접 매칭이 아니라 기본 의료비 방어 목적이라고 설명 |
| "내 조건 보험료는 얼마인가요?" | 선택된 나이/성별 quote가 있으면 selected quote를 말하고, 대표 보험료와 다르다는 점을 설명 |
| "삼성화재 상품도 추천되나요?" | 현재 active 추천 결과에 없으면 포함되지 않았다고 답하고, 문서 endpoint blocker를 단정적으로 노출하지 않음 |
| "제 DNA 수치를 알려주세요" | 원본 DNA와 수치는 제공할 수 없고 분석 즉시 소각됐다고 답변 |
| "이 상품에 가입하면 되나요?" | 가입 권유가 아니라 비교 보조이며 최종 판단은 공식 약관/보험사 심사 확인 필요 |

성공 기준:

- LLM prompt에 raw DNA, 파일 내용, risk score가 포함되지 않는다.
- 추천상품 외 상품명을 생성하지 않는다.
- `approvedQuotes` 외 보험료를 확정 가격처럼 말하지 않는다.
- `baseline`과 `risk_target` 차이를 설명한다.
- 한국어/영어 메시지 키가 동기화된다.

---

## 8. 365 Rubric 영향

| Rubric | 영향 |
|---|---|
| Functionality | 상담 AI가 실제 추천 카드와 같은 DB 근거를 설명한다 |
| Potential Impact | 사용자가 상품 추천 이유를 질문으로 확인할 수 있어 서비스 신뢰도가 높아진다 |
| Novelty | 유전자 위험 분석, 공식 보험 공시 DB, 상담 AI가 같은 세션 컨텍스트로 연결된다 |
| UX | 추천 카드만 보는 흐름에서 "왜 이 상품인가"를 대화로 확인하는 흐름으로 확장된다 |
| Open-source | DB-selected context 주입 패턴은 다른 보험/헬스케어 추천 에이전트에도 재사용 가능하다 |
| Business Plan | 실제 상품 설명 가능성이 높아져 제휴/중개형 서비스 전환의 핵심 신뢰 기반이 된다 |

---

## 9. 구현 순서

1. 완료 - `ConciergeProductContext` type과 Zod schema를 `src/lib/tee/concierge-product-context.ts`에 추가한다.
2. 완료 - `DashboardClient`에서 `data.products`와 `selectedQuoteCondition`을 상담용 context로 변환한다.
3. 완료 - `ConciergeChat` props에 `productContext`를 추가한다.
4. 완료 - `buildSystemPrompt`를 `buildSystemPrompt(riskContext, productContext)` 형태로 확장한다.
5. 완료 - 상품 컨텍스트 formatter에서 JSON을 사람이 읽기 쉬운 짧은 텍스트로 변환한다.
6. 완료 - 상품 질문 QA를 추가한다.
7. 후속 - 실제 Test Pilot Dashboard에서 KDB, 한화, 교보, DB손보, KB손보, 현대해상 질문을 수동 검증한다.

---

## 10. Related Documents

- **Technical_Specs**: [The Secret Keeper 구현 명세](./SECRET_KEEPER_IMPL_SPEC.md) - 현재 상담 AI 구조와 server action
- **Technical_Specs**: [AI Concierge Architecture](./AI_CONCIERGE_ARCH.md) - The Secret Keeper 아키텍처 원칙
- **Technical_Specs**: [Insurance Data Collection Pipeline](./01_INSURANCE_DATA_COLLECTION_PIPELINE.md) - source-backed 상품과 approved quote 생성 흐름
- **Technical_Specs**: [Insurance Matching Keyword Policy](./03_INSURANCE_MATCHING_KEYWORD_POLICY_2026_05_28.md) - risk_target/baseline 매칭 기준
- **Logic_Progress**: [AI Matching Pipeline](../04_Logic_Progress/AI_MATCHING_PIPELINE.md) - 분석 AI와 DB 상품 추천의 책임 경계
- **Logic_Progress**: [Roadmap](../04_Logic_Progress/ROADMAP.md) - 현재 추천 상품 수와 다음 구현 순서
- **QA_Validation**: [Medical Baseline Quote UI Verification](../05_QA_Validation/51_MEDICAL_BASELINE_QUOTE_UI_VERIFICATION_2026_05_31.md) - 최신 추천 카드 UI 검증
- **QA_Validation**: [The Secret Keeper Product Context QA](../05_QA_Validation/52_CONCIERGE_PRODUCT_CONTEXT_QA_2026_05_31.md) - 추천상품 컨텍스트 주입 구현 검증
