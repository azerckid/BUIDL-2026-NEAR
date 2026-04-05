"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskProfileCard } from "./RiskProfileCard";
import { InsuranceProductCard } from "./InsuranceProductCard";
import { createCart } from "@/actions/createCart";
import type { DashboardData } from "@/actions/getDashboardData";
import type { RiskProfile, RiskLevel } from "@/lib/db/schema";

const LEVEL_ORDER: Record<RiskLevel, number> = { high: 0, moderate: 1, normal: 2 };

function sortedCategories(riskProfile: RiskProfile): Array<keyof RiskProfile> {
  return (Object.keys(riskProfile) as Array<keyof RiskProfile>).sort(
    (a, b) => LEVEL_ORDER[riskProfile[a].level] - LEVEL_ORDER[riskProfile[b].level]
  );
}

interface DashboardClientProps {
  data: DashboardData;
}

export function DashboardClient({ data }: DashboardClientProps) {
  const { sessionId, walletAddress, riskProfile, products, zkpProofHash } = data;
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const orderedCategories = sortedCategories(riskProfile);

  function toggleProduct(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  const selectedProducts = products.filter((p) => selectedIds.has(p.id));
  const totalMonthly = selectedProducts.reduce((sum, p) => sum + p.monthlyPremiumUsdc, 0);
  const totalDiscount = selectedProducts.reduce((sum, p) => {
    if (p.discountEligible === 1 && p.originalPremiumUsdc != null) {
      return sum + (p.originalPremiumUsdc - p.monthlyPremiumUsdc);
    }
    return sum;
  }, 0);

  function handleCheckout() {
    if (selectedIds.size === 0) {
      toast.error(t("selectPrompt"));
      return;
    }

    startTransition(async () => {
      const result = await createCart({
        walletAddress,
        sessionId,
        selectedProductIds: Array.from(selectedIds),
      });

      if (!result.success) {
        toast.error(result.error ?? t("cartError"));
        return;
      }

      toast.success(t("cartCreated"));
      router.push(`/checkout/${result.cartId}`);
    });
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/40 text-primary text-xs">
            Stage 5
          </Badge>
          {zkpProofHash && (
            <Badge variant="outline" className="border-emerald-300 text-emerald-700 text-xs">
              {t("badge")}
            </Badge>
          )}
        </div>
        <h1 className="text-xl font-bold text-foreground">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="w-full">
          <TabsTrigger value="profile" className="flex-1">
            {t("tabRisk")}
          </TabsTrigger>
          <TabsTrigger value="products" className="flex-1">
            {t("tabInsurance", { count: products.length })}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {orderedCategories.map((cat) => (
              <RiskProfileCard
                key={cat}
                category={cat}
                level={riskProfile[cat].level}
                flags={riskProfile[cat].flags}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("noProducts")}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {products.map((product) => (
                <InsuranceProductCard
                  key={product.id}
                  product={product}
                  selected={selectedIds.has(product.id)}
                  onToggle={toggleProduct}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("selectedProducts")}</span>
          <span className="font-medium text-foreground">{selectedIds.size}</span>
        </div>
        {totalDiscount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-emerald-600">{t("zkpDiscount")}</span>
            <span className="font-medium text-emerald-600">-${totalDiscount.toFixed(1)}/mo</span>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <span className="text-sm font-semibold text-foreground">{t("totalPremium")}</span>
          <span className="text-lg font-bold text-primary">${totalMonthly.toFixed(1)}/mo</span>
        </div>
        <Button
          className="w-full"
          disabled={selectedIds.size === 0 || isPending}
          onClick={handleCheckout}
        >
          {isPending ? t("processing") : t("checkout")}
        </Button>
      </div>
    </div>
  );
}
