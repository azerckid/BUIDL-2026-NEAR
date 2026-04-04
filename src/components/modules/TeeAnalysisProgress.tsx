"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { runAnalysis } from "@/actions/runAnalysis";

// ─── 단계 정의 ────────────────────────────────────────────────────────────────

type AnalysisStage = "parsing" | "tee" | "zkp" | "profiling" | "purged" | "error";

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

// 애니메이션 타임라인 — runAnalysis 예상 소요 시간(~2.7초)과 동기화
const STAGE_TIMELINE: Array<{ stage: AnalysisStage; delay: number }> = [
  { stage: "parsing",   delay: 0 },
  { stage: "tee",       delay: 600 },
  { stage: "zkp",       delay: 2800 },
  { stage: "profiling", delay: 3000 },
  { stage: "purged",    delay: 3500 },
];

// Memory Purge 파티클 설정
const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  angle: (i * 360) / 12,
}));

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

interface TeeAnalysisProgressProps {
  sessionId: string;
}

export function TeeAnalysisProgress({ sessionId }: TeeAnalysisProgressProps) {
  const router = useRouter();
  const [stage, setStage] = useState<AnalysisStage>("parsing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let isMounted = true;

    // 서버에서 완료 여부 추적용 ref (클로저 공유)
    const resultRef = { value: null as { success: boolean; error?: string } | null };
    const stageRef = { value: "parsing" as AnalysisStage };

    const navigateToDashboard = () => {
      if (isMounted) router.push(`/dashboard?sid=${sessionId}`);
    };

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

      // 애니메이션이 이미 "purged"에 도달한 경우 바로 이동
      if (stageRef.value === "purged") {
        setTimeout(navigateToDashboard, 1000);
      }
    });

    // 애니메이션 타임라인 실행
    STAGE_TIMELINE.forEach(({ stage: s, delay }) => {
      timers.push(
        setTimeout(() => {
          if (!isMounted) return;
          stageRef.value = s;
          setStage(s);

          // "purged" 도달 시 — 서버 결과가 이미 왔으면 바로 이동
          if (s === "purged" && resultRef.value?.success) {
            setTimeout(navigateToDashboard, 1000);
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
    <div className="flex flex-col items-center gap-8 w-full max-w-lg">

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
          const isDone = currentStageIndex > i;
          const isActive = currentStageIndex === i && stage !== "error";
          return (
            <div key={step.key} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={[
                  "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors duration-300",
                  isDone
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"
                    : isActive
                    ? "bg-primary/20 text-primary border border-primary/50"
                    : "bg-muted text-muted-foreground border border-border",
                ].join(" ")}
              >
                {isDone ? (
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
                  isDone
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

      {/* 중앙 상태 표시 */}
      <div className="relative flex flex-col items-center gap-3 py-8">
        {/* Memory Purge 파티클 애니메이션 */}
        <AnimatePresence>
          {stage === "purged" &&
            PARTICLES.map(({ id, angle }) => {
              const radian = (angle * Math.PI) / 180;
              const distance = 72;
              return (
                <motion.div
                  key={id}
                  className="absolute w-2 h-2 rounded-full bg-emerald-500"
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

        {/* 에러 아이콘 */}
        {stage === "error" ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-destructive"
          >
            <AlertCircle size={48} strokeWidth={1.5} />
          </motion.div>
        ) : (
          <motion.div
            key={stage}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={stage === "purged" ? "text-emerald-500" : "text-primary"}
          >
            {stage === "purged" ? (
              <CheckCircle size={48} strokeWidth={1.5} />
            ) : (
              <Loader2 size={48} strokeWidth={1.5} className="animate-spin" />
            )}
          </motion.div>
        )}

        {/* 단계 텍스트 */}
        <AnimatePresence mode="wait">
          <motion.div
            key={stage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-1 text-center"
          >
            <p className="font-semibold text-foreground">{config.label}</p>
            <p className="text-sm text-muted-foreground">{config.sublabel}</p>
          </motion.div>
        </AnimatePresence>
      </div>

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

      {/* 에러 상태 */}
      <AnimatePresence>
        {stage === "error" && errorMessage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-3 text-center"
          >
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
