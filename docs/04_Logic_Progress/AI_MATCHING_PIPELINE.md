# [로직 설계] AI 에이전트 매칭 알고리즘 및 프롬프트 파이프라인

- **작성일**: 2026-04-01
- **최종 수정일**: 2026-04-01
- **레이어**: 04_Logic_Progress
- **상태**: Draft v1.0

---

## 0. 설계 원칙

1. **프롬프트에 수치를 넣지 않는다.** 유전자 원본 수치(SNP 빈도, Risk Score 등)는 프롬프트에 포함하지 않는다. 파싱 단계에서 카테고리 레벨(`high / moderate / normal`)로 변환 후 프롬프트에 주입한다.
2. **Mock TEE와 Real TEE는 동일한 인터페이스를 사용한다.** Phase 0에서는 Mock 함수가 고정 JSON을 반환하지만, 함수 시그니처와 Output Schema는 Real TEE와 100% 동일하게 유지한다. Phase 2에서 구현체만 교체한다.
3. **보험 상품 추천은 DB 조회로 결정한다.** AI 에이전트는 위험 프로파일을 생성하는 역할만 한다. 프로파일에서 상품을 매칭하는 로직은 결정론적인 DB 쿼리로 처리한다. AI가 상품명을 직접 생성하지 않는다.

---

## 1. 전체 파이프라인 개요

```
[입력]
유전자 파일 (VCF / PDF / TXT / CSV)
        │
        ▼
[Stage 1] 파일 파싱 & 정규화
  → DTC 제공사별 포맷을 내부 표준 구조로 변환
  → 수치 → 카테고리 레벨 변환 (수치 소각 전 처리)
        │
        ▼
[Stage 2] TEE 내부 — AI 에이전트 실행 (IronClaw / Mock)
  → System Prompt 주입
  → 정규화된 카테고리 컨텍스트 주입
  → Chain of Thought 분석
  → JSON Output 생성
        │
        ▼
[Stage 2.5] TEE 내부 — Noir ZKP 증명 생성 (신규)
  → risk_score를 private input으로 Noir 회로 주입
  → assert(risk_score >= threshold) 검증
  → proof bytes 생성 (수치는 이 시점 TEE 메모리 소각)
  → proof bytes만 TEE 외부 반환
        │
        ▼
[Stage 3] 결과 후처리
  → JSON Output 파싱 및 Zod 검증
  → ZKP proof bytes를 TeeAnalysisOutput에 포함
  → DB 상품 매칭 쿼리 (riskTargets 기반 필터링)
  → 추천 순위 정렬
        │
        ▼
[Stage 4] 결제 — Chain Signatures + Confidential Intents (신규)
  → v1.signer MPC 컨트랙트로 트랜잭션 서명 생성
  → ZKP proof bytes를 트랜잭션 calldata에 첨부
  → Confidential Intents로 기밀 트랜잭션 제출
        │
        ▼
[출력]
AnalysisResult (DB 저장 + 프론트 렌더링용)
+ ZkpProof (proof bytes, DB 저장)
+ TxHash (NEAR Explorer 링크)
```

---

## 2. Stage 1 — 파일 파싱 및 정규화

### 2-1. 지원 파일 포맷별 처리

| 파일 유형 | 파싱 방법 | 추출 대상 |
|---|---|---|
| `.vcf` | VCF 4.x 스펙 파서 | CHROM, POS, REF, ALT, INFO 필드 |
| `.csv` | 제공사 컬럼 매핑 테이블 적용 | 항목명, 분류 코드, 결과 레이블 |
| `.pdf` | PDF 텍스트 추출 후 정규식 파싱 | 항목명, 결과 등급 텍스트 |
| `.txt` | 제공사별 라인 포맷 파서 | 항목명, 결과 코드 |

### 2-2. DTC 제공사별 컬럼 매핑 테이블

각 DTC 서비스는 결과 레이블이 다르다. 내부 표준 레이블로 통일한다.

| 내부 표준 레이블 | 젠톡 (GenTok) | 진스타일 (GeneStyle) | 뱅크샐러드 |
|---|---|---|---|
| `high` | "주의 필요" / "높음" | "고위험" / "Risk High" | "위험" |
| `moderate` | "관심 필요" / "보통" | "중위험" / "Risk Mid" | "주의" |
| `normal` | "정상" / "낮음" | "저위험" / "Risk Low" | "양호" |

