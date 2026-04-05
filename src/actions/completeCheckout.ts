"use server";

import { db } from "@/lib/db";
import { recommendationCarts, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const completeCheckoutInputSchema = z.object({
  cartId: z.string().uuid(),
  walletAddress: z.string().min(2).max(64),
  zkpProofHash: z.string().nullable(),
});

interface CompleteCheckoutResult {
  success: boolean;
  txId?: string;
  txHash?: string;
  error?: string;
}

export async function completeCheckout(input: unknown): Promise<CompleteCheckoutResult> {
  const parsed = completeCheckoutInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" };
  }

  const { cartId, walletAddress, zkpProofHash } = parsed.data;

  const carts = await db
    .select()
    .from(recommendationCarts)
    .where(eq(recommendationCarts.id, cartId))
    .limit(1);

  if (carts.length === 0) {
    return { success: false, error: "카트를 찾을 수 없습니다" };
  }

  const cart = carts[0];

  if (cart.walletAddress !== walletAddress) {
    return { success: false, error: "지갑 주소가 일치하지 않습니다" };
  }

  if (cart.status !== "active") {
    return { success: false, error: "이미 처리된 카트입니다" };
  }

  let selectedProductIds: string[];
  try {
    selectedProductIds = JSON.parse(cart.selectedProductIds);
  } catch {
    return { success: false, error: "카트 데이터가 올바르지 않습니다" };
  }

  const now = DateTime.now();
  const txId = uuidv4();

  try {
    // 1. 이중 결제 방지: cart → pending_checkout 선점
    await db
      .update(recommendationCarts)
      .set({ status: "pending_checkout", updatedAt: now.toJSDate() })
      .where(eq(recommendationCarts.id, cartId));

    // 2. transaction 레코드 생성 (pending)
    await db.insert(transactions).values({
      id: txId,
      walletAddress,
      cartId,
      txHash: null,
      network: "near_testnet",
      amountUsdc: cart.totalMonthlyUsdc,
      confidentialIntentsUsed: 1,
      status: "pending",
      failureReason: null,
      createdAt: now.toJSDate(),
      confirmedAt: null,
    });

    // 3. broadcasting 상태로 전환
    await db
      .update(transactions)
      .set({ status: "broadcasting" })
      .where(eq(transactions.id, txId));

    // 4. 지갑 서명은 클라이언트에서 처리됨 (Phase 1)
    // txHash는 confirmCheckout에서 수신 — 여기서는 mock 유지 (미사용 경로)
    const txHash = "unused-path";

    // 5. confirmed 처리
    const confirmedAt = DateTime.now();
    await db
      .update(transactions)
      .set({ txHash, status: "confirmed", confirmedAt: confirmedAt.toJSDate() })
      .where(eq(transactions.id, txId));

    // 6. cart → checked_out
    await db
      .update(recommendationCarts)
      .set({ status: "checked_out", updatedAt: confirmedAt.toJSDate() })
      .where(eq(recommendationCarts.id, cartId));

    return { success: true, txId, txHash };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // 실패 시 상태 롤백
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

    return { success: false, error: `결제 처리 중 오류가 발생했습니다: ${message}` };
  }
}
