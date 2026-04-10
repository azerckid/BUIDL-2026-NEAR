import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { analysisSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/modules/AppHeader";
import { TeeAnalysisProgress } from "@/components/modules/TeeAnalysisProgress";

interface AnalysisPageProps {
  params: Promise<{ sessionId: string; locale: string }>;
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { sessionId, locale } = await params;
  const t = await getTranslations("analysis");
  const tc = await getTranslations("common");

  const sessions = await db
    .select({ status: analysisSessions.status, walletAddress: analysisSessions.walletAddress })
    .from(analysisSessions)
    .where(eq(analysisSessions.id, sessionId))
    .limit(1);

  if (sessions.length === 0) redirect(`/${locale}/upload`);

  const { status, walletAddress } = sessions[0];
  if (status === "purged") redirect(`/${locale}/dashboard?sid=${sessionId}&wallet=${encodeURIComponent(walletAddress)}`);

  const STEPS = [
    tc("steps.walletConnect"),
    tc("steps.fileUpload"),
    tc("steps.teeAnalysis"),
    tc("steps.insuranceRecommend"),
    tc("steps.payment"),
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader backHref="/upload" backLabel={t("backLabel")} />

      <div className="flex items-center justify-center gap-2 py-4 border-b border-border">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={[
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                i === 2
                  ? "bg-primary text-primary-foreground"
                  : i < 2
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {i + 1}
            </div>
            <span
              className={[
                "text-xs hidden sm:inline",
                i === 2 ? "text-foreground font-medium" : "text-muted-foreground",
              ].join(" ")}
            >
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <span className="text-muted-foreground/40 text-xs">—</span>
            )}
          </div>
        ))}
      </div>

      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground max-w-md">{t("description")}</p>
        </div>
        <Suspense>
          <TeeAnalysisProgress sessionId={sessionId} walletAddress={walletAddress} />
        </Suspense>
      </main>
    </div>
  );
}
