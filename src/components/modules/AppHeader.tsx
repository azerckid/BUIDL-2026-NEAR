"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WalletConnect } from "@/components/modules/WalletConnect";

interface AppHeaderProps {
  backHref?: string;
  backLabel?: string;
}

function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();

  const toggle = () => {
    router.replace("/", { locale: locale === "ko" ? "en" : "ko" });
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="text-xs text-muted-foreground hover:text-foreground font-mono px-2"
      onClick={toggle}
    >
      {locale === "ko" ? "EN" : "KO"}
    </Button>
  );
}

export function AppHeader({ backHref, backLabel }: AppHeaderProps) {
  const router = useRouter();
  const tc = useTranslations("common");
  const label = backLabel ?? tc("back");

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-border">
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-primary font-bold text-xl tracking-tight">ohmyDNA</span>
          <Badge variant="outline" className="border-primary/40 text-primary text-xs">
            Insurance Agent
          </Badge>
        </Link>

        {backHref && (
          <>
            <span className="text-border">|</span>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-1 px-2"
              onClick={() => router.push(backHref)}
            >
              <ChevronLeft size={14} />
              {label}
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        <WalletConnect />
      </div>
    </header>
  );
}
