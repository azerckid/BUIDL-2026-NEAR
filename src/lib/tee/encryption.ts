// TEE 암호화 — ECIES (secp256k1) + AES-256-GCM
// 브라우저 전용 모듈: eciesjs (secp256k1 지원, SubtleCrypto 기반)
// TEE signing_public_key(64바이트 hex) → 65바이트 비압축 형태(04 prefix)로 변환 후 암호화

import { PublicKey, encrypt } from "eciesjs";

/**
 * attestation report의 signing_public_key(128자 hex)로 파일 버퍼를 암호화.
 * 반환값: base64 인코딩된 암호문 (서버 → TEE 전달용)
 */
export async function encryptForTee(
  fileBuffer: ArrayBuffer,
  teePublicKeyHex: string
): Promise<string> {
  if (teePublicKeyHex.length !== 128) {
    throw new Error(
      `TEE 공개키 형식 오류: 128자 hex 필요, 실제 ${teePublicKeyHex.length}자`
    );
  }

  // secp256k1 비압축 공개키: "04" + x(32B) + y(32B) = 65바이트
  const uncompressedHex = "04" + teePublicKeyHex;
  const pubKeyBytes = hexToBytes(uncompressedHex);

  const pubKey = PublicKey.fromHex(uncompressedHex);
  const plaintext = new Uint8Array(fileBuffer);
  const ciphertext = encrypt(pubKey.toBytes(), plaintext);

  return bytesToBase64(ciphertext);
}

/**
 * 암호화된 데이터가 올바른 포맷인지 기본 검증.
 * 실제 복호화 검증은 TEE 내부에서만 가능.
 */
export function validateEncryptedPayload(base64Payload: string): boolean {
  try {
    const bytes = base64ToBytes(base64Payload);
    // ECIES 최소 오버헤드: 33(압축 공개키) + 16(MAC) = 49바이트
    return bytes.length > 49;
  } catch {
    return false;
  }
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(normalized.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
