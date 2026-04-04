import { ZkpProof } from "@/types/zkp";
import { TeeAnalysisOutput } from "@/types/tee-output";

const INSURANCE_ELIGIBILITY_THRESHOLD = 50;

// ─── 위험 점수 도출 ───────────────────────────────────────────────────────────
// TEE 출력의 riskProfile에서 대표 점수를 산출 (TEE 내부에서만 사용)
// 이 값은 ZKP private input으로 주입되고 proof 생성 후 즉시 소각

const LEVEL_SCORE: Record<string, number> = {
  high: 80,
  moderate: 60,
  normal: 30,
};

export function derivePrimaryRiskScore(
  riskProfile: TeeAnalysisOutput["riskProfile"]
): number {
  return Math.max(
    LEVEL_SCORE[riskProfile.oncology.level] ?? 30,
    LEVEL_SCORE[riskProfile.cardiovascular.level] ?? 30,
    LEVEL_SCORE[riskProfile.metabolic.level] ?? 30,
    LEVEL_SCORE[riskProfile.neurological.level] ?? 30
  );
}

// ─── ZKP Proof 생성 ───────────────────────────────────────────────────────────
// Phase 0: 더미 proof 반환 (nargo CLI / @noir-lang 패키지 미사용)
//   - Vercel 배포 환경 호환 (바이너리 실행 불가, WASM 번들 50MB 제한)
//   - circuits/insurance_eligibility/src/main.nr 회로는 실제 작성됨
// Phase 2: @noir-lang/noir_js + BarretenbergBackend로 교체
//   - const backend = new BarretenbergBackend(circuit);
//   - const noir = new Noir(circuit, backend);
//   - return await noir.generateProof({ risk_score, threshold });

export async function generateZkpProof(input: {
  riskScore: number;
  threshold?: number;
}): Promise<ZkpProof> {
  const threshold = input.threshold ?? INSURANCE_ELIGIBILITY_THRESHOLD;

  // 100ms 지연 — 실제 proof 생성 시간 시뮬레이션
  await new Promise((r) => setTimeout(r, 100));

  return {
    proofBytes: `phase0_mock_proof_${Date.now()}_t${threshold}`,
    publicInputs: { threshold },
    verificationKey: "phase0_mock_vk",
  };
}
