"use server";

import { db } from "@/lib/db";
import {
  analysisResults,
  insuranceProducts,
  insuranceProductSources,
  insuranceSourceDocuments,
  riskProfileSchema,
} from "@/lib/db/schema";
import type { InsuranceProduct, RiskProfile } from "@/lib/db/schema";
import { and, eq, inArray } from "drizzle-orm";
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

export type DashboardProduct = InsuranceProduct & {
  officialProductUrl: string | null;
  sourceUrl: string | null;
  sourceDocumentType: string | null;
  sourceRetrievedAtIso: string | null;
  sourceCheckedAtIso: string | null;
};

export interface DashboardData {
  sessionId: string;
  walletAddress: string;
  riskProfile: RiskProfile;
  products: DashboardProduct[];
  zkpProofHash: string | null;
  expiresAt: string;
  advisoryMessages: AdvisoryMessages | null;
  reasoning: string | null;
  coverageGapSummary: string | null;
  priorityOrder: PriorityOrder | null;
}

function toIsoDateTime(value: Date | number | null | undefined): string | null {
  if (!value) return null;

  const dateTime = value instanceof Date ? DateTime.fromJSDate(value) : DateTime.fromSeconds(value);
  return dateTime.isValid ? dateTime.toISO() : null;
}

export async function getDashboardData(
  sessionId: string,
  walletAddress: string
): Promise<DashboardData | null> {
  if (!sessionId || !walletAddress) return null;

  const rows = await db
    .select()
    .from(analysisResults)
    .where(
      and(
        eq(analysisResults.sessionId, sessionId),
        eq(analysisResults.walletAddress, walletAddress)
      )
    )
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

  const productSourceIds = Array.from(
    new Set(
      products
        .map((product) => product.productSourceId)
        .filter((id): id is string => id !== null)
    )
  );
  const primarySourceDocumentIds = Array.from(
    new Set(
      products
        .map((product) => product.primarySourceDocumentId)
        .filter((id): id is string => id !== null)
    )
  );

  const [productSources, sourceDocumentsByPrimaryId, sourceDocumentsByProductSource] =
    await Promise.all([
      productSourceIds.length > 0
        ? db
            .select()
            .from(insuranceProductSources)
            .where(inArray(insuranceProductSources.id, productSourceIds))
        : Promise.resolve([]),
      primarySourceDocumentIds.length > 0
        ? db
            .select()
            .from(insuranceSourceDocuments)
            .where(inArray(insuranceSourceDocuments.id, primarySourceDocumentIds))
        : Promise.resolve([]),
      productSourceIds.length > 0
        ? db
            .select()
            .from(insuranceSourceDocuments)
            .where(inArray(insuranceSourceDocuments.productSourceId, productSourceIds))
        : Promise.resolve([]),
    ]);

  const productSourceMap = new Map(productSources.map((source) => [source.id, source]));
  const sourceDocumentByIdMap = new Map(
    sourceDocumentsByPrimaryId.map((document) => [document.id, document])
  );
  const sourceDocumentByProductSourceMap = new Map<string, (typeof sourceDocumentsByProductSource)[number]>();
  const documentPriority: Record<string, number> = {
    summary: 0,
    terms: 1,
    product_page: 2,
    business_method: 3,
    price_disclosure: 4,
    api_response: 5,
  };

  for (const document of sourceDocumentsByProductSource) {
    const current = sourceDocumentByProductSourceMap.get(document.productSourceId);
    if (
      !current ||
      (documentPriority[document.documentType] ?? 99) <
        (documentPriority[current.documentType] ?? 99)
    ) {
      sourceDocumentByProductSourceMap.set(document.productSourceId, document);
    }
  }

  const dashboardProducts: DashboardProduct[] = products.map((product) => {
    const productSource = product.productSourceId
      ? productSourceMap.get(product.productSourceId) ?? null
      : null;
    const sourceDocument =
      (product.primarySourceDocumentId
        ? sourceDocumentByIdMap.get(product.primarySourceDocumentId) ?? null
        : null) ??
      (product.productSourceId
        ? sourceDocumentByProductSourceMap.get(product.productSourceId) ?? null
        : null);

    const sourceCheckedAt =
      product.sourceCheckedAt ??
      productSource?.lastVerifiedAt ??
      sourceDocument?.retrievedAt ??
      null;

    return {
      ...product,
      officialProductUrl: productSource?.officialProductUrl ?? null,
      sourceUrl: sourceDocument?.sourceUrl ?? productSource?.officialProductUrl ?? null,
      sourceDocumentType: sourceDocument?.documentType ?? null,
      sourceRetrievedAtIso: toIsoDateTime(sourceDocument?.retrievedAt),
      sourceCheckedAtIso: toIsoDateTime(sourceCheckedAt),
    };
  });

  return {
    sessionId,
    walletAddress: row.walletAddress,
    riskProfile,
    products: dashboardProducts,
    zkpProofHash: row.zkpProofHash,
    expiresAt: expiresAt.toISOString(),
    advisoryMessages,
    reasoning: row.reasoning ?? null,
    coverageGapSummary: row.coverageGapSummary ?? null,
    priorityOrder,
  };
}
