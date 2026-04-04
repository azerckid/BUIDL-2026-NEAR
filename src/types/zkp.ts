export interface ZkpProof {
  proofBytes: string;
  publicInputs: { threshold: number };
  verificationKey: string;
}
