"use server";

import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { authNonces } from "@/lib/db/schema";
import { eq, lt } from "drizzle-orm";
import { DateTime } from "luxon";

const NONCE_TTL_SECONDS = 300; // 5분

interface GenerateAuthNonceResult {
  success: boolean;
  nonce?: string; // 64-char hex
  error?: string;
}

export async function generateAuthNonce(
  walletAddress: string
): Promise<GenerateAuthNonceResult> {
  if (!walletAddress) return { success: false, error: "지갑 주소가 필요합니다" };

  const nonce = randomBytes(32).toString("hex");
  const now = DateTime.now().toUnixInteger();
  const expiresAt = now + NONCE_TTL_SECONDS;

  try {
    // 만료된 nonce 정리 (동시 실행, 실패해도 무관)
    db.delete(authNonces).where(lt(authNonces.expiresAt, now)).catch(() => {});

    await db.insert(authNonces).values({ nonce, walletAddress, expiresAt });

    return { success: true, nonce };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Nonce 생성 오류: ${message}` };
  }
}

export async function consumeAuthNonce(
  nonce: string,
  walletAddress: string
): Promise<{ valid: boolean; error?: string }> {
  const now = DateTime.now().toUnixInteger();

  const rows = await db
    .select()
    .from(authNonces)
    .where(eq(authNonces.nonce, nonce))
    .limit(1);

  if (rows.length === 0) return { valid: false, error: "유효하지 않은 nonce입니다" };

  const record = rows[0];

  // 만료 확인
  if (record.expiresAt < now) {
    await db.delete(authNonces).where(eq(authNonces.nonce, nonce));
    return { valid: false, error: "Nonce가 만료되었습니다 (5분 초과)" };
  }

  // 소유자 확인
  if (record.walletAddress !== walletAddress) {
    return { valid: false, error: "Nonce 소유자 불일치" };
  }

  // 단 한 번만 사용 (사용 즉시 삭제)
  await db.delete(authNonces).where(eq(authNonces.nonce, nonce));

  return { valid: true };
}
