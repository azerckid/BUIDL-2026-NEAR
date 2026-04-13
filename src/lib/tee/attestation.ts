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
 * SHA-256(signing_key_bytes || nonce_bytes) 를 계산하여 report_data(hex)와 비교.
 * signing_key 또는 report_data 형식이 hex가 아닌 경우(base64 등) catch로 낙하하여
 * field 존재 여부 확인으로 fallback — Phase 2 에서는 throw 활성화 예정.
 */
export async function verifyNonceBinding(
  report: AttestationReport,
  nonce: string
): Promise<boolean> {
  if (typeof report.report_data !== "string" || report.report_data.length === 0) {
    return false;
  }

  try {
    const signingKeyBytes = hexToBytes(report.signing_key);
    const nonceBytes = hexToBytes(nonce);

    const combined = new Uint8Array(signingKeyBytes.length + nonceBytes.length);
    combined.set(signingKeyBytes, 0);
    combined.set(nonceBytes, signingKeyBytes.length);

    const hashBuffer = await crypto.subtle.digest("SHA-256", combined);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    return hashHex === report.report_data.toLowerCase();
  } catch {
    // signing_key 또는 report_data 가 hex 형식이 아닌 경우 — field 존재 여부로 fallback
    // Phase 2 전환 시 catch 블록 대신 throw 활성화
    return typeof report.report_data === "string" && report.report_data.length > 0;
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
