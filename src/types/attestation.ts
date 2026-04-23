import { z } from "zod";

// ─── Raw API response (실측 기준: 2026-04-23) ────────────────────────────────
// GET /v1/attestation/report 실제 응답 구조
// gateway_attestation + model_attestations 중첩 구조

const gatewayAttestationSchema = z.object({
  signing_address: z.string().min(1),
  signing_algo: z.string(),
  intel_quote: z.string().min(1),
  report_data: z.string().min(1),
  request_nonce: z.string(),
  info: z.record(z.string(), z.unknown()).optional(),
  vpc: z.record(z.string(), z.unknown()).optional(),
  event_log: z.unknown().optional(),
});

const modelAttestationSchema = z.object({
  model_name: z.string(),
  signing_address: z.string().min(1),
  signing_algo: z.string(),
  // secp256k1 비압축 공개키 — 64바이트 hex (0x04 prefix 없음)
  // ECIES 사용 시 앞에 "04" 추가 필요
  signing_public_key: z.string().min(128).max(128),
  request_nonce: z.string(),
  intel_quote: z.string().optional(),
  info: z.record(z.string(), z.unknown()).optional(),
  event_log: z.unknown().optional(),
  nvidia_payload: z.unknown().optional(),
  ohttp_key_config: z.string().optional(),
  compose_manager_attestation: z.unknown().optional(),
});

export const attestationReportSchema = z.object({
  gateway_attestation: gatewayAttestationSchema,
  model_attestations: z.array(modelAttestationSchema).min(1),
});

export type AttestationReport = z.infer<typeof attestationReportSchema>;
export type ModelAttestation = z.infer<typeof modelAttestationSchema>;

// ─── Verification result ──────────────────────────────────────────────────────

export type AttestationVerificationResult = {
  verified: boolean;
  intel_quote: string;
  // secp256k1 공개키 hex (128자, 0x04 없음) — ECIES 암호화에 사용
  signing_public_key: string;
  nonce: string;
  fetchedAt: string; // ISO 8601
  model: string;
  steps: {
    endpoint_reachable: boolean;
    report_data_bound: boolean;
    quote_structure_valid: boolean;
  };
};
