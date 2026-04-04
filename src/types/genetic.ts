import { z } from "zod";

export const riskLevelSchema = z.enum(["high", "moderate", "normal"]);
export type RiskLevel = z.infer<typeof riskLevelSchema>;

export const geneticRiskFlagSchema = z.enum([
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
export type GeneticRiskFlag = z.infer<typeof geneticRiskFlagSchema>;

export const dtcProviderSchema = z.enum(["gentok", "genestyle", "banksalad", "unknown"]);
export type DtcProvider = z.infer<typeof dtcProviderSchema>;

const categoryProfileSchema = z.object({
  overallLevel: riskLevelSchema,
  detectedFlags: z.array(geneticRiskFlagSchema),
});

export const normalizedGeneticProfileSchema = z.object({
  oncology: categoryProfileSchema,
  cardiovascular: categoryProfileSchema,
  metabolic: categoryProfileSchema,
  neurological: categoryProfileSchema,
  parsedFrom: dtcProviderSchema,
  fileType: z.enum(["vcf", "csv", "pdf", "txt"]),
});

export type NormalizedGeneticProfile = z.infer<typeof normalizedGeneticProfileSchema>;
