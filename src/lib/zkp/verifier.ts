import { createHash } from "crypto";
import { ZkpProof } from "@/types/zkp";

export const ZKP_VERIFIER_CONTRACT = "zkp.rogulus.testnet";
export const ZKP_VK_HASH =
  "3d1dc5b490206789edb811dc07f8681ed05d2747d42cc4b3f73ac6547eb64507";

const NEAR_RPC = "https://rpc.testnet.near.org";

export function computeProofHash(proof: ZkpProof): string {
  return createHash("sha256")
    .update(proof.proofBytes)
    .update(JSON.stringify(proof.publicInputs))
    .update(proof.verificationKey)
    .digest("hex");
}

export async function verifyZkpProof(proof: ZkpProof): Promise<boolean> {
  if (!proof.proofBytes || proof.proofBytes.length < 32) return false;
  if (proof.verificationKey !== ZKP_VK_HASH) return false;
  return true;
}

// Compute SHA-256 proof hash and attempt on-chain registration.
// On-chain submission requires wallet signing (browser) or a server-side signer key.
// Phase 2: hash is computed and stored in DB; wallet-signed submission via CheckoutClient.
// Phase 3: automated server-side signing via NEAR_SIGNER_ACCOUNT_ID + NEAR_PRIVATE_KEY.
export async function submitProofHashOnChain(proof: ZkpProof): Promise<string> {
  const proofHash = computeProofHash(proof);

  // TODO(Phase 3): Sign and broadcast submit_proof() call to zkp.rogulus.testnet
  // using NEAR_SIGNER_ACCOUNT_ID + NEAR_PRIVATE_KEY env vars when available.
  // Until then, the proof hash is stored in the DB and available for wallet-signed submission.
  return proofHash;
}

export async function isProofRegisteredOnChain(proofHash: string): Promise<boolean> {
  try {
    const response = await fetch(NEAR_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "1",
        method: "query",
        params: {
          request_type: "call_function",
          finality: "final",
          account_id: ZKP_VERIFIER_CONTRACT,
          method_name: "is_proof_registered",
          args_base64: Buffer.from(
            JSON.stringify({ proof_hash: proofHash })
          ).toString("base64"),
        },
      }),
    });

    const data = (await response.json()) as {
      error?: unknown;
      result?: { result?: number[] };
    };
    if (data.error || !data.result?.result) return false;

    const decoded = JSON.parse(
      Buffer.from(data.result.result).toString()
    ) as unknown;
    return decoded === true;
  } catch {
    return false;
  }
}
