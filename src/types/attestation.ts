import { z } from "zod";

// ─── Raw API response ─────────────────────────────────────────────────────────

export const attestationReportSchema = z.object({
  intel_quote: z.string().min(1),
  nvidia_tee: z
    .object({
      attestation: z.string(),
    })
    .optional(),
  signing_key: z.string().min(1),
  report_data: z.string().min(1),
  tls_fingerprint: z.string().optional(),
  manifest_hash: z.string().optional(),
});

export type AttestationReport = z.infer<typeof attestationReportSchema>;

// ─── Verification result ──────────────────────────────────────────────────────

export type AttestationVerificationResult = {
  verified: boolean;
  intel_quote: string;
  signing_key: string;
  nonce: string;
  fetchedAt: string; // ISO 8601
  model: string;
  steps: {
    endpoint_reachable: boolean;
    report_data_bound: boolean;
    quote_structure_valid: boolean;
  };
};