### 2-3. 수치 → 카테고리 레벨 변환 규칙

VCF 파일과 같이 수치 데이터가 포함된 경우, 파싱 즉시 카테고리로 변환하고 수치는 메모리에서 삭제한다.

```typescript
// src/lib/tee/normalizer.ts

type RiskLevel = "high" | "moderate" | "normal";

/**
 * 수치 기반 변환 (VCF의 경우)
 * 실제 임계값은 ACMG(미국의학유전학회) 가이드라인 기준
 */
function scoreToLevel(rawScore: number): RiskLevel {
  if (rawScore >= 0.7) return "high";
  if (rawScore >= 0.4) return "moderate";
  return "normal";
}

/**
 * 텍스트 레이블 변환 (CSV/PDF/TXT의 경우)
 */
function labelToLevel(rawLabel: string, provider: DtcProvider): RiskLevel {
  const mapping = DTC_LABEL_MAP[provider];
  return mapping[rawLabel.trim()] ?? "normal";
}
```

### 2-4. 정규화 결과 구조 (TEE 주입용)

수치가 제거된 이 구조만 TEE 내부 프롬프트에 전달된다.

```typescript
// NormalizedGeneticProfile — TEE 주입 직전 구조
type NormalizedGeneticProfile = {
  oncology: {
    overallLevel: RiskLevel;
    detectedFlags: GeneticRiskFlag[]; // 예: ["pancreatic_cancer", "liver_cancer"]
  };
  cardiovascular: {
    overallLevel: RiskLevel;
    detectedFlags: GeneticRiskFlag[];
  };
  metabolic: {
    overallLevel: RiskLevel;
    detectedFlags: GeneticRiskFlag[];
  };
  neurological: {
    overallLevel: RiskLevel;
    detectedFlags: GeneticRiskFlag[];
  };
  parsedFrom: DtcProvider; // "gentok" | "genestyle" | "banksalad" | "unknown"
  fileType: "vcf" | "csv" | "pdf" | "txt";
};
```

---

## 3. Stage 2 — AI 에이전트 실행 (프롬프트 파이프라인)

### 3-1. System Prompt

```
You are MyDNA Insurance Advisor, an AI agent running inside a Trusted Execution Environment (TEE).

Your role:
- Analyze a user's anonymized genetic risk profile (category levels only, no raw scores).
- Generate a structured insurance advisory report.
- Recommend risk mitigation priorities by category.
- Do NOT generate insurance product names or prices. Product matching is handled by a separate database query.
- Do NOT include any numerical genetic scores in your output.
- Your output MUST strictly follow the specified JSON schema.

Privacy constraints:
- The genetic profile you receive contains only category-level risk classifications (high/moderate/normal).
- You have no access to the user's identity, wallet address, or personal information.
- Your analysis exists only within this TEE session and will be purged upon completion.

Output language: Korean (한국어)
```

### 3-2. User Context Prompt (정규화 결과 주입)

```typescript
function buildUserContextPrompt(profile: NormalizedGeneticProfile): string {
  return `
## 유전자 위험 프로파일 (수치 없음 — 카테고리 분류만 포함)

### 종양/암 (Oncology)
- 전반적 위험 수준: ${profile.oncology.overallLevel}
- 감지된 위험 항목: ${profile.oncology.detectedFlags.join(", ") || "없음"}

### 심혈관 (Cardiovascular)
- 전반적 위험 수준: ${profile.cardiovascular.overallLevel}
- 감지된 위험 항목: ${profile.cardiovascular.detectedFlags.join(", ") || "없음"}

### 대사 (Metabolic)
- 전반적 위험 수준: ${profile.metabolic.overallLevel}
- 감지된 위험 항목: ${profile.metabolic.detectedFlags.join(", ") || "없음"}

### 신경계 (Neurological)
- 전반적 위험 수준: ${profile.neurological.overallLevel}
- 감지된 위험 항목: ${profile.neurological.detectedFlags.join(", ") || "없음"}

위 프로파일을 바탕으로 보험 설계 어드바이저리 리포트를 생성하세요.
`;
}
```

### 3-3. Chain of Thought 설계

AI 에이전트가 내부적으로 거치는 추론 단계. Output JSON에는 `reasoning` 필드로 요약본이 포함된다.

