"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { WalletConnect } from "@/components/modules/WalletConnect";
import { Badge } from "@/components/ui/badge";
import { useWallet } from "@/context/WalletContext";
import { Button } from "@/components/ui/button";

// 3D DNA 배경 — SSR 비활성화 (WebGL은 서버에서 실행 불가)
const DnaBackground = dynamic(
  () => import("@/components/modules/DnaBackground").then((m) => ({ default: m.DnaBackground })),
  { ssr: false }
);

export default function Home() {
  const { isConnected } = useWallet();
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="text-primary font-bold text-xl tracking-tight">MyDNA</span>
          <Badge
            variant="outline"
            className="border-primary/40 text-primary text-xs"
          >
            Insurance Agent
          </Badge>
        </div>
        <WalletConnect />
      </header>

      {/* Hero */}
      <main className="relative flex flex-1 flex-col items-center justify-center px-6 text-center gap-8 overflow-hidden">
        <DnaBackground />
        {/* 콘텐츠 — DNA 배경 위에 표시 */}
        <div className="relative z-10 flex flex-col items-center gap-8">

        {/* Status badge */}
        <Badge
          variant="outline"
          className="border-primary/30 bg-primary/5 text-primary/80 px-4 py-1.5 text-xs uppercase tracking-widest"
        >
          NEAR Buidl 2026 — Privacy-First Genetic Insurance
        </Badge>

        {/* Headline */}
        <div className="flex flex-col items-center gap-4 max-w-3xl">
          <h1 className="text-5xl font-bold tracking-tight text-foreground leading-tight">
            유전자 분석,{" "}
            <span className="text-primary">TEE 안에서만.</span>
            <br />
            보험사엔 자격 여부만 전달됩니다.
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
            유전자 원본 데이터는 Trusted Execution Environment에서 분석 후 즉시 소각됩니다.
            Noir ZKP 증명으로 수치 없이 자격을 증명하고, Confidential Intents로 기밀 결제합니다.
          </p>
        </div>

        {/* CTA */}
        {!isConnected ? (
          <div className="flex flex-col items-center gap-3">
            <WalletConnect />
            <p className="text-xs text-muted-foreground">
              NEAR Testnet 지갑을 연결하여 분석을 시작하세요
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              onClick={() => router.push("/upload")}
              className="min-w-[200px] font-semibold"
            >
              유전자 파일 업로드 시작
            </Button>
            <p className="text-xs text-emerald-500">
              지갑 연결 완료 — 다음 단계로 진행할 수 있습니다
            </p>
          </div>
        )}

        {/* Feature grid */}
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
        </div> {/* z-10 콘텐츠 래퍼 끝 */}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-muted-foreground border-t border-border">
        Powered by NEAR Protocol — IronClaw TEE · Confidential Intents · Chain Signatures
      </footer>
    </div>
  );
}

const FEATURES = [
  {
    label: "TEE",
    title: "TEE 프라이버시 분석",
    desc: "유전자 데이터는 IronClaw TEE 안에서만 처리되고 분석 즉시 소각됩니다.",
  },
  {
    label: "ZKP",
    title: "Noir ZKP 자격 증명",
    desc: "유전자 수치는 공개하지 않고 보험 자격 충족 여부만 영지식 증명으로 제출합니다.",
  },
  {
    label: "CI",
    title: "Confidential Intents 결제",
    desc: "NEAR Confidential Intents로 보험료를 기밀 결제합니다. 거래 내용은 당사자만 확인 가능합니다.",
  },
];
