# [명세] ZKP-in-TEE: IronClaw 인클레이브 내 Noir WASM 배포 구현 명세

- **작성일**: 2026-04-17
- **최종 수정일**: 2026-04-23
- **레이어**: 03_Technical_Specs
- **상태**: Phase 3 구현 예정 (v0.26.0 인프라 완전 준비 완료)
- **관련 단계**: Stage 16 완료, Stage 17 (ROADMAP.md)

---

## 1. 배경 및 필요성

### 현재 상태 (Phase 0)

`src/lib/zkp/prover.ts`는 Vercel 서버리스 환경의 번들 크기 제약(50MB 한도)으로 인해 Noir WASM 모듈을 실행하지 못하고 더미 proof 문자열을 반환합니다.

```
Barretenberg WASM 바이너리 크기: ~50MB+
Vercel Serverless Function 번들 한도: 50MB
→ 번들링 불가 → 더미 proof 반환
```

### ZKP가 반드시 TEE 내부에서 실행되어야 하는 이유

ZKP의 핵심 보안 전제는 `risk_score`(Private Input)가 TEE 외부로 절대 유출되지 않는 것입니다. 현재 구조에서 ZKP proof 생성을 일반 서버(Vercel)에서 수행하면:

1. Vercel 서버가 `risk_score` 수치를 평문으로 처리해야 함
2. "유전자 분석 결과가 서버 메모리에 존재한 적 없다"는 TEE 보안 주장이 무효화됨
3. TEE + ZKP 조합의 핵심 가치 (완전 격리형 프라이버시 파이프라인)가 달성 불가

따라서 ZKP proof 생성은 반드시 IronClaw TEE 인클레이브 내부에서 수행되어야 합니다.

---

## 2. IronClaw WASM 지원 타임라인

이 구현이 Phase 2로 미뤄진 것은 인프라 미비 때문이었으며, v0.26.0 출시로 모든 장벽이 해소되었습니다.