```
Step 1. 위험 카테고리 우선순위 결정
  → 각 카테고리의 overallLevel을 비교
  → high > moderate > normal 순으로 우선순위 배열 생성

Step 2. 카테고리별 핵심 보장 공백 진단
  → 각 detectedFlag에 대해 "현재 일반 보험으로 커버되지 않는 사각지대" 식별
  → 해당 플래그가 국내 보험 업계에서 일반적으로 고위험 거절 사유인지 평가

Step 3. 보장 우선순위 메시지 생성
  → 사용자가 이해할 수 있는 언어로 "왜 이 카테고리를 먼저 보장해야 하는가" 설명
  → 의료 진단이 아닌 "보험 설계 관점"에서 서술 (진단 행위 금지)

Step 4. 데이터 소각 확인 메시지 포함
  → 분석에 사용된 프로파일이 이 응답 생성 후 소각됨을 명시
```

### 3-4. Output JSON Schema (AI → 후처리 레이어 전달)

AI 에이전트가 반환하는 JSON. 이 스키마는 Mock TEE와 Real TEE 모두 동일하게 사용한다.

```typescript
// src/types/tee-output.ts

export type TeeAnalysisOutput = {
  // 위험 프로파일 요약 (DB의 analysis_results.risk_profile과 동일 구조)
  riskProfile: {
    oncology: { level: "high" | "moderate" | "normal"; flags: string[] };
    cardiovascular: { level: "high" | "moderate" | "normal"; flags: string[] };
    metabolic: { level: "high" | "moderate" | "normal"; flags: string[] };
    neurological: { level: "high" | "moderate" | "normal"; flags: string[] };
  };

  // 카테고리 우선순위 (프론트 탭 순서에 사용)
  priorityOrder: Array<"oncology" | "cardiovascular" | "metabolic" | "neurological">;

  // 카테고리별 사용자 대면 메시지 (한국어)
  advisoryMessages: {
    oncology: string;
    cardiovascular: string;
    metabolic: string;
    neurological: string;
  };

  // AI 추론 요약 (프론트 "AI 추천 근거" 섹션에 표시)
  reasoning: string;

  // 보장 공백 요약 (한 문장, 대시보드 상단 배너에 표시)
  coverageGapSummary: string;

  // 메타
  teeSessionId: string;    // analysis_sessions.id와 매핑
  purgeConfirmed: boolean; // 항상 true (TEE 응답 시점에 소각 완료)
  analysisModel: string;   // 예: "mydna-agent-v1-mock" | "ironclaw-v1"
};
```

**Zod 검증 스키마**
```typescript
// src/types/tee-output.ts

const riskCategorySchema = z.object({
  level: z.enum(["high", "moderate", "normal"]),
  flags: z.array(z.string()),
});

export const teeAnalysisOutputSchema = z.object({
  riskProfile: z.object({
    oncology: riskCategorySchema,
    cardiovascular: riskCategorySchema,
    metabolic: riskCategorySchema,
    neurological: riskCategorySchema,
  }),
  priorityOrder: z.array(
    z.enum(["oncology", "cardiovascular", "metabolic", "neurological"])
  ).length(4),
  advisoryMessages: z.object({
    oncology: z.string().min(1).max(300),
    cardiovascular: z.string().min(1).max(300),
    metabolic: z.string().min(1).max(300),
    neurological: z.string().min(1).max(300),
  }),
  reasoning: z.string().min(1).max(500),
  coverageGapSummary: z.string().min(1).max(150),
  teeSessionId: z.string().uuid(),
  purgeConfirmed: z.literal(true),
  analysisModel: z.string(),
});
```

---

## 4. Stage 3 — 결과 후처리 및 DB 상품 매칭

### 4-1. 상품 매칭 쿼리 로직

AI Output의 `riskProfile`에서 `flags` 배열을 추출하여 `insurance_products.risk_targets`와 교집합을 구한다. AI가 상품을 직접 선택하지 않는다.

