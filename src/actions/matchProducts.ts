"use server";

import { db } from "@/lib/db";
import { insuranceProducts, type InsuranceProduct } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TeeAnalysisOutput } from "@/types/tee-output";

export interface ProductMatchGroups {
  riskTargetProductIds: string[];
  baselineProductIds: string[];
  recommendedProductIds: string[];
}

function parseRiskTargets(rawTargets: string): string[] {
  try {
    const parsed = JSON.parse(rawTargets);
    return Array.isArray(parsed)
      ? parsed.filter((target): target is string => typeof target === "string")
      : [];
  } catch {
    return [];
  }
}

function sortByProductName(a: InsuranceProduct, b: InsuranceProduct) {
  return `${a.provider} ${a.name}`.localeCompare(`${b.provider} ${b.name}`, "ko");
}

function sortByPriorityOrder(priorityOrder: TeeAnalysisOutput["priorityOrder"]) {
  return (a: InsuranceProduct, b: InsuranceProduct) => {
    const fallback = priorityOrder.length;
    const aIdx = priorityOrder.indexOf(
      a.coverageCategory as (typeof priorityOrder)[number]
    );
    const bIdx = priorityOrder.indexOf(
      b.coverageCategory as (typeof priorityOrder)[number]
    );
    return (aIdx === -1 ? fallback : aIdx) - (bIdx === -1 ? fallback : bIdx);
  };
}

function uniqueProductIds(productIds: string[]) {
  return Array.from(new Set(productIds));
}

export async function matchProductGroups(
  riskProfile: TeeAnalysisOutput["riskProfile"],
  priorityOrder: TeeAnalysisOutput["priorityOrder"]
): Promise<ProductMatchGroups> {
  const allFlags = new Set([
    ...riskProfile.oncology.flags,
    ...riskProfile.cardiovascular.flags,
    ...riskProfile.metabolic.flags,
    ...riskProfile.neurological.flags,
  ]);

  const products = await db
    .select()
    .from(insuranceProducts)
    .where(eq(insuranceProducts.isActive, 1));

  const riskTargetProducts = products
    .filter((product) => {
      if (product.matchingStrategy !== "risk_target" || allFlags.size === 0) {
        return false;
      }

      const targets = parseRiskTargets(product.riskTargets);
      return targets.some((target) => allFlags.has(target));
    })
    .sort(sortByPriorityOrder(priorityOrder));

  const baselineProducts = products
    .filter((product) => product.matchingStrategy === "baseline")
    .sort(sortByProductName);

  const riskTargetProductIds = riskTargetProducts.map((product) => product.id);
  const baselineProductIds = baselineProducts.map((product) => product.id);

  return {
    riskTargetProductIds,
    baselineProductIds,
    recommendedProductIds: uniqueProductIds([
      ...riskTargetProductIds,
      ...baselineProductIds,
    ]),
  };
}

export async function matchProducts(
  riskProfile: TeeAnalysisOutput["riskProfile"],
  priorityOrder: TeeAnalysisOutput["priorityOrder"]
): Promise<string[]> {
  const groups = await matchProductGroups(riskProfile, priorityOrder);
  return groups.recommendedProductIds;
}
