import { Badge } from "@/components/ui/badge";

interface AnalysisPageProps {
  params: Promise<{ sessionId: string }>;
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { sessionId } = await params;

  return (
    <div className="flex flex-col min-h-screen bg-background items-center justify-center gap-6 px-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <Badge variant="outline" className="border-primary/40 text-primary text-xs">
          Stage 4 — TEE 분석
        </Badge>
        <h1 className="text-2xl font-bold text-foreground">분석 준비 완료</h1>
        <p className="text-sm text-muted-foreground">
          세션이 생성되었습니다. TEE 분석 화면은 Stage 4에서 구현됩니다.
        </p>
        <p className="font-mono text-xs text-muted-foreground/60 break-all">
          session: {sessionId}
        </p>
      </div>
    </div>
  );
}
