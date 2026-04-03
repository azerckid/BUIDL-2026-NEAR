import type { WalletSelector } from "@near-wallet-selector/core";
import { setupWalletSelector } from "@near-wallet-selector/core";
import { setupMyNearWallet } from "@near-wallet-selector/my-near-wallet";

export type { WalletSelector };

export type WalletNetwork = "testnet" | "mainnet";

const NEAR_NETWORK: WalletNetwork = "testnet";
// Phase 0 placeholder — Phase 2에서 실제 컨트랙트 주소로 교체
const CONTRACT_ID = "wrap.testnet";

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
