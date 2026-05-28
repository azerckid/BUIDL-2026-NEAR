import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { z } from "zod";

// ─── user_profiles ───────────────────────────────────────────────────────────

export const userProfiles = sqliteTable("user_profiles", {
  walletAddress: text("wallet_address").primaryKey(),
  subscriptionTier: text("subscription_tier", { enum: ["free", "pro"] })
    .notNull()
    .default("free"),
  subscriptionExpiresAt: integer("subscription_expires_at", { mode: "timestamp" }),
  lastAnalysisAt: integer("last_analysis_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const userProfileInsertSchema = z.object({
  walletAddress: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_\-\.]+\.(near|testnet)$|^[a-f0-9]{64}$/),
  subscriptionTier: z.enum(["free", "pro"]).default("free"),
  subscriptionExpiresAt: z.number().int().positive().nullable().default(null),
  lastAnalysisAt: z.number().int().positive().nullable().default(null),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

// ─── insurance catalog ────────────────────────────────────────────────────────

const coverageCategoryValues = [
  "oncology",
  "cardiovascular",
  "metabolic",
  "neurological",
  "medical_expense",
] as const;

const matchingStrategyValues = ["risk_target", "baseline", "manual"] as const;
const premiumCurrencyValues = ["KRW", "USDC"] as const;
const carrierTypeValues = ["life", "general", "postal", "reinsurance", "other"] as const;
const associationSourceValues = ["klia", "knia", "postal", "manual"] as const;
const saleStatusValues = ["active", "suspended", "archived", "unknown"] as const;
const productReviewStatusValues = ["raw", "parsed", "needs_review", "approved", "rejected"] as const;
const sourceTypeValues = [
  "association",
  "e_insmarket",
  "carrier_disclosure",
  "data_go_kr",
  "postal_api",
  "manual",
] as const;
const documentTypeValues = [
  "terms",
  "summary",
  "business_method",
  "price_disclosure",
  "product_page",
  "api_response",
] as const;
const usageStatusValues = ["internal_only", "link_only", "public_metadata_allowed"] as const;
const parseStatusValues = ["not_parsed", "parsed", "parse_failed"] as const;
const catalogStatusValues = ["approved", "needs_review", "archived"] as const;
const quoteSexValues = ["male", "female", "source_unknown"] as const;
const quoteSourceTypeValues = ["e_insmarket", "carrier_quote", "association", "manual"] as const;
const quoteReviewStatusValues = ["raw", "needs_review", "approved", "rejected"] as const;

function isJsonString(value: string) {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

const jsonStringSchema = z.string().refine(isJsonString, "JSON 문자열이어야 합니다.");
const sha256HexSchema = z.string().length(64).regex(/^[a-f0-9]{64}$/);

export const insuranceCarriers = sqliteTable("insurance_carriers", {
  id: text("id").primaryKey(),
  nameKo: text("name_ko").notNull(),
  nameEn: text("name_en"),
  carrierType: text("carrier_type", { enum: carrierTypeValues }).notNull(),
  associationSource: text("association_source", { enum: associationSourceValues }).notNull(),
  homepageUrl: text("homepage_url"),
  disclosureUrl: text("disclosure_url"),
  isActive: integer("is_active").notNull().default(1),
  lastCheckedAt: integer("last_checked_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("carriers_name_idx").on(table.nameKo),
]);

export const insuranceProductSources = sqliteTable("insurance_product_sources", {
  id: text("id").primaryKey(),
  carrierId: text("carrier_id")
    .notNull()
    .references(() => insuranceCarriers.id),
  rawProductName: text("raw_product_name").notNull(),
  normalizedProductName: text("normalized_product_name").notNull(),
  productGroup: text("product_group").notNull(),
  eInsmarketProductCode: text("e_insmarket_product_code"),
  officialProductUrl: text("official_product_url"),
  saleStatus: text("sale_status", { enum: saleStatusValues }).notNull().default("unknown"),
  saleStatusEvidence: text("sale_status_evidence"),
  premiumCurrency: text("premium_currency", { enum: premiumCurrencyValues })
    .notNull()
    .default("KRW"),
  monthlyPremiumKrw: integer("monthly_premium_krw"),
  premiumText: text("premium_text"),
  premiumBasis: text("premium_basis"),
  renewalType: text("renewal_type"),
  coverageSummary: text("coverage_summary"),
  exclusionsSummary: text("exclusions_summary"),
  coverageDetailsJson: text("coverage_details_json"),
  coverageCaveatsJson: text("coverage_caveats_json"),
  reviewStatus: text("review_status", { enum: productReviewStatusValues })
    .notNull()
    .default("raw"),
  reviewedAt: integer("reviewed_at", { mode: "timestamp" }),
  lastVerifiedAt: integer("last_verified_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("product_sources_carrier_review_idx").on(table.carrierId, table.reviewStatus),
  index("product_sources_code_idx").on(table.eInsmarketProductCode),
]);

export const insuranceSourceDocuments = sqliteTable("insurance_source_documents", {
  id: text("id").primaryKey(),
  productSourceId: text("product_source_id")
    .notNull()
    .references(() => insuranceProductSources.id),
  carrierId: text("carrier_id")
    .notNull()
    .references(() => insuranceCarriers.id),
  sourceType: text("source_type", { enum: sourceTypeValues }).notNull(),
  documentType: text("document_type", { enum: documentTypeValues }).notNull(),
  sourceUrl: text("source_url").notNull(),
  fileHashSha256: text("file_hash_sha256").notNull(),
  contentType: text("content_type"),
  contentLengthBytes: integer("content_length_bytes"),
  retrievedAt: integer("retrieved_at", { mode: "timestamp" }).notNull(),
  effectiveDate: text("effective_date"),
  publishedAt: text("published_at"),
  usageStatus: text("usage_status", { enum: usageStatusValues })
    .notNull()
    .default("link_only"),
  parseStatus: text("parse_status", { enum: parseStatusValues }).notNull().default("not_parsed"),
  extractedTextHash: text("extracted_text_hash"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("source_documents_product_idx").on(table.productSourceId),
  index("source_documents_hash_idx").on(table.fileHashSha256),
]);

export const insurancePremiumQuotes = sqliteTable("insurance_premium_quotes", {
  id: text("id").primaryKey(),
  productSourceId: text("product_source_id")
    .notNull()
    .references(() => insuranceProductSources.id),
  carrierId: text("carrier_id")
    .notNull()
    .references(() => insuranceCarriers.id),
  age: integer("age"),
  sex: text("sex", { enum: quoteSexValues }),
  sourceSexCode: text("source_sex_code"),
  paymentCycle: text("payment_cycle"),
  paymentPeriodYears: integer("payment_period_years"),
  insurancePeriodYears: integer("insurance_period_years"),
  coverageAmountKrw: integer("coverage_amount_krw"),
  planName: text("plan_name"),
  renewalType: text("renewal_type"),
  ridersJson: text("riders_json"),
  premiumCurrency: text("premium_currency", { enum: premiumCurrencyValues })
    .notNull()
    .default("KRW"),
  monthlyPremiumKrw: integer("monthly_premium_krw"),
  premiumText: text("premium_text"),
  quoteSourceType: text("quote_source_type", { enum: quoteSourceTypeValues }).notNull(),
  quoteSourceUrl: text("quote_source_url"),
  quoteParamsJson: text("quote_params_json"),
  quoteHashSha256: text("quote_hash_sha256"),
  retrievedAt: integer("retrieved_at", { mode: "timestamp" }).notNull(),
  reviewStatus: text("review_status", { enum: quoteReviewStatusValues })
    .notNull()
    .default("raw"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("premium_quotes_product_condition_idx").on(
    table.productSourceId,
    table.age,
    table.sex
  ),
  index("premium_quotes_product_review_idx").on(table.productSourceId, table.reviewStatus),
  index("premium_quotes_hash_idx").on(table.quoteHashSha256),
]);

// ─── insurance_products ───────────────────────────────────────────────────────

export const insuranceProducts = sqliteTable("insurance_products", {
  id: text("id").primaryKey(),
  productSourceId: text("product_source_id").references(() => insuranceProductSources.id),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  chainNetwork: text("chain_network", { enum: ["near", "ethereum", "solana"] }).notNull(),
  contractAddress: text("contract_address"),
  // KRW is the official Korean catalog price; USDC remains required for checkout/demo settlement.
  monthlyPremiumUsdc: real("monthly_premium_usdc").notNull(),
  monthlyPremiumKrw: integer("monthly_premium_krw"),
  premiumCurrency: text("premium_currency", { enum: premiumCurrencyValues })
    .notNull()
    .default("KRW"),
  premiumBasis: text("premium_basis"),
  coverageCategory: text("coverage_category", { enum: coverageCategoryValues }).notNull(),
  riskTargets: text("risk_targets").notNull(),
  matchingStrategy: text("matching_strategy", { enum: matchingStrategyValues })
    .notNull()
    .default("risk_target"),
  coverageDetailsJson: text("coverage_details_json"),
  coverageCaveatsJson: text("coverage_caveats_json"),
  sourceCheckedAt: integer("source_checked_at", { mode: "timestamp" }),
  primarySourceDocumentId: text("primary_source_document_id").references(
    () => insuranceSourceDocuments.id
  ),
  catalogStatus: text("catalog_status", { enum: catalogStatusValues })
    .notNull()
    .default("approved"),
  discountEligible: integer("discount_eligible").notNull().default(0),
  originalPremiumUsdc: real("original_premium_usdc"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("products_active_category_idx").on(table.isActive, table.coverageCategory),
  index("products_active_matching_idx").on(table.isActive, table.matchingStrategy),
  index("products_source_idx").on(table.productSourceId),
]);

const riskTargetEnum = z.enum([
  "pancreatic_cancer",
  "liver_cancer",
  "lung_cancer",
  "breast_cancer",
  "colon_cancer",
  "myocardial_infarction",
  "stroke",
  "arrhythmia",
  "type2_diabetes",
  "hyperlipidemia",
  "thyroid_disorder",
  "alzheimers",
  "parkinsons",
]);

export const insuranceProductInsertSchema = z.object({
  id: z.string().uuid(),
  productSourceId: z.string().nullable().default(null),
  name: z.string().min(2).max(100),
  provider: z.string().min(1).max(50),
  chainNetwork: z.enum(["near", "ethereum", "solana"]),
  contractAddress: z.string().nullable().default(null),
  monthlyPremiumUsdc: z.number().positive().max(10000),
  monthlyPremiumKrw: z.number().int().positive().nullable().default(null),
  premiumCurrency: z.enum(premiumCurrencyValues).default("KRW"),
  premiumBasis: z.string().nullable().default(null),
  coverageCategory: z.enum(coverageCategoryValues),
  riskTargets: z.array(riskTargetEnum).default([]),
  matchingStrategy: z.enum(matchingStrategyValues).default("risk_target"),
  coverageDetailsJson: z.string().nullable().default(null),
  coverageCaveatsJson: z.string().nullable().default(null),
  sourceCheckedAt: z.number().int().positive().nullable().default(null),
  primarySourceDocumentId: z.string().nullable().default(null),
  catalogStatus: z.enum(catalogStatusValues).default("approved"),
  discountEligible: z.boolean().default(false),
  originalPremiumUsdc: z.number().positive().nullable().default(null),
  isActive: z.boolean().default(true),
  createdAt: z.number().int().positive(),
}).superRefine((product, ctx) => {
  if (product.matchingStrategy !== "baseline" && product.riskTargets.length === 0) {
    ctx.addIssue({
      code: "custom",
      path: ["riskTargets"],
      message: "baseline이 아닌 보험상품은 최소 1개 이상의 risk target이 필요합니다.",
    });
  }
});

export const insuranceCarrierInsertSchema = z.object({
  id: z.string().min(1),
  nameKo: z.string().min(1).max(100),
  nameEn: z.string().max(100).nullable().default(null),
  carrierType: z.enum(carrierTypeValues),
  associationSource: z.enum(associationSourceValues),
  homepageUrl: z.string().url().nullable().default(null),
  disclosureUrl: z.string().url().nullable().default(null),
  isActive: z.boolean().default(true),
  lastCheckedAt: z.number().int().positive().nullable().default(null),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const insuranceProductSourceInsertSchema = z.object({
  id: z.string().min(1),
  carrierId: z.string().min(1),
  rawProductName: z.string().min(1).max(200),
  normalizedProductName: z.string().min(1).max(200),
  productGroup: z.string().min(1).max(50),
  eInsmarketProductCode: z.string().nullable().default(null),
  officialProductUrl: z.string().url().nullable().default(null),
  saleStatus: z.enum(saleStatusValues).default("unknown"),
  saleStatusEvidence: z.string().nullable().default(null),
  premiumCurrency: z.enum(premiumCurrencyValues).default("KRW"),
  monthlyPremiumKrw: z.number().int().positive().nullable().default(null),
  premiumText: z.string().nullable().default(null),
  premiumBasis: z.string().nullable().default(null),
  renewalType: z.string().nullable().default(null),
  coverageSummary: z.string().nullable().default(null),
  exclusionsSummary: z.string().nullable().default(null),
  coverageDetailsJson: z.string().nullable().default(null),
  coverageCaveatsJson: z.string().nullable().default(null),
  reviewStatus: z.enum(productReviewStatusValues).default("raw"),
  reviewedAt: z.number().int().positive().nullable().default(null),
  lastVerifiedAt: z.number().int().positive().nullable().default(null),
  createdAt: z.number().int().positive(),
  updatedAt: z.number().int().positive(),
});

export const insuranceSourceDocumentInsertSchema = z.object({
  id: z.string().min(1),
  productSourceId: z.string().min(1),
  carrierId: z.string().min(1),
  sourceType: z.enum(sourceTypeValues),
  documentType: z.enum(documentTypeValues),
  sourceUrl: z.string().url(),
  fileHashSha256: z.string().length(64),
  contentType: z.string().nullable().default(null),
  contentLengthBytes: z.number().int().positive().nullable().default(null),
  retrievedAt: z.number().int().positive(),
  effectiveDate: z.string().nullable().default(null),
  publishedAt: z.string().nullable().default(null),
  usageStatus: z.enum(usageStatusValues).default("link_only"),
  parseStatus: z.enum(parseStatusValues).default("not_parsed"),
  extractedTextHash: z.string().length(64).nullable().default(null),
  createdAt: z.number().int().positive(),
});

export const insurancePremiumQuoteInsertSchema = z.object({
  id: z.string().min(1),
  productSourceId: z.string().min(1),
  carrierId: z.string().min(1),
  age: z.number().int().min(0).max(120).nullable().default(null),
  sex: z.enum(quoteSexValues).nullable().default(null),
  sourceSexCode: z.string().nullable().default(null),
  paymentCycle: z.string().nullable().default(null),
  paymentPeriodYears: z.number().int().positive().nullable().default(null),
  insurancePeriodYears: z.number().int().positive().nullable().default(null),
  coverageAmountKrw: z.number().int().positive().nullable().default(null),
  planName: z.string().nullable().default(null),
  renewalType: z.string().nullable().default(null),
  ridersJson: jsonStringSchema.nullable().default(null),
  premiumCurrency: z.enum(premiumCurrencyValues).default("KRW"),
  monthlyPremiumKrw: z.number().int().positive().nullable().default(null),
  premiumText: z.string().nullable().default(null),
  quoteSourceType: z.enum(quoteSourceTypeValues),
  quoteSourceUrl: z.string().url().nullable().default(null),
  quoteParamsJson: jsonStringSchema.nullable().default(null),
  quoteHashSha256: sha256HexSchema.nullable().default(null),
  retrievedAt: z.number().int().positive(),
  reviewStatus: z.enum(quoteReviewStatusValues).default("raw"),
  createdAt: z.number().int().positive(),
});

// ─── analysis_sessions ───────────────────────────────────────────────────────

export const analysisSessions = sqliteTable("analysis_sessions", {
  id: text("id").primaryKey(),
  walletAddress: text("wallet_address")
    .notNull()
    .references(() => userProfiles.walletAddress),
  fileHash: text("file_hash").notNull(),
  fileType: text("file_type", { enum: ["vcf", "pdf", "txt", "csv"] }).notNull(),
  status: text("status", {
    enum: [
      "pending",
      "uploading",
      "tee_processing",
      "zkp_generating",
      "completed",
      "purged",
      "failed",
      "timeout",
    ],
  })
    .notNull()
    .default("pending"),
  errorCode: text("error_code"),
  startedAt: integer("started_at", { mode: "timestamp" }).notNull(),
  teeEnteredAt: integer("tee_entered_at", { mode: "timestamp" }),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  purgedAt: integer("purged_at", { mode: "timestamp" }),
  attestationNonce: text("attestation_nonce"),
  attestationVerified: integer("attestation_verified", { mode: "boolean" }),
}, (table) => [
  index("analysis_sessions_wallet_idx").on(table.walletAddress),
]);

export const analysisSessionInsertSchema = z.object({
  id: z.string().uuid(),
  walletAddress: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9_\-\.]+\.(near|testnet)$|^[a-f0-9]{64}$/),
  fileHash: z.string().length(64, "SHA-256 해시는 64자 hex여야 합니다"),
  fileType: z.enum(["vcf", "pdf", "txt", "csv"]),
  status: z
    .enum([
      "pending",
      "uploading",
      "tee_processing",
      "zkp_generating",
      "completed",
      "purged",
      "failed",
      "timeout",
    ])
    .default("uploading"),
  startedAt: z.number().int().positive(),
});

// ─── analysis_results ────────────────────────────────────────────────────────

export const analysisResults = sqliteTable("analysis_results", {
  id: text("id").primaryKey(),
  sessionId: text("session_id")
    .notNull()
    .unique()
    .references(() => analysisSessions.id),
  walletAddress: text("wallet_address")
    .notNull()
    .references(() => userProfiles.walletAddress),
  riskProfile: text("risk_profile").notNull(),
  recommendedProductIds: text("recommended_product_ids").notNull(),
  zkpProofHash: text("zkp_proof_hash"),
  advisoryMessages: text("advisory_messages"),
  reasoning: text("reasoning"),
  coverageGapSummary: text("coverage_gap_summary"),
  priorityOrder: text("priority_order"),
  generatedAt: integer("generated_at", { mode: "timestamp" }).notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("analysis_results_wallet_idx").on(table.walletAddress),
]);

const riskLevelSchema = z.enum(["high", "moderate", "normal"]);

const categoryRiskSchema = z.object({
  level: riskLevelSchema,
  flags: z.array(z.string()),
});

export const riskProfileSchema = z.object({
  oncology: categoryRiskSchema,
  cardiovascular: categoryRiskSchema,
  metabolic: categoryRiskSchema,
  neurological: categoryRiskSchema,
});

// ─── recommendation_carts ────────────────────────────────────────────────────

export const recommendationCarts = sqliteTable("recommendation_carts", {
  id: text("id").primaryKey(),
  walletAddress: text("wallet_address")
    .notNull()
    .references(() => userProfiles.walletAddress),
  sessionId: text("session_id")
    .notNull()
    .references(() => analysisSessions.id),
  selectedProductIds: text("selected_product_ids").notNull(),
  totalMonthlyUsdc: real("total_monthly_usdc").notNull(),
  discountAppliedUsdc: real("discount_applied_usdc").notNull().default(0),
  status: text("status", {
    enum: ["active", "pending_checkout", "checked_out", "abandoned"],
  })
    .notNull()
    .default("active"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("carts_wallet_status_idx").on(table.walletAddress, table.status),
]);

// ─── transactions ─────────────────────────────────────────────────────────────

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  walletAddress: text("wallet_address")
    .notNull()
    .references(() => userProfiles.walletAddress),
  cartId: text("cart_id")
    .notNull()
    .unique()
    .references(() => recommendationCarts.id),
  txHash: text("tx_hash"),
  network: text("network", { enum: ["near_testnet", "near_mainnet", "ethereum_sepolia"] }).notNull(),
  amountUsdc: real("amount_usdc").notNull(),
  confidentialIntentsUsed: integer("confidential_intents_used").notNull().default(1),
  status: text("status", {
    enum: ["pending", "broadcasting", "confirmed", "failed", "reverted"],
  })
    .notNull()
    .default("pending"),
  failureReason: text("failure_reason"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  confirmedAt: integer("confirmed_at", { mode: "timestamp" }),
});

export const transactionInsertSchema = z.object({
  id: z.string().uuid(),
  walletAddress: z.string().min(2).max(64),
  cartId: z.string().uuid(),
  txHash: z.string().nullable().default(null),
  network: z.enum(["near_testnet", "near_mainnet", "ethereum_sepolia"]),
  amountUsdc: z.number().positive(),
  confidentialIntentsUsed: z.number().int().min(1).default(1),
  status: z.enum(["pending", "broadcasting", "confirmed", "failed", "reverted"]).default("pending"),
  failureReason: z.string().nullable().default(null),
  createdAt: z.number().int().positive(),
  confirmedAt: z.number().int().positive().nullable().default(null),
});

// ─── auth_nonces ──────────────────────────────────────────────────────────────
// Challenge-Response 서명 검증용 일회용 Nonce (5분 TTL)
// walletAddress는 user_profiles FK 없이 독립 저장 (프로필 미생성 상태에서도 발급 가능)

export const authNonces = sqliteTable("auth_nonces", {
  nonce: text("nonce").primaryKey(),          // 64-char hex (32 random bytes)
  walletAddress: text("wallet_address").notNull(),
  expiresAt: integer("expires_at").notNull(), // Unix timestamp (seconds)
});

export type AuthNonce = typeof authNonces.$inferSelect;

// Indexes are declared in each sqliteTable extraConfig block so Drizzle Kit can
// include them in migration snapshots.

// ─── Inferred types ──────────────────────────────────────────────────────────

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsuranceCarrier = typeof insuranceCarriers.$inferSelect;
export type InsuranceProductSource = typeof insuranceProductSources.$inferSelect;
export type InsuranceSourceDocument = typeof insuranceSourceDocuments.$inferSelect;
export type InsurancePremiumQuote = typeof insurancePremiumQuotes.$inferSelect;
export type InsuranceProduct = typeof insuranceProducts.$inferSelect;
export type AnalysisSession = typeof analysisSessions.$inferSelect;
export type AnalysisResult = typeof analysisResults.$inferSelect;
export type RecommendationCart = typeof recommendationCarts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type RiskProfile = z.infer<typeof riskProfileSchema>;
export type RiskLevel = z.infer<typeof riskLevelSchema>;
