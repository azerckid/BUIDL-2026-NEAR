"use server";

import OpenAI, { toFile } from "openai";

export async function uploadToIronClaw(
  fileBase64: string,
  filename: string
): Promise<{ success: true; fileId: string } | { success: false; error: string }> {
  const baseURL = process.env.IRONCLAW_BASE_URL ?? "https://cloud-api.near.ai/v1";
  const apiKey = process.env.IRONCLAW_API_KEY;

  if (!apiKey) {
    return { success: false, error: "IRONCLAW_API_KEY 미설정" };
  }

  try {
    const client = new OpenAI({ baseURL, apiKey });
    const buffer = Buffer.from(fileBase64, "base64");
    const file = await toFile(buffer, filename, { type: "text/plain" });

    const uploaded = await client.files.create({ file, purpose: "assistants" });
    return { success: true, fileId: uploaded.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "파일 업로드 실패",
    };
  }
}
