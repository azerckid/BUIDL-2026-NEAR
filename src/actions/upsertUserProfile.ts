"use server";

import { db } from "@/lib/db";
import { userProfiles, userProfileInsertSchema } from "@/lib/db/schema";
import { DateTime } from "luxon";
import { eq } from "drizzle-orm";

interface UpsertResult {
  success: boolean;
  error?: string;
}

export async function upsertUserProfile(walletAddress: string): Promise<UpsertResult> {
  const now = DateTime.now().toUnixInteger();

  const parseResult = userProfileInsertSchema.safeParse({
    walletAddress,
    subscriptionTier: "free",
    subscriptionExpiresAt: null,
    lastAnalysisAt: null,
    createdAt: now,
    updatedAt: now,
  });

  if (!parseResult.success) {
    const issue = parseResult.error.issues[0]?.message ?? "유효성 검사 실패";
    return { success: false, error: `유효하지 않은 지갑 주소 (${issue})` };
  }

  const nowDate = new Date(now * 1000);

  try {
    const existing = await db
      .select({ walletAddress: userProfiles.walletAddress })
      .from(userProfiles)
      .where(eq(userProfiles.walletAddress, walletAddress))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userProfiles)
        .set({ updatedAt: nowDate })
        .where(eq(userProfiles.walletAddress, walletAddress));
    } else {
      await db.insert(userProfiles).values({
        walletAddress,
        subscriptionTier: "free",
        createdAt: nowDate,
        updatedAt: nowDate,
      });
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `DB 오류: ${message}` };
  }
}
