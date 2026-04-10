// Server-only: NEP-413 Challenge-Response 서명 검증
// https://github.com/near/NEPs/blob/master/neps/nep-0413.md

import * as nacl from "tweetnacl";
import { createHash } from "crypto";
import bs58 from "bs58";

const NEP413_TAG = 2147484061; // 2^31 + 413

function borshU32(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(value, 0);
  return buf;
}

function borshString(str: string): Buffer {
  const strBytes = Buffer.from(str, "utf8");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(strBytes.length, 0);
  return Buffer.concat([lenBuf, strBytes]);
}

function borshOptionString(str: string | null | undefined): Buffer {
  if (str == null) return Buffer.from([0]);
  return Buffer.concat([Buffer.from([1]), borshString(str)]);
}

export interface VerifySignatureParams {
  message: string;
  nonce: string;          // 64-char hex (32 bytes)
  recipient: string;
  callbackUrl: string | null;
  signature: string;      // base64
  publicKey: string;      // "ed25519:BASE58_ENCODED"
}

export function verifyNearSignature(params: VerifySignatureParams): boolean {
  try {
    const nonceBytes = Buffer.from(params.nonce, "hex");
    if (nonceBytes.length !== 32) return false;

    // NEP-413 Borsh payload 재구성
    const payload = Buffer.concat([
      borshU32(NEP413_TAG),
      borshString(params.message),
      nonceBytes,
      borshString(params.recipient),
      borshOptionString(params.callbackUrl),
    ]);

    // 서명 대상: SHA-256(Borsh payload)
    const hash = createHash("sha256").update(payload).digest();

    // publicKey 파싱: "ed25519:BASE58..."
    const [scheme, keyBase58] = params.publicKey.split(":");
    if (scheme !== "ed25519" || !keyBase58) return false;

    const publicKeyBytes = bs58.decode(keyBase58);
    const signatureBytes = Buffer.from(params.signature, "base64");

    return nacl.sign.detached.verify(
      new Uint8Array(hash),
      new Uint8Array(signatureBytes),
      new Uint8Array(publicKeyBytes)
    );
  } catch {
    return false;
  }
}
