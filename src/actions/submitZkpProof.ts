"use server";

// Submit a ZKP proof hash to the on-chain registry (zkp.rogulus.testnet).
// Called after payment is confirmed, so the proof is permanently recorded on NEAR Testnet.
//
// Phase 0: uses near-api-js JsonRpcProvider view call to verify the contract exists.
//          Actual write (submit_proof) requires a signed transaction from the user's wallet —
//          this is triggered client-side via WalletSelector in Phase 2.
// Phase 2: move submit_proof call to client (CheckoutClient) using WalletSelector FunctionCall action.

import { z } from "zod";

export const ZKP_VERIFIER_CONTRACT = "zkp.rogulus.testnet";

const inputSchema = z.object({
  proofHash: z.string().min(1),
  cartId: z.string().uuid(),
});

interface SubmitZkpProofResult {
  success: boolean;
  alreadyRegistered?: boolean;
  error?: string;
}

// Read-only view: check if proof is already registered (no signing needed).
export async function checkProofRegistration(
  proofHash: string
): Promise<boolean> {
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
          args_base64: Buffer.from(
            JSON.stringify({ proof_hash: proofHash })
          ).toString("base64"),
        },
      }),
      cache: "no-store",
    });

    const data = await response.json();
    if (data.error || !data.result?.result) return false;

    const decoded = JSON.parse(
      Buffer.from(data.result.result).toString()
    );
    return decoded === true;
  } catch {
    return false;
  }
}

// Validate input and return the proof submission metadata.
// Actual on-chain write happens client-side (WalletSelector FunctionCall).
// This server action records intent and validates the proof hash format.
export async function prepareZkpProofSubmission(
  input: unknown
): Promise<SubmitZkpProofResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "입력값 오류",
    };
  }

  const { proofHash } = parsed.data;

  const alreadyRegistered = await checkProofRegistration(proofHash);
  if (alreadyRegistered) {
    return { success: true, alreadyRegistered: true };
  }

  return { success: true, alreadyRegistered: false };
}
