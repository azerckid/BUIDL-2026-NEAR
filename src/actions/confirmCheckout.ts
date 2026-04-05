"use server";

import { db } from "@/lib/db";
import { recommendationCarts, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { z } from "zod";

const confirmCheckoutInputSchema = z.object({
  txId: z.string().uuid(),
  txHash: z.string().min(1),
  cartId: z.string().uuid(),
});

interface ConfirmCheckoutResult {
  success: boolean;
  txId?: string;
  txHash?: string;
  error?: string;
}

export async function confirmCheckout(input: unknown): Promise<ConfirmCheckoutResult> {
  const parsed = confirmCheckoutInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" };
  }

  const { txId, txHash, cartId } = parsed.data;

  const confirmedAt = DateTime.now();

  try {
    // 1. transaction → broadcasting
    await db
      .update(transactions)
      .set({ status: "broadcasting" })
      .where(eq(transactions.id, txId));

    // 2. transaction → confirmed + txHash 저장
    await db
      .update(transactions)
      .set({ txHash, status: "confirmed", confirmedAt: confirmedAt.toJSDate() })
      .where(eq(transactions.id, txId));

    // 3. cart → checked_out
    await db
      .update(recommendationCarts)
      .set({ status: "checked_out", updatedAt: confirmedAt.toJSDate() })
      .where(eq(recommendationCarts.id, cartId));

    return { success: true, txId, txHash };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    await db
      .update(transactions)
      .set({ status: "failed", failureReason: message })
      .where(eq(transactions.id, txId))
      .catch(() => {});

    await db
      .update(recommendationCarts)
      .set({ status: "active", updatedAt: DateTime.now().toJSDate() })
      .where(eq(recommendationCarts.id, cartId))
      .catch(() => {});

    return { success: false, error: `결제 확정 중 오류가 발생했습니다: ${message}` };
  }
}
