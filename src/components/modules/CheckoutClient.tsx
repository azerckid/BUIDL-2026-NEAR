"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { DateTime } from "luxon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { prepareCheckout } from "@/actions/prepareCheckout";
import { confirmCheckout } from "@/actions/confirmCheckout";
import { initiateNearTransaction } from "@/lib/near/chain-signatures";
import { truncateAddress } from "@/lib/near/wallet";
import type { CartData } from "@/actions/getCartData";
import type { InsuranceProduct } from "@/lib/db/schema";

// NEAR Testnet Explorer
const NEAR_EXPLORER_BASE = "https://testnet.nearblocks.io/txns";

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
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CheckoutResult | null>(null);

  // 지갑 리다이렉트 복귀 시 즉시 confirming 상태로 시작
  const txHashParam = searchParams.get("transactionHashes");
  const [step, setStep] = useState<PaymentStep>(txHashParam ? "confirming" : "idle");

  const originalTotal = data.products.reduce((sum, p) => {
    if (p.discountEligible === 1 && p.originalPremiumUsdc != null) {
      return sum + p.originalPremiumUsdc;
    }
    return sum + p.monthlyPremiumUsdc;
  }, 0);

  // 지갑 서명 후 리다이렉트 복귀 처리
  useEffect(() => {
    if (!txHashParam) return;

    const key = `pending-checkout-${data.cartId}`;
    const pending = sessionStorage.getItem(key);
    if (!pending) return;

    const { txId } = JSON.parse(pending) as { txId: string };

    startTransition(async () => {
      setStep("confirming");
      const confirmed = await confirmCheckout({
        txId,
        txHash: txHashParam.split(",")[0],
        cartId: data.cartId,
      });

      if (!confirmed.success) {
        toast.error(confirmed.error ?? "결제 확정에 실패했습니다");
        setStep("idle");
        return;
      }

      sessionStorage.removeItem(key);
      setResult({ txId: confirmed.txId!, txHash: confirmed.txHash! });
      setStep("done");
      toast.success("결제가 완료되었습니다");
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      // 2단계: txId를 sessionStorage에 저장 (리다이렉트 복귀 시 사용)
      sessionStorage.setItem(
        `pending-checkout-${data.cartId}`,
        JSON.stringify({ txId: prepared.txId })
      );

      // 3단계: 지갑 서명 요청 (MyNearWallet 리다이렉트)
      setStep("signing");
      try {
        await initiateNearTransaction(data.cartId);
        // 이 아래는 실행되지 않음 — 브라우저가 지갑 페이지로 이동
      } catch {
        toast.error("지갑 서명 요청에 실패했습니다");
        setStep("idle");
      }
    });
  }

  function getButtonLabel(): string {
    if (step === "preparing") return "결제 준비 중...";
    if (step === "signing")   return "지갑으로 이동 중...";
    if (step === "confirming") return "결제 확정 중...";
    return "NEAR로 결제하기";
  }

  // ── 결제 확정 대기 화면 ─────────────────────────────────────────────────────
  if (step === "confirming" && !result) {
    return (
      <div className="mx-auto w-full max-w-lg px-4 py-16 flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">NEAR 트랜잭션 확정 중...</p>
      </div>
    );
  }

  // ── 보험 가입 확인서 ────────────────────────────────────────────────────────
  if (result) {
    const policyNumber = "MYD-" + result.txId.replace(/-/g, "").slice(0, 8).toUpperCase();
    const enrolledAt = DateTime.now().toFormat("yyyy-MM-dd");
    const explorerUrl = `${NEAR_EXPLORER_BASE}/${result.txHash}`;

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
            <h1 className="text-xl font-bold text-foreground">보험 가입 완료</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              NEAR Testnet에서 실제 처리된 트랜잭션입니다.
            </p>
          </div>
        </div>

        {/* 증서 카드 */}
        <div className="w-full rounded-xl border border-border/60 bg-card flex flex-col divide-y divide-border/60">

          {/* 증서 정보 */}
          <div className="p-4 flex flex-col gap-2.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">증서 정보</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">증서 번호</span>
              <span className="font-mono font-semibold text-foreground">{policyNumber}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">가입일</span>
              <span className="text-foreground">{enrolledAt}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">결제 지갑</span>
              <span className="font-mono text-xs text-foreground">{truncateAddress(data.walletAddress)}</span>
            </div>
            {data.zkpProofHash && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">ZKP 검증</span>
                <Badge className="text-xs px-2 py-0 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                  검증 완료
                </Badge>
              </div>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">네트워크</span>
              <span className="text-foreground">NEAR Testnet</span>
            </div>
          </div>

          {/* 가입 상품 목록 */}
          <div className="p-4 flex flex-col gap-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              가입 상품 ({data.products.length}건)
            </p>
            {data.products.map((product) => (
              <div key={product.id} className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                  <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {CATEGORY_LABELS[product.coverageCategory] ?? product.coverageCategory}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-1.5 py-0">
                      {NETWORK_LABELS[product.chainNetwork] ?? product.chainNetwork}
                    </Badge>
                    {product.discountEligible === 1 && (
                      <Badge className="text-xs px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                        ZKP 할인
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
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">결제 요약</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">월 보험료 합계</span>
              <span className="text-lg font-bold text-primary">${data.totalMonthlyUsdc.toFixed(1)} USDC/mo</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">결제 방식</span>
              <span className="text-foreground">NEAR Testnet</span>
            </div>
            <div className="flex flex-col gap-1 pt-1">
              <span className="text-xs text-muted-foreground">Tx Hash</span>
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
              NEAR Testnet Explorer에서 확인 →
            </a>
          </div>

          {/* 데모 고지 */}
          <div className="px-4 py-3 bg-muted/30 rounded-b-xl">
            <p className="text-xs text-muted-foreground text-center">
              본 증서는 해커톤 데모용 가상 계약서이며 실제 보험 효력이 없습니다.
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
            확인서 인쇄
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/upload")}
          >
            처음으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // ── 결제 확인 화면 ──────────────────────────────────────────────────────────
  return (
    <div className="mx-auto w-full max-w-lg px-4 py-8 flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-1.5">
        <Badge variant="outline" className="border-primary/40 text-primary text-xs w-fit">
          NEAR Testnet 결제
        </Badge>
        <h1 className="text-xl font-bold text-foreground">결제 확인</h1>
        <p className="text-sm text-muted-foreground">
          NEAR 지갑으로 실제 Testnet 트랜잭션을 서명합니다. 원본 유전자 데이터는 이미 소각되었습니다.
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
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">서명 금액</span>
          <span className="text-foreground">0.001 NEAR (데모 심볼릭)</span>
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
