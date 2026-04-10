"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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

const STAGE_PROGRESS: Record<AnalysisStage, number> = {
  parsing: 10, tee: 35, zkp: 65, profiling: 85, purged: 100, error: 0,
};

const STAGE_ORDER: AnalysisStage[] = ["parsing", "tee", "zkp", "profiling", "purged"];

// TEE 분석 최대 대기 시간 (60초)
const ANALYSIS_TIMEOUT_MS = 60_000;

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
  walletAddress: string;
}

type LogEntry = { id: string; text: string; type: "default" | "success" | "private" | "system" | "error" };

export function TeeAnalysisProgress({ sessionId, walletAddress }: TeeAnalysisProgressProps) {
  const router = useRouter();
  const t = useTranslations("teeProgress");

  const STAGE_CONFIG: Record<AnalysisStage, StageConfig> = {
    parsing:   { label: t("steps.parsing"),   sublabel: t("steps.parsingDesc"),  progress: STAGE_PROGRESS.parsing },
    tee:       { label: t("steps.tee"),        sublabel: t("steps.teeDesc"),      progress: STAGE_PROGRESS.tee },
    zkp:       { label: t("steps.zkp"),        sublabel: t("steps.zkpDesc"),      progress: STAGE_PROGRESS.zkp },
    profiling: { label: t("steps.profile"),    sublabel: t("steps.profileDesc"),  progress: STAGE_PROGRESS.profiling },
    purged:    { label: t("steps.purge"),      sublabel: t("steps.purgeDesc"),    progress: STAGE_PROGRESS.purged },
    error:     { label: t("errorTitle"),       sublabel: t("errorDesc"),          progress: STAGE_PROGRESS.error },
  };

  const STEPS: Array<{ key: AnalysisStage; label: string }> = [
    { key: "parsing",   label: t("steps.parsing") },
    { key: "tee",       label: t("steps.tee") },
    { key: "zkp",       label: t("steps.zkp") },
    { key: "profiling", label: t("steps.profile") },
    { key: "purged",    label: t("steps.purge") },
  ];

  const [stage, setStage] = useState<AnalysisStage>("parsing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDone, setIsDone] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logsRef = useRef<LogEntry[]>([]);
  const doneBtnRef = useRef<HTMLDivElement>(null);
  const errorBtnRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isDone) {
      doneBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [isDone]);

  useEffect(() => {
    if (stage === "error") {
      errorBtnRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [stage]);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let isMounted = true;

    const resultRef = { value: null as { success: boolean; error?: string } | null };
    const stageRef = { value: "parsing" as AnalysisStage };

    // Server Action 실행 (60초 타임아웃 적용)
    const timeoutPromise = new Promise<{ success: false; error: string }>((resolve) => {
      setTimeout(() => resolve({ success: false, error: "__TIMEOUT__" }), ANALYSIS_TIMEOUT_MS);
    });

    Promise.race([runAnalysis(sessionId), timeoutPromise]).then((result) => {
      if (!isMounted) return;
      resultRef.value = result;

      if (!result.success) {
        timers.forEach(clearTimeout);
        setStage("error");
        const isTimeout = result.error === "__TIMEOUT__";
        const message = isTimeout ? t("timeoutError") : (result.error ?? t("analysisError"));
        setErrorMessage(message);
        toast.error(t("errorTitle") + ": " + message);
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
          // purged는 완료 상태 — 마지막 단계도 체크 아이콘으로 표시
          const isDoneStep = currentStageIndex > i || (stage === "purged" && currentStageIndex === i);
          const isActive = currentStageIndex === i && stage !== "error" && stage !== "purged";
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
            {t("zkpBadge")}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 완료 버튼 — 자동 이동 없이 사용자가 직접 클릭 */}
      <AnimatePresence>
        {isDone && (
          <motion.div
            ref={doneBtnRef}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full flex flex-col items-center gap-2"
          >
            <p className="text-xs text-muted-foreground">
              {t("doneMessage")}
            </p>
            <Button
              className="w-full"
              onClick={() => router.push(`/dashboard?sid=${sessionId}&wallet=${encodeURIComponent(walletAddress)}`)}
            >
              {t("goToDashboard")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 에러 상태 */}
      <AnimatePresence>
        {stage === "error" && errorMessage && (
          <motion.div
            ref={errorBtnRef}
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
              {t("backToUpload")}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
