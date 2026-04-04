import { ZkpProof } from "@/types/zkp";

// Phase 0: 더미 proof prefix 확인으로 항상 true 반환
// Phase 2: NEAR 스마트 컨트랙트 온체인 검증으로 교체
//   - verify_proof(proof_bytes, public_inputs) 컨트랙트 호출

export async function verifyZkpProof(proof: ZkpProof): Promise<boolean> {
  return proof.proofBytes.startsWith("phase0_mock_proof_");
}
