import { AttestationReport, attestationReportSchema } from "@/types/attestation";

const ATTESTATION_BASE_URL = "https://cloud-api.near.ai";

/**
 * 32 bytes 랜덤 nonce를 64자 hex 문자열로 생성.
 * Server-side only (Node.js crypto).
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * NEAR AI Cloud TEE Attestation 조회.
 * API 키 불필요 — 공개 엔드포인트.
 * 참고: https://github.com/nearai/nearai-cloud-verifier
 */
export async function fetchAttestationReport(params: {
  model: string;
  nonce: string;
  signingAlgo?: "ecdsa" | "ed25519";
  includeTlsFingerprint?: boolean;
}): Promise<AttestationReport> {
  const url = new URL("/v1/attestation/report", ATTESTATION_BASE_URL);
  url.searchParams.set("model", params.model);
  url.searchParams.set("nonce", params.nonce);
  url.searchParams.set("signing_algo", params.signingAlgo ?? "ecdsa");
  if (params.includeTlsFingerprint) {
    url.searchParams.set("include_tls_fingerprint", "true");
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      `Attestation 엔드포인트 오류: ${response.status} ${response.statusText}`
    );
  }

  const raw: unknown = await response.json();
  return attestationReportSchema.parse(raw);
}

/**
 * nonce 바인딩 검증.
 * Phase 0: report_data 필드 존재 여부 확인.
 * Phase 2: SHA256(signing_key || nonce) 해시 비교로 교체.
 */
export function verifyNonceBinding(report: AttestationReport): boolean {
  return typeof report.report_data === "string" && report.report_data.length > 0;
}