| 날짜 | 버전 | 내용 |
|---|---|---|
| 2026-03-10 | v0.17.0 | 커스텀 WASM 툴 배포 최초 도입 (실험적) |
| 2026-03-xx | — | 본 프로젝트 개발 시작 (v0.17.0 실험적 단계) |
| 2026-04-11 | v0.25.0 | 커스텀 WASM 툴 배포 프로덕션 수준 공식 지원 |
| 2026-04-18 | — | Final Pitch Day (NEAR Protocol 트랙 1위) |
| 2026-04-21 | **v0.26.0** | **최신 — WASM 크리덴셜 인젝션 버그 완전 해결 (Issue #1537 COMPLETED)** |

### v0.26.0 핵심 변경사항 (Phase 3 업그레이드 직접 연관)

**1. WASM 크리덴셜 인젝션 완전 해결 (Issue #1537)**

호스티드 TEE 환경에서 WASM 툴에 시크릿이 주입되지 않던 버그가 v0.26.0에서 완전 종결되었습니다.

| PR | 내용 | 병합 버전 |
|---|---|---|
| #845 | WASM credential injection No-DB 환경 초기 수정 | v0.17.0 |
| #2099 | 크로스 테넌트 크리덴셜 무음 폴백 제거 | v0.25.0 |
| #2465 | fail closed on WASM default-scope fallback (완전 해결) | v0.26.0 |

루트 원인: `WasmToolLoader`가 `secrets_store`를 `None`으로 수신할 때 `Vec::new()`를 반환하며 무음 실패 → v0.26.0에서 `fail closed` 로 변경, 크리덴셜 없으면 명시적 에러 반환.

**2. 프로젝트별 샌드박스 + 미션 생명주기 (engine-v2)**

유전자 분석 세션을 독립 샌드박스로 격리하고 비용 추적 가능. 세션별 완전 격리 보장.

**3. 파일 첨부 플로우 (gateway)**

실제 유전자 파일을 TEE로 전달하는 파이프라인 구현에 직접 활용 가능한 attachment/document upload API 추가.

**결론**: v0.26.0으로 Barretenberg WASM 배포 + 크리덴셜 인젝션이 모두 프로덕션 수준에서 동작합니다. 남은 확인 사항은 Barretenberg 바이너리 크기 제한 여부입니다.

---

## 3. 현재 준비 완료된 아티팩트

Phase 0에서도 Noir 회로 구현과 로컬 증명 생성은 완료되어 있습니다.

| 파일 | 상태 | 설명 |
|---|---|---|
| `circuits/insurance_eligibility/src/main.nr` | 완성 | `assert(risk_score >= threshold)` 회로 |
| `circuits/insurance_eligibility/Nargo.toml` | 완성 | 회로 프로젝트 설정 |
| `circuits/insurance_eligibility/target/insurance_eligibility.json` | 완성 | 컴파일된 회로 아티팩트 (1.7KB) |
| `circuits/insurance_eligibility/target/proof` | 완성 | `nargo prove` 로컬 실행으로 생성된 실제 proof (14KB) |
| `src/lib/zkp/prover.ts` | Phase 2 교체 대상 | 현재 더미 반환, Phase 2에서 TEE API 호출로 교체 |
| `src/lib/zkp/verifier.ts` | Phase 2 교체 대상 | 현재 문자열 검사, Phase 2에서 온체인 검증으로 교체 |

---

## 4. Phase 2 구현 아키텍처

### 4-1. Barretenberg WASM 패키징

Noir의 proving backend인 Barretenberg를 WASI Preview 2 컴포넌트 모델로 패키징하면 IronClaw TEE 인클레이브 내부에서 직접 실행 가능합니다.

```
[IronClaw TEE 인클레이브]
├── Qwen3-30B (LLM 분석 엔진)
├── Barretenberg WASM (WASI Preview 2)     ← Phase 2 추가
│   └── insurance_eligibility.json (회로)  ← Phase 2 추가
└── ZKP Proving Runtime                    ← Phase 2 추가
```

### 4-2. 데이터 흐름 (Phase 2)

```
[클라이언트]
    ↓ file_hash (SHA-256, 파일 원본 미전송)
[서버 runAnalysis.ts]
    ↓ NormalizedGeneticProfile JSON
[IronClaw TEE 인클레이브]
    ├── LLM 분석 (Qwen3-30B) → riskProfile (위험 레이블)
    ├── derivePrimaryRiskScore(riskProfile) → risk_score (TEE 내부에서만 존재)
    ├── Barretenberg WASM 실행
    │   ├── Private Input: risk_score
    │   ├── Public Input: threshold (50)
    │   └── assert(risk_score >= threshold)
    └── proof bytes 반환 (risk_score는 TEE 외부 미노출)
[서버]
    ↓ proof bytes
[NEAR 스마트 컨트랙트]
    └── submit_proof(proof_hash) → 온체인 등록
```

### 4-3. IronClaw 커스텀 WASM 툴 배포 방식

IronClaw v0.25.0 기준 커스텀 WASM 툴을 인클레이브에 배포하는 방법:

```bash
# 1. Barretenberg를 WASI Preview 2로 컴파일
cargo build --target wasm32-wasip2 --release

# 2. IronClaw 인클레이브에 WASM 툴 등록
near-ai agent upload \
  --tool barretenberg.wasm \
  --name zkp-prover \
  --version 0.1.0

# 3. 인클레이브 내에서 WASM 툴 호출
# IronClaw Tool Call API를 통해 prove() 함수 호출
```

---

## 5. Phase 2 구현 태스크 (Stage 16)

### 5-1. Barretenberg WASM 빌드

- [ ] Barretenberg 소스코드 클론 (`AztecProtocol/barretenberg`)
- [ ] `wasm32-wasip2` 타깃으로 크로스 컴파일
- [ ] WASM 모듈 기능 검증 (`prove`, `verify` 함수 export 확인)
- [ ] IronClaw WASM 툴 크기 제한 확인 및 최적화 (필요 시 strip)

### 5-2. IronClaw WASM 툴 등록

- [ ] NEAR AI Cloud에 `zkp-prover` WASM 툴 등록
- [ ] `insurance_eligibility.json` 회로 파일 인클레이브 내 배치
- [ ] 툴 호출 API 엔드포인트 및 파라미터 확인

### 5-3. prover.ts 교체

```typescript
// Phase 2 교체 내용
// src/lib/zkp/prover.ts

export async function generateZkpProof(input: ZkpInput): Promise<ZkpProof> {
  // IronClaw Tool Call API 호출
  const response = await ironclawClient.tools.call({
    tool: "zkp-prover",
    function: "prove",
    inputs: {
      circuit: "insurance_eligibility",
      private_inputs: { risk_score: input.riskScore }, // TEE 내부에서만 처리
      public_inputs: { threshold: input.threshold },
    },
  });

  return {
    proofBytes: response.proof_bytes,
    publicInputs: [input.threshold.toString()],
    verificationKey: response.verification_key,
  };
}
```

### 5-4. verifier.ts 교체

- [ ] `proofBytes.startsWith("phase0_mock_proof_")` 문자열 검사 제거
- [ ] proof bytes SHA-256 해시 계산
- [ ] `zkp.rogulus.testnet` `submit_proof(proof_hash)` 온체인 등록

### 5-5. 검증

- [ ] `nargo verify` 로컬 검증과 TEE 생성 proof 일치 확인
- [ ] `is_proof_registered` 온체인 조회 성공 확인
- [ ] E2E: 파일 업로드 → TEE 분석 + proof 생성 → 온체인 등록 → 대시보드 표시

---

## 6. Stage 17 착수 전 해결 필요 사항 (2026-04-23 점검)

> 코드베이스 실측 점검 결과 도출된 블로커 4가지.
> 착수 순서: 1 → 2 → 3 → 4 순으로 해결 후 본 구현 진행.

### 문제 1 — `runAnalysis` 함수 시그니처: 파일 데이터 전달 경로 없음 [가장 심각]

**현황**
```typescript
// src/actions/runAnalysis.ts
runAnalysis(sessionId: string, auth: AuthPayload)
// → 내부에서 parseMockFile() 하드코딩 — 실제 파일 데이터 수신 경로 없음
const profile = parseMockFile();
```

**문제**
- ECIES 암호화 파일을 TEE로 전달하려면 함수 시그니처에 `encryptedFile` 파라미터 추가 필요
- Next.js 16 Server Action 기본 body 제한: **1MB**
- 유전자 파일 최대 허용 크기: **5MB** → 설정 없이는 즉시 실패

**해결**
```typescript
// next.config.ts에 추가
experimental: { serverActionsBodySizeLimit: '6mb' }

// runAnalysis 시그니처 변경
runAnalysis(sessionId: string, auth: AuthPayload, encryptedFile?: string)
```

**상태**: [ ] 미해결

---

### 문제 2 — Attestation Zod 스키마 오류 + secp256k1 ECIES 제약 [2026-04-23 실측 확인]

**실측 결과 (2026-04-23)**

실제 API 응답 구조:
```json
{
  "gateway_attestation": {
    "signing_address": "0x614bc66ff0407dbb70b9c7ca1f5e983e4a02c921",
    "signing_algo": "ecdsa",
    "intel_quote": "...",
    "report_data": "614bc66ff04...",
    "request_nonce": "..."
  },
  "model_attestations": [{
    "model_name": "Qwen/Qwen3-30B-A3B-Instruct-2507",
    "signing_public_key": "d33af782492ec889...",  // 64바이트 hex (secp256k1, 0x04 없음)
    "signing_address": "0xc03b0cfc81531eb9...",
    "signing_algo": "ecdsa"
  }]
}
```

**문제 1 — Zod 스키마가 실제 응답 구조와 완전히 불일치**
```typescript
// 현재 src/types/attestation.ts (틀림)
z.object({
  intel_quote: z.string(),
  signing_key: z.string(),   // ← 실제로 없는 필드
  report_data: z.string(),   // ← gateway_attestation 안에 중첩되어 있음
})
```
`attestationReportSchema.parse(raw)`는 **항상 실패** 중. Phase 0 `try/catch`로 조용히 무시됨.

**문제 2 — secp256k1 공개키 → 브라우저 SubtleCrypto ECIES 불가**
- `signing_public_key`: 64바이트 hex = secp256k1 비압축 공개키 (`0x04` prefix 없음)
- 브라우저 `SubtleCrypto.importKey()`는 **P-256(secp256r1)만 지원**, secp256k1 미지원
- ECIES 구현에 별도 라이브러리 필요: `eciesjs` 또는 `@ecies/ciphers`

**해결**
1. `src/types/attestation.ts` — 중첩 구조(`gateway_attestation`, `model_attestations`)에 맞게 스키마 재작성
2. `src/lib/tee/attestation.ts` — `model_attestations[0].signing_public_key` 추출 로직 추가
3. ECIES 구현 시 `eciesjs` 패키지 사용 (secp256k1 지원, Web Crypto API 기반)

**상태**: [x] 문제 확인 완료 / [ ] 코드 수정 필요

---

### 문제 3 — `USE_REAL_ZKP` 환경변수 미설정: ZKP가 로컬 HMAC-SHA256 유지 중

**현황**
```bash
# .env.local 현재 상태
USE_REAL_TEE=<설정됨>
IRONCLAW_BASE_URL=<설정됨>
IRONCLAW_API_KEY=<설정됨>
# USE_REAL_ZKP → 미설정 (default: false → 로컬 HMAC-SHA256)
```

**문제**
- `USE_REAL_TEE=true`여도 ZKP는 여전히 로컬 HMAC-SHA256 (`generateLocalProof`)
- `USE_REAL_ZKP=true` 설정 시 IronClaw Tool Call 경로 진입 → WASM 툴 미등록이면 즉시 오류
- `ironclaw` CLI 미설치로 WASM 툴 등록 불가 → 선행 조건 충족 전 설정 금지

**해결 순서**
1. `ironclaw` CLI v0.26.0 설치
2. WASM 툴 등록 (`zkp-prover-wasm/REGISTER.md` 참조)
3. 등록 확인 후 `.env.local`에 `USE_REAL_ZKP=true` 추가

**상태**: [ ] 미해결 (ironclaw CLI 설치 후 착수)

---

### 문제 4 — IronClaw WASM Tool Call 동작 방식 미검증

**현황**
```typescript
// src/lib/zkp/prover.ts
// Chat Completions API function tool_choice 방식으로 구현
tool_choice: { type: "function", function: { name: "zkp_prove" } }
```

**문제**
- 현재 구현은 LLM이 `zkp_prove` 함수 인자를 JSON으로 반환하는 방식
- IronClaw가 등록된 WASM 툴을 LLM tool_choice 후 자동으로 실행하는지, 별도 Tool Call API 엔드포인트를 써야 하는지 공식 문서에 명확히 없음
- 잘못 구현되면 LLM이 인자만 반환하고 WASM은 실행되지 않을 수 있음

**해결**
- `ironclaw` CLI로 WASM 툴 등록 후 실제 Tool Call 동작 확인
- 동작 방식에 따라 `prover.ts` 수정 (Chat Completions 방식 vs 전용 API 방식)

**상태**: [ ] 미해결 (ironclaw CLI 설치 + WASM 툴 등록 후 확인)

---

### 착수 순서 요약 (2026-04-23 업데이트)

| 순서 | 작업 | 담당 파일 | 상태 |
|---|---|---|---|
| 1 | `ironclaw` CLI v0.26.0 설치 | — | [x] 완료 (`~/.local/bin/ironclaw 0.26.0`) |
| 2 | `next.config.ts` Server Action body size limit 설정 | `next.config.ts` | [ ] 미완료 |
| 3 | Attestation Zod 스키마 실제 응답 구조에 맞게 재작성 | `src/types/attestation.ts` | [ ] 미완료 (문제 2) |
| 4 | `eciesjs` 패키지 설치 + ECIES 암호화 모듈 구현 | `src/lib/tee/encryption.ts` | [ ] 미완료 (문제 2) |
| 5 | `runAnalysis` 시그니처 변경 + `parseMockFile` 제거 | `src/actions/runAnalysis.ts` | [ ] 미완료 (문제 1) |
| 6 | `FileUploadZone` 암호화 전송 파이프라인 추가 | `src/components/modules/FileUploadZone.tsx` | [ ] 미완료 |
| 7 | IronClaw WASM 툴 등록 + Tool Call 동작 검증 | `zkp-prover-wasm/REGISTER.md` | [ ] 미완료 (문제 4) |
| 8 | `USE_REAL_ZKP=true` 설정 + prover.ts E2E 검증 | `.env.local` | [ ] 미완료 (문제 3) |
| 9 | 17-4~17-5 E2E 검증 + Mock 코드 완전 제거 | 전체 | [ ] 미완료 |

---

## 7. TEE + ZKP 역할 분담 (보완 구조)

```
TEE (IronClaw)                    ZKP (Noir)
─────────────────────────         ───────────────────────────────
"데이터를 보이지 않게"             "결과가 올바름을 수학적으로 증명"

유전자 데이터 격리                 실제 점수 비공개
분석 중 메모리 소각                자격 충족 여부만 외부 노출
하드웨어 신뢰 (Intel TDX)         수학적 신뢰 (ZK proof)
운영자도 접근 불가                 서버 없이 proof bytes만으로 검증
```

TEE만 존재하면 "NEAR AI Cloud를 믿어라"는 중앙화된 신뢰가 남습니다. ZKP가 추가되면 보험사는 어떤 서버도 신뢰하지 않고 proof bytes 하나만으로 자격을 검증합니다.

---

## 관련 문서

- [ROADMAP.md](../04_Logic_Progress/ROADMAP.md) — Stage 16
- [JUDGING_CODE_WALKTHROUGH.md](../05_QA_Validation/JUDGING_CODE_WALKTHROUGH.md) — ZKP 심사 대응
- [PHASE2_IMPLEMENTATION_SPEC.md](./PHASE2_IMPLEMENTATION_SPEC.md)
- [TEE_ATTESTATION_SPEC.md](./TEE_ATTESTATION_SPEC.md)
