"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskLevel, RiskProfile } from "@/lib/db/schema";

const LEVEL_CLASS: Record<RiskLevel, string> = {
  high: "bg-red-100 text-red-700 border-red-200",
  moderate: "bg-amber-100 text-amber-700 border-amber-200",
  normal: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

interface RiskProfileCardProps {
  category: keyof RiskProfile;
  level: RiskLevel;
  flags: string[];
}

export function RiskProfileCard({ category, level, flags }: RiskProfileCardProps) {
  const t = useTranslations("riskProfile");

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">
            {t(`categories.${category}`)}
          </CardTitle>
          <Badge variant="outline" className={`text-xs font-medium ${LEVEL_CLASS[level]}`}>
            {t(`levels.${level}`)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {flags.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("noFlags")}</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {flags.map((flag) => (
              <li key={flag}>
                <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {t.has(`flags.${flag}`) ? t(`flags.${flag}` as Parameters<typeof t>[0]) : flag}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
