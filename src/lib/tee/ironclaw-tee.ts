// IronClaw TEE Analysis — NEAR AI Cloud (OpenAI-compatible API)
// Phase 2: runMockTeeAnalysis 대체 — 동일 인터페이스
// 환경 변수: IRONCLAW_BASE_URL, IRONCLAW_API_KEY, IRONCLAW_MODEL

import OpenAI from "openai";
import { teeAnalysisOutputSchema, TeeAnalysisOutput } from "@/types/tee-output";
import { NormalizedGeneticProfile } from "@/types/genetic";

const IRONCLAW_SYSTEM_PROMPT = `You are MyDNA Insurance Agent running inside an IronClaw Trusted Execution Environment (TEE) on NEAR Protocol.

Your task: analyze a normalized genetic risk profile and return a JSON object matching the exact schema below. No markdown, no explanation — raw JSON only.

Schema:
{
  "riskProfile": {
    "oncology":       { "level": "high"|"moderate"|"normal", "flags": string[] },
    "cardiovascular": { "level": "high"|"moderate"|"normal", "flags": string[] },
    "metabolic":      { "level": "high"|"moderate"|"normal", "flags": string[] },
    "neurological":   { "level": "high"|"moderate"|"normal", "flags": string[] }
  },
  "priorityOrder": ["oncology"|"cardiovascular"|"metabolic"|"neurological"] (exactly 4, sorted high→normal),
  "advisoryMessages": {
    "oncology":       string (max 300 chars, Korean),
    "cardiovascular": string (max 300 chars, Korean),
    "metabolic":      string (max 300 chars, Korean),
    "neurological":   string (max 300 chars, Korean)
  },
  "reasoning":          string (max 500 chars, Korean — overall analysis rationale),
  "coverageGapSummary": string (max 150 chars, Korean — unmet coverage gaps),
  "teeSessionId":       string (UUID — use the sessionId from input),
  "purgeConfirmed":     true,
  "analysisModel":      string (model identifier)
}

Rules:
- flags must only contain values present in the input detectedFlags
- priorityOrder must contain each category exactly once, sorted by risk level (high first)
- All advisory messages must be in Korean
- purgeConfirmed must always be true (TEE purges data after analysis)
- Return ONLY valid JSON, no surrounding text`;

function buildUserPrompt(sessionId: string, profile: NormalizedGeneticProfile): string {
  return JSON.stringify({
    sessionId,
    geneticProfile: {
      oncology: {
        overallLevel: profile.oncology.overallLevel,
        detectedFlags: profile.oncology.detectedFlags,
      },
      cardiovascular: {
        overallLevel: profile.cardiovascular.overallLevel,
        detectedFlags: profile.cardiovascular.detectedFlags,
      },
      metabolic: {
        overallLevel: profile.metabolic.overallLevel,
        detectedFlags: profile.metabolic.detectedFlags,
      },
      neurological: {
        overallLevel: profile.neurological.overallLevel,
        detectedFlags: profile.neurological.detectedFlags,
      },
    },
  });
}

export async function runIronClawAnalysis(
  sessionId: string,
  profile: NormalizedGeneticProfile
): Promise<TeeAnalysisOutput> {
  const baseURL = process.env.IRONCLAW_BASE_URL ?? "https://cloud-api.near.ai/v1";
  const apiKey = process.env.IRONCLAW_API_KEY;
  const model = process.env.IRONCLAW_MODEL ?? "llama-v3p3-70b-instruct";

  if (!apiKey) {
    throw new Error("IRONCLAW_API_KEY 환경 변수가 설정되지 않았습니다");
  }

  const client = new OpenAI({ baseURL, apiKey });

  const completion = await client.chat.completions.create({
    model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: IRONCLAW_SYSTEM_PROMPT },
      { role: "user", content: buildUserPrompt(sessionId, profile) },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("IronClaw TEE 응답이 비어있습니다");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`IronClaw TEE 응답 JSON 파싱 실패: ${raw.slice(0, 200)}`);
  }

  // teeSessionId, purgeConfirmed, analysisModel은 응답에서 덮어씌워서 보장
  const merged = {
    ...(parsed as object),
    teeSessionId: sessionId,
    purgeConfirmed: true as const,
    analysisModel: model,
  };

  return teeAnalysisOutputSchema.parse(merged);
}
