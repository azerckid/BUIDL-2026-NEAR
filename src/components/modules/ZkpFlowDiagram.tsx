"use client";

// 터미널 스타일 ZKP 프로토콜 흐름 로그
// 단계별 로그가 순차적으로 추가되며, 완료 후에도 사라지지 않음

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export type AnalysisStage = "parsing" | "tee" | "zkp" | "profiling" | "purged" | "error";

interface LogEntry {
  id: string;
  text: string;
  type: "default" | "success" | "private" | "system" | "error";
}

const STAGE_LOGS: Record<AnalysisStage, Array<{ text: string; type: LogEntry["type"] }>> = {
  parsing: [
    { text: "> [Browser]  Computing file_hash...", type: "default" },
    { text: "> [Browser]  → TEE    file_hash transmitted", type: "success" },
  ],
  tee: [
    { text: "> [TEE]      Secure enclave initialized", type: "default" },
    { text: "> [TEE]      Parsing genetic profile... ✓", type: "success" },
    { text: "> [TEE]      risk_score computed  [PRIVATE — not exposed to insurer]", type: "private" },
  ],
  zkp: [
    { text: "> [Noir]     Loading insurance_eligibility circuit", type: "default" },
    { text: "> [Noir]     Executing ZKP proof generation...", type: "default" },
    { text: "> [Noir]     proof_bytes generated  ✓", type: "success" },
  ],
  profiling: [
    { text: "> [TEE]      Encoding risk profile (encrypted)", type: "default" },
    { text: "> [TEE]      → Browser   proof_bytes transferred  ✓", type: "success" },
  ],
  purged: [
    { text: "> [TEE]      Memory wipe initiated...", type: "default" },
    { text: "> [TEE]      All genetic data purged  ✓", type: "success" },
    { text: "> [NEAR]     Broadcasting tx + proof calldata  ✓", type: "success" },
    { text: "> ─────────────────────────────────────────────────", type: "system" },
    { text: "> Process complete. Raw DNA never left the TEE.", type: "system" },
  ],
  error: [
    { text: "> [ERROR]    Analysis pipeline failed", type: "error" },
  ],
};

const TYPE_COLORS: Record<LogEntry["type"], string> = {
  default:  "text-green-400",
  success:  "text-emerald-300",
  private:  "text-yellow-400",
  system:   "text-zinc-400",
  error:    "text-red-400",
};

interface ZkpFlowDiagramProps {
  stage: AnalysisStage;
  logsRef: React.MutableRefObject<LogEntry[]>;
  onLogsChange: (logs: LogEntry[]) => void;
}

export function ZkpFlowDiagram({ stage, logsRef, onLogsChange }: ZkpFlowDiagramProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const processedStages = useRef<Set<AnalysisStage>>(new Set());

  useEffect(() => {
    if (processedStages.current.has(stage)) return;
    processedStages.current.add(stage);

    const entries = STAGE_LOGS[stage];
    if (!entries) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    entries.forEach((entry, i) => {
      timers.push(
        setTimeout(() => {
          const newEntry: LogEntry = {
            id: `${stage}-${i}`,
            text: entry.text,
            type: entry.type,
          };
          logsRef.current = [...logsRef.current, newEntry];
          onLogsChange([...logsRef.current]);
        }, i * 200)
      );
    });

    return () => timers.forEach(clearTimeout);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logsRef.current.length]);

  return (
    <div className="w-full rounded-lg border border-zinc-700 bg-zinc-950 overflow-hidden shadow-lg">
      {/* 터미널 헤더 */}
      <div className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 border-b border-zinc-700">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
        <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
        <span className="ml-2 text-xs text-zinc-500 font-mono">tee-analysis  —  ironclaw runtime</span>
      </div>

      {/* 로그 영역 */}
      <div className="px-4 py-3 font-mono text-xs space-y-1.5 min-h-[200px] max-h-[300px] overflow-y-auto">
        {logsRef.current.map((log) => (
          <motion.p
            key={log.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
            className={TYPE_COLORS[log.type]}
          >
            {log.text}
          </motion.p>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
