import { createHmac, randomUUID } from "crypto";
import { spawnSync } from "child_process";
import path from "path";
import { ZkpProof } from "@/types/zkp";
import { TeeAnalysisOutput } from "@/types/tee-output";
import { ZKP_VK_HASH } from "./verifier";

const INSURANCE_ELIGIBILITY_THRESHOLD = 50;

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

// In-process HMAC-SHA256 commitment — identical algorithm to zkp-prover-wasm/src/main.rs
// Fallback when wasmtime is not available (Vercel serverless, CI, etc.)
function generateLocalProof(riskScore: number, threshold: number, nonce: string): ZkpProof {
  if (riskScore < threshold) {
    throw new Error("ZKP 회로 어설션 실패: 보험 자격 기준 미충족");
  }

  const proofBytes = createHmac("sha256", ZKP_VK_HASH)
    .update(Buffer.from([riskScore, threshold]))
    .update(nonce)
    .digest("hex");

  return {
    proofBytes,
    publicInputs: { threshold, nonce },
    verificationKey: ZKP_VK_HASH,
  };
}

interface ZkpWasmOutput {
  proof_bytes: string;
  public_inputs: { threshold: number; nonce: string };
  verification_key: string;
  circuit: string;
  assertion_passed: boolean;
}

// wasmtime 서브프로세스로 zkp-prover.wasm 실행
// Stage 17: 검증된 동작 (wasmtime 44.0.0 + wasm32-wasip2 빌드 확인 2026-04-23)
// Phase 3 업그레이드: Barretenberg ultraplonk 지원 시 동일 인터페이스로 교체
function generateWasmProof(riskScore: number, threshold: number, nonce: string): ZkpProof {
  const wasmPath = path.resolve(process.cwd(), "zkp-prover-wasm/dist/zkp-prover.wasm");
  const input = JSON.stringify({ risk_score: riskScore, threshold, nonce });

  const result = spawnSync("wasmtime", ["run", wasmPath], {
    input,
    encoding: "utf-8",
    timeout: 10_000,
  });

  if (result.error) throw new Error(`wasmtime 실행 실패: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`zkp-prover WASM 오류: ${result.stderr}`);

  let output: ZkpWasmOutput;
  try {
    output = JSON.parse(result.stdout) as ZkpWasmOutput;
  } catch {
    throw new Error(`zkp-prover WASM 출력 파싱 실패: ${result.stdout.slice(0, 200)}`);
  }

  if (!output.assertion_passed) {
    throw new Error("ZKP 회로 어설션 실패: 보험 자격 기준 미충족");
  }

  return {
    proofBytes: output.proof_bytes,
    publicInputs: output.public_inputs,
    verificationKey: output.verification_key,
  };
}

function isWasmtimeAvailable(): boolean {
  const result = spawnSync("wasmtime", ["--version"], { encoding: "utf-8", timeout: 3_000 });
  return result.status === 0;
}

export async function generateZkpProof(input: {
  riskScore: number;
  threshold?: number;
}): Promise<ZkpProof> {
  const threshold = input.threshold ?? INSURANCE_ELIGIBILITY_THRESHOLD;
  const nonce = randomUUID();

  // wasmtime 가용 시: 실제 WASM 실행 (로컬 개발, 자체 호스팅 환경)
  // 미가용 시: in-process HMAC-SHA256 fallback (Vercel 서버리스 등)
  // 두 경로 모두 동일한 HMAC-SHA256 커밋먼트 알고리즘 사용
  if (isWasmtimeAvailable()) {
    return generateWasmProof(input.riskScore, threshold, nonce);
  }

  return generateLocalProof(input.riskScore, threshold, nonce);
}
