// Phase 0: Mock 서명 — Phase 2에서 @defuse-protocol/intents-sdk + v1.signer MPC로 교체
// 이 파일은 클라이언트 사이드에서 호출된다 ("use server" 없음)

export interface SignIntentParams {
  walletAddress: string;
  amountUsdc: number;
  zkpProofHash: string | null;
  productIds: string[];
  txId: string;
}

export interface SignIntentResult {
  txHash: string;
  network: "near_testnet";
}

/**
 * Confidential Intent 서명 및 브로드캐스트
 *
 * Phase 0: Mock 구현 — NEAR base58 44자 txHash 반환
 * Phase 2 교체 대상:
 *   1. @defuse-protocol/intents-sdk 로 Confidential Intent 구성
 *   2. WalletSelector.signAndSendTransaction 으로 브라우저 지갑 서명
 *   3. v1.signer MPC 컨트랙트 호출로 Chain Signatures 적용
 */
export async function signAndBroadcastIntent(
  params: SignIntentParams
): Promise<SignIntentResult> {
  // Phase 2 교체 지점 ──────────────────────────────────────────────────
  // const { intents } = await import("@defuse-protocol/intents-sdk");
  // const wallet = await getWalletSelector().then((s) => s.wallet());
  // const outcome = await wallet.signAndSendTransaction({ ... });
  // return { txHash: outcome.transaction.hash, network: "near_testnet" };
  // ────────────────────────────────────────────────────────────────────

  // Phase 0 Mock: 2초 지연 후 NEAR base58 44자 txHash 반환
  void params;
  await new Promise((resolve) => setTimeout(resolve, 2000));
  return { txHash: generateMockTxHash(), network: "near_testnet" };
}

// NEAR tx hash 형식: base58 알파벳 44자
function generateMockTxHash(): string {
  const chars = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  return Array.from({ length: 44 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}
