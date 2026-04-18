import OpenAI from "openai";
import { randomUUID } from "crypto";
import { ZkpProof } from "@/types/zkp";
import { TeeAnalysisOutput } from "@/types/tee-output";

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

export async function generateZkpProof(input: {
  riskScore: number;
  threshold?: number;
}): Promise<ZkpProof> {
  const baseURL = process.env.IRONCLAW_BASE_URL ?? "https://cloud-api.near.ai/v1";
  const apiKey = process.env.IRONCLAW_API_KEY;
  const model = process.env.IRONCLAW_MODEL ?? "Qwen/Qwen3-30B-A3B-Instruct-2507";

  if (!apiKey) {
    throw new Error("IRONCLAW_API_KEY 환경 변수가 설정되지 않았습니다");
  }

  const threshold = input.threshold ?? INSURANCE_ELIGIBILITY_THRESHOLD;
  const nonce = randomUUID();

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
        content: JSON.stringify({ risk_score: input.riskScore, threshold, nonce }),
      },
    ],
  });

  const rawToolCall = completion.choices[0]?.message?.tool_calls?.[0];
  if (!rawToolCall) {
    throw new Error("IronClaw TEE가 zkp_prove 툴을 호출하지 않았습니다");
  }

  // Extract function name and arguments safely across OpenAI SDK versions
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

  if (!result.assertion_passed) {
    throw new Error("ZKP 회로 어설션 실패: 보험 자격 기준 미충족");
  }

  return {
    proofBytes: result.proof_bytes,
    publicInputs: result.public_inputs,
    verificationKey: result.verification_key,
  };
}
