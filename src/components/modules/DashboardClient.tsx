"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiskProfileCard } from "./RiskProfileCard";
import { InsuranceProductCard } from "./InsuranceProductCard";
import { ConciergeChat } from "./ConciergeChat";
import { createCart } from "@/actions/createCart";
import type {
  DashboardData,
  DashboardProduct,
  DashboardQuoteCondition,
  PriorityOrder,
} from "@/actions/getDashboardData";
import type { RiskProfile, RiskLevel } from "@/lib/db/schema";
import { isTestPilotClientEnabled, isTestPilotGuestIdentity } from "@/lib/test-pilot";

const LEVEL_ORDER: Record<RiskLevel, number> = { high: 0, moderate: 1, normal: 2 };
const QUOTE_SEX_ORDER: Record<DashboardQuoteCondition["sex"], number> = {
  male: 0,
  female: 1,
  source_unknown: 2,
};

type QuoteConditionOptions = {
  ages: number[];
  sexes: DashboardQuoteCondition["sex"][];
};

function sortedCategories(
  riskProfile: RiskProfile,
  priorityOrder: PriorityOrder | null
): Array<keyof RiskProfile> {
  if (priorityOrder && priorityOrder.length === 4) {
    return priorityOrder as Array<keyof RiskProfile>;
  }
  return (Object.keys(riskProfile) as Array<keyof RiskProfile>).sort(
    (a, b) => LEVEL_ORDER[riskProfile[a].level] - LEVEL_ORDER[riskProfile[b].level]
  );
}

function getQuoteConditionOptions(products: DashboardProduct[]): QuoteConditionOptions {
  const ages = new Set<number>();
  const sexes = new Set<DashboardQuoteCondition["sex"]>();

  for (const product of products) {
    for (const quote of product.approvedQuotes) {
      if (quote.age != null) ages.add(quote.age);
      if (quote.sex != null) sexes.add(quote.sex);
    }
  }

  return {
    ages: Array.from(ages).sort((a, b) => a - b),
    sexes: Array.from(sexes).sort((a, b) => QUOTE_SEX_ORDER[a] - QUOTE_SEX_ORDER[b]),
  };
}

function getDefaultQuoteCondition(
  options: QuoteConditionOptions
): DashboardQuoteCondition | null {
  if (options.ages.length === 0 || options.sexes.length === 0) return null;

  return {
    age: options.ages.includes(34) ? 34 : options.ages[0],
    sex: options.sexes.includes("female") ? "female" : options.sexes[0],
  };
}

function isQuoteConditionAvailable(
  options: QuoteConditionOptions,
  condition: DashboardQuoteCondition | null
) {
  if (!condition) return false;
  return options.ages.includes(condition.age) && options.sexes.includes(condition.sex);
}

function getQuoteSexLabelKey(sex: DashboardQuoteCondition["sex"]) {
  if (sex === "male") return "quoteCondition.sexMale";
  if (sex === "female") return "quoteCondition.sexFemale";
  return "quoteCondition.sexUnknown";
}

interface QuoteConditionSelectorProps {
  options: QuoteConditionOptions;
  selectedCondition: DashboardQuoteCondition | null;
  onChange: (condition: DashboardQuoteCondition) => void;
}

