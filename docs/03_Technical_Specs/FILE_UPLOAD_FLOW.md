# 유전자 파일 업로드 처리 흐름 (Phase 0 현황)

- **작성일**: 2026-04-06
- **레이어**: 03_Technical_Specs
- **상태**: Phase 0 해커톤 데모 구현 기준
- **정식 서비스 목표**: `PRODUCTION_FILE_PIPELINE_SPEC.md` 참조

---

## 개요

사용자가 유전자 분석 결과 파일(PDF, VCF, TXT, CSV)을 업로드했을 때 실제로 어떤 일이 일어나는지, 각 처리가 어디서(브라우저 / 서버 / 외부 API) 이루어지는지를 코드 위치 기준으로 기술한다.

---

## 전체 흐름

### 1단계 — 파일 선택 및 검증

| 항목 | 내용 |
|------|------|
| **실행 위치** | 브라우저 (클라이언트) |
| **파일** | `src/components/modules/FileUploadZone.tsx:78` |
| **함수** | `validateAndSetFile()` |

**처리 내용**
- 사용자가 파일을 드롭하거나 선택하면 `validateAndSetFile()` 호출
- Zod 스키마로 두 가지 검증:
  - 허용 확장자: `.vcf` / `.txt` / `.csv` / `.pdf`
  - 파일 크기: 5MB 이하
- 검증 통과 시 `selectedFile` React 상태에 저장, 자물쇠 잠김 Framer Motion 애니메이션 실행
- 검증 실패 시 `toast.error` 표시

**이 시점에서 파일은 브라우저 메모리에만 존재. 서버로 아무것도 전달되지 않음.**

---

### 2단계 — 해시 계산 + 세션 생성

| 항목 | 내용 |
|------|------|
| **실행 위치** | 브라우저 → 서버 |
| **파일 (브라우저)** | `src/components/modules/FileUploadZone.tsx:142` |
| **파일 (서버)** | `src/actions/createSession.ts` |
| **함수** | `handleStartAnalysis()` → `computeSHA256()` → `createSession()` |

**처리 내용 (브라우저)**
```
computeSHA256(selectedFile)   ← Web Crypto API (SubtleCrypto)
  → fileHash: 16진수 64자 문자열
  → fileType: 파일 확장자 문자열
```

**처리 내용 (서버 — createSession)**
```
analysis_sessions 테이블 INSERT
  wallet_address  : NEAR 지갑 주소
  file_hash       : SHA-256 해시 (무결성 증거용)
  file_type       : 확장자
  status          : "uploading"
  → sessionId (UUID) 반환
```

**이 시점에서 파일 원본 내용은 서버로 전달되지 않음. 해시와 확장자만 DB 저장.**

---

### 3단계 — 분석 페이지 이동

| 항목 | 내용 |
|------|------|
| **실행 위치** | 브라우저 |
| **파일** | `src/components/modules/FileUploadZone.tsx:164` |

```typescript
router.push(`/analysis/${result.sessionId}`)
```

- `src/app/[locale]/analysis/[sessionId]/page.tsx` (서버 컴포넌트)가 렌더링됨
- `sessionId`를 props로 받아 `TeeAnalysisProgress` 컴포넌트에 전달

---

### 4단계 — runAnalysis 파이프라인 실행

| 항목 | 내용 |
|------|------|
| **실행 위치** | 서버 (Server Action) |
| **트리거 파일** | `src/components/modules/TeeAnalysisProgress.tsx:86` |
| **핵심 파일** | `src/actions/runAnalysis.ts` |

브라우저의 `TeeAnalysisProgress`가 Server Action `runAnalysis(sessionId)`를 호출한다.

**`runAnalysis.ts` 처리 순서:**

```typescript
// 1. 세션 조회 + 재실행 가드
const session = db.select().from(analysisSessions).where(id = sessionId)

// 2. ★ 핵심: 파일 내용 무시 — mock 상수로 고정
const profile = parseMockFile()   // src/lib/tee/normalizer.ts:130
// → 사용자가 올린 파일과 무관하게 항상 동일한 mock 데이터 반환

// 3. 세션 상태 → "tee_processing"
updateSessionStatus(sessionId, "tee_processing")

// 4. TEE 분석 (Mock / Real 분기)
const useRealTee = process.env.USE_REAL_TEE === "true"
const teeOutput = useRealTee
  ? runIronClawAnalysis(sessionId, profile)   // NEAR AI Cloud
  : runMockTeeAnalysis(sessionId, profile)    // 로컬 mock
```

**`parseMockFile()` 위치:**
`src/lib/tee/normalizer.ts:130`
```typescript
export function parseMockFile(): NormalizedGeneticProfile {
  return parseGentokTxt(MOCK_GENTOK_CONTENT)  // 하드코딩 상수만 파싱
}
```

**`MOCK_GENTOK_CONTENT` 위치:**
`src/lib/tee/mock-data.ts`
- 젠톡 TXT 포맷 유전자 데이터 상수 (하드코딩)
- 사용자가 어떤 파일을 올리든 이 상수로 분석됨

