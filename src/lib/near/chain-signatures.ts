// Phase 1: WalletSelector 실거래 트랜잭션 (NEAR Testnet)
// Phase 2: v1.signer MPC Chain Signatures (ETH Sepolia)
//
// Phase 3 교체 대상:
//   NEAR: wrap.testnet → 실제 보험 컨트랙트
//   ETH: Sepolia → Mainnet
//   Confidential Intents SDK 연동 (near-api-js v7 충돌 해소 후)

import type { WalletSelector } from "@near-wallet-selector/core";
import { ethers } from "ethers";
import bs58 from "bs58";

// ─── 상수 ────────────────────────────────────────────────────────────────────

// NEAR Testnet — 데모 보험료 수신 계정 (항상 존재)
const DEMO_INSURANCE_TREASURY = "wrap.testnet";
// 0.001 NEAR (yoctoNEAR) — 데모용 심볼릭 보험료
const DEMO_AMOUNT_YNEAR = "1000000000000000000000";

// MPC 컨트랙트
const MPC_CONTRACT_TESTNET = "v1.signer-prod.testnet";
// const MPC_CONTRACT_MAINNET = "v1.signer.near";

// ETH Sepolia RPC (1rpc.io — 무료, CORS *, 브라우저 호환)
const SEPOLIA_RPC = "https://1rpc.io/sepolia";

// 보험 결제 전용 파생 경로
const INSURANCE_DERIVATION_PATH = "insurance,1";

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export type ChainNetwork = "near" | "eth";

// ─── Phase 1: NEAR Testnet 실거래 ────────────────────────────────────────────

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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const actions: any[] = [
    { transfer: { deposit: DEMO_AMOUNT_YNEAR } },
  ];

  const result = await wallet.signAndSendTransaction({
    receiverId: DEMO_INSURANCE_TREASURY,
    callbackUrl: `${window.location.origin}/checkout/${cartId}`,
    actions,
  });

  if (result && typeof result === "object" && "transaction" in result) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const txHash = (result as any).transaction?.hash as string | undefined;
    return txHash ? { txHash } : null;
  }

  return null;
}

// ─── Phase 2: MPC Chain Signatures (ETH) ────────────────────────────────────

/**
 * NEAR 계정에서 ETH 파생 주소 계산 (view call — 가스 비용 없음)
 *
 * rogulus.testnet + "insurance,1" → 항상 동일한 ETH 주소 결정론적 파생
 * 해당 ETH 주소의 개인키는 존재하지 않음 — MPC 노드만 서명 가능
 */
export async function deriveEthAddress(
  nearAccountId: string,
  derivationPath: string = INSURANCE_DERIVATION_PATH
): Promise<string> {
  // near-api-js v7에서 connect/keyStores 제거됨 → NEAR RPC 직접 호출 (view call)
  const args = Buffer.from(
    JSON.stringify({ path: derivationPath, predecessor: nearAccountId })
  ).toString("base64");

  const response = await fetch("https://rpc.testnet.near.org", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "dontcare",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: MPC_CONTRACT_TESTNET,
        method_name: "derived_public_key",
        args_base64: args,
      },
    }),
  });

  const json = await response.json() as { result?: { result?: number[] }; error?: unknown };
  if (!json.result?.result) {
    throw new Error("MPC view call failed: " + JSON.stringify(json.error ?? json));
  }

  const resultStr = Buffer.from(json.result.result).toString("utf-8");
  // MPC 컨트랙트 반환 형식: "secp256k1:<base58-encoded-64-bytes>"
  const keyStr = JSON.parse(resultStr) as string;

  return secp256k1KeyToEthAddress(keyStr);
}

/**
 * v1.signer MPC 컨트랙트에 서명 요청
 * NEAR 지갑 팝업 → 사용자 서명 → MPC 노드 분산 서명
 *
 * @param wallet    WalletSelector wallet 인스턴스
 * @param payload   32바이트 해시 (ETH 트랜잭션 해시)
 * @param derivationPath 파생 경로 (기본값: "insurance,1")
 */
export async function requestMpcSignature(
  wallet: Awaited<ReturnType<WalletSelector["wallet"]>>,
  payload: Uint8Array,
  derivationPath: string = INSURANCE_DERIVATION_PATH
): Promise<{ bigR: string; s: string; recoveryId?: number }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (wallet as any).signAndSendTransaction({
    receiverId: MPC_CONTRACT_TESTNET,
    actions: [
      {
        functionCall: {
          methodName: "sign",
          args: new TextEncoder().encode(JSON.stringify({
            request: {
              payload: Array.from(payload),
              path: derivationPath,
              key_version: 0,
            },
          })),
          gas: "250000000000000", // 250 Tgas
          deposit: "1",           // 1 yoctoNEAR
        },
      },
    ],
  });

  return extractMpcSignature(result);
}

/**
 * ETH Sepolia 트랜잭션 브로드캐스트
 *
 * MPC 서명({ bigR, s }) + 미서명 ETH 트랜잭션 → 완성된 ETH 트랜잭션 브로드캐스트
 */
