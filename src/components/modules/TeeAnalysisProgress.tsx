"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runAnalysis } from "@/actions/runAnalysis";
import { ZkpFlowDiagram } from "@/components/modules/ZkpFlowDiagram";
import type { AnalysisStage } from "@/components/modules/ZkpFlowDiagram";

// ─── 단계 정의 ────────────────────────────────────────────────────────────────

interface StageConfig {
  label: string;
  sublabel: string;
  progress: number;
}

const STAGE_CONFIG: Record<AnalysisStage, StageConfig> = {
  parsing:   { label: "파일 파싱 중",       sublabel: "유전자 파일 데이터 구조 분석 중",                    progress: 10 },
  tee:       { label: "TEE 분석 중",        sublabel: "IronClaw 보안 환경 내부에서 처리 중",                 progress: 35 },
  zkp:       { label: "ZKP 증명 생성 중",   sublabel: "유전자 수치 없이 자격 증명 생성 중",                  progress: 65 },
  profiling: { label: "위험 프로파일 생성", sublabel: "분석 결과 암호화 저장 중",                            progress: 85 },
  purged:    { label: "데이터 소각 완료",   sublabel: "유전자 원본 데이터가 안전하게 소각되었습니다",         progress: 100 },
  error:     { label: "분석 실패",          sublabel: "오류가 발생했습니다",                                 progress: 0 },
};

const STEPS: Array<{ key: AnalysisStage; label: string }> = [
  { key: "parsing",   label: "파일 파싱" },
  { key: "tee",       label: "TEE 분석" },
  { key: "zkp",       label: "ZKP 증명" },
  { key: "profiling", label: "프로파일 생성" },
  { key: "purged",    label: "소각 완료" },
];

const STAGE_ORDER: AnalysisStage[] = ["parsing", "tee", "zkp", "profiling", "purged"];

// 애니메이션 타임라인
const STAGE_TIMELINE: Array<{ stage: AnalysisStage; delay: number }> = [
  { stage: "parsing",   delay: 0 },
  { stage: "tee",       delay: 600 },
  { stage: "zkp",       delay: 2800 },
  { stage: "profiling", delay: 3000 },
  { stage: "purged",    delay: 3500 },
];

// Memory Purge 파티클
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  angle: (i * 360) / 12,
}));

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

interface TeeAnalysisProgressProps {
  sessionId: string;
}

type LogEntry = { id: string; text: string; type: "default" | "success" | "private" | "system" | "error" };

export function TeeAnalysisProgress({ sessionId }: TeeAnalysisProgressProps) {
  const router = useRouter();
  const [stage, setStage] = useState<AnalysisStage>("parsing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsRef = useRef<LogEntry[]>([]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let isMounted = true;

    const resultRef = { value: null as { success: boolean; error?: string } | null };
    const stageRef = { value: "parsing" as AnalysisStage };

    // Server Action 실행
    runAnalysis(sessionId).then((result) => {
      if (!isMounted) return;
      resultRef.value = result;

      if (!result.success) {
        timers.forEach(clearTimeout);
        setStage("error");
        setErrorMessage(result.error ?? "분석 중 오류가 발생했습니다");
        toast.error("분석 실패: " + (result.error ?? "알 수 없는 오류"));
        return;
      }

      // 애니메이션이 이미 "purged"에 도달한 경우 완료 상태로 전환
      if (stageRef.value === "purged") {
        setTimeout(() => { if (isMounted) setIsDone(true); }, 1200);
      }
    });

    // 애니메이션 타임라인 실행
    STAGE_TIMELINE.forEach(({ stage: s, delay }) => {
      timers.push(
        setTimeout(() => {
          if (!isMounted) return;
          stageRef.value = s;
          setStage(s);

          if (s === "purged" && resultRef.value?.success) {
            setTimeout(() => { if (isMounted) setIsDone(true); }, 1200);
          }
        }, delay)
      );
    });

    return () => {
      isMounted = false;
      timers.forEach(clearTimeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const currentStageIndex = STAGE_ORDER.indexOf(stage);
  const config = STAGE_CONFIG[stage];

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">

      {/* 진행 바 */}
      <div className="w-full h-1 bg-border rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: "0%" }}
          animate={{ width: stage === "error" ? "0%" : `${config.progress}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>

      {/* 단계 인디케이터 */}
      <div className="flex items-center gap-1 w-full justify-between">
        {STEPS.map((step, i) => {
          const isDoneStep = currentStageIndex > i;
          const isActive = currentStageIndex === i && stage !== "error";
          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={[
                  "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors duration-300",
                  isDoneStep
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                    : isActive
                    ? "bg-primary/20 text-primary border border-primary/50"
                    : "bg-muted text-muted-foreground border border-border",
                ].join(" ")}
              >
                {isDoneStep ? (
                  <CheckCircle size={14} />
                ) : isActive ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={[
                  "text-xs text-center leading-tight hidden sm:block",
                  isDoneStep
                    ? "text-emerald-400"
                    : isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground",
                ].join(" ")}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Memory Purge 파티클 */}
      <div className="relative w-full flex justify-center">
        <AnimatePresence>
          {stage === "purged" &&
            PARTICLES.map(({ id, angle }) => {
              const radian = (angle * Math.PI) / 180;
              const distance = 60;
              return (
                <motion.div
                  key={id}
                  className="absolute w-2 h-2 rounded-full bg-emerald-500"
                  style={{ top: 0, left: "50%" }}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos(radian) * distance,
                    y: Math.sin(radian) * distance,
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 0.9, ease: "easeOut" }}
                />
              );
            })}
        </AnimatePresence>
      </div>

      {/* 터미널 로그 */}
      {stage !== "error" && (
        <ZkpFlowDiagram
          stage={stage}
          logsRef={logsRef}
          onLogsChange={setLogs}
        />
      )}

      {/* 로그 렌더링 트리거용 — logs state 사용 */}
      {logs.length === 0 && null}

      {/* ZKP 완료 배지 */}
      <AnimatePresence>
        {(stage === "profiling" || stage === "purged") && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs"
          >
            <CheckCircle size={13} />
            자격 증명 생성 완료 — 수치는 보험사에 전달되지 않습니다
          </motion.div>
        )}
      </AnimatePresence>

      {/* 완료 버튼 — 자동 이동 없이 사용자가 직접 클릭 */}
      <AnimatePresence>
        {isDone && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col items-center gap-2"
          >
            <p className="text-xs text-muted-foreground">
              분석이 완료되었습니다. 위 로그를 확인 후 대시보드로 이동하세요.
            </p>
            <Button
              className="w-full"
              onClick={() => router.push(`/dashboard?sid=${sessionId}`)}
            >
              대시보드로 이동
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 에러 상태 */}
      <AnimatePresence>
        {stage === "error" && errorMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <AlertCircle size={36} className="text-destructive" strokeWidth={1.5} />
            <p className="text-sm text-destructive">{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/upload")}
            >
              파일 업로드로 돌아가기
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
