import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { RiskLevel, RiskProfile } from "@/lib/db/schema";

const CATEGORY_LABELS: Record<keyof RiskProfile, string> = {
  oncology: "종양·암",
  cardiovascular: "심혈관",
  metabolic: "대사·내분비",
  neurological: "신경·뇌",
};

const LEVEL_CONFIG: Record<RiskLevel, { label: string; className: string }> = {
  high: { label: "고위험", className: "bg-red-100 text-red-700 border-red-200" },
  moderate: { label: "주의", className: "bg-amber-100 text-amber-700 border-amber-200" },
  normal: { label: "정상", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

const FLAG_LABELS: Record<string, string> = {
  pancreatic_cancer: "췌장암",
  liver_cancer: "간암",
  lung_cancer: "폐암",
  breast_cancer: "유방암",
  colon_cancer: "대장암",
  myocardial_infarction: "심근경색",
  stroke: "뇌졸중",
  arrhythmia: "부정맥",
  type2_diabetes: "2형 당뇨",
  hyperlipidemia: "고지혈증",
  thyroid_disorder: "갑상선 이상",
  alzheimers: "알츠하이머",
  parkinsons: "파킨슨병",
};

interface RiskProfileCardProps {
  category: keyof RiskProfile;
  level: RiskLevel;
  flags: string[];
}

export function RiskProfileCard({ category, level, flags }: RiskProfileCardProps) {
  const config = LEVEL_CONFIG[level];

  return (
    <Card className="border border-border/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-foreground">
            {CATEGORY_LABELS[category]}
          </CardTitle>
          <Badge variant="outline" className={`text-xs font-medium ${config.className}`}>
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {flags.length === 0 ? (
          <p className="text-xs text-muted-foreground">감지된 위험 인자 없음</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {flags.map((flag) => (
              <li key={flag}>
                <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                  {FLAG_LABELS[flag] ?? flag}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