```typescript
// src/actions/matchProducts.ts

async function matchProductsForProfile(
  riskProfile: TeeAnalysisOutput["riskProfile"],
  priorityOrder: TeeAnalysisOutput["priorityOrder"]
): Promise<string[]> {
  // 1. 모든 감지된 플래그 수집
  const allFlags = [
    ...riskProfile.oncology.flags,
    ...riskProfile.cardiovascular.flags,
    ...riskProfile.metabolic.flags,
    ...riskProfile.neurological.flags,
  ];

  if (allFlags.length === 0) return [];

  // 2. DB에서 활성 상품 조회
  const products = await db
    .select()
    .from(insuranceProducts)
    .where(eq(insuranceProducts.isActive, 1));

  // 3. riskTargets와 교집합이 있는 상품 필터링
  const matched = products.filter((product) => {
    const targets: string[] = JSON.parse(product.riskTargets);
    return targets.some((t) => allFlags.includes(t));
  });

  // 4. priorityOrder 기준으로 정렬 (high 카테고리 상품 우선)
  matched.sort((a, b) => {
    const aIdx = priorityOrder.indexOf(a.coverageCategory as any);
    const bIdx = priorityOrder.indexOf(b.coverageCategory as any);
    return aIdx - bIdx;
  });

  return matched.map((p) => p.id);
}
```

---

## 5. Mock TEE 구현체 (Phase 0)

Phase 0에서 Real IronClaw 대신 사용하는 Mock 함수. 인터페이스는 Real TEE와 동일.

```typescript
// src/lib/tee/mock-tee.ts

import { TeeAnalysisOutput } from "@/types/tee-output";
import { NormalizedGeneticProfile } from "@/types/genetic";

/**
 * Mock TEE — 정규화된 프로파일을 받아 고정 패턴의 JSON을 반환.
 * Real TEE 전환 시 이 함수만 교체하면 된다.
 */
export async function runMockTeeAnalysis(
  sessionId: string,
  profile: NormalizedGeneticProfile
): Promise<TeeAnalysisOutput> {
  // 2초 지연으로 실제 분석 시간 시뮬레이션
  await new Promise((resolve) => setTimeout(resolve, 2000));

  return {
    riskProfile: {
      oncology: {
        level: profile.oncology.overallLevel,
        flags: profile.oncology.detectedFlags,
      },
      cardiovascular: {
        level: profile.cardiovascular.overallLevel,
        flags: profile.cardiovascular.detectedFlags,
      },
      metabolic: {
        level: profile.metabolic.overallLevel,
        flags: profile.metabolic.detectedFlags,
      },
      neurological: {
        level: profile.neurological.overallLevel,
        flags: profile.neurological.detectedFlags,
      },
    },
    priorityOrder: buildPriorityOrder(profile),
    advisoryMessages: buildAdvisoryMessages(profile),
    reasoning:
      "유전자 프로파일 분석 결과, 종양 관련 위험 항목이 감지되어 해당 카테고리를 최우선 보장 대상으로 설정했습니다. 대사 관련 항목도 주의 수준으로 분류되어 복합 보장을 권장합니다.",
    coverageGapSummary:
      "현재 일반 보험 상품으로는 커버되지 않는 유전자 맹점이 2개 카테고리에서 감지되었습니다.",
    teeSessionId: sessionId,
    purgeConfirmed: true,
    analysisModel: "mydna-agent-v1-mock",
  };
}

function buildPriorityOrder(
  profile: NormalizedGeneticProfile
): TeeAnalysisOutput["priorityOrder"] {
  const categories = [
    { key: "oncology" as const, level: profile.oncology.overallLevel },
    { key: "cardiovascular" as const, level: profile.cardiovascular.overallLevel },
    { key: "metabolic" as const, level: profile.metabolic.overallLevel },
    { key: "neurological" as const, level: profile.neurological.overallLevel },
  ];
  const levelScore = { high: 3, moderate: 2, normal: 1 };
  return categories
    .sort((a, b) => levelScore[b.level] - levelScore[a.level])
    .map((c) => c.key);
}

function buildAdvisoryMessages(
  profile: NormalizedGeneticProfile
): TeeAnalysisOutput["advisoryMessages"] {
  const messages: Record<string, Record<string, string>> = {
    oncology: {
      high: "종양 관련 유전자 항목에서 주의가 필요한 수준이 감지되었습니다. 조기 발견 및 집중 보장 특약을 최우선으로 설계할 것을 권장합니다.",
      moderate: "종양 관련 유전자 항목에서 관심 수준이 감지되었습니다. 기본 암 보장을 포함한 설계를 권장합니다.",
      normal: "종양 관련 유전자 항목은 일반적인 수준입니다. 표준 보장으로 충분합니다.",
    },
    cardiovascular: {
      high: "심혈관 관련 유전자 항목에서 주의가 필요한 수준이 감지되었습니다. 심근경색·뇌졸중 특약을 포함할 것을 권장합니다.",
      moderate: "심혈관 관련 유전자 항목에서 관심 수준이 감지되었습니다. 기본 심혈관 보장을 권장합니다.",
      normal: "심혈관 관련 유전자 항목은 일반적인 수준입니다.",
    },
    metabolic: {
      high: "대사 관련 유전자 항목에서 주의가 필요한 수준이 감지되었습니다. 당뇨·대사 관리 특약 포함을 권장합니다.",
      moderate: "대사 관련 유전자 항목에서 관심 수준이 감지되었습니다. 예방적 보장 설계를 권장합니다.",
      normal: "대사 관련 유전자 항목은 일반적인 수준입니다.",
    },
    neurological: {
      high: "신경계 관련 유전자 항목에서 주의가 필요한 수준이 감지되었습니다. 치매 조기 진단 특약을 포함할 것을 권장합니다.",
      moderate: "신경계 관련 유전자 항목에서 관심 수준이 감지되었습니다. 장기 보호 설계를 권장합니다.",
      normal: "신경계 관련 유전자 항목은 일반적인 수준입니다.",
    },
  };

  return {
    oncology: messages.oncology[profile.oncology.overallLevel],
    cardiovascular: messages.cardiovascular[profile.cardiovascular.overallLevel],
    metabolic: messages.metabolic[profile.metabolic.overallLevel],
    neurological: messages.neurological[profile.neurological.overallLevel],
  };
}
```

