// Phase 1: WalletSelector 실거래 트랜잭션
// - InjectedWallet (팝업): signAndSendTransaction → FinalExecutionOutcome 직접 반환
// - BrowserWallet (리다이렉트): callbackUrl로 복귀 → CheckoutClient useEffect 처리
//
// Phase 2 교체 대상:
//   receiverId → 실제 NEAR 보험 컨트랙트 주소
//   Transfer → FunctionCall: pay_premium({ zkp_proof_hash, product_ids })
//   Confidential Intents SDK (@defuse-protocol/intents-sdk) 연동

import type { WalletSelector } from "@near-wallet-selector/core";

// 데모 보험료 수신 계정 (항상 존재하는 testnet 계정)
// Phase 2에서 실제 보험사 컨트랙트로 교체
const DEMO_INSURANCE_TREASURY = "wrap.testnet";

// 0.001 NEAR (yoctoNEAR) — 데모용 심볼릭 보험료
const DEMO_AMOUNT_YNEAR = "1000000000000000000000";

/**
 * NEAR Testnet 실거래 트랜잭션 시작
 *
 * 반환값:
 * - { txHash } : InjectedWallet(팝업) — 서명 결과가 직접 반환됨
 * - null       : BrowserWallet(리다이렉트) — callbackUrl로 복귀 후 useEffect 처리
 */
export async function initiateNearTransaction(
  cartId: string,
  selector: WalletSelector
): Promise<{ txHash: string } | null> {
  const wallet = await selector.wallet();

  // near-wallet-selector v10 borsh 직렬화 포맷
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actions: any[] = [
    {
      transfer: { deposit: DEMO_AMOUNT_YNEAR },
    },
  ];

  const result = await wallet.signAndSendTransaction({
    receiverId: DEMO_INSURANCE_TREASURY,
    callbackUrl: `${window.location.origin}/checkout/${cartId}`,
    actions,
  });

  // InjectedWallet: FinalExecutionOutcome 직접 반환
  if (result && typeof result === "object" && "transaction" in result) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txHash = (result as any).transaction?.hash as string | undefined;
    return txHash ? { txHash } : null;
  }

  // BrowserWallet: 리다이렉트 후 null — useEffect에서 ?transactionHashes= 파라미터로 처리
  return null;
}
