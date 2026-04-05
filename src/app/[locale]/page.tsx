"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { AppHeader } from "@/components/modules/AppHeader";
import { useWallet } from "@/context/WalletContext";
import { WalletConnect } from "@/components/modules/WalletConnect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "@/i18n/navigation";

const DnaBackground = dynamic(
  () => import("@/components/modules/DnaBackground").then((m) => ({ default: m.DnaBackground })),
  { ssr: false }
);

export default function Home() {
  const { isConnected } = useWallet();
  const router = useRouter();
  const t = useTranslations("home");

  const FEATURES = [
    { label: t("features.tee.label"), title: t("features.tee.title"), desc: t("features.tee.desc") },
    { label: t("features.zkp.label"), title: t("features.zkp.title"), desc: t("features.zkp.desc") },
    { label: t("features.ci.label"),  title: t("features.ci.title"),  desc: t("features.ci.desc") },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />

      <main className="relative flex flex-1 flex-col items-center justify-center px-6 text-center gap-8 overflow-hidden">
        <DnaBackground />
        <div className="relative z-10 flex flex-col items-center gap-8">

          <Badge
            variant="outline"
            className="border-primary/30 bg-primary/5 text-primary/80 px-4 py-1.5 text-xs uppercase tracking-widest"
          >
            {t("badge")}
          </Badge>

          <div className="flex flex-col items-center gap-4 max-w-3xl">
            <h1 className="text-5xl font-bold tracking-tight text-foreground leading-tight">
              {t("headline1")}{" "}
              <span className="text-primary">{t("headline2")}</span>
              <br />
              {t("headline3")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              {t("description")}
            </p>
          </div>

          {!isConnected ? (
            <div className="flex flex-col items-center gap-3">
              <WalletConnect />
              <p className="text-xs text-muted-foreground">{t("connectPrompt")}</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Button
                size="lg"
                onClick={() => router.push("/upload")}
                className="min-w-[200px] font-semibold"
              >
                {t("startUpload")}
              </Button>
              <p className="text-xs text-emerald-500">{t("walletConnected")}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 max-w-3xl w-full">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="flex flex-col items-start gap-2 rounded-xl border border-border bg-card p-5 text-left"
              >
                <span className="text-xs font-mono font-bold text-primary border border-primary/30 rounded px-2 py-0.5">{f.label}</span>
                <h2 className="font-semibold text-sm text-foreground">{f.title}</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-muted-foreground border-t border-border">
        {t("footer")}
      </footer>
    </div>
  );
}
