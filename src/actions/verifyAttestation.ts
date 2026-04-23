"use server";

import { DateTime } from "luxon";
import {
  fetchAttestationReport,
  generateNonce,
  verifyNonceBinding,
} from "@/lib/tee/attestation";
import { AttestationVerificationResult } from "@/types/attestation";

const DEFAULT_MODEL =
  process.env.IRONCLAW_MODEL ?? "Qwen/Qwen3-30B-A3B-Instruct-2507";

export async function verifyAttestation(): Promise<AttestationVerificationResult> {
  const nonce = generateNonce();
  const fetchedAt = DateTime.now().toISO();

  const report = await fetchAttestationReport({
    model: DEFAULT_MODEL,
    nonce,
    signingAlgo: "ecdsa",
    includeTlsFingerprint: true,
  });

  const gw = report.gateway_attestation;
  const modelAttestation = report.model_attestations[0];

  const nonceOk = await verifyNonceBinding(report, nonce);
  const quoteOk = gw.intel_quote.length > 0;

  return {
    verified: nonceOk && quoteOk,
    intel_quote: gw.intel_quote,
    signing_public_key: modelAttestation.signing_public_key,
    nonce,
    fetchedAt,
    model: DEFAULT_MODEL,
    steps: {
      endpoint_reachable: true,
      report_data_bound: nonceOk,
      quote_structure_valid: quoteOk,
    },
  };
}
