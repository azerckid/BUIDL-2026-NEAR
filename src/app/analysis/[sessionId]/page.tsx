import Link from "next/link";
import { db } from "@/lib/db";
import { analysisSessions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { WalletConnect } from "@/components/modules/WalletConnect";
import { TeeAnalysisProgress } from "@/components/modules/TeeAnalysisProgress";
import { Badge } from "@/components/ui/badge";

interface AnalysisPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { sessionId } = await params;

  const sessions = await db
    .select({ status: analysisSessions.status })
    .from(analysisSessions)
    .where(eq(analysisSessions.id, sessionId))
    .limit(1);

  // 세션 미존재
  if (sessions.length === 0) {
    redirect("/upload");
  }

  // 이미 완료된 세션 → 대시보드로 바로 이동
  const { status } = sessions[0];
  if (status === "purged") {
    redirect(`/dashboard?sid=${sessionId}`);
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

      {/* Step 인디케이터 */}
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

      {/* 메인 콘텐츠 */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-12 gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">TEE 분석 진행 중</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            유전자 데이터가 IronClaw Trusted Execution Environment 내부에서 분석됩니다.
            <br />
            분석 완료 즉시 원본 데이터는 소각됩니다.
          </p>
        </div>

        <TeeAnalysisProgress sessionId={sessionId} />
      </main>
    </div>
  );
}

const STEPS = ["지갑 연결", "파일 업로드", "TEE 분석", "보험 추천", "결제"];
