"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { useWallet } from "@/context/WalletContext";
import { AppHeader } from "@/components/modules/AppHeader";
import { FileUploadZone } from "@/components/modules/FileUploadZone";
import { Badge } from "@/components/ui/badge";
import { getOrCreateTestPilotGuestIdentity, isTestPilotClientEnabled } from "@/lib/test-pilot";

export default function UploadPage() {
  const { isConnected, isLoading } = useWallet();
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("upload");
  const tc = useTranslations("common");
  const [testPilotGuestId, setTestPilotGuestId] = useState<string | null>(null);

  const isTestPilotRequested = searchParams.get("mode") === "test";
  const isTestPilotAllowed = isTestPilotRequested && isTestPilotClientEnabled();

  useEffect(() => {
    let cancelled = false;
    const setGuestId = (guestId: string | null) => {
      queueMicrotask(() => {
        if (!cancelled) setTestPilotGuestId(guestId);
      });
    };

    if (isLoading) return;

    if (isTestPilotAllowed) {
      const guestId = getOrCreateTestPilotGuestIdentity();
      setGuestId(guestId);
      return () => {
        cancelled = true;
      };
    }

    setGuestId(null);

    if (!isConnected) {
      router.replace("/");
    }

    return () => {
      cancelled = true;
    };
  }, [isConnected, isLoading, isTestPilotAllowed, router]);

  const canAccessUpload = isConnected || Boolean(testPilotGuestId);

  const STEPS = useMemo(() => {
    const firstStep = testPilotGuestId ? tc("steps.testPilotStart") : tc("steps.walletConnect");
    const finalStep = testPilotGuestId ? tc("steps.testApplication") : tc("steps.payment");

    return [
      firstStep,
      tc("steps.fileUpload"),
      tc("steps.teeAnalysis"),
      tc("steps.insuranceRecommend"),
      finalStep,
    ];
  }, [tc, testPilotGuestId]);

  if (isLoading || !canAccessUpload) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader backHref="/" backLabel={t("backLabel")} />

      <div className="flex items-center justify-center gap-2 py-4 border-b border-border">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={[
                "flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold",
                i === 1
                  ? "bg-primary text-primary-foreground"
                  : i < 1
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : "bg-muted text-muted-foreground",
              ].join(" ")}
            >
              {i + 1}
            </div>
            <span
              className={[
                "text-xs hidden sm:inline",
                i === 1 ? "text-foreground font-medium" : "text-muted-foreground",
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
          {testPilotGuestId && (
            <Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
              {t("testPilotBadge")}
            </Badge>
          )}
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            {testPilotGuestId ? t("testPilotDescription") : t("description")}
          </p>
        </div>

        <FileUploadZone testPilotGuestId={testPilotGuestId} />

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs text-muted-foreground">{t("supportedFormats")}</p>
          <p className="text-xs text-muted-foreground">{t("maxSize")}</p>
        </div>
      </main>
    </div>
  );
}
