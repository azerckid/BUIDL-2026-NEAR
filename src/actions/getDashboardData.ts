"use server";

import { db } from "@/lib/db";
import { analysisResults, insuranceProducts, riskProfileSchema } from "@/lib/db/schema";
import type { InsuranceProduct, RiskProfile } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";

export interface DashboardData {
  sessionId: string;
  walletAddress: string;
  riskProfile: RiskProfile;
  products: InsuranceProduct[];
  zkpProofHash: string | null;
  expiresAt: string; // ISO string — serializable across Server/Client boundary
}

export async function getDashboardData(sessionId: string): Promise<DashboardData | null> {
  if (!sessionId) return null;

  const rows = await db
    .select()
    .from(analysisResults)
    .where(eq(analysisResults.sessionId, sessionId))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];

  // 만료 확인
  const expiresAt = row.expiresAt instanceof Date ? row.expiresAt : new Date((row.expiresAt as unknown as number) * 1000);
  if (DateTime.fromJSDate(expiresAt) < DateTime.now()) return null;

  // riskProfile JSON 파싱 + Zod 검증
  let riskProfile: RiskProfile;
  try {
    riskProfile = riskProfileSchema.parse(JSON.parse(row.riskProfile));
  } catch {
    return null;
  }

  // recommendedProductIds JSON 파싱
  let recommendedProductIds: string[];
  try {
    recommendedProductIds = JSON.parse(row.recommendedProductIds);
  } catch {
    return null;
  }

  if (recommendedProductIds.length === 0) {
    return {
      sessionId,
      walletAddress: row.walletAddress,
      riskProfile,
      products: [],
      zkpProofHash: row.zkpProofHash,
      expiresAt: expiresAt.toISOString(),
    };
  }

  // 전체 활성 상품 조회 후 추천 순서대로 정렬
  const allProducts = await db
    .select()
    .from(insuranceProducts)
    .where(eq(insuranceProducts.isActive, 1));

  const productMap = new Map(allProducts.map((p) => [p.id, p]));
  const products = recommendedProductIds
    .map((id) => productMap.get(id))
    .filter((p): p is InsuranceProduct => p !== undefined);

  return {
    sessionId,
    walletAddress: row.walletAddress,
    riskProfile,
    products,
    zkpProofHash: row.zkpProofHash,
    expiresAt: expiresAt.toISOString(),
  };
}
