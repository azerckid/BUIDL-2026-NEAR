"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, LockOpen, Upload, FileText, X } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { createSession } from "@/actions/createSession";
import { useWallet } from "@/context/WalletContext";

// ─── 파일 검증 상수 ───────────────────────────────────────────────────────────

const ALLOWED_EXTENSIONS = ["vcf", "txt", "csv", "pdf"] as const;
type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const fileValidationSchema = z.object({
  size: z.number().max(MAX_FILE_SIZE, "파일 크기는 5MB를 초과할 수 없습니다"),
  extension: z.enum([...ALLOWED_EXTENSIONS], {
    message: ".vcf, .txt, .csv, .pdf 파일만 허용됩니다",
  }),
});

// ─── 처리 단계 ────────────────────────────────────────────────────────────────

type ProcessStage = "idle" | "hashing" | "creating" | "done";

const STAGE_PROGRESS: Record<ProcessStage, number> = {
  idle: 0,
  hashing: 40,
  creating: 80,
  done: 100,
};

const STAGE_LABEL: Record<ProcessStage, string> = {
  idle: "",
  hashing: "SHA-256 해시 계산 중...",
  creating: "세션 생성 중...",
  done: "완료",
};

// ─── 유틸 함수 ────────────────────────────────────────────────────────────────

function getExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function FileUploadZone() {
  const router = useRouter();
  const { accountId } = useWallet();
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [stage, setStage] = useState<ProcessStage>("idle");
  const [isProcessing, setIsProcessing] = useState(false);

  const validateAndSetFile = useCallback((file: File) => {
    setValidationError(null);
    const ext = getExtension(file.name);
    const result = fileValidationSchema.safeParse({ size: file.size, extension: ext });

    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "파일 검증 실패";
      setValidationError(message);
      setSelectedFile(null);
      setIsLocked(false);
      toast.error(message);
      return;
    }

    setSelectedFile(file);
    setIsLocked(true);
    toast.success("파일 검증 완료 — 분석을 시작할 수 있습니다");
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndSetFile(file);
    },
    [validateAndSetFile]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndSetFile(file);
    },
    [validateAndSetFile]
  );

  const handleSampleFile = useCallback(async () => {
    try {
      const res = await fetch("/mock/mock_genome_gentok.txt");
      if (!res.ok) throw new Error("fetch 실패");
      const blob = await res.blob();
      const file = new File([blob], "mock_genome_gentok.txt", { type: "text/plain" });
      validateAndSetFile(file);
    } catch {
      toast.error("샘플 파일을 불러올 수 없습니다");
    }
  }, [validateAndSetFile]);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setIsLocked(false);
    setValidationError(null);
    setStage("idle");
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const handleStartAnalysis = useCallback(async () => {
    if (!selectedFile || !accountId) return;
    setIsProcessing(true);

    try {
      setStage("hashing");
      const fileHash = await computeSHA256(selectedFile);
      const fileType = getExtension(selectedFile.name) as AllowedExtension;

      setStage("creating");
      const result = await createSession(accountId, fileHash, fileType);

      if (!result.success || !result.sessionId) {
        toast.error(result.error ?? "세션 생성 실패");
        setIsProcessing(false);
        setStage("idle");
        return;
      }

      setStage("done");
      toast.success("세션 생성 완료 — 분석 화면으로 이동합니다");

      setTimeout(() => {
        router.push(`/analysis/${result.sessionId}`);
      }, 800);
    } catch {
      toast.error("처리 중 오류가 발생했습니다");
      setIsProcessing(false);
      setStage("idle");
    }
  }, [selectedFile, accountId, router]);

  const dropZoneClass = [
    "relative w-full rounded-2xl border-2 border-dashed transition-colors duration-200",
    "flex flex-col items-center justify-center gap-4 p-10",
    isDragOver
      ? "border-primary bg-primary/10"
      : selectedFile
      ? "border-emerald-500/60 bg-emerald-500/5"
      : "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
  ].join(" ");

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-lg">
      {/* 드롭존 */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!selectedFile) inputRef.current?.click();
        }}
        className={dropZoneClass}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".vcf,.txt,.csv,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* 자물쇠 / 업로드 아이콘 */}
        <AnimatePresence mode="wait">
          {isLocked ? (
            <motion.div
              key="locked"
              initial={{ scale: 0.4, opacity: 0, rotate: -15 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 22 }}
              className="text-emerald-500"
            >
              <Lock size={44} strokeWidth={1.8} />
            </motion.div>
          ) : (
            <motion.div
              key="unlocked"
              initial={{ opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-muted-foreground"
            >
              <LockOpen size={44} strokeWidth={1.8} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 파일 정보 / 안내 문구 */}
        {selectedFile ? (
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-2 text-emerald-400 font-medium text-sm">
              <FileText size={15} />
              <span className="max-w-[280px] truncate">{selectedFile.name}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleClearFile();
                }}
                className="text-muted-foreground hover:text-foreground ml-1 flex-shrink-0"
                aria-label="파일 제거"
              >
                <X size={14} />
              </button>
            </div>
            <span className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</span>
            <span className="text-xs text-emerald-500 mt-1">검증 완료 — 분석을 시작할 수 있습니다</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Upload size={16} />
              <p className="text-sm font-medium text-foreground">파일을 드래그하거나 클릭하여 선택</p>
            </div>
            <p className="text-xs text-muted-foreground">.vcf, .txt, .csv, .pdf — 최대 5MB</p>
          </div>
        )}
      </div>

      {/* 검증 에러 */}
      <AnimatePresence>
        {validationError && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="text-sm text-destructive"
          >
            {validationError}
          </motion.p>
        )}
      </AnimatePresence>

      {/* 샘플 파일 버튼 */}
      {!selectedFile && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleSampleFile}
          className="text-xs border-primary/30 text-primary/80 hover:text-primary hover:border-primary/60"
        >
          샘플 파일로 체험하기
        </Button>
      )}

      {/* 프로그레스 바 + 분석 시작 버튼 */}
      {selectedFile && (
        <div className="w-full flex flex-col gap-3">
          <AnimatePresence>
            {isProcessing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-2"
              >
                <Progress value={STAGE_PROGRESS[stage]} className="h-1.5" />
                <p className="text-xs text-center text-muted-foreground">
                  {STAGE_LABEL[stage]}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <Button
            onClick={handleStartAnalysis}
            disabled={isProcessing}
            className="w-full font-semibold"
          >
            {isProcessing ? "처리 중..." : "분석 시작"}
          </Button>
        </div>
      )}
    </div>
  );
}
