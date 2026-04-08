"use server";

import { db } from "@/lib/db";
import { analysisResults, insuranceProducts, riskProfileSchema } from "@/lib/db/schema";
import type { InsuranceProduct, RiskProfile } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { z } from "zod";

const advisoryMessagesSchema = z.object({
  oncology: z.string(),
  cardiovascular: z.string(),
  metabolic: z.string(),
  neurological: z.string(),
});

const priorityOrderSchema = z.array(
  z.enum(["oncology", "cardiovascular", "metabolic", "neurological"])
);

export type AdvisoryMessages = z.infer<typeof advisoryMessagesSchema>;
export type PriorityOrder = z.infer<typeof priorityOrderSchema>;

export interface DashboardData {
  sessionId: string;
  walletAddress: string;
  riskProfile: RiskProfile;
  products: InsuranceProduct[];
  zkpProofHash: string | null;
  expiresAt: string;
  advisoryMessages: AdvisoryMessages | null;
  reasoning: string | null;
  coverageGapSummary: string | null;
  priorityOrder: PriorityOrder | null;
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

  const expiresAt = row.expiresAt instanceof Date ? row.expiresAt : new Date((row.expiresAt as unknown as number) * 1000);
  if (DateTime.fromJSDate(expiresAt) < DateTime.now()) return null;

  let riskProfile: RiskProfile;
  try {
    riskProfile = riskProfileSchema.parse(JSON.parse(row.riskProfile));
  } catch {
    return null;
  }

  let recommendedProductIds: string[];
  try {
    recommendedProductIds = JSON.parse(row.recommendedProductIds);
  } catch {
    return null;
  }

  let advisoryMessages: AdvisoryMessages | null = null;
  try {
    if (row.advisoryMessages) {
      advisoryMessages = advisoryMessagesSchema.parse(JSON.parse(row.advisoryMessages));
    }
  } catch {
    advisoryMessages = null;
  }

  let priorityOrder: PriorityOrder | null = null;
  try {
    if (row.priorityOrder) {
      priorityOrder = priorityOrderSchema.parse(JSON.parse(row.priorityOrder));
    }
  } catch {
    priorityOrder = null;
  }

  if (recommendedProductIds.length === 0) {
    return {
      sessionId,
      walletAddress: row.walletAddress,
      riskProfile,
      products: [],
      zkpProofHash: row.zkpProofHash,
      expiresAt: expiresAt.toISOString(),
      advisoryMessages,
      reasoning: row.reasoning ?? null,
      coverageGapSummary: row.coverageGapSummary ?? null,
      priorityOrder,
    };
  }

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
    advisoryMessages,
    reasoning: row.reasoning ?? null,
    coverageGapSummary: row.coverageGapSummary ?? null,
    priorityOrder,
  };
}
