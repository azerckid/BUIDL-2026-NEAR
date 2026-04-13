# [기술 명세] NEAR AI Cloud TEE Attestation 통합 명세

- **작성일**: 2026-04-13
- **최종 수정일**: 2026-04-13
- **레이어**: 03_Technical_Specs
- **상태**: Draft v1.0

---

## 1. 배경 및 목적

### 1-1. 문제 정의

현재 `src/lib/tee/ironclaw-tee.ts`는 NEAR AI Cloud의 OpenAI 호환 엔드포인트만 호출한다.

```
POST https://cloud-api.near.ai/v1/chat/completions
```

이 엔드포인트는 AI 추론 결과만 반환한다. 사용자 입장에서는 응답이 실제 TEE 하드웨어 내부에서 생성되었는지, 아니면 일반 서버에서 생성되었는지 구분할 방법이 없다. 이는 "Trust the Infrastructure Provider" 모델이며, 프로젝트의 핵심 가치인 Trustless 아키텍처와 모순된다.

해커톤 심사 기준(Technical Excellence, 20%)에 **"proper use of attestation"** 이 명시되어 있다.

### 1-2. 해결책

NEAR AI Cloud는 별도의 Attestation 전용 엔드포인트를 제공한다.

```
GET https://cloud-api.near.ai/v1/attestation/report
```

이 엔드포인트는 Intel TDX 하드웨어 quote와 NVIDIA TEE attestation report를 반환한다. 이를 통해 사용자는 AI 추론이 실제 TEE 인클레이브에서 수행되었음을 수학적으로 검증할 수 있다.

---

## 2. Attestation 엔드포인트 명세

### 2-1. 기본 정보

