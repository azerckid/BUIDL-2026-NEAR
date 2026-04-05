"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@/context/WalletContext";
import { WalletConnect } from "@/components/modules/WalletConnect";
import { FileUploadZone } from "@/components/modules/FileUploadZone";
import { Badge } from "@/components/ui/badge";

export default function UploadPage() {
  const { isConnected, isLoading } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isConnected) {
      router.replace("/");
    }
  }, [isConnected, isLoading, router]);

  // 지갑 초기화 중 또는 미연결 → 빈 화면 (리다이렉트 처리 중)
  if (isLoading || !isConnected) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-border">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span className="text-primary font-bold text-xl tracking-tight">MyDNA</span>
          <Badge variant="outline" className="border-primary/40 text-primary text-xs">
            Insurance Agent
          </Badge>
        </Link>
        <WalletConnect />
      </header>

      {/* Step 진행 표시 */}
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

      {/* 메인 콘텐츠 */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">유전자 파일 업로드</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            파일은 서버로 전송되지 않습니다. 브라우저에서 해시값만 계산된 후
            <br />
            TEE 내부에서 원본 분석이 진행됩니다.
          </p>
        </div>

        <FileUploadZone />

        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-xs text-muted-foreground">지원 형식: GenTok(.txt), VCF(.vcf), CSV(.csv), PDF(.pdf)</p>
          <p className="text-xs text-muted-foreground">최대 파일 크기: 5MB</p>
        </div>
      </main>
    </div>
  );
}

const STEPS = ["지갑 연결", "파일 업로드", "TEE 분석", "보험 추천", "결제"];
