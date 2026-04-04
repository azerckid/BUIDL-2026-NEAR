"use server";

import { db } from "@/lib/db";
import { insuranceProducts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { TeeAnalysisOutput } from "@/types/tee-output";

export async function matchProducts(
  riskProfile: TeeAnalysisOutput["riskProfile"],
  priorityOrder: TeeAnalysisOutput["priorityOrder"]
): Promise<string[]> {
  // 감지된 모든 위험 플래그 수집
  const allFlags = [
    ...riskProfile.oncology.flags,
    ...riskProfile.cardiovascular.flags,
    ...riskProfile.metabolic.flags,
    ...riskProfile.neurological.flags,
  ];

  if (allFlags.length === 0) return [];

  const products = await db
    .select()
    .from(insuranceProducts)
    .where(eq(insuranceProducts.isActive, 1));

  // riskTargets JSON 파싱 후 교집합 필터링
  const matched = products.filter((product) => {
    try {
      const targets: string[] = JSON.parse(product.riskTargets);
      return targets.some((t) => allFlags.includes(t));
    } catch {
      return false;
    }
  });

  // priorityOrder(위험 카테고리 우선순위) 기준 정렬
  matched.sort((a, b) => {
    const aIdx = priorityOrder.indexOf(
      a.coverageCategory as (typeof priorityOrder)[number]
    );
    const bIdx = priorityOrder.indexOf(
      b.coverageCategory as (typeof priorityOrder)[number]
    );
    return aIdx - bIdx;
  });

  return matched.map((p) => p.id);
}
