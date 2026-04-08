"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Copy } from "lucide-react";
import { prepareCheckout } from "@/actions/prepareCheckout";
import { confirmCheckout } from "@/actions/confirmCheckout";
import {
  initiateNearTransaction,
  deriveEthAddress,
  requestMpcSignature,
  broadcastEthTransaction,
  fetchMpcSignatureFromTxHash,
  getEthBalance,
  reconstructEthSignature as reconstructSignature,
  type ChainNetwork,
} from "@/lib/near/chain-signatures";
import {
  deriveEthAddressAction,
  getEthBalanceAction,
  getTransactionCountAction,
  getFeeDataAction,
  broadcastRawTxAction,
} from "@/actions/ethRpc";
import { ethers } from "ethers";
import { truncateAddress } from "@/lib/near/wallet";
import { ZKP_VERIFIER_CONTRACT } from "@/lib/zkp/verifier";
import { useWallet } from "@/context/WalletContext";
import type { CartData } from "@/actions/getCartData";
import type { InsuranceProduct } from "@/lib/db/schema";

// NEAR Testnet Explorer
const NEAR_EXPLORER_BASE = "https://testnet.nearblocks.io/txns";

// Deterministic hex hash from intent content (client-side, no crypto API required)
function deriveIntentHash(cartId: string, zkpProofHash: string | null, productIds: string[]): string {
  const raw = [cartId, zkpProofHash ?? "null", ...productIds].join("|");
  let h = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h ^= raw.charCodeAt(i);
    h = (Math.imul(h, 0x01000193) >>> 0);
  }
  return h.toString(16).padStart(8, "0") + cartId.replace(/-/g, "").slice(0, 8);
}

const NETWORK_LABELS: Record<string, string> = {
  near: "NEAR",
  ethereum: "ETH",
  solana: "SOL",
};

interface CheckoutClientProps {
  data: CartData;
}

interface CheckoutResult {
  txId: string;
  txHash: string;
  chain: ChainNetwork;
  paidAmount: string;
  paidCurrency: string;
}

