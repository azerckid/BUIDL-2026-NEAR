"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useWallet } from "@/context/WalletContext";
import { truncateAddress } from "@/lib/near/wallet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { upsertUserProfile } from "@/actions/upsertUserProfile";

interface WalletConnectProps {
  onConnected?: (accountId: string) => void;
}

export function WalletConnect({ onConnected }: WalletConnectProps) {
  const { accountId, isConnected, isLoading, connect, disconnect } = useWallet();
  const t = useTranslations("walletConnect");
  const prevAccountIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const prev = prevAccountIdRef.current;

    if (prev === undefined) {
      prevAccountIdRef.current = accountId;
      if (accountId) saveProfile(accountId);
      return;
    }

    if (!prev && accountId) {
      toast.success(t("toastConnected", { address: truncateAddress(accountId) }));
      saveProfile(accountId);
    } else if (prev && !accountId) {
      toast.info(t("toastDisconnected"));
    }

    prevAccountIdRef.current = accountId;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  async function saveProfile(id: string) {
    const result = await upsertUserProfile(id);
    if (result.success) {
      toast.success(t("toastProfileSaved"));
      onConnected?.(id);
    } else {
      toast.error(t("toastProfileError", { error: result.error ?? "unknown error" }));
    }
  }

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="min-w-[160px]">
        <span className="animate-pulse">{t("connecting")}</span>
      </Button>
    );
  }

  if (isConnected && accountId) {
    return (
      <div className="flex items-center gap-3">
        <Badge
          variant="outline"
          className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 text-sm font-mono"
        >
          <span className="mr-2 h-2 w-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
          {truncateAddress(accountId)}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={() => disconnect()}
          className="border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500"
        >
          {t("disconnect")}
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={connect}
      className="min-w-[160px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
    >
      {t("connect")}
    </Button>
  );
}
