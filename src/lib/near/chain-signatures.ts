// Phase 1: WalletSelector 실거래 트랜잭션
// BrowserWallet(MyNearWallet)은 서명 시 외부 페이지로 리다이렉트 →
// callbackUrl(?transactionHashes=HASH)로 복귀 → CheckoutClient에서 확정 처리
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
 * NEAR Testnet 실거래 트랜잭션 시작
 *
 * BrowserWallet은 이 함수 호출 시 MyNearWallet 페이지로 리다이렉트.
 * 서명 완료 후 /checkout/[cartId]?transactionHashes=REAL_HASH 로 복귀.
 * 복귀 후 CheckoutClient의 useEffect가 confirmCheckout을 호출하여 완료 처리.
 */
export async function initiateNearTransaction(
  cartId: string,
  selector: WalletSelector
): Promise<void> {
  const wallet = await selector.wallet();

  // near-wallet-selector v10 Action 타입 호환을 위해 명시적 캐스팅
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actions: any[] = [
    {
      type: "Transfer",
      params: { deposit: DEMO_AMOUNT_YNEAR },
    },
  ];

  await wallet.signAndSendTransaction({
    receiverId: DEMO_INSURANCE_TREASURY,
    callbackUrl: `${window.location.origin}/checkout/${cartId}`,
    actions,
  });
}
