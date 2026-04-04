import { TeeAnalysisOutput } from "@/types/tee-output";
import { NormalizedGeneticProfile, RiskLevel } from "@/types/genetic";

// ─── Mock TEE (AI_MATCHING_PIPELINE.md 5절 기준) ─────────────────────────────
// Phase 0: 2초 지연으로 실제 분석 시간 시뮬레이션
// Phase 2: runIronClawAnalysis(sessionId, profile)로 교체 (동일 인터페이스)

export async function runMockTeeAnalysis(
  sessionId: string,
  profile: NormalizedGeneticProfile
): Promise<TeeAnalysisOutput> {
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
  const levelScore: Record<RiskLevel, number> = { high: 3, moderate: 2, normal: 1 };
  return [
    { key: "oncology" as const, level: profile.oncology.overallLevel },
    { key: "cardiovascular" as const, level: profile.cardiovascular.overallLevel },
    { key: "metabolic" as const, level: profile.metabolic.overallLevel },
    { key: "neurological" as const, level: profile.neurological.overallLevel },
  ]
    .sort((a, b) => levelScore[b.level] - levelScore[a.level])
    .map((c) => c.key);
}

function buildAdvisoryMessages(
  profile: NormalizedGeneticProfile
): TeeAnalysisOutput["advisoryMessages"] {
  const messages: Record<string, Record<RiskLevel, string>> = {
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
