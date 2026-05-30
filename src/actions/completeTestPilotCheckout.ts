"use server";

import { db } from "@/lib/db";
import {
  recommendationCarts,
  testPilotCheckouts,
  testPilotCheckoutInsertSchema,
} from "@/lib/db/schema";
import { isTestPilotGuestIdentity } from "@/lib/test-pilot";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

const completeTestPilotCheckoutInputSchema = z.object({
  cartId: z.string().uuid(),
  walletAddress: z.string().min(2).max(64),
  disclaimerAccepted: z.literal(true),
});

interface CompleteTestPilotCheckoutResult {
  success: boolean;
  testCheckoutId?: string;
  error?: string;
}

export async function completeTestPilotCheckout(
  input: unknown
): Promise<CompleteTestPilotCheckoutResult> {
  const parsed = completeTestPilotCheckoutInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" };
  }

  if (!isTestPilotCheckoutEnabled()) {
    return { success: false, error: "테스트 결제 완료 모드가 비활성화되어 있습니다" };
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
    return { success: false, error: "테스트 세션 주소가 일치하지 않습니다" };
  }

  if (!isTestPilotGuestIdentity(cart.walletAddress)) {
    return { success: false, error: "테스트 guest 카트가 아닙니다" };
  }

  if (cart.status !== "active") {
    return { success: false, error: "이미 처리된 카트입니다" };
  }

  const checkoutId = uuidv4();
  const now = DateTime.now();

  const row = testPilotCheckoutInsertSchema.safeParse({
    id: checkoutId,
    cartId,
    walletAddress,
    selectedProductIds: cart.selectedProductIds,
    totalMonthlyUsdc: cart.totalMonthlyUsdc,
    status: "completed",
    disclaimerAccepted: true,
    createdAt: now.toUnixInteger(),
  });

  if (!row.success) {
    return { success: false, error: row.error.issues[0]?.message ?? "테스트 신청 데이터 검증 실패" };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(testPilotCheckouts).values({
        id: checkoutId,
        cartId,
        walletAddress,
        selectedProductIds: cart.selectedProductIds,
        totalMonthlyUsdc: cart.totalMonthlyUsdc,
        status: "completed",
        disclaimerAccepted: true,
        createdAt: now.toJSDate(),
      });

      await tx
        .update(recommendationCarts)
        .set({ status: "checked_out", updatedAt: now.toJSDate() })
        .where(eq(recommendationCarts.id, cartId));
    });

    return { success: true, testCheckoutId: checkoutId };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `테스트 신청 완료 중 오류가 발생했습니다: ${message}` };
  }
}

function isTestPilotCheckoutEnabled(): boolean {
  return (
    process.env.TEST_PILOT_ENABLED === "true" &&
    process.env.TEST_PILOT_SKIP_PAYMENT === "true"
  );
}
