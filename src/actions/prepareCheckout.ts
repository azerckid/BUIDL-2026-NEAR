"use server";

import { db } from "@/lib/db";
import { recommendationCarts, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const prepareCheckoutInputSchema = z.object({
  cartId: z.string().uuid(),
  walletAddress: z.string().min(2).max(64),
});

interface PrepareCheckoutResult {
  success: boolean;
  txId?: string;
  amountUsdc?: number;
  productIds?: string[];
  error?: string;
}

export async function prepareCheckout(input: unknown): Promise<PrepareCheckoutResult> {
  const parsed = prepareCheckoutInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" };
  }

  const { cartId, walletAddress } = parsed.data;

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

  let productIds: string[];
  try {
    productIds = JSON.parse(cart.selectedProductIds);
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

    return {
      success: true,
      txId,
      amountUsdc: cart.totalMonthlyUsdc,
      productIds,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    // 실패 시 cart 롤백
    await db
      .update(recommendationCarts)
      .set({ status: "active", updatedAt: DateTime.now().toJSDate() })
      .where(eq(recommendationCarts.id, cartId))
      .catch(() => {});

    return { success: false, error: `결제 준비 중 오류가 발생했습니다: ${message}` };
  }
}
