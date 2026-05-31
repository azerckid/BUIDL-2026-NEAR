import type { ConciergeProductContext } from "@/lib/tee/concierge-product-context";

// AI Concierge (The Secret Keeper) — 시스템 프롬프트
// Vercel 배포 환경에서 fs.readFileSync 사용 불가 -> TS 상수로 관리
// 내용 수정 시 이 파일만 편집하면 됨

function formatKrw(amount: number | null) {
  if (amount == null) return "미확인";
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(value: string | null) {
  if (!value) return "미확인";
  return value.slice(0, 10);
}

function formatSex(sex: "male" | "female" | "source_unknown" | null) {
  if (sex === "male") return "남성";
  if (sex === "female") return "여성";
  if (sex === "source_unknown") return "성별 원천 미표기";
  return "성별 미확인";
}

function formatQuote(
  quote: NonNullable<ConciergeProductContext["products"][number]["selectedQuote"]>
) {
  const age = quote.age == null ? "나이 미확인" : `${quote.age}세`;
  const premium = quote.monthlyKrw != null ? formatKrw(quote.monthlyKrw) : quote.premiumText ?? "미확인";

  return `${age} ${formatSex(quote.sex)} 기준 ${premium}, 출처 유형 ${quote.sourceType}, 수집일 ${formatDate(quote.retrievedAtIso)}`;
}

function formatQuoteSummary(
  quote: ConciergeProductContext["products"][number]["approvedQuoteSummary"][number]
) {
  const age = quote.age == null ? "나이 미확인" : `${quote.age}세`;
  const premium = quote.monthlyKrw != null ? formatKrw(quote.monthlyKrw) : quote.premiumText ?? "미확인";

  return `${age} ${formatSex(quote.sex)} ${premium}`;
}

function formatProductContext(productContext?: ConciergeProductContext) {
  if (!productContext || productContext.products.length === 0) {
    return `
현재 세션에 상담 AI가 설명할 수 있는 DB-selected 추천 보험상품이 없습니다.
사용자가 특정 상품을 물으면 현재 추천 결과에는 상품 컨텍스트가 없다고 답하세요.
    `.trim();
  }

  const selectedCondition = productContext.selectedQuoteCondition
    ? `${productContext.selectedQuoteCondition.age}세 ${formatSex(productContext.selectedQuoteCondition.sex)}`
    : "선택된 나이/성별 조건 없음";

  const productLines = productContext.products.map((product, index) => {
    const quoteText = product.selectedQuote
      ? formatQuote(product.selectedQuote)
      : "선택 조건과 일치하는 approved quote 없음";
    const quoteSummary =
      product.approvedQuoteSummary.length > 0
        ? product.approvedQuoteSummary.map(formatQuoteSummary).join(" / ")
        : "approved quote summary 없음";
    const riskTargets =
      product.riskTargets.length > 0 ? product.riskTargets.join(", ") : "없음";
    const caveats = product.caveats.length > 0 ? product.caveats.join(" / ") : "특이 caveat 없음";
    const sourceUrl = product.source.sourceUrl ?? product.source.officialProductUrl ?? "공식 URL 미확인";

    return `
[${index + 1}] ${product.provider} - ${product.name}
- 보장 카테고리: ${product.coverageCategory}
- 매칭 방식: ${product.matchingStrategy}
- risk targets: ${riskTargets}
- 대표 보험료: ${formatKrw(product.representativePremium.monthlyKrw)} / USDC 정산 예상 ${product.representativePremium.monthlyUsdc.toFixed(2)} USDC
- 대표 보험료 기준: ${product.representativePremium.basis ?? "미확인"}
- 선택 조건 보험료: ${quoteText}
- approved quote 요약: ${quoteSummary}
- 공식 출처: ${product.source.documentType ?? "문서 유형 미확인"}, 확인일 ${formatDate(product.source.checkedAtIso)}, URL ${sourceUrl}
- caveat: ${caveats}
    `.trim();
  });

  return `
선택된 보험료 조건: ${selectedCondition}
아래 상품만 현재 세션의 DB-selected 추천 결과입니다.
${productLines.join("\n\n")}
  `.trim();
}

export function buildSystemPrompt(
  riskProfileContext: string,
  productContext?: ConciergeProductContext
): string {
  return `
당신은 OHmyDNA의 건강·보험 상담 도우미입니다.
사용자의 유전자 분석 결과를 바탕으로 보험과 건강에 대한 질문에 답변합니다.

## 말투 원칙
- 먼저 사용자의 걱정이나 감정에 공감하는 문장으로 시작하세요.
- 딱딱한 나열보다 자연스러운 대화체로 답변하세요.
- 불안을 가중시키지 않도록 균형 잡힌 시각을 유지하세요.
- 사용자가 작성한 언어로 답변하세요.

## 컨텍스트
사용자의 유전자 분석 결과 위험 레이블 (원본 DNA 시퀀스는 분석 즉시 소각됨):
${riskProfileContext}

## 현재 추천된 보험상품 컨텍스트
${formatProductContext(productContext)}

## 가드레일 (반드시 준수)
1. 원본 유전자 시퀀스(ATGC...)나 구체적 수치는 절대 언급하지 마세요. 해당 데이터는 분석 즉시 소각되었습니다.
2. "~입니다"가 아닌 "~일 수 있습니다", "~가능성이 있습니다" 형태로 답변하세요. 확정적 의학 진단을 내리지 마세요.
3. 중요한 건강 결정은 반드시 전문의 상담을 권고하세요.
4. 보험 관련 질문에는 현재 추천된 DB-selected 상품 컨텍스트 안에서만 답변하세요.
5. 목록에 없는 상품명, 보험료, 출처는 추측하거나 생성하지 마세요. 사용자가 목록에 없는 상품을 물으면 현재 추천 결과에는 포함되어 있지 않다고 답하세요.
6. 대표 보험료와 선택 조건 보험료를 구분해서 설명하세요. 보험료는 공시/비교 조건 기준 예시이며 실제 가입 보험료가 아닐 수 있음을 함께 말하세요.
7. baseline 상품은 특정 유전자 위험에 직접 대응하는 상품이 아니라 기본 의료비 방어 목적임을 설명하세요.
8. 가입 가능성이나 최종 가입 결정을 확정하지 말고 공식 상품설명서, 약관, 보험사 심사 확인을 권고하세요.
9. 이전 세션의 대화 내용을 기억하지 못하는 것이 정상임을 사용자가 묻는다면 솔직하게 설명하세요.
  `.trim();
}
