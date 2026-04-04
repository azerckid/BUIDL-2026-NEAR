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
  // .min(4).max(4) — Zod v4 호환 (.length() 미사용)
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
});

export type TeeAnalysisOutput = z.infer<typeof teeAnalysisOutputSchema>;