---

## 6. 파이프라인 실행 흐름 (Server Action)

```typescript
// src/actions/runAnalysis.ts

export async function runAnalysis(sessionId: string, fileBuffer: ArrayBuffer): Promise<void> {
  // Stage 1: 파싱 및 정규화
  const provider = detectProvider(fileBuffer);
  const profile = await parseAndNormalize(fileBuffer, provider);
  // 수치는 이 시점에 메모리에서 삭제됨 (profile에는 레벨만 포함)

  await updateSessionStatus(sessionId, "tee_processing");

  // Stage 2: TEE 실행 (Phase 0: Mock / Phase 2: Real IronClaw)
  const teeOutput = await runMockTeeAnalysis(sessionId, profile);

  // Zod 검증
  const validated = teeAnalysisOutputSchema.parse(teeOutput);

  await updateSessionStatus(sessionId, "zkp_generating");
  // Stage 2.5: Noir ZKP proof 생성 (Phase 0: 로컬 생성, Phase 2: TEE 내부 생성 + 온체인 검증)
  const zkpProof = await generateZkpProof({
    riskScore: derivePrimaryRiskScore(validated.riskProfile),
    threshold: INSURANCE_ELIGIBILITY_THRESHOLD, // 보험사 공개 기준값
  });
  await updateSessionStatus(sessionId, "completed");

  // Stage 3: 상품 매칭
  const matchedIds = await matchProductsForProfile(
    validated.riskProfile,
    validated.priorityOrder
  );

  // DB 저장 (ZKP proof bytes 포함)
  await saveAnalysisResult({
    sessionId,
    riskProfile: validated.riskProfile,
    recommendedProductIds: matchedIds,
    zkpProofBytes: zkpProof.proofBytes,
    expiresAt: DateTime.now().plus({ days: 30 }).toUnixInteger(),
  });

  await updateSessionStatus(sessionId, "purged");
}
```

---

## 7. 데모용 Mock 입력 파일 스펙

해커톤 데모에서 사용할 표준 Mock 입력 파일. `public/mock/` 디렉토리에 위치.

**`mock_genome_gentok.txt`** — 젠톡 포맷 시뮬레이션

```
항목명,분류,결과
췌장암 감수성,종양,주의 필요
간암 감수성,종양,관심 필요
당뇨병(2형) 감수성,대사,관심 필요
고지혈증 감수성,대사,정상
심근경색 감수성,심혈관,정상
치매(알츠하이머) 감수성,신경계,정상
```

이 파일을 Stage 1 파서에 주입하면 다음 NormalizedGeneticProfile이 생성된다:

