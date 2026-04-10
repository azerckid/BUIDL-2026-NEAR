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

// ─── insurance_products ───────────────────────────────────────────────────────

export const insuranceProducts = sqliteTable("insurance_products", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  provider: text("provider").notNull(),
  chainNetwork: text("chain_network", { enum: ["near", "ethereum", "solana"] }).notNull(),
  contractAddress: text("contract_address"),
  monthlyPremiumUsdc: real("monthly_premium_usdc").notNull(),
  coverageCategory: text("coverage_category", {
    enum: ["oncology", "cardiovascular", "metabolic", "neurological"],
  }).notNull(),
  riskTargets: text("risk_targets").notNull(),
  discountEligible: integer("discount_eligible").notNull().default(0),
  originalPremiumUsdc: real("original_premium_usdc"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

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
  name: z.string().min(2).max(100),
  provider: z.string().min(1).max(50),
  chainNetwork: z.enum(["near", "ethereum", "solana"]),
  contractAddress: z.string().nullable().default(null),
  monthlyPremiumUsdc: z.number().positive().max(10000),
  coverageCategory: z.enum(["oncology", "cardiovascular", "metabolic", "neurological"]),
  riskTargets: z.array(riskTargetEnum).min(1),
  discountEligible: z.boolean().default(false),
  originalPremiumUsdc: z.number().positive().nullable().default(null),
  isActive: z.boolean().default(true),
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
});

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
});

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
});

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

// ─── Indexes ─────────────────────────────────────────────────────────────────

export const analysisSessionsIdx = index("analysis_sessions_wallet_idx").on(
  analysisSessions.walletAddress
);

export const analysisResultsWalletIdx = index("analysis_results_wallet_idx").on(
  analysisResults.walletAddress
);

export const cartsWalletStatusIdx = index("carts_wallet_status_idx").on(
  recommendationCarts.walletAddress,
  recommendationCarts.status
);

export const productsActiveCategoryIdx = index("products_active_category_idx").on(
  insuranceProducts.isActive,
  insuranceProducts.coverageCategory
);

// ─── Inferred types ──────────────────────────────────────────────────────────

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsuranceProduct = typeof insuranceProducts.$inferSelect;
export type AnalysisSession = typeof analysisSessions.$inferSelect;
export type AnalysisResult = typeof analysisResults.$inferSelect;
export type RecommendationCart = typeof recommendationCarts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type RiskProfile = z.infer<typeof riskProfileSchema>;
export type RiskLevel = z.infer<typeof riskLevelSchema>;
