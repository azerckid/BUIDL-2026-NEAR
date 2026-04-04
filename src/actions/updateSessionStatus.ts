"use server";

import { db } from "@/lib/db";
import { analysisSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type SessionStatus =
  | "pending"
  | "uploading"
  | "tee_processing"
  | "zkp_generating"
  | "completed"
  | "purged"
  | "failed"
  | "timeout";

export async function updateSessionStatus(
  sessionId: string,
  status: SessionStatus
): Promise<void> {
  const now = new Date();

  await db
    .update(analysisSessions)
    .set({
      status,
      ...(status === "tee_processing" && { teeEnteredAt: now }),
      ...(status === "completed" && { completedAt: now }),
      ...(status === "purged" && { purgedAt: now }),
    })
    .where(eq(analysisSessions.id, sessionId));
}
