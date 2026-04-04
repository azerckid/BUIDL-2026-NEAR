import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

interface InsuranceProductCardProps {
  product: InsuranceProduct;
  selected: boolean;
  onToggle: (id: string) => void;
}

export function InsuranceProductCard({ product, selected, onToggle }: InsuranceProductCardProps) {
  const isDiscount = product.discountEligible === 1 && product.originalPremiumUsdc != null;

  return (
    <Card
      className={`cursor-pointer border transition-colors ${
        selected
          ? "border-primary/60 bg-primary/5"
          : "border-border/60 hover:border-border"
      }`}
      onClick={() => onToggle(product.id)}
    >
      <CardContent className="flex items-start gap-3 py-4">
        {/* 체크박스 */}
        <div
          className={`mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors ${
            selected
              ? "border-primary bg-primary"
              : "border-border bg-background"
          }`}
        >
          {selected && (
            <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 12 12">
              <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* 상품 정보 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground leading-tight">{product.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{product.provider}</p>
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
          </div>

          <div className="mt-2 flex items-center gap-1.5">
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
      </CardContent>
    </Card>
  );
}
