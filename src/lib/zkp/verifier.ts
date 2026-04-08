import { ZkpProof } from "@/types/zkp";

// ZKP Verifier Contract (NEAR Testnet)
// Deployed at: zkp.rogulus.testnet
// vk_hash: 3d1dc5b490206789edb811dc07f8681ed05d2747d42cc4b3f73ac6547eb64507
export const ZKP_VERIFIER_CONTRACT = "zkp.rogulus.testnet";
export const ZKP_VK_HASH = "3d1dc5b490206789edb811dc07f8681ed05d2747d42cc4b3f73ac6547eb64507";

// ─── [Phase 2 교체 지점] verifyZkpProof ──────────────────────────────────────
// 현재(Phase 0): proof prefix 문자열 검사 — 로컬 처리, RPC 없음
// Phase 2 교체 내용:
//   import { Noir } from "@noir-lang/noir_js";
//   import { BarretenbergBackend } from "@noir-lang/backend_barretenberg";
//   import circuit from "@/../circuits/insurance_eligibility/target/insurance_eligibility.json";
//
//   const backend = new BarretenbergBackend(circuit);
//   const noir = new Noir(circuit, backend);
//   return await noir.verifyProof({ proof: proof.proofBytes, publicInputs: proof.publicInputs });
//
// 주의: @noir-lang/noir_js WASM 번들 ~50MB → Vercel 함수 크기 제한 확인 필요
//       클라이언트 사이드 검증 또는 별도 Vercel Edge Function으로 분리 검토
// ─────────────────────────────────────────────────────────────────────────────
export async function verifyZkpProof(proof: ZkpProof): Promise<boolean> {
  return proof.proofBytes.startsWith("phase0_mock_proof_");
}

// ─── [Phase 2 교체 지점] isProofRegisteredOnChain ────────────────────────────
// 현재(Phase 0/1): zkp.rogulus.testnet NEAR Testnet에 proof hash 등록 여부 조회
// Phase 2 교체 내용:
//   - 온체인 수학적 검증으로 전환: zkp.rogulus.testnet에 verify_proof_onchain 함수 추가
//   - proof bytes + public inputs를 컨트랙트에 전달해 WASM 내 ultraplonk pairing check 실행
//   - NEAR 런타임 제약(gas 300Tgas, WASM 4MB) 내 실행 가능 여부 Aztec 팀 기술 지원 필요
//   - 재개 조건: barretenberg-sys Rust FFI 바인딩 또는 NEAR 공식 ZKP verifier 출시
// ─────────────────────────────────────────────────────────────────────────────
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
