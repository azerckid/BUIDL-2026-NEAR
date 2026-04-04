"use server";

import { db } from "@/lib/db";
import { recommendationCarts, insuranceProducts } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { DateTime } from "luxon";
import { z } from "zod";

const createCartInputSchema = z.object({
  walletAddress: z.string().min(2).max(64),
  sessionId: z.string().uuid(),
  selectedProductIds: z.array(z.string()).min(1, "상품을 하나 이상 선택해야 합니다"),
});

interface CreateCartResult {
  success: boolean;
  cartId?: string;
  error?: string;
}

export async function createCart(input: unknown): Promise<CreateCartResult> {
  const parsed = createCartInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다" };
  }

  const { walletAddress, sessionId, selectedProductIds } = parsed.data;

  // 선택한 상품의 보험료 합산
  const products = await db
    .select({
      monthlyPremiumUsdc: insuranceProducts.monthlyPremiumUsdc,
      discountEligible: insuranceProducts.discountEligible,
      originalPremiumUsdc: insuranceProducts.originalPremiumUsdc,
    })
    .from(insuranceProducts)
    .where(inArray(insuranceProducts.id, selectedProductIds));

  if (products.length === 0) {
    return { success: false, error: "유효한 상품이 없습니다" };
  }

  let totalMonthlyUsdc = 0;
  let discountAppliedUsdc = 0;

  for (const p of products) {
    totalMonthlyUsdc += p.monthlyPremiumUsdc;
    if (p.discountEligible === 1 && p.originalPremiumUsdc != null) {
      discountAppliedUsdc += p.originalPremiumUsdc - p.monthlyPremiumUsdc;
    }
  }

  const now = DateTime.now();
  const cartId = uuidv4();

  await db.insert(recommendationCarts).values({
    id: cartId,
    walletAddress,
    sessionId,
    selectedProductIds: JSON.stringify(selectedProductIds),
    totalMonthlyUsdc,
    discountAppliedUsdc,
    status: "active",
    createdAt: now.toJSDate(),
    updatedAt: now.toJSDate(),
  });

  return { success: true, cartId };
}
