"use server";

import { db } from "@/lib/db";
import { activeSourceBackedProductFilter } from "@/lib/db/insuranceProductFilters";
import { recommendationCarts, insuranceProducts, analysisResults } from "@/lib/db/schema";
import type { InsuranceProduct } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";

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
    const parsedProductIds = JSON.parse(cart.selectedProductIds);
    if (!Array.isArray(parsedProductIds)) return null;
    const productIds = parsedProductIds.filter((id): id is string => typeof id === "string");
    selectedProductIds = Array.from(new Set(productIds));
  } catch {
    return null;
  }

  if (selectedProductIds.length === 0) return null;

  const products: InsuranceProduct[] = await db
    .select()
    .from(insuranceProducts)
    .where(
      and(activeSourceBackedProductFilter(), inArray(insuranceProducts.id, selectedProductIds))
    );

  if (products.length !== selectedProductIds.length) return null;

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