```json
{
  "oncology": { "overallLevel": "high", "detectedFlags": ["pancreatic_cancer", "liver_cancer"] },
  "cardiovascular": { "overallLevel": "normal", "detectedFlags": [] },
  "metabolic": { "overallLevel": "moderate", "detectedFlags": ["type2_diabetes"] },
  "neurological": { "overallLevel": "normal", "detectedFlags": [] },
  "parsedFrom": "gentok",
  "fileType": "txt"
}
```

그 결과 `priorityOrder`는 `["oncology", "metabolic", "cardiovascular", "neurological"]`이 되고, `prod_001`, `prod_002`, `prod_003`이 상위 추천 상품으로 매칭된다.

---

## 8. 매칭 결과 UI 표현 방식 — "왜 이 상품인가"를 사용자에게 보여주기

### 8-1. 문제 정의

현재 분석 완료 후 대시보드로 이동하면 보험 상품 2개가 즉시 노출된다.
사용자 입장에서는 "어디서 왜 이 상품이 나왔는지" 맥락이 없어 신뢰도가 낮다.
`TeeAnalysisOutput`의 `advisoryMessages`, `reasoning`, `coverageGapSummary` 필드가 설계되어 있지만 UI에서 활용되지 않고 있다.

### 8-2. 목표 UX 흐름

분석 완료 후 대시보드 진입 전, 단계적으로 결과를 공개하여 사용자가 추천 근거를 납득한 뒤 상품을 보도록 한다.

```
[분석 완료 화면]
  "대시보드로 이동" 버튼 클릭
        │
        ▼
[Step 1 — 위험 프로파일 요약]
  4개 카테고리 (oncology / cardiovascular / metabolic / neurological)
  각 카테고리에 위험 등급(high / moderate / normal) 배지 표시
  → 사용자: "내 유전자에서 이런 위험이 감지됐구나"
        │
        ▼
[Step 2 — AI 추천 근거 공개]
  `coverageGapSummary` — 상단 한 줄 요약 배너
  `reasoning` — AI가 왜 이 순서로 우선순위를 결정했는지 설명 텍스트
  `advisoryMessages` — 위험 등급이 높은 카테고리 1~2개의 메시지 표시
  → 사용자: "AI가 이런 이유로 이 카테고리를 먼저 보장하라고 했구나"
        │
        ▼
[Step 3 — 추천 상품 등장]
  매칭된 상품 카드가 순차적으로 (staggered animation) 등장
  각 카드에 "이 상품이 추천된 이유: {해당 카테고리 advisoryMessage 요약}" 한 줄 표시
  → 사용자: "납득된 상태에서 상품을 선택"
```

### 8-3. 각 필드의 UI 매핑

| TeeAnalysisOutput 필드 | 표시 위치 | 표시 방식 |
|---|---|---|
| `coverageGapSummary` | 대시보드 상단 배너 | 노란색 경고 배너, 한 줄 텍스트 |
| `reasoning` | Step 2 본문 | 회색 박스, 2~3줄 텍스트 |
| `advisoryMessages[category]` | Step 2 카테고리 카드 + 상품 카드 서브텍스트 | 카테고리별 접이식 표시 |
| `priorityOrder` | 카테고리 정렬 순서 | 1순위 카테고리 강조 표시 |
| `riskProfile[category].level` | 카테고리 배지 색상 | high=빨강, moderate=노랑, normal=초록 |

### 8-4. 구현 시 고려사항

- `advisoryMessages`와 `reasoning`은 현재 Mock TEE가 고정 문자열을 반환한다. 이 값이 실제 사용자 위험 프로파일에 맞게 동적으로 생성되는지 확인 후 UI 연결할 것.
- Step 1 → Step 2 → Step 3 전환은 자동 진행이 아닌 "다음" 버튼으로 사용자가 직접 확인하는 방식을 권장한다 (납득 시간 확보).
- 상품 카드에 표시하는 "추천 이유" 한 줄은 `advisoryMessages[product.coverageCategory]`에서 앞 50자를 잘라 사용한다.

---

## 관련 문서

- [DB 스키마 명세](../03_Technical_Specs/DB_SCHEMA.md)
- [NEAR 프라이버시 아키텍처](../03_Technical_Specs/NEAR_PRIVACY_STACK_ARCH.md)
- [사용자 플로우](../02_UI_Screens/USER_FLOW.md)
- [로드맵](./ROADMAP.md)
- [비즈니스 모델](../01_Concept_Design/B2B_BROKER_CONCEPT.md)
