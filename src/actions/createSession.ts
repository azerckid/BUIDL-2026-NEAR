"use server";

import { db } from "@/lib/db";
import { analysisSessions, analysisSessionInsertSchema } from "@/lib/db/schema";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";

type FileType = "vcf" | "pdf" | "txt" | "csv";

interface CreateSessionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export async function createSession(
  walletAddress: string,
  fileHash: string,
  fileType: FileType
): Promise<CreateSessionResult> {
  const sessionId = uuidv4();
  const now = DateTime.now().toUnixInteger();

  const parseResult = analysisSessionInsertSchema.safeParse({
    id: sessionId,
    walletAddress,
    fileHash,
    fileType,
    status: "uploading",
    startedAt: now,
  });

  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]?.message ?? "유효성 검사 실패";
    return { success: false, error: issue };
  }

  try {
    await db.insert(analysisSessions).values({
      id: sessionId,
      walletAddress,
      fileHash,
      fileType,
      status: "uploading",
      startedAt: new Date(now * 1000),
    });

    return { success: true, sessionId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `DB 오류: ${message}` };
  }
}