function QuoteConditionSelector({
  options,
  selectedCondition,
  onChange,
}: QuoteConditionSelectorProps) {
  const t = useTranslations("dashboard");

  if (!selectedCondition || options.ages.length === 0 || options.sexes.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/60 bg-muted/25 p-3">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-foreground">{t("quoteCondition.title")}</p>
          <p className="text-[11px] text-muted-foreground">{t("quoteCondition.caption")}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[7rem_1fr]">
        <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
          {t("quoteCondition.age")}
          <select
            className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground outline-none focus:border-primary"
            value={selectedCondition.age}
            onChange={(event) => {
              onChange({
                age: Number(event.target.value),
                sex: selectedCondition.sex,
              });
            }}
          >
            {options.ages.map((age) => (
              <option key={age} value={age}>
                {t("quoteCondition.ageValue", { age })}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            {t("quoteCondition.sex")}
          </span>
          <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
            {options.sexes.map((sex) => {
              const isSelected = selectedCondition.sex === sex;
              return (
                <button
                  key={sex}
                  type="button"
                  className={[
                    "h-9 rounded-md border px-2 text-xs font-medium transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                  onClick={() => onChange({ age: selectedCondition.age, sex })}
                >
                  {t(getQuoteSexLabelKey(sex) as Parameters<typeof t>[0])}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 카트 + 결제 공통 UI ──────────────────────────────────────────────────────

interface CartSummaryProps {
  products: DashboardProduct[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onCheckout: () => void;
  isPending: boolean;
  recommendReason?: string | null;
  advisoryMessages?: DashboardData["advisoryMessages"];
  isTestPilotSession: boolean;
  quoteConditionOptions: QuoteConditionOptions;
  selectedQuoteCondition: DashboardQuoteCondition | null;
  onQuoteConditionChange: (condition: DashboardQuoteCondition) => void;
}

function ProductList({
  products,
  selectedIds,
  onToggle,
  isPending,
  onCheckout,
  recommendReason,
  advisoryMessages,
  isTestPilotSession,
  quoteConditionOptions,
  selectedQuoteCondition,
  onQuoteConditionChange,
}: CartSummaryProps) {
  const t = useTranslations("dashboard");

  const selectedProducts = products.filter((p) => selectedIds.has(p.id));
  const totalMonthly = selectedProducts.reduce((sum, p) => sum + p.monthlyPremiumUsdc, 0);
  const totalDiscount = selectedProducts.reduce((sum, p) => {
    if (p.discountEligible === 1 && p.originalPremiumUsdc != null) {
      return sum + (p.originalPremiumUsdc - p.monthlyPremiumUsdc);
    }
    return sum;
  }, 0);

  return (
    <div className="flex flex-col gap-3">
      <QuoteConditionSelector
        options={quoteConditionOptions}
        selectedCondition={selectedQuoteCondition}
        onChange={onQuoteConditionChange}
      />

      {products.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">{t("noProducts")}</p>
      ) : (
        products.map((product, i) => {
          const categoryKey = product.coverageCategory as keyof NonNullable<DashboardData["advisoryMessages"]>;
          const advisory = advisoryMessages?.[categoryKey];
          const reason = advisory ? advisory.slice(0, 50) + (advisory.length > 50 ? "..." : "") : null;

          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.12, duration: 0.3 }}
            >
              <InsuranceProductCard
                product={product}
                selected={selectedIds.has(product.id)}
                onToggle={onToggle}
                selectedQuoteCondition={selectedQuoteCondition}
              />
              {reason && recommendReason && (
                <p className="mt-1 ml-1 text-xs text-muted-foreground">
                  {recommendReason}: {reason}
                </p>
              )}
            </motion.div>
          );
        })
      )}

      <div className="rounded-xl border border-border/60 bg-card p-4 flex flex-col gap-3 mt-1">
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
          onClick={onCheckout}
        >
          {isPending ? t("processing") : t(isTestPilotSession ? "testApplication" : "checkout")}
        </Button>
      </div>
    </div>
  );
}

// ─── 단계별 공개 UI ───────────────────────────────────────────────────────────

interface RevealFlowProps {
  data: DashboardData;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onCheckout: () => void;
  isPending: boolean;
  isTestPilotSession: boolean;
  quoteConditionOptions: QuoteConditionOptions;
  selectedQuoteCondition: DashboardQuoteCondition | null;
  onQuoteConditionChange: (condition: DashboardQuoteCondition) => void;
}

function RevealFlow({
  data,
  selectedIds,
  onToggle,
  onCheckout,
  isPending,
  isTestPilotSession,
  quoteConditionOptions,
  selectedQuoteCondition,
  onQuoteConditionChange,
}: RevealFlowProps) {
  const { riskProfile, products, advisoryMessages, reasoning, coverageGapSummary, priorityOrder } = data;
  const t = useTranslations("dashboard");
  const tRisk = useTranslations("riskProfile");
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const scrollTargetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      scrollTargetRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 300);
    return () => clearTimeout(timer);
  }, [step]);

  const orderedCategories = sortedCategories(riskProfile, priorityOrder);
  const nonNormalCategories = orderedCategories.filter(
    (cat) => riskProfile[cat].level !== "normal"
  );

  return (
    <div className="flex flex-col gap-4">
      {/* 단계 인디케이터 */}
      <div className="flex items-center gap-2">
        {([1, 2, 3] as const).map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={[
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold transition-colors",
                s < step
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : s === step
                  ? "bg-primary/20 text-primary border border-primary/50"
                  : "bg-muted text-muted-foreground border border-border",
              ].join(" ")}
            >
              {s}
            </div>
            {s < 3 && <ChevronRight size={12} className="text-muted-foreground/50" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1 — 위험 프로파일 요약 */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold text-foreground">{t("reveal.step1Title")}</h2>
              <p className="text-xs text-muted-foreground">{t("reveal.step1Desc")}</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {orderedCategories.map((cat, i) => (
                <motion.div
                  key={cat}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <RiskProfileCard
                    category={cat}
                    level={riskProfile[cat].level}
                    flags={riskProfile[cat].flags}
                  />
                </motion.div>
              ))}
            </div>
            <Button className="w-full" onClick={() => setStep(2)}>
              {t("reveal.step1Button")}
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Step 2 — AI 추천 근거 */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-4"
          >
            <h2 className="text-base font-semibold text-foreground">{t("reveal.step2Title")}</h2>

            {/* coverageGapSummary 배너 */}
            {coverageGapSummary && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5">
                <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-600">{coverageGapSummary}</p>
              </div>
            )}

            {/* reasoning */}
            {reasoning && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted-foreground">{t("reveal.step2ReasoningLabel")}</p>
                <div className="rounded-lg bg-muted/50 border border-border/60 px-3 py-2.5">
                  <p className="text-xs text-foreground leading-relaxed">{reasoning}</p>
                </div>
              </div>
            )}

            {/* 카테고리별 advisory messages (normal 제외) */}
            {nonNormalCategories.length > 0 && advisoryMessages && (
              <div className="flex flex-col gap-2">
                {nonNormalCategories.map((cat) => (
                  <div key={cat} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {tRisk(`categories.${cat}`)}
                      </span>
                      <Badge
                        variant="outline"
                        className={[
                          "text-xs",
                          riskProfile[cat].level === "high"
                            ? "border-red-200 text-red-700 bg-red-100"
                            : "border-amber-200 text-amber-700 bg-amber-100",
                        ].join(" ")}
                      >
                        {tRisk(`levels.${riskProfile[cat].level}`)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {advisoryMessages[cat as keyof typeof advisoryMessages]}
                    </p>
                  </div>
                ))}
              </div>
            )}

            <Button className="w-full" onClick={() => setStep(3)}>
              {t("reveal.step2Button")}
              <ChevronRight size={14} className="ml-1" />
            </Button>
          </motion.div>
        )}

        {/* Step 3 — 추천 상품 */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col gap-3"
          >
            <h2 className="text-base font-semibold text-foreground">{t("reveal.step3Title")}</h2>
            <ProductList
              products={products}
              selectedIds={selectedIds}
              onToggle={onToggle}
              onCheckout={onCheckout}
              isPending={isPending}
              recommendReason={t("reveal.recommendReason")}
              advisoryMessages={advisoryMessages}
              isTestPilotSession={isTestPilotSession}
              quoteConditionOptions={quoteConditionOptions}
              selectedQuoteCondition={selectedQuoteCondition}
              onQuoteConditionChange={onQuoteConditionChange}
            />
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={scrollTargetRef} />
    </div>
  );
}

// ─── 기존 Tabs UI (fallback) ─────────────────────────────────────────────────

interface LegacyTabsProps {
  data: DashboardData;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onCheckout: () => void;
  isPending: boolean;
  isTestPilotSession: boolean;
  quoteConditionOptions: QuoteConditionOptions;
  selectedQuoteCondition: DashboardQuoteCondition | null;
  onQuoteConditionChange: (condition: DashboardQuoteCondition) => void;
}

function LegacyTabs({
  data,
  selectedIds,
  onToggle,
  onCheckout,
  isPending,
  isTestPilotSession,
  quoteConditionOptions,
  selectedQuoteCondition,
  onQuoteConditionChange,
}: LegacyTabsProps) {
  const { riskProfile, products, priorityOrder } = data;
  const t = useTranslations("dashboard");
  const orderedCategories = sortedCategories(riskProfile, priorityOrder);

  return (
    <Tabs defaultValue="profile">
      <TabsList className="w-full">
        <TabsTrigger value="profile" className="flex-1">{t("tabRisk")}</TabsTrigger>
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
        <ProductList
          products={products}
          selectedIds={selectedIds}
          onToggle={onToggle}
          onCheckout={onCheckout}
          isPending={isPending}
          isTestPilotSession={isTestPilotSession}
          quoteConditionOptions={quoteConditionOptions}
          selectedQuoteCondition={selectedQuoteCondition}
          onQuoteConditionChange={onQuoteConditionChange}
        />
      </TabsContent>
    </Tabs>
  );
}

// ─── 메인 컴포넌트 ─────────────────────────────────────────────────────────────

interface DashboardClientProps {
  data: DashboardData;
}

export function DashboardClient({ data }: DashboardClientProps) {
  const { sessionId, walletAddress, zkpProofHash, advisoryMessages, reasoning, coverageGapSummary } = data;
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const quoteConditionOptions = useMemo(
    () => getQuoteConditionOptions(data.products),
    [data.products]
  );
  const defaultQuoteCondition = useMemo(
    () => getDefaultQuoteCondition(quoteConditionOptions),
    [quoteConditionOptions]
  );
  const [userQuoteCondition, setUserQuoteCondition] =
    useState<DashboardQuoteCondition | null>(defaultQuoteCondition);
  const selectedQuoteCondition = isQuoteConditionAvailable(
    quoteConditionOptions,
    userQuoteCondition
  )
    ? userQuoteCondition
    : defaultQuoteCondition;

  const hasAiData = !!(advisoryMessages && reasoning && coverageGapSummary);
  const isTestPilotSession = isTestPilotClientEnabled() && isTestPilotGuestIdentity(walletAddress);

  function toggleProduct(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

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

      {hasAiData ? (
        <RevealFlow
          data={data}
          selectedIds={selectedIds}
          onToggle={toggleProduct}
          onCheckout={handleCheckout}
          isPending={isPending}
          isTestPilotSession={isTestPilotSession}
          quoteConditionOptions={quoteConditionOptions}
          selectedQuoteCondition={selectedQuoteCondition}
          onQuoteConditionChange={setUserQuoteCondition}
        />
      ) : (
        <LegacyTabs
          data={data}
          selectedIds={selectedIds}
          onToggle={toggleProduct}
          onCheckout={handleCheckout}
          isPending={isPending}
          isTestPilotSession={isTestPilotSession}
          quoteConditionOptions={quoteConditionOptions}
          selectedQuoteCondition={selectedQuoteCondition}
          onQuoteConditionChange={setUserQuoteCondition}
        />
      )}

      <ConciergeChat riskProfile={data.riskProfile} />
    </div>
  );
}
