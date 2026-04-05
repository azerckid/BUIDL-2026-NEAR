"use server";

import { db } from "@/lib/db";
import { recommendationCarts, insuranceProducts, analysisResults } from "@/lib/db/schema";
import type { InsuranceProduct } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

export interface CartData {
  cartId: string;
  walletAddress: string;
  sessionId: string;
  products: InsuranceProduct[];
  totalMonthlyUsdc: number;
  discountAppliedUsdc: number;
  zkpProofHash: string | null;
  status: "active" | "pending_checkout" | "checked_out" | "abandoned";
}

export async function getCartData(cartId: string): Promise<CartData | null> {
  if (!cartId) return null;

  const carts = await db
    .select()
    .from(recommendationCarts)
    .where(eq(recommendationCarts.id, cartId))
    .limit(1);

  if (carts.length === 0) return null;

  const cart = carts[0];

  if (cart.status === "abandoned") return null;

  let selectedProductIds: string[];
  try {
    selectedProductIds = JSON.parse(cart.selectedProductIds);
  } catch {
    return null;
  }

  const products: InsuranceProduct[] =
    selectedProductIds.length > 0
      ? await db
          .select()
          .from(insuranceProducts)
          .where(inArray(insuranceProducts.id, selectedProductIds))
      : [];

  const resultRows = await db
    .select({ zkpProofHash: analysisResults.zkpProofHash })
    .from(analysisResults)
    .where(eq(analysisResults.sessionId, cart.sessionId))
    .limit(1);

  const zkpProofHash = resultRows[0]?.zkpProofHash ?? null;

  return {
    cartId: cart.id,
    walletAddress: cart.walletAddress,
    sessionId: cart.sessionId,
    products,
    totalMonthlyUsdc: cart.totalMonthlyUsdc,
    discountAppliedUsdc: cart.discountAppliedUsdc,
    zkpProofHash,
    status: cart.status as CartData["status"],
  };
}