---

### 5단계 — TEE 분석

| 항목 | 내용 |
|------|------|
| **실행 위치 (Mock)** | 서버 |
| **실행 위치 (Real)** | 서버 → NEAR AI Cloud |

**Mock 경로** (`USE_REAL_TEE` 미설정)
- 파일: `src/lib/tee/mock-tee.ts`
- `runMockTeeAnalysis(sessionId, profile)` — 2초 지연 후 고정된 `riskProfile` 반환

**Real 경로** (`USE_REAL_TEE=true`)
- 파일: `src/lib/tee/ironclaw-tee.ts`
- `runIronClawAnalysis(sessionId, profile)` 호출
- `https://cloud-api.near.ai/v1/chat/completions` REST 요청
- 모델: `Qwen/Qwen3-30B-A3B-Instruct-2507`
- `profile`을 JSON으로 직렬화하여 User Prompt로 전달
- 응답 JSON → `teeAnalysisOutputSchema` Zod 검증

**Real 경로여도 `profile`이 mock 상수에서 왔으므로 실제 파일 내용은 반영되지 않음.**

---

### 6단계 — ZKP proof 생성 + DB 저장

| 항목 | 내용 |
|------|------|
| **실행 위치** | 서버 |
| **파일** | `src/actions/runAnalysis.ts:66` |

```typescript
const riskScore = derivePrimaryRiskScore(validated.riskProfile)
const zkpProof = await generateZkpProof({ riskScore, threshold: 50 })
// Phase 0: 더미 proof bytes 반환

db.insert(analysisResults).values({
  riskProfile: JSON.stringify(validated.riskProfile),
  recommendedProductIds: JSON.stringify(matchedIds),
  zkpProofHash: zkpProof.proofBytes,
  expiresAt: now.plus({ days: 30 })
})

updateSessionStatus(sessionId, "purged")
```

---

## 전체 데이터 흐름 다이어그램

```
[브라우저]                         [서버 (Next.js)]           [NEAR AI Cloud]

파일 선택 (메모리 보관)
  ↓
validateAndSetFile()
  Zod 검증 (확장자, 크기)
  ↓
computeSHA256(file)
  Web Crypto API
  ↓ fileHash, fileType 만 전달
createSession() ─────────────→ analysis_sessions INSERT
                                (file_hash, file_type, status)
  ↓ sessionId 반환
router.push("/analysis/...")

TeeAnalysisProgress 마운트
  ↓ Server Action 호출
runAnalysis(sessionId) ──────→ parseMockFile()
                                ★ 파일 내용 무시
                                USE_REAL_TEE?
                                  No  → mock-tee.ts (2초 지연)
                                  Yes → ironclaw-tee.ts ────→ Qwen3-30B
                                                              ← riskProfile JSON
                                ZKP proof 생성 (더미)
                                analysisResults INSERT
                                status → "purged"
  ↓ success 반환
"대시보드로 이동" 버튼 표시

router.push("/dashboard?sid=...")
```

---

## Phase 0 핵심 제약

| 제약 | 내용 | 위치 |
|------|------|------|
| 파일 원본 미전송 | 파일 내용은 브라우저 메모리에서만 존재, 서버 미도달 | `FileUploadZone.tsx:142` |
| mock 상수 고정 | `parseMockFile()`이 항상 동일한 상수를 반환 | `normalizer.ts:130` |
| sessionId만 전달 | `runAnalysis`는 `sessionId`만 인자로 받아 파일 내용 접근 불가 | `runAnalysis.ts:21` |
| 더미 ZKP | `generateZkpProof()`가 랜덤 hex 문자열 반환 | `prover.ts` |

---

## 관련 문서

- `PRODUCTION_FILE_PIPELINE_SPEC.md` — 정식 서비스에서 이 흐름이 어떻게 되어야 하는지 명세

---

## 관련 파일 목록

| 파일 | 역할 |
|------|------|
| `src/components/modules/FileUploadZone.tsx` | 파일 선택, 검증, 해시 계산, 세션 생성 트리거 |
| `src/actions/createSession.ts` | analysis_sessions DB INSERT |
| `src/actions/runAnalysis.ts` | 분석 파이프라인 전체 조율 |
| `src/lib/tee/normalizer.ts` | 젠톡 TXT 파서, parseMockFile |
| `src/lib/tee/mock-data.ts` | Phase 0 고정 유전자 데이터 상수 |
| `src/lib/tee/mock-tee.ts` | Mock TEE 분석 (2초 지연) |
| `src/lib/tee/ironclaw-tee.ts` | IronClaw NEAR AI Cloud 연동 |
| `src/lib/zkp/prover.ts` | ZKP proof 생성 (Phase 0: 더미) |
| `src/components/modules/TeeAnalysisProgress.tsx` | 분석 진행 UI, runAnalysis 호출 트리거 |
| `src/app/[locale]/analysis/[sessionId]/page.tsx` | 분석 페이지 서버 컴포넌트 |
