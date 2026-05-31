import { z } from "zod";

const quoteSexSchema = z.enum(["male", "female", "source_unknown"]);

const nullableUrlSchema = z
  .string()
  .url()
  .nullable();

export const conciergeProductContextSchema = z.object({
  selectedQuoteCondition: z
    .object({
      age: z.number().int().min(0).max(120),
      sex: z.enum(["male", "female", "source_unknown"]),
    })
    .nullable(),
  products: z
    .array(
      z.object({
        id: z.string().min(1).max(120),
        name: z.string().min(1).max(120),
        provider: z.string().min(1).max(80),
        coverageCategory: z.string().min(1).max(60),
        matchingStrategy: z.enum(["risk_target", "baseline", "manual"]),
        riskTargets: z.array(z.string().min(1).max(80)).max(12),
        representativePremium: z.object({
          monthlyKrw: z.number().int().positive().nullable(),
          monthlyUsdc: z.number().positive().max(10000),
          basis: z.string().max(500).nullable(),
        }),
        selectedQuote: z
          .object({
            age: z.number().int().min(0).max(120).nullable(),
            sex: quoteSexSchema.nullable(),
            monthlyKrw: z.number().int().positive().nullable(),
            premiumText: z.string().max(120).nullable(),
            sourceType: z.enum(["e_insmarket", "carrier_quote", "association", "manual"]),
            retrievedAtIso: z.string().datetime({ offset: true }).nullable(),
          })
          .nullable(),
        approvedQuoteSummary: z
          .array(
            z.object({
              age: z.number().int().min(0).max(120).nullable(),
              sex: quoteSexSchema.nullable(),
              monthlyKrw: z.number().int().positive().nullable(),
              premiumText: z.string().max(120).nullable(),
            })
          )
          .max(4),
        source: z.object({
          officialProductUrl: nullableUrlSchema,
          sourceUrl: nullableUrlSchema,
          documentType: z.string().max(80).nullable(),
          checkedAtIso: z.string().datetime({ offset: true }).nullable(),
        }),
        caveats: z.array(z.string().min(1).max(250)).max(4),
      })
    )
    .max(12),
});

export type ConciergeProductContext = z.infer<typeof conciergeProductContextSchema>;
