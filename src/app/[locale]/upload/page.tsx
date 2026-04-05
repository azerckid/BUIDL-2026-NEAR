"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { useWallet } from "@/context/WalletContext";
import { AppHeader } from "@/components/modules/AppHeader";
import { FileUploadZone } from "@/components/modules/FileUploadZone";

export default function UploadPage() {
  const { isConnected, isLoading } = useWallet();
  const router = useRouter();
  const t = useTranslations("upload");
  const tc = useTranslations("common");

  useEffect(() => {
    if (!isLoading && !isConnected) {
      router.replace("/");
    }
  }, [isConnected, isLoading, router]);

  if (isLoading || !isConnected) return null;

  const STEPS = [
    tc("steps.walletConnect"),
    tc("steps.fileUpload"),
    tc("steps.teeAnalysis"),
    tc("steps.insuranceRecommend"),
    tc("steps.payment"),
  ];

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
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground max-w-md">{t("description")}</p>
        </div>

        <FileUploadZone />

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs text-muted-foreground">{t("supportedFormats")}</p>
          <p className="text-xs text-muted-foreground">{t("maxSize")}</p>
        </div>
      </main>
    </div>
  );
}