function ProductRow({ product }: { product: InsuranceProduct }) {
  const tp = useTranslations("insuranceProduct");
  const isDiscount = product.discountEligible === 1 && product.originalPremiumUsdc != null;

  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {tp.has(`categories.${product.coverageCategory}`)
                ? tp(`categories.${product.coverageCategory}` as Parameters<typeof tp>[0])
                : product.coverageCategory}
            </Badge>
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {NETWORK_LABELS[product.chainNetwork] ?? product.chainNetwork}
            </Badge>
            {isDiscount && (
              <Badge className="text-xs px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                {tp("zkpDiscount")}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end flex-shrink-0">
          {isDiscount && (
            <span className="text-xs text-muted-foreground line-through">
              ${product.originalPremiumUsdc!.toFixed(0)}/mo
            </span>
          )}
          <span className="text-sm font-bold text-foreground">
            ${product.monthlyPremiumUsdc.toFixed(1)}/mo
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfidentialIntentPanelNote() {
  const t = useTranslations("checkout");
  return (
    <div className="px-3 pb-2.5 text-[10px] text-muted-foreground">
      {t("intentPanel.privateNote")}
    </div>
  );
}

function ConfidentialIntentPanel({ data }: { data: CartData }) {
  const t = useTranslations("checkout");
  const intentHash = deriveIntentHash(
    data.cartId,
    data.zkpProofHash,
    data.products.map((p) => p.id)
  );

  const rows: { label: string; value: string; private?: boolean }[] = [
    { label: "intent_type", value: '"insurance_premium_payment"' },
    {
      label: "zkp_proof_hash",
      value: data.zkpProofHash
        ? `"${data.zkpProofHash.slice(0, 12)}..."`
        : '"(none)"',
      private: true,
    },
    {
      label: "product_ids",
      value: `[${data.products.map((p) => `"${p.id.slice(0, 8)}..."`).join(", ")}]`,
      private: true,
    },
    { label: "estimated_usdc", value: `${data.totalMonthlyUsdc.toFixed(2)}` },
    { label: "network", value: '"near_testnet"' },
    { label: "intent_hash", value: `"0x${intentHash}"` },
  ];

  return (
    <div className="rounded-xl border border-primary/20 bg-card overflow-hidden">
      {/* 터미널 헤더 */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/40 border-b border-border/60">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
        <span className="ml-2 text-xs text-muted-foreground font-mono">
          {t("intentPanel.terminal")}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-primary/30 text-primary"
          >
            Defuse Protocol
          </Badge>
          <Badge
            variant="outline"
            className="text-[10px] px-1.5 py-0 border-yellow-500/40 text-yellow-500"
          >
            {t("intentPanel.phase2")}
          </Badge>
        </div>
      </div>

      {/* 인텐트 필드 */}
      <div className="p-3 font-mono text-xs flex flex-col gap-1">
        <span className="text-zinc-400">{"{"}</span>
        {rows.map(({ label, value, private: isPrivate }) => (
          <div key={label} className="flex items-start gap-1 pl-4">
            <span className="text-primary/70">{label}:</span>
            <span className={isPrivate ? "text-yellow-400" : "text-emerald-400"}>{value}</span>
            {isPrivate && (
              <span className="ml-1 text-yellow-500/60 text-[10px]">
                [PRIVATE]
              </span>
            )}
          </div>
        ))}
        <span className="text-zinc-400">{"}"}</span>
      </div>

      <ConfidentialIntentPanelNote />
    </div>
  );
}

type PaymentStep = "idle" | "preparing" | "signing" | "confirming" | "done";

export function CheckoutClient({ data }: CheckoutClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("checkout");
  const tp = useTranslations("insuranceProduct");
  const { selector, accountId } = useWallet();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [selectedChain, setSelectedChain] = useState<ChainNetwork>("near");
  const [derivedEthAddress, setDerivedEthAddress] = useState<string | null>(null);
  const [ethBalance, setEthBalance] = useState<string | null>(null);
  const [ethBalanceError, setEthBalanceError] = useState(false);

  // 지갑 리다이렉트 복귀 시 즉시 confirming 상태로 시작
  const txHashParam = searchParams.get("transactionHashes");
  const [step, setStep] = useState<PaymentStep>(txHashParam ? "confirming" : "idle");

  const originalTotal = data.products.reduce((sum, p) => {
    if (p.discountEligible === 1 && p.originalPremiumUsdc != null) {
      return sum + p.originalPremiumUsdc;
    }
    return sum + p.monthlyPremiumUsdc;
  }, 0);

  // ETH 체인 선택 시 파생 주소 + 잔액 자동 조회
  useEffect(() => {
    if (selectedChain !== "eth" || !accountId) return;

    setEthBalance(null);
    setEthBalanceError(false);

    deriveEthAddressAction(accountId)
      .then(async (addrResult) => {
        if ("error" in addrResult) throw new Error(addrResult.error);
        setDerivedEthAddress(addrResult.address);
        const balResult = await getEthBalanceAction(addrResult.address);
        if ("error" in balResult) throw new Error(balResult.error);
        setEthBalance(balResult.balance);
      })
      .catch(() => {
        setEthBalanceError(true);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChain, accountId]);

  // 지갑 서명 후 리다이렉트 복귀 처리 (NEAR / ETH MPC 공통)
  useEffect(() => {
    if (!txHashParam) return;

    const key = `pending-checkout-${data.cartId}`;
    const pending = sessionStorage.getItem(key);
    if (!pending) return;

    const parsed = JSON.parse(pending) as {
      txId: string;
      mode?: string;
      unsignedTxJson?: string;
      derivedEthAddress?: string;
      signerAccountId?: string;
    };

    startTransition(async () => {
      setStep("confirming");

      // ── ETH MPC 서명 복귀 처리 ──────────────────────────────────────────────
      if (parsed.mode === "eth") {
        try {
          const nearTxHash = txHashParam.split(",")[0];
          const mpcSig = await fetchMpcSignatureFromTxHash(
            nearTxHash,
            parsed.signerAccountId!
          );

          const unsignedTx = JSON.parse(
            parsed.unsignedTxJson!,
            (_, v) => (v?.__bigint !== undefined ? BigInt(v.__bigint) : v)
          ) as ethers.TransactionRequest;

          const signature = reconstructSignature(
            mpcSig,
            unsignedTx,
            parsed.derivedEthAddress!
          );
          const signedTx = ethers.Transaction.from({
            ...(unsignedTx as ethers.TransactionLike<string>),
            signature,
          });
          const broadcastResult = await broadcastRawTxAction(signedTx.serialized);
          if ("error" in broadcastResult) throw new Error(broadcastResult.error);
          const ethTxHash = broadcastResult.txHash;

          const confirmed = await confirmCheckout({
            txId: parsed.txId,
            txHash: ethTxHash,
            cartId: data.cartId,
          });

          if (!confirmed.success) {
            toast.error(confirmed.error ?? t("toastConfirmError"));
            setStep("idle");
            return;
          }

          sessionStorage.removeItem(key);
          setResult({ txId: confirmed.txId!, txHash: ethTxHash, chain: "eth", paidAmount: "0.0001", paidCurrency: "ETH" });
          setStep("done");
          toast.success(t("toastSuccess"));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          toast.error(t("toastSignError", { message }));
          setStep("idle");
        }
        return;
      }

      // ── NEAR 결제 복귀 처리 ─────────────────────────────────────────────────
      const confirmed = await confirmCheckout({
        txId: parsed.txId,
        txHash: txHashParam.split(",")[0],
        cartId: data.cartId,
      });

      if (!confirmed.success) {
        toast.error(confirmed.error ?? t("toastConfirmError"));
        setStep("idle");
        return;
      }

      sessionStorage.removeItem(key);
      setResult({ txId: confirmed.txId!, txHash: confirmed.txHash!, chain: "near", paidAmount: "0.001", paidCurrency: "NEAR" });
      setStep("done");
      toast.success(t("toastSuccess"));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handlePayment() {
    if (selectedChain === "eth") {
      handleEthPayment();
      return;
    }
    handleNearPayment();
  }

  function handleEthPayment() {
    startTransition(async () => {
      if (!selector || !accountId || !derivedEthAddress) {
        toast.error(t("toastWalletError"));
        return;
      }

      setStep("preparing");
      const prepared = await prepareCheckout({
        cartId: data.cartId,
        walletAddress: data.walletAddress,
      });

      if (!prepared.success) {
        toast.error(prepared.error ?? t("toastPrepareError"));
        setStep("idle");
        return;
      }

      try {
        setStep("signing");
        const wallet = await selector.wallet();

        // ETH 트랜잭션 구성 (Sepolia — 데모용 0.0001 ETH)
        // Server Action으로 nonce, feeData 조회 (CORS 우회)
        const [nonceResult, feeResult] = await Promise.all([
          getTransactionCountAction(derivedEthAddress),
          getFeeDataAction(),
        ]);

        if ("error" in nonceResult) throw new Error(nonceResult.error);
        if ("error" in feeResult) throw new Error(feeResult.error);

        const unsignedTx: ethers.TransactionRequest = {
          to: "0x000000000000000000000000000000000000dEaD", // 데모용 burn 주소
          value: ethers.parseEther("0.0001"),
          nonce: nonceResult.nonce,
          chainId: 11155111, // Sepolia
          gasLimit: BigInt(21000),
          maxFeePerGas: BigInt(feeResult.maxFeePerGas),
          maxPriorityFeePerGas: BigInt(feeResult.maxPriorityFeePerGas),
          type: 2,
        };

        // MPC 서명 요청 전 — BrowserWallet 리다이렉트 복귀 대비 sessionStorage 저장
        sessionStorage.setItem(
          `pending-checkout-${data.cartId}`,
          JSON.stringify({
            txId: prepared.txId!,
            mode: "eth",
            unsignedTxJson: JSON.stringify(
              unsignedTx,
              (_, v) => (typeof v === "bigint" ? { __bigint: v.toString() } : v)
            ),
            derivedEthAddress,
            signerAccountId: accountId,
          })
        );

        // MPC 서명 요청 (NEAR 지갑 팝업 또는 리다이렉트)
        const txHash = ethers.keccak256(
          ethers.Transaction.from(unsignedTx as ethers.TransactionLike<string>).unsignedSerialized
        );
        const payload = ethers.getBytes(txHash);

        const mpcSig = await requestMpcSignature(wallet, payload);

        // ETH 서명 복원 + 브로드캐스트 (Server Action)
        setStep("confirming");
        const signature = reconstructSignature(mpcSig, unsignedTx, derivedEthAddress);
        const signedTx = ethers.Transaction.from({
          ...(unsignedTx as ethers.TransactionLike<string>),
          signature,
        });
        const broadcastResult = await broadcastRawTxAction(signedTx.serialized);
        if ("error" in broadcastResult) throw new Error(broadcastResult.error);
        const ethTxHash = broadcastResult.txHash;

        const confirmed = await confirmCheckout({
          txId: prepared.txId!,
          txHash: ethTxHash,
          cartId: data.cartId,
        });

        if (!confirmed.success) {
          toast.error(confirmed.error ?? t("toastConfirmError"));
          setStep("idle");
          return;
        }

        setResult({ txId: confirmed.txId!, txHash: ethTxHash, chain: "eth", paidAmount: "0.0001", paidCurrency: "ETH" });
        setStep("done");
        toast.success(t("toastSuccess"));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(t("toastSignError", { message }));
        setStep("idle");
      }
    });
  }

  function handleNearPayment() {
    startTransition(async () => {
      // 1단계: 결제 준비 (cart 선점 + transaction 레코드 생성)
      setStep("preparing");
      const prepared = await prepareCheckout({
        cartId: data.cartId,
        walletAddress: data.walletAddress,
      });

      if (!prepared.success) {
        toast.error(prepared.error ?? t("toastPrepareError"));
        setStep("idle");
        return;
      }

      // 2단계: txId를 sessionStorage에 저장 (리다이렉트 복귀 시 사용)
      sessionStorage.setItem(
        `pending-checkout-${data.cartId}`,
        JSON.stringify({ txId: prepared.txId })
      );

      // 3단계: 지갑 서명 요청 (MyNearWallet 리다이렉트)
      if (!selector) {
        toast.error(t("toastWalletError"));
        setStep("idle");
        return;
      }

      setStep("signing");
      let signResult: { txHash: string } | null = null;
      try {
        signResult = await initiateNearTransaction(data.cartId, selector);
        // signResult === null: BrowserWallet 리다이렉트 → 여기서 실행 중단
        // signResult !== null: InjectedWallet(팝업) → 바로 아래에서 처리
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(t("toastSignError", { message }));
        setStep("idle");
        return;
      }

      // InjectedWallet: txHash 직접 수신 → 결제 확정
      if (signResult) {
        setStep("confirming");
        const confirmed = await confirmCheckout({
          txId: prepared.txId!,
          txHash: signResult.txHash,
          cartId: data.cartId,
        });

        if (!confirmed.success) {
          toast.error(confirmed.error ?? t("toastConfirmError"));
          setStep("idle");
          return;
        }

        // ZKP proof hash 온체인 등록 (zkp.rogulus.testnet)
        if (data.zkpProofHash && selector) {
          try {
            const zkpWallet = await selector.wallet();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (zkpWallet as any).signAndSendTransaction({
              receiverId: ZKP_VERIFIER_CONTRACT,
              actions: [
                {
                  functionCall: {
                    methodName: "submit_proof",
                    args: JSON.stringify({
                      proof_hash: data.zkpProofHash,
                      cart_id: data.cartId,
                    }),
                    gas: "30000000000000",
                    deposit: "0",
                  },
                },
              ],
            });
            toast.success(t("toastZkpSuccess"));
          } catch {
            toast.error(t("toastZkpError"));
          }
        }

        sessionStorage.removeItem(`pending-checkout-${data.cartId}`);
        setResult({ txId: confirmed.txId!, txHash: confirmed.txHash!, chain: "near", paidAmount: "0.001", paidCurrency: "NEAR" });
        setStep("done");
        toast.success(t("toastSuccess"));
      }
    });
  }

  function getButtonLabel(): string {
    if (step === "preparing") return t("btnPreparing");
    if (step === "signing")   return t("btnSigning");
    if (step === "confirming") return t("btnConfirming");
    return t("btnPay");
  }

  // ── 결제 확정 대기 화면 ─────────────────────────────────────────────────────
  if (step === "confirming" && !result) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16 flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">{t("confirming")}</p>
      </div>
    );
  }

  // ── 보험 가입 확인서 ────────────────────────────────────────────────────────
  if (result) {
    const policyNumber = "MYD-" + result.txId.replace(/-/g, "").slice(0, 8).toUpperCase();
    const enrolledAt = DateTime.now().toFormat("yyyy-MM-dd");
    const isEth = result.chain === "eth";
    const explorerUrl = isEth
      ? `https://sepolia.etherscan.io/tx/${result.txHash}`
      : `${NEAR_EXPLORER_BASE}/${result.txHash}`;

    return (
      <div className="mx-auto w-full max-w-lg px-4 py-10 flex flex-col gap-6">
        {/* 헤더 */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100">
            <svg
              className="h-7 w-7 text-emerald-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">{t("success.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("success.subtitle")}
            </p>
          </div>
        </div>

        {/* 증서 카드 */}
        <div className="w-full rounded-xl border border-border/60 bg-card flex flex-col divide-y divide-border/60">

          {/* 증서 정보 */}
          <div className="p-4 flex flex-col gap-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("success.policyInfo")}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("success.policyNumber")}</span>
              <span className="font-mono font-semibold text-foreground">{policyNumber}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("success.enrolledAt")}</span>
              <span className="text-foreground">{enrolledAt}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("success.payWallet")}</span>
              <span className="font-mono text-xs text-foreground">{truncateAddress(data.walletAddress)}</span>
            </div>
            {data.zkpProofHash && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("success.zkpVerified")}</span>
                <Badge className="text-xs px-2 py-0 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                  {t("success.zkpVerifiedBadge")}
                </Badge>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("success.confidentialIntent")}</span>
              <Badge className="text-xs px-2 py-0 bg-primary/10 text-primary border-primary/30 hover:bg-primary/10">
                {t("success.intentDone")}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("success.network")}</span>
              <span className="text-foreground">{isEth ? "ETH Sepolia (MPC)" : "NEAR Testnet"}</span>
            </div>
          </div>

          {/* 가입 상품 목록 */}
          <div className="p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {t("success.products", { count: data.products.length })}
            </p>
            {data.products.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {tp.has(`categories.${product.coverageCategory}`)
                        ? tp(`categories.${product.coverageCategory}` as Parameters<typeof tp>[0])
                        : product.coverageCategory}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {NETWORK_LABELS[product.chainNetwork] ?? product.chainNetwork}
                    </Badge>
                    {product.discountEligible === 1 && (
                      <Badge className="text-xs px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                        {tp("zkpDiscount")}
                      </Badge>
                    )}
                  </div>
                </div>
                <span className="text-sm font-bold text-foreground flex-shrink-0">
                  ${product.monthlyPremiumUsdc.toFixed(1)}/mo
                </span>
              </div>
            ))}
          </div>

          {/* 결제 요약 */}
          <div className="p-4 flex flex-col gap-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{t("success.paymentSummary")}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("success.totalPremium")}</span>
              <span className="text-lg font-bold text-primary">${data.totalMonthlyUsdc.toFixed(1)} USDC/mo</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("success.paymentMethod")}</span>
              <span className="text-foreground">{isEth ? "ETH Sepolia (MPC Chain Signatures)" : "NEAR Testnet"}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("success.onChainAmount")}</span>
              <span className="font-mono font-semibold text-foreground">
                {result.paidAmount} {result.paidCurrency}
                <span className="text-[10px] text-muted-foreground ml-1">(+ gas)</span>
              </span>
            </div>
            <div className="flex flex-col gap-1 pt-1">
              <span className="text-xs text-muted-foreground">{t("success.txHash")}</span>
              <span className="font-mono text-xs text-foreground break-all bg-muted/40 rounded px-2 py-1.5">
                {result.txHash}
              </span>
            </div>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary underline underline-offset-2 mt-1"
            >
              {t("success.explorerLink")}
            </a>
          </div>

          {/* 데모 고지 */}
          <div className="px-4 py-3 bg-muted/30 rounded-b-xl">
            <p className="text-xs text-muted-foreground text-center">
              {t("success.demoNotice")}
            </p>
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => window.print()}
          >
            {t("success.printBtn")}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/upload")}
          >
            {t("success.backBtn")}
          </Button>
        </div>
      </div>
    );
  }

  // ── 결제 확인 화면 ──────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <Badge variant="outline" className="border-primary/40 text-primary text-xs w-fit">
          {t("badge")}
        </Badge>
        <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("selectedProducts", { count: data.products.length })}
        </p>
        {data.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noProducts")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.products.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-2.5">
        {data.discountAppliedUsdc > 0 && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t("originalTotal")}</span>
              <span className="text-muted-foreground">${originalTotal.toFixed(1)}/mo</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-600">{t("zkpDiscount")}</span>
              <span className="text-emerald-600 font-medium">-${data.discountAppliedUsdc.toFixed(1)}/mo</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
          <span className="text-sm font-semibold text-foreground">{t("monthlyPremium")}</span>
          <span className="text-lg font-bold text-primary">${data.totalMonthlyUsdc.toFixed(1)} USDC/mo</span>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("payWallet")}</span>
          <span className="font-mono text-foreground">{truncateAddress(data.walletAddress)}</span>
        </div>
        {data.zkpProofHash && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("zkpProof")}</span>
            <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-xs px-1.5 py-0">
              {t("success.zkpVerifiedBadge")}
            </Badge>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("network")}</span>
          <span className="text-foreground">NEAR Testnet</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{t("signAmount")}</span>
          <span className="text-foreground">{t("signAmountValue")}</span>
        </div>
      </div>

      {/* 체인 선택 */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {t("chainSelect")}
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedChain("near")}
            className={[
              "flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors",
              selectedChain === "near"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            ].join(" ")}
          >
            NEAR Testnet
          </button>
          <button
            onClick={() => setSelectedChain("eth")}
            className={[
              "flex-1 rounded-lg border py-2.5 text-sm font-medium transition-colors",
              selectedChain === "eth"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            ].join(" ")}
          >
            ETH Sepolia
            <Badge className="ml-1.5 text-[10px] px-1 py-0 bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100">
              Phase 2
            </Badge>
          </button>
        </div>

        {/* ETH 선택 시 파생 주소 표시 */}
        {selectedChain === "eth" && (
          <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("ethDerivedAddress")}</span>
              {derivedEthAddress ? (
                <button
                  type="button"
                  className="flex items-center gap-1.5 font-mono text-foreground hover:text-primary transition-colors"
                  onClick={() => {
                    navigator.clipboard.writeText(derivedEthAddress);
                    toast.success(t("ethAddressCopied"));
                  }}
                >
                  <span>{derivedEthAddress.slice(0, 6)}...{derivedEthAddress.slice(-4)}</span>
                  <Copy className="h-3 w-3 flex-shrink-0" />
                </button>
              ) : (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t("ethBalance")}</span>
              {ethBalanceError ? (
                <button
                  type="button"
                  className="text-destructive text-[10px] underline underline-offset-2"
                  onClick={() => {
                    setEthBalanceError(false);
                    setEthBalance(null);
                    setDerivedEthAddress(null);
                    if (accountId) {
                      deriveEthAddressAction(accountId)
                        .then(async (addrResult) => {
                          if ("error" in addrResult) throw new Error(addrResult.error);
                          setDerivedEthAddress(addrResult.address);
                          const balResult = await getEthBalanceAction(addrResult.address);
                          if ("error" in balResult) throw new Error(balResult.error);
                          setEthBalance(balResult.balance);
                        })
                        .catch(() => setEthBalanceError(true));
                    }
                  }}
                >
                  {t("ethBalanceRetry")}
                </button>
              ) : ethBalance !== null ? (
                <span className={parseFloat(ethBalance) < 0.001 ? "text-destructive" : "text-foreground"}>
                  {parseFloat(ethBalance).toFixed(4)} ETH
                </span>
              ) : (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              )}
            </div>
            {ethBalance !== null && parseFloat(ethBalance) < 0.001 && (
              <p className="text-destructive text-[10px] pt-0.5">
                {t("ethInsufficientBalance")}
              </p>
            )}
            {derivedEthAddress && (
              <a
                href={`https://sepolia.etherscan.io/address/${derivedEthAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary text-[10px] underline underline-offset-2 pt-0.5"
              >
                {t("ethViewOnEtherscan")}
              </a>
            )}
          </div>
        )}
      </div>

      {/* Confidential Intent 미리보기 */}
      <ConfidentialIntentPanel data={data} />

      {/* 결제 버튼 */}
      <Button
        className="w-full"
        disabled={
          isPending ||
          data.products.length === 0 ||
          (selectedChain === "eth" && (!derivedEthAddress || ethBalance === null || ethBalanceError || parseFloat(ethBalance) < 0.001))
        }
        onClick={handlePayment}
      >
        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {getButtonLabel()}
      </Button>
    </div>
  );
}
