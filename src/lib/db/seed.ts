import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { insuranceProducts } from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const db = drizzle(client);

const now = Math.floor(Date.now() / 1000);

const SEED_PRODUCTS = [
  {
    id: "prod_001",
    name: "췌장·간 집중 보장 특약",
    provider: "KB손해보험",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: 32.0,
    originalPremiumUsdc: 45.0,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(["pancreatic_cancer", "liver_cancer"]),
    discountEligible: 1,
    isActive: 1,
    createdAt: new Date(now * 1000),
  },
  {
    id: "prod_002",
    name: "암 진단비 강화 특약",
    provider: "삼성생명",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: 47.0,
    originalPremiumUsdc: 60.0,
    coverageCategory: "oncology" as const,
    riskTargets: JSON.stringify(["pancreatic_cancer", "lung_cancer", "colon_cancer"]),
    discountEligible: 1,
    isActive: 1,
    createdAt: new Date(now * 1000),
  },
  {
    id: "prod_003",
    name: "당뇨·대사 관리 특약",
    provider: "한화생명",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: 18.5,
    originalPremiumUsdc: null,
    coverageCategory: "metabolic" as const,
    riskTargets: JSON.stringify(["type2_diabetes", "hyperlipidemia"]),
    discountEligible: 0,
    isActive: 1,
    createdAt: new Date(now * 1000),
  },
  {
    id: "prod_004",
    name: "심혈관 정밀 보장 특약",
    provider: "신한라이프",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: 29.0,
    originalPremiumUsdc: 38.0,
    coverageCategory: "cardiovascular" as const,
    riskTargets: JSON.stringify(["myocardial_infarction", "stroke", "arrhythmia"]),
    discountEligible: 1,
    isActive: 1,
    createdAt: new Date(now * 1000),
  },
  {
    id: "prod_005",
    name: "치매 조기 진단 특약",
    provider: "교보생명",
    chainNetwork: "near" as const,
    contractAddress: null,
    monthlyPremiumUsdc: 22.0,
    originalPremiumUsdc: null,
    coverageCategory: "neurological" as const,
    riskTargets: JSON.stringify(["alzheimers", "parkinsons"]),
    discountEligible: 0,
    isActive: 1,
    createdAt: new Date(now * 1000),
  },
];

async function seed() {
  console.log("Seeding insurance products...");
  for (const product of SEED_PRODUCTS) {
    await db
      .insert(insuranceProducts)
      .values(product)
      .onConflictDoNothing();
  }
  console.log("Seed complete. 5 products inserted.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