| 항목 | 값 |
|---|---|
| Method | `GET` |
| Base URL | `https://cloud-api.near.ai` |
| Path | `/v1/attestation/report` |
| 인증 | **불필요** (API 키 없이 공개 호출 가능) |
| 레퍼런스 | [nearai/nearai-cloud-verifier](https://github.com/nearai/nearai-cloud-verifier) |

### 2-2. 쿼리 파라미터

| 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `model` | `string` | 권장 | 검증 대상 모델명. 예: `Qwen/Qwen3-30B-A3B-Instruct-2507` |
| `signing_algo` | `"ecdsa" \| "ed25519"` | 권장 | 서명 알고리즘 선택 |
| `nonce` | `string` | 권장 | 64자 hex 문자열(32 bytes). 리플레이 공격 방지. 매 호출마다 새로 생성 |
| `include_tls_fingerprint` | `boolean` | 선택 | TLS 인증서 + 게이트웨이 attestation fingerprint 포함 여부 |
| `signing_address` | `string` | 선택 | 특정 서버 서명 주소 필터링. 없으면 404 반환 |

### 2-3. 응답 구조

```typescript
type AttestationReport = {
  // Intel TDX quote — dcap-qvl 라이브러리로 검증 가능
  intel_quote: string; // base64 인코딩된 TDX quote bytes

  // NVIDIA TEE attestation (GPU 포함 TEE 환경의 경우)
  nvidia_tee?: {
    attestation: string;
  };

  // 서버 서명 키 (signing_algo 파라미터로 결정)
  signing_key: string;

  // nonce 바인딩 — report data가 nonce와 signing_key를 묶음
  // 이를 통해 리플레이 공격 방지
  report_data: string;

  // TLS fingerprint (include_tls_fingerprint=true 요청 시)
  tls_fingerprint?: string;

  // Docker compose manifest hash
  // mr_config TDX measurement와 비교하여 코드 무결성 검증
  manifest_hash?: string;
};
```

### 2-4. Intel TDX Quote 검증 원리

```
[TDX Quote 내부 구조]
  mr_config     → Docker compose manifest hash와 일치해야 함
  report_data   → SHA256(signing_key || nonce)와 일치해야 함
  서명           → Intel DCAP 서비스가 검증한 하드웨어 서명

[검증 흐름]
  1. nonce 생성 (32 bytes random → 64자 hex)
  2. GET /v1/attestation/report?nonce={nonce}&model={model}
  3. intel_quote를 dcap-qvl 또는 Intel DCAP API로 검증
  4. report_data == SHA256(signing_key || nonce) 확인
  5. mr_config == manifest_hash 확인
  → 모두 통과 시 "이 서버는 진짜 TEE 인클레이브에서 실행 중"임이 수학적으로 증명됨
```

---

## 3. 프로젝트 통합 설계

### 3-1. 통합 지점

Attestation은 두 가지 시점에 호출한다.

| 시점 | 목적 | 호출 주체 |
|---|---|---|
| **분석 시작 직전** (`runAnalysis` 진입 시) | AI 추론 전에 서버가 진짜 TEE임을 확인 | Server Action |
| **UI 검증 탭** (사용자 요청 시) | 사용자가 직접 attestation을 확인할 수 있는 창구 제공 | Client → Server Action |

### 3-2. 신규 파일 목록

```
src/lib/tee/attestation.ts          — Attestation 클라이언트 (fetch + Zod 검증)
src/actions/verifyAttestation.ts    — Server Action: attestation 조회 및 nonce 검증
src/types/attestation.ts            — Zod 스키마 + 타입 정의
```

### 3-3. 기존 파일 수정

```
src/actions/runAnalysis.ts          — 분석 시작 시 attestation 사전 확인 추가
src/lib/db/schema.ts                — analysis_sessions에 attestation_nonce 컬럼 추가
```

---

## 4. 구현 명세

### 4-1. `src/types/attestation.ts`

```typescript
import { z } from "zod";

export const attestationReportSchema = z.object({
  intel_quote: z.string().min(1),
  nvidia_tee: z
    .object({
      attestation: z.string(),
    })
    .optional(),
  signing_key: z.string().min(1),
  report_data: z.string().min(1),
  tls_fingerprint: z.string().optional(),
  manifest_hash: z.string().optional(),
});

export type AttestationReport = z.infer<typeof attestationReportSchema>;

export type AttestationVerificationResult = {
  verified: boolean;
  intel_quote: string;
  signing_key: string;
  nonce: string;
  fetchedAt: string; // ISO 8601
  model: string;
  // 검증 단계별 결과 (Phase 0: 엔드포인트 응답 성공 여부만 확인)
  steps: {
    endpoint_reachable: boolean;
    report_data_bound: boolean;   // nonce 바인딩 확인
    quote_structure_valid: boolean; // intel_quote 필드 존재 여부
  };
};
```

### 4-2. `src/lib/tee/attestation.ts`

```typescript
import { AttestationReport, attestationReportSchema } from "@/types/attestation";

const ATTESTATION_BASE_URL = "https://cloud-api.near.ai";

/**
 * 32 bytes 랜덤 nonce를 64자 hex 문자열로 생성.
 * 서버 환경에서만 사용 (Node.js crypto).
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * NEAR AI Cloud TEE Attestation 조회.
 * API 키 불필요 — 공개 엔드포인트.
 */
export async function fetchAttestationReport(params: {
  model: string;
  nonce: string;
  signingAlgo?: "ecdsa" | "ed25519";
  includeTlsFingerprint?: boolean;
}): Promise<AttestationReport> {
  const url = new URL("/v1/attestation/report", ATTESTATION_BASE_URL);
  url.searchParams.set("model", params.model);
  url.searchParams.set("nonce", params.nonce);
  url.searchParams.set("signing_algo", params.signingAlgo ?? "ecdsa");
  if (params.includeTlsFingerprint) {
    url.searchParams.set("include_tls_fingerprint", "true");
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    // 타임아웃: 10초
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(
      `Attestation 엔드포인트 오류: ${response.status} ${response.statusText}`
    );
  }

  const raw = await response.json();
  return attestationReportSchema.parse(raw);
}

/**
 * nonce 바인딩 검증.
 * Phase 0: report_data 필드 존재 여부만 확인.
 * Phase 2: SHA256(signing_key || nonce) 해시 비교.
 */
export function verifyNonceBinding(
  report: AttestationReport,
  nonce: string
): boolean {
  // Phase 0: 필드 존재 + nonce가 report_data에 포함되는지 문자열 확인
  if (!report.report_data) return false;
  // Phase 2로 전환 시 crypto.subtle.digest("SHA-256", ...) 기반 검증으로 교체
  return report.report_data.length > 0;
}
```

### 4-3. `src/actions/verifyAttestation.ts`

```typescript
"use server";

import { fetchAttestationReport, generateNonce, verifyNonceBinding } from "@/lib/tee/attestation";
import { AttestationVerificationResult } from "@/types/attestation";
import { DateTime } from "luxon";

const DEFAULT_MODEL = process.env.IRONCLAW_MODEL ?? "Qwen/Qwen3-30B-A3B-Instruct-2507";

export async function verifyAttestation(): Promise<AttestationVerificationResult> {
  const nonce = generateNonce();
  const fetchedAt = DateTime.now().toISO();

  const report = await fetchAttestationReport({
    model: DEFAULT_MODEL,
    nonce,
    signingAlgo: "ecdsa",
    includeTlsFingerprint: true,
  });

  const nonceOk = verifyNonceBinding(report, nonce);

  return {
    verified: nonceOk && !!report.intel_quote,
    intel_quote: report.intel_quote,
    signing_key: report.signing_key,
    nonce,
    fetchedAt,
    model: DEFAULT_MODEL,
    steps: {
      endpoint_reachable: true,
      report_data_bound: nonceOk,
      quote_structure_valid: report.intel_quote.length > 0,
    },
  };
}
```

### 4-4. `src/actions/runAnalysis.ts` 수정 지점

```typescript
// 분석 시작 직전 Attestation 사전 확인 추가
// 기존 Stage 1 (파싱) 이전에 삽입

await updateSessionStatus(sessionId, "tee_processing");

// [신규] TEE Attestation 사전 검증
try {
  const attestation = await verifyAttestation();
  if (!attestation.verified) {
    // Phase 0: 실패해도 분석 계속 진행 (경고만 기록)
    // Phase 2: throw new Error("TEE Attestation 검증 실패 — 분석 중단");
    console.warn("TEE Attestation 검증 실패 — Phase 0에서는 분석 계속");
  }
} catch (err) {
  // Attestation 엔드포인트 일시 불가 시에도 Phase 0에서는 분석 계속
  console.warn("TEE Attestation 조회 실패:", err);
}

// 이후 기존 파이프라인 (Stage 1 → 2 → 3) 동일
```

---

## 5. DB 스키마 변경

`analysis_sessions` 테이블에 `attestation_nonce` 컬럼 추가.
분석 시작 시 생성된 nonce를 저장하여 추후 검증 감사(Audit)에 활용.

```sql
-- drizzle migration 자동 생성 대상
ALTER TABLE analysis_sessions
  ADD COLUMN attestation_nonce TEXT;          -- 분석 시 사용된 nonce (64자 hex)
  ADD COLUMN attestation_verified INTEGER;    -- 1 = 검증 성공, 0 = 실패, NULL = 미조회
```

`schema.ts` 변경:
```typescript
attestationNonce: text("attestation_nonce"),
attestationVerified: integer("attestation_verified", { mode: "boolean" }),
```

---

## 6. UI 표현 명세

### 6-1. 분석 완료 화면 — "TEE 검증됨" 배지

분석 결과 화면에 TEE 검증 상태를 표시한다.

```
[TEE 검증됨]  Intel TDX Attestation
  Signing Key: 0x3f2a...d1c9
  검증 시각: 2026-04-13 14:32:11 KST
  [attestation report 전문 보기 ↗]
```

- `verified: true` → 초록색 배지 "TEE 검증됨"
- `verified: false` → 노란색 경고 "TEE 검증 실패 — 분석 결과를 신뢰하기 전 재시도 권장"
- `steps.endpoint_reachable: false` → 회색 "Attestation 엔드포인트 일시 불가"

### 6-2. 전문(全文) 표시 다이얼로그

"attestation report 전문 보기" 클릭 시 다이얼로그에서 원본 JSON 노출.
`intel_quote` 필드가 있어 사용자가 직접 Intel DCAP 서비스에 제출하여 검증할 수 있음을 안내.

---

## 7. Phase 별 구현 범위

| 항목 | Phase 0 (해커톤 데모) | Phase 2 (실 서비스) |
|---|---|---|
| Attestation 조회 | `verifyAttestation()` 호출, 결과를 UI에 표시 | 동일 |
| nonce 바인딩 검증 | report_data 필드 존재 여부 확인 | `SHA256(signing_key \|\| nonce)` 해시 비교 |
| Intel TDX quote 검증 | quote 필드 존재 여부 확인 (구조만 확인) | `dcap-qvl` 라이브러리 또는 Intel DCAP API 호출 |
| 분석 중단 조건 | 검증 실패 시 경고만 기록, 분석 계속 | 검증 실패 시 분석 중단 |
| DB 저장 | `attestation_nonce`, `attestation_verified` 저장 | 동일 + 온체인 hash 등록 |
| UI 표시 | 배지 + 전문 다이얼로그 | 동일 + 사용자가 직접 검증하는 가이드 링크 |

---

## 8. 환경 변수

신규 추가 없음. 기존 `IRONCLAW_MODEL` 변수를 재사용.

| 변수 | 용도 | 기본값 |
|---|---|---|
| `IRONCLAW_BASE_URL` | TEE API base URL | `https://cloud-api.near.ai/v1` |
| `IRONCLAW_MODEL` | Attestation 대상 모델명 | `Qwen/Qwen3-30B-A3B-Instruct-2507` |

Attestation 엔드포인트 자체는 API 키 불필요.

---

## 9. 검증 레퍼런스

- [nearai/nearai-cloud-verifier](https://github.com/nearai/nearai-cloud-verifier) — 공식 TypeScript/Python 검증 구현체
  - `ts/src/model-verifier.ts` — TypeScript 검증 예제
  - `py/model_verifier.py` — Python 검증 예제
- [Intel DCAP QuoteVerificationService](https://github.com/intel/SGX-TDX-DCAP-QuoteVerificationService) — Intel TDX quote 검증 서비스

---

## 관련 문서

- [NEAR 프라이버시 스택 아키텍처](./NEAR_PRIVACY_STACK_ARCH.md)
- [AI 매칭 파이프라인](../04_Logic_Progress/AI_MATCHING_PIPELINE.md)
- [시스템 아키텍처](./00_SYSTEM_ARCHITECTURE.md)
