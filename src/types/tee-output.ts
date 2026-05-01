import { z } from "zod";

const riskCategorySchema = z.object({
  level: z.enum(["high", "moderate", "normal"]),
  flags: z.array(z.string()),
});

export const teeAnalysisOutputSchema = z.object({
  riskProfile: z.object({
    oncology: riskCategorySchema,
    cardiovascular: riskCategorySchema,
    metabolic: riskCategorySchema,
    neurological: riskCategorySchema,
  }),
  priorityOrder: z
    .array(z.enum(["oncology", "cardiovascular", "metabolic", "neurological"]))
    .min(4)
    .max(4),
  advisoryMessages: z.object({
    oncology: z.string().min(1).max(300),
    cardiovascular: z.string().min(1).max(300),
    metabolic: z.string().min(1).max(300),
    neurological: z.string().min(1).max(300),
  }),
  reasoning: z.string().min(1).max(500),
  coverageGapSummary: z.string().min(1).max(150),
  teeSessionId: z.string().uuid(),
  purgeConfirmed: z.literal(true),
  analysisModel: z.string(),
  // ZKP commitment — TEE 내부에서 생성 (HMAC-SHA256 커밋먼트 표현)
  zkpPassed: z.boolean(),
  zkpNonce: z.string().length(32),
  zkpProofHash: z.string().length(64),
});

export type TeeAnalysisOutput = z.infer<typeof teeAnalysisOutputSchema>;
