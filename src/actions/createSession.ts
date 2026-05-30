"use server";

import { db } from "@/lib/db";
import { analysisSessions, analysisSessionInsertSchema } from "@/lib/db/schema";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { isTestPilotGuestIdentity } from "@/lib/test-pilot";

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
  if (isTestPilotGuestIdentity(walletAddress) && !isTestPilotSessionCreationEnabled()) {
    return {
      success: false,
      error: "테스트 모드가 비활성화되어 guest 세션을 생성할 수 없습니다",
    };
  }

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

function isTestPilotSessionCreationEnabled(): boolean {
  return (
    process.env.TEST_PILOT_ENABLED === "true" &&
    process.env.TEST_PILOT_SKIP_WALLET === "true"
  );
}
