import OpenAI from "openai";
import { createHmac, randomUUID } from "crypto";
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

// Local HMAC-SHA256 commitment — mirrors zkp-prover-wasm/src/main.rs
// Used when USE_REAL_ZKP=false (WASM tool not yet registered on IronClaw)
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

// ZKP tool definition — registered in IronClaw as "zkp-prover" WASM tool
// Registration: zkp-prover-wasm/REGISTER.md
const ZKP_PROVER_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "zkp_prove",
    description:
      "Generate a ZKP proof for insurance eligibility inside the TEE. " +
      "risk_score is a private input that never leaves the enclave. " +
      "Returns proof_bytes (HMAC-SHA256 commitment) and public_inputs.",
    parameters: {
      type: "object",
      properties: {
        risk_score: {
          type: "integer",
          minimum: 0,
          maximum: 255,
          description: "Private risk score derived from TEE analysis (never exposed)",
        },
        threshold: {
          type: "integer",
          minimum: 0,
          maximum: 255,
          description: "Public insurer-set eligibility baseline",
        },
        nonce: {
          type: "string",
          description: "UUID nonce for commitment uniqueness",
        },
      },
      required: ["risk_score", "threshold", "nonce"],
    },
  },
};

interface ZkpToolResult {
  proof_bytes: string;
  public_inputs: { threshold: number; nonce: string };
  verification_key: string;
  circuit: string;
  assertion_passed: boolean;
}

async function generateIronClawProof(
  riskScore: number,
  threshold: number,
  nonce: string
): Promise<ZkpProof> {
  const baseURL = process.env.IRONCLAW_BASE_URL ?? "https://cloud-api.near.ai/v1";
  const apiKey = process.env.IRONCLAW_API_KEY;
  const model = process.env.IRONCLAW_MODEL ?? "Qwen/Qwen3-30B-A3B-Instruct-2507";

  if (!apiKey) throw new Error("IRONCLAW_API_KEY 환경 변수가 설정되지 않았습니다");

  const client = new OpenAI({ baseURL, apiKey });

  const completion = await client.chat.completions.create({
    model,
    tools: [ZKP_PROVER_TOOL],
    tool_choice: { type: "function", function: { name: "zkp_prove" } },
    messages: [
      {
        role: "system",
        content:
          "You are running inside an IronClaw TEE. " +
          "Call the zkp_prove tool with the provided inputs. " +
          "Do not output anything else.",
      },
      {
        role: "user",
        content: JSON.stringify({ risk_score: riskScore, threshold, nonce }),
      },
    ],
  });

  const rawToolCall = completion.choices[0]?.message?.tool_calls?.[0];
  if (!rawToolCall) throw new Error("IronClaw TEE가 zkp_prove 툴을 호출하지 않았습니다");

  const fnCall = (rawToolCall as { function?: { name?: string; arguments?: string } }).function;
  if (!fnCall || fnCall.name !== "zkp_prove") {
    throw new Error(`예상치 않은 툴 호출: ${fnCall?.name ?? "unknown"}`);
  }

  let result: ZkpToolResult;
  try {
    result = JSON.parse(fnCall.arguments ?? "{}") as ZkpToolResult;
  } catch {
    throw new Error(`zkp_prove 툴 응답 파싱 실패: ${(fnCall.arguments ?? "").slice(0, 200)}`);
  }

  if (!result.assertion_passed) throw new Error("ZKP 회로 어설션 실패: 보험 자격 기준 미충족");

  return {
    proofBytes: result.proof_bytes,
    publicInputs: result.public_inputs,
    verificationKey: result.verification_key,
  };
}

export async function generateZkpProof(input: {
  riskScore: number;
  threshold?: number;
}): Promise<ZkpProof> {
  const threshold = input.threshold ?? INSURANCE_ELIGIBILITY_THRESHOLD;
  const nonce = randomUUID();
  const useRealZkp = process.env.USE_REAL_ZKP === "true";

  if (useRealZkp) {
    return generateIronClawProof(input.riskScore, threshold, nonce);
  }

  // USE_REAL_ZKP=false (default): local HMAC-SHA256 commitment
  // Identical algorithm to zkp-prover-wasm — switch to IronClaw Tool Call
  // by setting USE_REAL_ZKP=true after WASM tool registration on cloud.near.ai
  return generateLocalProof(input.riskScore, threshold, nonce);
}
