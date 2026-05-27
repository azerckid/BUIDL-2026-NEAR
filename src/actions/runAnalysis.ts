"use server";

import { db } from "@/lib/db";
import { analysisSessions, analysisResults } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { v4 as uuidv4 } from "uuid";
import { runIronClawAnalysis } from "@/lib/tee/ironclaw-tee";
import { MOCK_GENTOK_CONTENT } from "@/lib/tee/mock-data";
import { verifyAttestation } from "./verifyAttestation";
import { teeAnalysisOutputSchema } from "@/types/tee-output";
import { submitProofHashOnChain, ZKP_VK_HASH } from "@/lib/zkp/verifier";
import type { ZkpProof } from "@/types/zkp";
import { matchProductGroups } from "./matchProducts";
import { updateSessionStatus } from "./updateSessionStatus";
import { consumeAuthNonce } from "./generateAuthNonce";
import { verifyNearSignature } from "@/lib/near/verify-signature";
import { AUTH_MESSAGE, AUTH_RECIPIENT } from "@/lib/near/wallet";

export interface AuthPayload {
  signature: string;   // base64
  publicKey: string;   // "ed25519:BASE58..."
  nonce: string;       // 64-char hex
  callbackUrl: string;
  fileId: string;      // IronClaw file_id (from /v1/files upload, "" if unavailable)
  fileContent: string; // base64-encoded raw file content ("" → mock fallback)
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

    if (session.status === "completed" || session.status === "purged") {
      return { success: true };
    }

    // ── 서명 검증 ─────────────────────────────────────────────────────────────
    const nonceCheck = await consumeAuthNonce(auth.nonce, session.walletAddress);
    if (!nonceCheck.valid) {
      return { success: false, error: `인증 실패: ${nonceCheck.error}` };
    }

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

    // ── raw 파일 내용 준비 (파싱은 TEE 내부에서 수행) ─────────────────────────
    // fileContent가 있으면 base64 디코딩, 없으면 mock 샘플 사용
    const rawContent = auth.fileContent
      ? Buffer.from(auth.fileContent, "base64").toString("utf-8")
      : MOCK_GENTOK_CONTENT;

    await updateSessionStatus(sessionId, "tee_processing");

    // ── TEE Attestation 사전 검증 ──────────────────────────────────────────────
    let attestationNonce: string | null = null;
    let attestationVerified: boolean | null = null;
    try {
      const attestation = await verifyAttestation();
      attestationNonce = attestation.nonce;
      attestationVerified = attestation.verified;
    } catch {
      // 엔드포인트 일시 불가 — 분석 계속
    }

    await db
      .update(analysisSessions)
      .set({ attestationNonce, attestationVerified })
      .where(eq(analysisSessions.id, sessionId));

    // ── TEE 분석 — 파싱과 분석 모두 IronClaw TEE 내부에서 실행 ─────────────────
    const teeOutput = await runIronClawAnalysis(sessionId, auth.fileId, rawContent);

    const validated = teeAnalysisOutputSchema.parse(teeOutput);

    await updateSessionStatus(sessionId, "zkp_generating");

    // ── ZKP 커밋먼트 — TEE 내부에서 생성된 proof 사용 ──────────────────────────
    // IronClaw TEE가 분석과 동시에 HMAC-SHA256 커밋먼트를 생성하여 반환
    // Phase 3: Barretenberg ultraplonk으로 교체 예정
    if (!validated.zkpPassed) {
      throw new Error("ZKP 보험 자격 기준 미충족 (TEE 내부 검증 실패)");
    }

    const teeProof: ZkpProof = {
      proofBytes: validated.zkpProofHash,
      publicInputs: { threshold: 50, nonce: validated.zkpNonce },
      verificationKey: ZKP_VK_HASH,
    };

    const proofHash = await submitProofHashOnChain(teeProof).catch(() => validated.zkpProofHash);

    await updateSessionStatus(sessionId, "completed");

    // ── DB 상품 매칭 ──────────────────────────────────────────────────────────
    const matchGroups = await matchProductGroups(
      validated.riskProfile,
      validated.priorityOrder
    );

    // ── 결과 저장 ─────────────────────────────────────────────────────────────
    const now = DateTime.now();
    await db.insert(analysisResults).values({
      id: uuidv4(),
      sessionId,
      walletAddress: session.walletAddress,
      riskProfile: JSON.stringify(validated.riskProfile),
      recommendedProductIds: JSON.stringify(matchGroups.recommendedProductIds),
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