export async function broadcastEthTransaction(
  mpcSignature: { bigR: string; s: string; recoveryId?: number },
  unsignedTx: ethers.TransactionRequest,
  fromAddress: string
): Promise<string> {
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);

  // MPC 서명 → ethers v6 Signature 복원
  const signature = reconstructEthSignature(mpcSignature, unsignedTx, fromAddress);

  const signedTx = ethers.Transaction.from({
    ...(unsignedTx as ethers.TransactionLike<string>),
    signature,
  });

  const broadcastResult = await provider.broadcastTransaction(signedTx.serialized);
  return broadcastResult.hash;
}

/**
 * ETH Sepolia에서 파생 주소의 잔액 조회 (ETH 단위)
 * ethers Provider 대신 fetch 직접 호출 — 네트워크 자동 감지 없이 단일 요청으로 완료
 */
export async function getEthBalance(ethAddress: string): Promise<string> {
  const response = await fetch(SEPOLIA_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [ethAddress, "latest"],
    }),
  });
  const json = await response.json() as { result?: string; error?: unknown };
  if (!json.result) {
    throw new Error("ETH 잔액 조회 실패: " + JSON.stringify(json.error ?? json));
  }
  return ethers.formatEther(BigInt(json.result));
}

// ─── 유틸 함수 ───────────────────────────────────────────────────────────────

/**
 * MPC 컨트랙트 반환 공개키 → ETH 주소 변환
 *
 * v1.signer-prod.testnet derived_public_key 반환 형식:
 *   "secp256k1:<base58-encoded-64-bytes>"  (X||Y 좌표, 04 prefix 없음)
 *
 * hex 0x 형식도 지원 (레거시)
 */
function secp256k1KeyToEthAddress(keyStr: string): string {
  if (keyStr.startsWith("secp256k1:")) {
    const b58 = keyStr.slice("secp256k1:".length);
    const bytes = bs58.decode(b58); // 64바이트 (X||Y)
    const hex = "0x" + Buffer.from(bytes).toString("hex");
    return ethers.computeAddress(hex);
  }
  // hex 형식 폴백
  const hex = keyStr.startsWith("0x") ? keyStr : `0x${keyStr}`;
  return ethers.computeAddress(hex);
}

/**
 * @deprecated secp256k1KeyToEthAddress 사용
 * compressed secp256k1 공개키 → ETH 주소 변환 (레거시)
 */
function compressedPublicKeyToEthAddress(compressedHex: string): string {
  return secp256k1KeyToEthAddress(compressedHex);
}

/**
 * MPC FunctionCall 결과에서 { bigR, s, recoveryId } 추출
 *
 * v1.signer-prod.testnet 신규 응답 형식:
 *   { big_r: { affine_point: "03..." }, s: { scalar: "..." }, recovery_id: 0|1 }
 * 구형 폴백:
 *   { big_r: "hexstring", s: "hexstring" }
 */
function extractMpcSignature(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result: any
): { bigR: string; s: string; recoveryId?: number } {
  // FinalExecutionOutcome → receipts_outcome → 마지막 SuccessValue 파싱
  try {
    const outcomes = result?.receipts_outcome ?? [];
    for (const outcome of [...outcomes].reverse()) {
      const status = outcome?.outcome?.status;
      if (status?.SuccessValue) {
        const decoded = Buffer.from(status.SuccessValue, "base64").toString("utf-8");
        const parsed = JSON.parse(decoded);

        // 신규 형식: big_r.affine_point, s.scalar, recovery_id
        if (parsed?.big_r?.affine_point && parsed?.s?.scalar) {
          // affine_point는 압축 공개키 hex (02/03 prefix + 32바이트 x좌표)
          // ECDSA r 값 = x좌표 (prefix 2자리 제거)
          const bigR = (parsed.big_r.affine_point as string).slice(2);
          const s = parsed.s.scalar as string;
          const recoveryId = typeof parsed.recovery_id === "number" ? parsed.recovery_id : undefined;
          return { bigR, s, recoveryId };
        }

        // 구형 형식: big_r, s 모두 문자열
        if (typeof parsed?.big_r === "string" && typeof parsed?.s === "string") {
          return { bigR: parsed.big_r, s: parsed.s };
        }
      }
    }
  } catch {
    // fall through
  }
  throw new Error("MPC 서명 결과를 파싱할 수 없습니다");
}

/**
 * MPC { bigR, s, recoveryId } → ethers v6 Signature 복원
 * recovery_id가 있으면 직접 사용, 없으면 0/1 순차 시도
 */
export function reconstructEthSignature(
  { bigR, s, recoveryId }: { bigR: string; s: string; recoveryId?: number },
  unsignedTx: ethers.TransactionRequest,
  fromAddress: string
): ethers.Signature {
  const txHash = ethers.keccak256(
    ethers.Transaction.from(unsignedTx as ethers.TransactionLike<string>).unsignedSerialized
  );

  const vCandidates: number[] =
    recoveryId !== undefined ? [recoveryId + 27] : [27, 28];

  for (const v of vCandidates) {
    try {
      const sig = ethers.Signature.from({
        r: `0x${bigR}`,
        s: `0x${s}`,
        v,
      });
      const recovered = ethers.recoverAddress(txHash, sig);
      if (recovered.toLowerCase() === fromAddress.toLowerCase()) {
        return sig;
      }
    } catch {
      continue;
    }
  }

  throw new Error("ETH 서명 복구 실패 — 파생 주소와 서명이 일치하지 않습니다");
}

// ─── 주소 표시 유틸 ───────────────────────────────────────────────────────────

export function truncateAddress(address: string): string {
  if (address.length <= 14) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
