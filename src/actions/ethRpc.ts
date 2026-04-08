"use server";

import { deriveEthAddress } from "@/lib/near/chain-signatures";

// ETH Sepolia RPC 호출 (Server Action — CORS 우회)
const SEPOLIA_RPC = "https://1rpc.io/sepolia";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function rpcCall(method: string, params: unknown[]): Promise<any> {
  const response = await fetch(SEPOLIA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = (await response.json()) as { result?: unknown; error?: unknown };
  if (json.error || json.result === undefined) {
    throw new Error("ETH RPC error: " + JSON.stringify(json.error ?? json));
  }
  return json.result;
}

/** ETH 파생 주소 조회 (NEAR RPC view call — 서버 측 실행) */
export async function deriveEthAddressAction(
  nearAccountId: string
): Promise<{ address: string } | { error: string }> {
  try {
    const address = await deriveEthAddress(nearAccountId);
    return { address };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/** 잔액 조회 (ETH 단위 문자열) */
export async function getEthBalanceAction(
  ethAddress: string
): Promise<{ balance: string } | { error: string }> {
  try {
    const hex = (await rpcCall("eth_getBalance", [ethAddress, "latest"])) as string;
    const eth = Number(BigInt(hex)) / 1e18;
    return { balance: eth.toFixed(6) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/** 트랜잭션 카운트 (nonce) */
export async function getTransactionCountAction(
  ethAddress: string
): Promise<{ nonce: number } | { error: string }> {
  try {
    const hex = (await rpcCall("eth_getTransactionCount", [ethAddress, "latest"])) as string;
    return { nonce: Number(BigInt(hex)) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/** 가스 수수료 데이터 */
export async function getFeeDataAction(): Promise<
  { maxFeePerGas: string; maxPriorityFeePerGas: string } | { error: string }
> {
  try {
    const baseFeeHex = (await rpcCall("eth_gasPrice", [])) as string;
    const baseFee = BigInt(baseFeeHex);
    // EIP-1559: maxFeePerGas = baseFee * 2, maxPriorityFeePerGas = 1.5 gwei
    const maxFeePerGas = (baseFee * BigInt(2)).toString();
    const maxPriorityFeePerGas = BigInt(1500000000).toString(); // 1.5 gwei
    return { maxFeePerGas, maxPriorityFeePerGas };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/** 서명된 트랜잭션 브로드캐스트 */
export async function broadcastRawTxAction(
  signedTxHex: string
): Promise<{ txHash: string } | { error: string }> {
  try {
    const hash = (await rpcCall("eth_sendRawTransaction", [signedTxHex])) as string;
    return { txHash: hash };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Unknown error" };
  }
}
