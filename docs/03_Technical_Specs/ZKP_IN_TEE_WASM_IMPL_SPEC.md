# [명세] ZKP-in-TEE: IronClaw 인클레이브 내 Noir WASM 배포 구현 명세

- **작성일**: 2026-04-17
- **레이어**: 03_Technical_Specs
- **상태**: Phase 2 구현 예정 (인프라 준비 완료)
- **관련 단계**: Stage 16 (ROADMAP.md)

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

## 2. IronClaw WASM 지원 타임라인 (핵심 증거)

이 구현이 Phase 2로 미뤄진 것은 인프라 미비 때문이었으며, 해커톤 기간 중 해당 장벽이 제거되었습니다.

| 날짜 | 버전 | 내용 |
|---|---|---|
| 2026-03-10 | v0.17.0 | 커스텀 WASM 툴 배포 최초 도입 (실험적) |
| 2026-03-xx | — | 본 프로젝트 개발 시작 (v0.17.0 실험적 단계) |
| 2026-04-11 | v0.25.0 | 커스텀 WASM 툴 배포 프로덕션 수준 공식 지원 |
| 2026-04-17 | — | 현재 (발표 전날) — Phase 2 인프라 준비 완료 상태 |
| 2026-04-18 | — | Final Pitch Day |

**결론**: 프로젝트 빌드 기간(v0.17.0 실험적) → 해커톤 마감 직전(v0.25.0 프로덕션). ZKP-in-TEE 설계는 완료되어 있었으며, 인프라가 따라왔습니다.

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

## 6. TEE + ZKP 역할 분담 (보완 구조)

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
