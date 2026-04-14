"use server";

import OpenAI from "openai";
import { z } from "zod";
import { buildSystemPrompt } from "@/lib/tee/concierge-system-prompt";

const client = new OpenAI({
  baseURL: process.env.IRONCLAW_BASE_URL ?? "https://cloud-api.near.ai/v1",
  apiKey: process.env.IRONCLAW_API_KEY ?? "",
});

const MODEL = process.env.CONCIERGE_MODEL ?? "Qwen/Qwen3-30B-A3B-Instruct-2507";

const riskEntrySchema = z.object({
  level: z.string(),
  flags: z.array(z.string()),
});

const inputSchema = z.object({
  message: z.string().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
      })
    )
    .max(20),
  riskProfile: z.record(z.string(), riskEntrySchema),
});

function formatRiskContext(
  riskProfile: Record<string, { level: string; flags: string[] }>
): string {
  return Object.entries(riskProfile)
    .map(([category, { level, flags }]) => {
      const flagText = flags.length > 0 ? ` (주요 항목: ${flags.join(", ")})` : "";
      return `- ${category}: ${level}${flagText}`;
    })
    .join("\n");
}

export async function chatWithConcierge(
  input: z.infer<typeof inputSchema>
): Promise<{ reply: string } | { error: string }> {
  const parsed = inputSchema.parse(input);
  const riskContext = formatRiskContext(parsed.riskProfile);
  const systemPrompt = buildSystemPrompt(riskContext);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...parsed.history,
    { role: "user", content: parsed.message },
  ];

  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      max_tokens: 600,
      temperature: 0.7,
    });

    return { reply: response.choices[0].message.content ?? "" };
  } catch {
    return { error: "상담 서비스에 일시적으로 접근할 수 없습니다. 잠시 후 다시 시도해주세요." };
  }
}
