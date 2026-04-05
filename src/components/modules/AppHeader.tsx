"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WalletConnect } from "@/components/modules/WalletConnect";

interface AppHeaderProps {
  /** 뒤로가기 버튼 표시 여부 */
  backHref?: string;
  /** 뒤로가기 버튼 레이블 */
  backLabel?: string;
}

export function AppHeader({ backHref, backLabel = "이전" }: AppHeaderProps) {
  const router = useRouter();

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-border">
      {/* 왼쪽: 로고 + 뒤로가기 */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-primary font-bold text-xl tracking-tight">MyDNA</span>
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
              {backLabel}
            </Button>
          </>
        )}
      </div>

      {/* 오른쪽: 지갑 */}
      <WalletConnect />
    </header>
  );
}
