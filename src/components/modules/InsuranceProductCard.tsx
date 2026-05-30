"use client";

import { ExternalLink } from "lucide-react";
import { DateTime } from "luxon";
import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { DashboardPremiumQuote, DashboardProduct } from "@/actions/getDashboardData";

const NETWORK_LABELS: Record<string, string> = {
  near: "NEAR",
  ethereum: "ETH",
  solana: "SOL",
};

interface InsuranceProductCardProps {
  product: DashboardProduct;
  selected: boolean;
  onToggle: (id: string) => void;
}

function parseCoverageCaveats(rawCaveats: string | null): string[] {
  if (!rawCaveats) return [];

  try {
    const parsed: unknown = JSON.parse(rawCaveats);
    if (Array.isArray(parsed)) {
      return parsed.filter((caveat): caveat is string => typeof caveat === "string");
    }
    if (typeof parsed === "string") return [parsed];
    if (parsed && typeof parsed === "object") {
      return Object.values(parsed).filter((caveat): caveat is string => typeof caveat === "string");
    }
  } catch {
    return [rawCaveats];
  }

  return [];
}

function formatKrw(amount: number) {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatSourceDate(value: string | null, locale: string) {
  if (!value) return null;
  const date = DateTime.fromISO(value).setLocale(locale);
  return date.isValid ? date.toFormat("yyyy.LL.dd") : null;
}

function formatQuotePremium(quote: DashboardPremiumQuote, perMonth: string) {
  if (quote.monthlyPremiumKrw != null) {
    return `${formatKrw(quote.monthlyPremiumKrw)}${perMonth}`;
  }

  return quote.premiumText ?? "-";
}

export function InsuranceProductCard({ product, selected, onToggle }: InsuranceProductCardProps) {
  const t = useTranslations("insuranceProduct");
  const locale = useLocale();
  const isDiscount = product.discountEligible === 1 && product.originalPremiumUsdc != null;
  const isBaseline = product.matchingStrategy === "baseline";
  const caveats = parseCoverageCaveats(product.coverageCaveatsJson);
  const sourceDate = formatSourceDate(product.sourceCheckedAtIso, locale);
  const sourceUrl = product.sourceUrl ?? product.officialProductUrl;
  const approvedQuotes = product.approvedQuotes.slice(0, 4);
  const hiddenQuoteCount = Math.max(product.approvedQuotes.length - approvedQuotes.length, 0);
  const representativePremium =
    product.monthlyPremiumKrw != null
      ? `${formatKrw(product.monthlyPremiumKrw)}${t("perMonth")}`
      : `$${product.monthlyPremiumUsdc.toFixed(1)}${t("perMonth")}`;

  function formatQuoteCondition(quote: DashboardPremiumQuote) {
    const parts: string[] = [];

    if (quote.age != null) parts.push(t("ageValue", { age: quote.age }));
    if (quote.sex === "male") parts.push(t("sexMale"));
    if (quote.sex === "female") parts.push(t("sexFemale"));
    if (quote.sex === "source_unknown") parts.push(t("sexUnknown"));

    return parts.length > 0 ? parts.join(" · ") : t("conditionUnavailable");
  }

  return (
    <Card
      className={`cursor-pointer border transition-colors ${
        selected ? "border-primary/60 bg-primary/5" : "border-border/60 hover:border-border"
      }`}
      onClick={() => onToggle(product.id)}
    >
      <CardContent className="flex items-start gap-3 py-4">
        <div
          className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
            selected ? "border-primary bg-primary" : "border-border bg-background"
          }`}
        >
          {selected && (
            <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{product.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{product.provider}</p>
            </div>
            <div className="flex max-w-[9.5rem] flex-shrink-0 flex-col items-end text-right">
              <span className="text-[11px] font-medium text-muted-foreground">
                {t("representativePremium")}
              </span>
              {isDiscount && (
                <span className="text-xs text-muted-foreground line-through">
                  ${product.originalPremiumUsdc!.toFixed(0)}{t("perMonth")}
                </span>
              )}
              <span className="text-sm font-bold text-foreground">
                {representativePremium}
              </span>
              {product.monthlyPremiumKrw != null && (
                <span className="text-xs text-muted-foreground">
                  {t("settlementEstimate")}: ${product.monthlyPremiumUsdc.toFixed(1)}
                  {t("perMonth")}
                </span>
              )}
            </div>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            {isBaseline && (
              <Badge className="text-xs px-1.5 py-0 bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-100">
                {t("baseline")}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {t.has(`categories.${product.coverageCategory}`)
                ? t(`categories.${product.coverageCategory}` as Parameters<typeof t>[0])
                : product.coverageCategory}
            </Badge>
            <Badge variant="outline" className="text-xs px-1.5 py-0">
              {NETWORK_LABELS[product.chainNetwork] ?? product.chainNetwork}
            </Badge>
            {isDiscount && (
              <Badge className="text-xs px-1.5 py-0 bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                {t("zkpDiscount")}
              </Badge>
            )}
          </div>

          {approvedQuotes.length > 0 && (
            <div className="mt-3 border-t border-border/50 pt-2.5">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">{t("conditionalQuotes")}</p>
                {hiddenQuoteCount > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {t("moreQuotes", { count: hiddenQuoteCount })}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {approvedQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="flex min-h-8 items-center justify-between gap-2 rounded-sm bg-muted/40 px-2 py-1.5"
                  >
                    <span className="min-w-0 truncate text-xs text-muted-foreground">
                      {formatQuoteCondition(quote)}
                    </span>
                    <span className="flex-shrink-0 text-xs font-semibold text-foreground">
                      {formatQuotePremium(quote, t("perMonth"))}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                {t("quoteCaveat")}
              </p>
            </div>
          )}

          {(product.premiumBasis || sourceUrl || caveats.length > 0) && (
            <div className="mt-3 flex flex-col gap-1.5 border-t border-border/50 pt-2.5">
              {product.premiumBasis && (
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">{t("premiumBasis")}: </span>
                  {product.premiumBasis}
                </p>
              )}
              {caveats.slice(0, 2).map((caveat, index) => (
                <p key={`${index}-${caveat}`} className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">{t("caveat")}: </span>
                  {caveat}
                </p>
              ))}
              {(sourceUrl || sourceDate) && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                  {sourceDate && (
                    <span>
                      <span className="font-medium text-foreground">{t("sourceChecked")}: </span>
                      {sourceDate}
                    </span>
                  )}
                  {sourceUrl && (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      {t("officialSource")}
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
