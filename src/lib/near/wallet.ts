import type { WalletSelector } from "@near-wallet-selector/core";
import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";

export type { WalletSelector };

export type WalletNetwork = "testnet" | "mainnet";

// NEP-413 서명 검증에 사용되는 앱 식별자 (서버-클라이언트 공유 상수)
export const AUTH_RECIPIENT = "mydna-tee.testnet";
export const AUTH_MESSAGE = "Authorize MyDNA Analysis";

const NEAR_NETWORK: WalletNetwork = "testnet";
// Phase 2 컨트랙트 주소: "wrap.testnet" → 실제 컨트랙트로 교체 예정

let selectorInstance: WalletSelector | null = null;

export async function getWalletSelector(): Promise<WalletSelector> {
  if (selectorInstance) return selectorInstance;

  selectorInstance = await setupWalletSelector({
    network: NEAR_NETWORK,
    modules: [setupMyNearWallet()],
  });

  return selectorInstance;
}

export function truncateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
