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
 *
 * NEAR AI report_data 실측 구조 (64바이트 = 128 hex chars):
 *   [0..39]   signing_address hex (20바이트, 0x 없음)
 *   [40..63]  zero padding (12바이트)
 *   [64..127] nonce hex (32바이트)
 *
 * 즉 report_data = signing_address_zero_padded_to_32bytes || nonce
 * SHA-256 해시가 아닌 원문 연결이므로 마지막 64자가 nonce와 일치하는지 확인.
 */
export async function verifyNonceBinding(
  report: AttestationReport,
  nonce: string
): Promise<boolean> {
  const gw = report.gateway_attestation;

  if (!gw.report_data || gw.report_data.length < 64) return false;

  try {
    const reportData = gw.report_data.toLowerCase();
    const nonceHex = nonce.toLowerCase();

    // report_data 마지막 64자(32바이트)가 nonce와 일치해야 함
    const nonceInReport = reportData.slice(-64);
    return nonceInReport === nonceHex;
  } catch {
    return false;
  }
}

/** hex 문자열 → Uint8Array 변환 (0x 접두사 허용) */
function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (normalized.length % 2 !== 0) {
    throw new Error(`Invalid hex length: ${normalized.length}`);
  }
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}
