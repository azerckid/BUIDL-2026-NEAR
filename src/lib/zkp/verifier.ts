import { ZkpProof } from "@/types/zkp";

// ZKP Verifier Contract (NEAR Testnet)
// Deployed at: zkp.rogulus.testnet
// vk_hash: 3d1dc5b490206789edb811dc07f8681ed05d2747d42cc4b3f73ac6547eb64507
export const ZKP_VERIFIER_CONTRACT = "zkp.rogulus.testnet";
export const ZKP_VK_HASH = "3d1dc5b490206789edb811dc07f8681ed05d2747d42cc4b3f73ac6547eb64507";

// Phase 0: dummy proof prefix check (local, no RPC call)
// Phase 2: replace with @noir-lang/noir_js + BarretenbergBackend client-side verification
export async function verifyZkpProof(proof: ZkpProof): Promise<boolean> {
  return proof.proofBytes.startsWith("phase0_mock_proof_");
}

// Query the on-chain registry to check if a proof_hash was submitted.
// Uses NEAR RPC view call (no gas, no signing required).
export async function isProofRegisteredOnChain(proofHash: string): Promise<boolean> {
  try {
    const response = await fetch("https://rpc.testnet.near.org", {
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
          args_base64: Buffer.from(JSON.stringify({ proof_hash: proofHash })).toString("base64"),
        },
      }),
    });

    const data = await response.json();
    if (data.error || !data.result?.result) return false;

    const decoded = JSON.parse(Buffer.from(data.result.result).toString());
    return decoded === true;
  } catch {
    return false;
  }
}
