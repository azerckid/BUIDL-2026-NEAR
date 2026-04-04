import { Badge } from "@/components/ui/badge";

interface DashboardPageProps {
  searchParams: Promise<{ sid?: string }>;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const { sid } = await searchParams;

  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <Badge variant="outline" className="border-primary/40 text-primary text-xs">
          Stage 5 — 보험 추천 대시보드
        </Badge>
        <h1 className="text-2xl font-bold text-foreground">분석 완료</h1>
        <p className="text-sm text-muted-foreground">
          TEE 분석 및 ZKP 증명이 완료되었습니다.
          <br />
          보험 추천 대시보드는 Stage 5에서 구현됩니다.
        </p>
        {sid && (
          <p className="font-mono text-xs text-muted-foreground/60 break-all">
            session: {sid}
          </p>
        )}
      </div>
    </div>
  );
}
