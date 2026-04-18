"use server";

import { db } from "@/lib/db";
import { analysisSessions, analysisResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { parseMockFile } from "@/lib/tee/normalizer";
import { runMockTeeAnalysis } from "@/lib/tee/mock-tee";
import { runIronClawAnalysis } from "@/lib/tee/ironclaw-tee";
import { verifyAttestation } from "./verifyAttestation";
import { teeAnalysisOutputSchema } from "@/types/tee-output";
import { generateZkpProof, derivePrimaryRiskScore } from "@/lib/zkp/prover";
import { verifyZkpProof, submitProofHashOnChain } from "@/lib/zkp/verifier";
import { matchProducts } from "./matchProducts";
import { updateSessionStatus } from "./updateSessionStatus";
import { consumeAuthNonce } from "./generateAuthNonce";
import { verifyNearSignature } from "@/lib/near/verify-signature";
import { AUTH_MESSAGE, AUTH_RECIPIENT } from "@/lib/near/wallet";

export interface AuthPayload {
  signature: string;   // base64
  publicKey: string;   // "ed25519:BASE58..."
  nonce: string;       // 64-char hex
  callbackUrl: string;
}

interface RunAnalysisResult {
  success: boolean;
  error?: string;
  attestationVerified?: boolean | null;
}

export async function runAnalysis(
  sessionId: string,
  auth: AuthPayload
): Promise<RunAnalysisResult> {
  try {
    // 세션 조회 + 재실행 가드
    const sessions = await db
      .select({
        status: analysisSessions.status,
        walletAddress: analysisSessions.walletAddress,
      })
      .from(analysisSessions)
      .where(eq(analysisSessions.id, sessionId))
      .limit(1);

    if (sessions.length === 0) {
      return { success: false, error: "세션을 찾을 수 없습니다" };
    }

    const session = sessions[0];

    // 이미 완료된 세션은 재실행 없이 성공 반환
    if (session.status === "completed" || session.status === "purged") {
      return { success: true };
    }

    // ── 서명 검증 ─────────────────────────────────────────────────────────────
    // 1. Nonce 유효성 확인 및 소비 (Replay Attack 방지)
    const nonceCheck = await consumeAuthNonce(auth.nonce, session.walletAddress);
    if (!nonceCheck.valid) {
      return { success: false, error: `인증 실패: ${nonceCheck.error}` };
    }

    // 2. NEP-413 Ed25519 서명 검증
    // callbackUrl 포함 버전 먼저 시도, 실패 시 null로 재시도
    // (my-near-wallet 직접 반환 시 callbackUrl이 페이로드에 포함되지 않을 수 있음)
    const baseParams = {
      message: AUTH_MESSAGE,
      nonce: auth.nonce,
      recipient: AUTH_RECIPIENT,
      signature: auth.signature,
      publicKey: auth.publicKey,
    };

    const isValid =
      verifyNearSignature({ ...baseParams, callbackUrl: auth.callbackUrl }) ||
      verifyNearSignature({ ...baseParams, callbackUrl: null });

    if (!isValid) {
      return { success: false, error: "서명 검증 실패: 유효하지 않은 서명입니다" };
    }

    // ── Stage 1: 파싱 및 정규화 ────────────────────────────────────────────
    // Phase 0: B안 — 서버에서 mock 상수 직접 파싱 (파일 원본 서버 전송 없음)
    // Phase 2: 클라이언트가 NormalizedGeneticProfile로 정규화 후 전달
    const profile = parseMockFile();

    await updateSessionStatus(sessionId, "tee_processing");

    // ── TEE Attestation 사전 검증 ──────────────────────────────────────────
    // Phase 0: 실패해도 분석 계속 (nonce + 결과를 DB에 기록)
    // Phase 2: verified === false 시 throw로 전환
    let attestationNonce: string | null = null;
    let attestationVerified: boolean | null = null;
    try {
      const attestation = await verifyAttestation();
      attestationNonce = attestation.nonce;
      attestationVerified = attestation.verified;
      if (!attestation.verified) {
        // Phase 2 전환 시 아래 throw 활성화
        // throw new Error("TEE Attestation 검증 실패 — 분석 중단");
      }
    } catch {
      // 엔드포인트 일시 불가 — Phase 0에서는 분석 계속
    }

    // attestation 결과를 세션 레코드에 기록
    await db
      .update(analysisSessions)
      .set({ attestationNonce, attestationVerified })
      .where(eq(analysisSessions.id, sessionId));

    // ── Stage 2: TEE 분석 ──────────────────────────────────────────────────
    // USE_REAL_TEE=true → IronClaw NEAR AI Cloud, 미설정 → Mock (Phase 0)
    const useRealTee = process.env.USE_REAL_TEE === "true";
    const teeOutput = useRealTee
      ? await runIronClawAnalysis(sessionId, profile)
      : await runMockTeeAnalysis(sessionId, profile);

    // Zod 검증
    const validated = teeAnalysisOutputSchema.parse(teeOutput);

    await updateSessionStatus(sessionId, "zkp_generating");

    // ── Stage 2.5: ZKP proof 생성 + 온체인 등록 ──────────────────────────────
    // Phase 2: IronClaw TEE Tool Call → HMAC-SHA256 commitment proof
    // Phase 3 업그레이드: Barretenberg ultraplonk (Aztec verifier 라이브러리 출시 후)
    const riskScore = derivePrimaryRiskScore(validated.riskProfile);
    const zkpProof = await generateZkpProof({ riskScore, threshold: 50 });

    const proofValid = await verifyZkpProof(zkpProof);
    if (!proofValid) throw new Error("ZKP proof 검증 실패");

    // 온체인 등록 — 실패해도 파이프라인 비차단 (NEAR_PRIVATE_KEY 미설정 시 생략)
    const proofHash = await submitProofHashOnChain(zkpProof).catch(() => zkpProof.proofBytes);

    await updateSessionStatus(sessionId, "completed");

    // ── Stage 3: DB 상품 매칭 ─────────────────────────────────────────────
    const matchedIds = await matchProducts(
      validated.riskProfile,
      validated.priorityOrder
    );

    // ── 결과 저장 ─────────────────────────────────────────────────────────
    const now = DateTime.now();
    await db.insert(analysisResults).values({
      id: uuidv4(),
      sessionId,
      walletAddress: session.walletAddress,
      riskProfile: JSON.stringify(validated.riskProfile),
      recommendedProductIds: JSON.stringify(matchedIds),
      zkpProofHash: proofHash,
      advisoryMessages: JSON.stringify(validated.advisoryMessages),
      reasoning: validated.reasoning,
      coverageGapSummary: validated.coverageGapSummary,
      priorityOrder: JSON.stringify(validated.priorityOrder),
      generatedAt: now.toJSDate(),
      expiresAt: now.plus({ days: 30 }).toJSDate(),
    });

    await updateSessionStatus(sessionId, "purged");

    return { success: true, attestationVerified };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateSessionStatus(sessionId, "failed").catch(() => {});
    return { success: false, error: message };
  }
}
