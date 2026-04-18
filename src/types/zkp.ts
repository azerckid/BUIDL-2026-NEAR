export interface ZkpProof {
  proofBytes: string;
  publicInputs: { threshold: number; nonce?: string };
  verificationKey: string;
}
