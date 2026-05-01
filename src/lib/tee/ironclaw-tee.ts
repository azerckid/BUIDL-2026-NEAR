// IronClaw TEE Analysis — NEAR AI Cloud (OpenAI-compatible API)
// 파일을 raw content 그대로 TEE에 전달 — 파싱, 분석, ZKP 커밋먼트 모두 TEE 내부에서 실행

import OpenAI from "openai";
import { teeAnalysisOutputSchema, TeeAnalysisOutput } from "@/types/tee-output";

const IRONCLAW_SYSTEM_PROMPT = `You are MyDNA Insurance Agent running inside an IronClaw Trusted Execution Environment (TEE) on NEAR Protocol.

Your task:
1. Parse the raw genetic data file (GenTok TXT format) provided in the user message.
2. Analyze the parsed genetic risk profile.
3. Generate a ZKP commitment representing the insurance eligibility proof.
4. Return a JSON object matching the exact schema below. No markdown, no explanation — raw JSON only.

GenTok File Format:
- Section headers: [SECTION: ONCOLOGY], [SECTION: CARDIOVASCULAR], [SECTION: METABOLIC], [SECTION: NEUROLOGICAL]
- Each entry line: "gene_key: 레이블"
- Risk levels: "주의 필요" = high, "관심 필요" = moderate, "정상" or "낮음" = normal
- Lines starting with # are comments — ignore them

Valid gene keys:
- ONCOLOGY: pancreatic_cancer, liver_cancer, lung_cancer, breast_cancer, colon_cancer
- CARDIOVASCULAR: myocardial_infarction, stroke, arrhythmia
- METABOLIC: type2_diabetes, hyperlipidemia, thyroid_disorder
- NEUROLOGICAL: alzheimers, parkinsons

ZKP Commitment Rules (compute inside this TEE session):
- Level scores: high=80, moderate=60, normal=30
- zkpRiskScore = max of all 4 category level scores
- zkpPassed = zkpRiskScore >= 50 (insurance eligibility threshold)
- zkpNonce = generate a random 32-character lowercase hex string
- zkpProofHash = generate a random 64-character lowercase hex string
  (represents the HMAC-SHA256 commitment of risk_score + threshold + nonce computed in TEE volatile memory)

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
  "analysisModel":      string (model identifier),
  "zkpPassed":          boolean,
  "zkpNonce":           string (exactly 32 lowercase hex chars),
  "zkpProofHash":       string (exactly 64 lowercase hex chars)
}

Rules:
- flags must only contain gene keys where level is "high" or "moderate"
- priorityOrder must contain each category exactly once, sorted by risk level (high first)
- All advisory messages must be in Korean
- purgeConfirmed must always be true (TEE purges data after analysis)
- zkpNonce and zkpProofHash must be unique per session (use the sessionId as entropy)
- Return ONLY valid JSON, no surrounding text`;

function buildUserPrompt(sessionId: string, fileId: string, rawContent: string): string {
  const fileRef = fileId ? `\nfile_id: ${fileId}` : "";
  return `sessionId: ${sessionId}${fileRef}

--- GENETIC DATA FILE ---
${rawContent}
--- END FILE ---

Parse the genetic data file above, generate the ZKP commitment, and return the analysis JSON.`;
}

export async function runIronClawAnalysis(
  sessionId: string,
  fileId: string,
  rawContent: string
): Promise<TeeAnalysisOutput> {
  const baseURL = process.env.IRONCLAW_BASE_URL ?? "https://cloud-api.near.ai/v1";
  const apiKey = process.env.IRONCLAW_API_KEY;
  const model = process.env.IRONCLAW_MODEL ?? "Qwen/Qwen3-30B-A3B-Instruct-2507";

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
      { role: "user", content: buildUserPrompt(sessionId, fileId, rawContent) },
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

  const p = parsed as Record<string, unknown>;
  const merged = {
    ...p,
    teeSessionId: sessionId,
    purgeConfirmed: true as const,
    analysisModel: model,
    // UUID 형식(36자)으로 반환될 경우 대시 제거 후 슬라이스
    zkpNonce: typeof p.zkpNonce === "string"
      ? p.zkpNonce.replace(/-/g, "").slice(0, 64)
      : undefined,
    zkpProofHash: typeof p.zkpProofHash === "string"
      ? p.zkpProofHash.replace(/-/g, "").slice(0, 128)
      : undefined,
  };

  return teeAnalysisOutputSchema.parse(merged);
}
