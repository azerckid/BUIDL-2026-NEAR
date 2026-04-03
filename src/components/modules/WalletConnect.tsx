"use client";

import { useEffect, useRef } from "react";
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
  // 최초 연결 시에만 토스트가 뜨도록 추적
  const prevAccountIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    // undefined → 아직 초기화 전, null → 미연결, string → 연결됨
    const prev = prevAccountIdRef.current;

    if (prev === undefined) {
      // 첫 렌더링: 초기값 기록만 하고 토스트 없음
      prevAccountIdRef.current = accountId;
      if (accountId) {
        // 리디렉션 후 복원된 연결 — DB 저장만 수행
        saveProfile(accountId);
      }
      return;
    }

    if (!prev && accountId) {
      // 미연결 → 연결됨 (신규 연결)
      toast.success(`지갑 연결 완료: ${truncateAddress(accountId)}`);
      saveProfile(accountId);
    } else if (prev && !accountId) {
      // 연결됨 → 미연결 (연결 해제)
      toast.info("지갑 연결이 해제되었습니다.");
    }

    prevAccountIdRef.current = accountId;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId]);

  async function saveProfile(id: string) {
    const result = await upsertUserProfile(id);
    if (result.success) {
      toast.success("프로필이 DB에 저장되었습니다.");
      onConnected?.(id);
    } else {
      toast.error(`프로필 저장 실패: ${result.error ?? "알 수 없는 오류"}`);
    }
  }

  const handleDisconnect = async () => {
    await disconnect();
  };

  if (isLoading) {
    return (
      <Button variant="outline" disabled className="min-w-[160px]">
        <span className="animate-pulse">초기화 중...</span>
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
          onClick={handleDisconnect}
          className="border-zinc-700 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500"
        >
          연결 해제
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={connect}
      className="min-w-[160px] bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
    >
      NEAR 지갑 연결
    </Button>
  );
}
