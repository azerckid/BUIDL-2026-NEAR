"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { prepareCheckout } from "@/actions/prepareCheckout";
import { confirmCheckout } from "@/actions/confirmCheckout";
import { signAndBroadcastIntent } from "@/lib/near/chain-signatures";
import { truncateAddress } from "@/lib/near/wallet";
import type { CartData } from "@/actions/getCartData";
import type { InsuranceProduct } from "@/lib/db/schema";

const CATEGORY_LABELS: Record<string, string> = {
  oncology: "종양·암",
  cardiovascular: "심혈관",
  metabolic: "대사·내분비",
  neurological: "신경·뇌",
};

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
}

function ProductRow({ product }: { product: InsuranceProduct }) {
  const isDiscount = product.discountEligible === 1 && product.originalPremiumUsdc != null;

  return (
    <Card className="border-border/60">
      <CardContent className="flex items-center justify-between gap-3 py-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
          <div className="mt-1 flex items-center gap-1.5">
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {CATEGORY_LABELS[product.coverageCategory] ?? product.coverageCategory}
            </Badge>
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {NETWORK_LABELS[product.chainNetwork] ?? product.chainNetwork}
            </Badge>
            {isDiscount && (
              <Badge className="text-xs px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                ZKP 할인
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

type PaymentStep = "idle" | "preparing" | "signing" | "confirming" | "done";

export function CheckoutClient({ data }: CheckoutClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [step, setStep] = useState<PaymentStep>("idle");

  const originalTotal = data.products.reduce((sum, p) => {
    if (p.discountEligible === 1 && p.originalPremiumUsdc != null) {
      return sum + p.originalPremiumUsdc;
    }
    return sum + p.monthlyPremiumUsdc;
  }, 0);

  function handlePayment() {
    startTransition(async () => {
      // 1단계: 결제 준비 (cart 선점 + transaction 레코드 생성)
      setStep("preparing");
      const prepared = await prepareCheckout({
        cartId: data.cartId,
        walletAddress: data.walletAddress,
      });

      if (!prepared.success) {
        toast.error(prepared.error ?? "결제 준비에 실패했습니다");
        setStep("idle");
        return;
      }

      // 2단계: 브라우저 지갑 서명 + Confidential Intent 브로드캐스트
      // Phase 2: @defuse-protocol/intents-sdk + WalletSelector.signAndSendTransaction
      setStep("signing");
      let signResult: { txHash: string };
      try {
        signResult = await signAndBroadcastIntent({
          walletAddress: data.walletAddress,
          amountUsdc: prepared.amountUsdc!,
          zkpProofHash: data.zkpProofHash,
          productIds: prepared.productIds!,
          txId: prepared.txId!,
        });
      } catch {
        toast.error("서명 또는 브로드캐스트에 실패했습니다");
        setStep("idle");
        return;
      }

      // 3단계: 결제 확정 (DB confirmed 처리)
      setStep("confirming");
      const confirmed = await confirmCheckout({
        txId: prepared.txId!,
        txHash: signResult.txHash,
        cartId: data.cartId,
      });

      if (!confirmed.success) {
        toast.error(confirmed.error ?? "결제 확정에 실패했습니다");
        setStep("idle");
        return;
      }

      setResult({ txId: confirmed.txId!, txHash: confirmed.txHash! });
      setStep("done");
      toast.success("결제가 완료되었습니다");
    });
  }

  function getButtonLabel(): string {
    if (step === "preparing") return "결제 준비 중...";
    if (step === "signing") return "서명 대기 중...";
    if (step === "confirming") return "확정 처리 중...";
    return "NEAR로 결제하기";
  }

  // 결제 완료 화면
  if (result) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-12 flex flex-col items-center gap-6">
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
            <h1 className="text-xl font-bold text-foreground">결제 완료</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              NEAR Confidential Intents로 보험료가 안전하게 처리되었습니다.
            </p>
          </div>
        </div>

        <div className="w-full rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">월 보험료</span>
            <span className="font-bold text-primary">${data.totalMonthlyUsdc.toFixed(1)} USDC</span>
          </div>
          <div className="flex items-center justify-between text-sm border-t border-border/60 pt-3">
            <span className="text-muted-foreground">트랜잭션 ID</span>
            <span className="font-mono text-xs text-foreground">{result.txId.slice(0, 8)}...</span>
          </div>
          <div className="flex flex-col gap-1 border-t border-border/60 pt-3">
            <span className="text-xs text-muted-foreground">Tx Hash (NEAR Testnet)</span>
            <span className="font-mono text-xs text-foreground break-all bg-muted/40 rounded px-2 py-1.5">
              {result.txHash}
            </span>
          </div>
          {data.zkpProofHash && (
            <div className="flex flex-col gap-1 border-t border-border/60 pt-3">
              <span className="text-xs text-muted-foreground">ZKP Proof Hash</span>
              <span className="font-mono text-xs text-emerald-700 break-all bg-emerald-50 rounded px-2 py-1.5">
                {data.zkpProofHash.slice(0, 32)}...
              </span>
            </div>
          )}
        </div>

        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push("/upload")}
        >
          처음으로 돌아가기
        </Button>
      </div>
    );
  }

  // 결제 확인 화면
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-1.5">
        <Badge variant="outline" className="border-primary/40 text-primary text-xs w-fit">
          Confidential Checkout
        </Badge>
        <h1 className="text-xl font-bold text-foreground">결제 확인</h1>
        <p className="text-sm text-muted-foreground">
          NEAR Confidential Intents로 결제 내역이 보호됩니다. 원본 유전자 데이터는 이미 소각되었습니다.
        </p>
      </div>

      {/* 선택 상품 목록 */}
      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          선택한 보험 상품 ({data.products.length}개)
        </p>
        {data.products.length === 0 ? (
          <p className="text-sm text-muted-foreground">선택된 상품이 없습니다.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {data.products.map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* 결제 요약 */}
      <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-2.5">
        {data.discountAppliedUsdc > 0 && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">정가 합계</span>
              <span className="text-muted-foreground">${originalTotal.toFixed(1)}/mo</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-600">ZKP 할인</span>
              <span className="text-emerald-600 font-medium">-${data.discountAppliedUsdc.toFixed(1)}/mo</span>
            </div>
          </>
        )}
        <div className="flex items-center justify-between border-t border-border/60 pt-2.5">
          <span className="text-sm font-semibold text-foreground">월 보험료</span>
          <span className="text-lg font-bold text-primary">${data.totalMonthlyUsdc.toFixed(1)} USDC/mo</span>
        </div>
      </div>

      {/* 메타 정보 */}
      <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">결제 지갑</span>
          <span className="font-mono text-foreground">{truncateAddress(data.walletAddress)}</span>
        </div>
        {data.zkpProofHash && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">ZKP Proof</span>
            <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-xs px-1.5 py-0">
              검증 완료
            </Badge>
          </div>
        )}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">네트워크</span>
          <span className="text-foreground">NEAR Testnet</span>
        </div>
      </div>

      {/* 결제 버튼 */}
      <Button
        className="w-full"
        disabled={isPending || data.products.length === 0}
        onClick={handlePayment}
      >
        {getButtonLabel()}
      </Button>
    </div>
  );
}
