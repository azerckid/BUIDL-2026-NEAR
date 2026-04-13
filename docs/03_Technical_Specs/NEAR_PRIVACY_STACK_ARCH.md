# [기술 명세] NEAR AI 프라이버시 스택 기반 유전자 데이터 처리 아키텍처

- **작성일**: 2026-03-31
- **최종 수정일**: 2026-04-13
- **레이어**: 03_Technical_Specs
- **상태**: Draft v2.0

---

## 1. 아키텍처 개요 (Architectural Overview)
본 시스템은 개인의 민감한 유전자 데이터(DNA Raw Data)를 처리하기 위해 'Security-First' 접근 방식을 채택합니다. 모든 연산은 격리된 환경에서 수행되며, 데이터 소유권은 완벽히 사용자에게 귀속됩니다.

### 1.1 핵심 기술 구성 요소 (Key Components)
- **NEAR Private Cloud (NPC)**: 사용자별 암호화 스토리지. 유전자 원본 데이터(VCF, PDF)가 보관되는 금고 역할.
- **IronClaw (Agentic Harness, NEAR TEE)**: AI 에이전트가 WASM 샌드박스 + 하드웨어 격리 인클레이브 이중 격리 환경에서 가동되도록 보장하는 오픈소스 Rust 런타임 (2026-02-23 NEARCON 발표). 자격증명 런타임 주입, 프롬프트 인젝션 방어 내장.
- **Noir ZKP (영지식 증명 레이어)**: Aztec 개발 Rust 기반 ZK DSL. TEE 내부에서 유전자 위험 수치를 private input으로 Noir 회로에 주입하여 "자격 충족 여부(bool)"만 proof로 생성. 수치는 TEE 외부로 절대 미노출.
- **Private Shards / Confidential Intents**: 2026.02 도입. 허가된 검증자 셋이 운영하는 전용 샤드로서, 거래 상세 내역(ZKP proof 포함)을 퍼블릭 멤풀에 노출하지 않음.
- **Chain Signatures (MPC 서명)**: `v1.signer` MPC 컨트랙트를 통해 NEAR 계정 하나로 이더리움, 솔라나 등 타 체인 트랜잭션에 서명. 별도 지갑 없이 멀티체인 보험 결제 접근.
- **TEE-based Bridges**: 메인넷과 프라이빗 샤드 간의 데이터 이동을 하드웨어 수준에서 증명하고 보안을 유지함.

---

## 2. 데이터 흐름 (Data Flow)

### Step 1: 데이터 주권 확보 (Data Sovereignty)
1. 사용자가 DTC 업체로부터 받은 유전자 Raw Data를 NPC에 업로드.
2. 데이터는 사용자의 개인키로 암호화되어 저장됨. NPC 관리자도 내용을 확인 불가.
   - **암호화 알고리즘**: ECIES(Elliptic Curve Integrated Encryption Scheme) 적용. 사용자의 NEAR 계정 키 쌍(Ed25519)에서 파생된 X25519 공개키로 데이터를 암호화하고, AES-256-GCM으로 실제 데이터 본문을 대칭 암호화.
   - **전송 구간**: 브라우저 → NPC 업로드 전 구간은 TLS 1.3 적용.
   - **NPC API 참조**: `NEAR AI Cloud` SDK(`@nearai/client`)의 `storage.upload(encryptedBlob)` / `storage.download(fileId)` 인터페이스 사용. 공식 문서: https://docs.near.ai/privacy-cloud/storage

### Step 2: 보안 분석 (In-TEE Processing)
1. 사용자가 분석을 요청하면, NPC에서 암호화된 데이터를 TEE 내부로 로드.
2. TEE 내부에서 데이터 복호화 및 AI 에이전트 가동.
3. 분석 완료 직후, TEE 내부의 모든 중간 데이터(복호화된 원본 등)는 즉시 파기(Volatile Memory).

### Step 3: ZKP 증명 생성 (In-TEE Proof Generation)
1. IronClaw TEE 내부에서 AI 분석 완료 직후 Noir 회로 실행.
2. `risk_score`(private)와 `threshold`(public)를 회로에 주입하여 `assert(risk_score >= threshold)` 검증.
3. proof bytes 생성 → 사용자 지갑으로 반환. 원본 risk_score는 이 시점에 TEE 메모리에서 소각.
4. 생성된 proof bytes는 `analysis_results` DB에 저장 (온체인 검증은 Phase 2).

### Step 4: 결과 도출 및 기밀 계약 (Result & Settlement)
1. AI 에이전트가 최적의 보험 상품 조합 리포트 생성.
2. 리포트는 사용자에게만 전달되며, 보험사에는 'Noir ZKP proof + 적정 상품 코드'만 전달됨.
3. **Chain Signatures** (`v1.signer` MPC)로 트랜잭션 서명 생성.
4. **Confidential Intents**를 통해 ZKP proof가 첨부된 기밀 트랜잭션으로 보험료 결제 프로세스 진행.

---

## 3. 보안 원칙 (Security Principles)

### 3-1. Noir ZKP (영지식 증명)
사용자의 실제 유전자 수치를 공개하지 않고도 '보험 자격 충족 여부'만 증명.
- **ZK 라이브러리**: [Noir](https://noir-lang.org/) (Aztec 개발, Rust 기반 ZK DSL). NEAR 스마트 컨트랙트에서 Noir로 컴파일된 회로를 온체인 검증 가능.
- **회로 구조**:
  ```noir
  fn main(risk_score: u8, pub threshold: u8) {
      assert(risk_score >= threshold);
  }
  ```
  - `risk_score`: private input — TEE 내부에서만 사용, 외부 절대 미노출
  - `threshold`: public input — 보험사 공개 기준값
  - proof output: "기준값 충족 여부(bool)"만 보험사에 전달
- **증명 생성 위치**: IronClaw TEE 내부. `prover.ts`가 호출되며, proof bytes만 TEE 외부로 반환.
- **검증 위치**: Phase 0 — 로컬 (`nargo verify`). Phase 2 — NEAR 스마트 컨트랙트 온체인.
- **트랜잭션 첨부**: proof bytes가 Confidential Intents 트랜잭션 calldata에 포함되어 보험사 컨트랙트가 직접 검증.

### 3-2. Chain Signatures (MPC 기반 멀티체인 서명)
NEAR 계정 하나로 타 체인 트랜잭션에 서명. 별도 지갑 없이 글로벌 보험 유동성 접근.
- **MPC 컨트랙트**: `v1.signer` (`multichain-testnet.near` on testnet)
- **파생 키 생성**: `deriveAddress(accountId, path)` — NEAR 계정에서 ETH/SOL 주소 파생
- **서명 요청**: `requestSignature(payload, path)` → MPC 노드들이 분산 서명 후 합산
- **Phase 0 적용**: NEAR → NEAR testnet MPC 서명 시연 (단일 체인, 플로우 증명)
- **Phase 3 적용**: NEAR → ETH/SOL 파생 주소로 타 체인 보험 상품 결제 (Relayer 서비스 연동)

### 3-3. Volatile Analysis
모든 분석은 휘발성 메모리(IronClaw TEE) 내에서만 이루어지며, 원본은 NPC 외부로 절대 유출되지 않음.

### 3-4. User-Owned AI
AI 에이전트의 분석 로직은 투명하게 공개되되, 분석 시점은 사용자의 승인 하에만 작동.

---

## 4. 실패 시나리오 및 에러 처리 (Failure Scenarios)

| 시나리오 | 발생 지점 | 처리 방식 |
| :--- | :--- | :--- |
| 파일 포맷 미지원 | Step 1 업로드 | 사전 클라이언트 검증(VCF/PDF/TXT만 허용). 업로드 전 파일 확장자 및 MIME 타입 확인 후 즉시 반환. |
| NPC 업로드 실패 | Step 1 | 3회 재시도(exponential backoff) 후 실패 시 사용자에게 에러 Toast 노출. 로컬 파일은 유지하고 재시도 유도. |
| TEE 분석 타임아웃 | Step 2 | 60초 이내 응답 없을 시 분석 요청 취소 및 TEE 세션 종료. UI에 "분석 환경 혼잡으로 재시도 필요" 안내 노출. |
| TEE 내부 오류 | Step 2 | IronClaw Runtime 반환 에러코드(ENCLAVE_ERROR) 수신 시 분석 즉시 중단, 중간 데이터 강제 소각(Emergency Purge) 후 사용자에게 재시도 유도. |
| ZKP 증명 생성 실패 | Step 3 | Noir 회로 에러 시 분석 결과 리포트 보류. "보험사 전달 증명 생성 실패" 안내 후 분석 재실행 요청. |
| Confidential Intents 거래 실패 | Step 5 | 트랜잭션 실패 시 결제 금액 즉시 환불(on-chain revert). 보험사로 데이터 미전송 보장. |

---

## 5. 향후 확장 기술 (Future Expansion)
- **Multi-Party Computation (MPC)**: 여러 사용자의 익명화된 데이터를 결합하여 정밀한 질병 예측 모델을 고도화할 때 활용.
- **Off-chain Attestation (구현 완료 — Phase 0)**: NEAR AI Cloud의 `GET /v1/attestation/report` 공개 엔드포인트를 통해 Intel TDX Quote를 조회하고, nonce 바인딩 검증 결과(`attestationNonce`, `attestationVerified`)를 DB에 기록. 분석 UI에서 `Intel TDX Attestation Verified` 배지로 사용자에게 표시. Phase 2에서는 `SHA256(signing_key || nonce)` 전체 해시 비교 검증으로 업그레이드 예정.
- **On-chain Attestation 등록 (Phase 2 예정)**: Off-chain 검증 결과를 NEAR 스마트 컨트랙트에 온체인 등록하여 제3자가 감사 가능한 형태의 불변 증명서 발급. Intel TDX `intel_quote`를 온체인 Calldata로 기록, DCAP-QVL 기반 검증 로직 연동.

---

---

## 6. ZKP proof 생성·검증 흐름 상세 (ZKP Flow Detail)

### 6-1. 실제 설계 흐름

```
[브라우저]              [TEE 서버]                  [NEAR 온체인]
    │                       │                             │
    │  파일 hash만 전송      │                             │
    │──────────────────────>│                             │
    │                       │  유전자 파일 파싱            │
    │                       │  risk_score 계산             │
    │                       │  (TEE 내부, 외부 미노출)     │
    │                       │                             │
    │                       │  Noir 회로 실행              │
    │                       │  private input: risk_score   │
    │                       │  public  input: threshold    │
    │                       │  assert(risk_score >= th)    │
    │                       │                             │
    │                       │  risk_score 소각             │
    │                       │  (TEE volatile memory)       │
    │                       │                             │
    │<── proof bytes ───────│                             │
    │                       │                             │
    │  결제 시 proof를 tx calldata에 첨부                  │
    │────────────────────────────────────────────────────>│
    │                       │          verify_proof()      │
    │                       │          스마트 컨트랙트      │
```

**proof 생성 위치**: TEE 서버 내부 (`prover.ts` → IronClaw Runtime)
**proof 검증 위치**: NEAR 온체인 스마트 컨트랙트 (`verify_proof(proof_bytes, public_inputs)`)

### 6-2. 브라우저에서 proof를 생성하지 않는 이유

proof 생성에는 **private input인 `risk_score`가 필수**다. `risk_score`는 유전자 데이터에서 도출되는 값이다.

만약 브라우저에서 proof를 생성한다면:
- `risk_score`가 브라우저 JavaScript 힙 메모리에 노출됨
- 개발자 도구, 메모리 덤프, 악성 확장 프로그램 등으로 수치 추출 가능
- TEE 프라이버시 모델이 완전히 무력화됨

TEE 내부에서 proof를 생성하면:
- `risk_score`가 하드웨어 격리 인클레이브 밖으로 절대 나오지 않음
- proof bytes만 TEE 외부로 반환 (수치 정보 없음)
- 브라우저는 proof bytes를 결제 트랜잭션 calldata에 첨부하는 역할만 수행

### 6-3. Phase 0 / Phase 2 구현 비교

| 항목 | Phase 0 (해커톤 데모) | Phase 2 (실 서비스) |
|---|---|---|
| proof 생성 위치 | TEE 서버 (`prover.ts` 더미 문자열) | TEE 서버 (`@noir-lang/noir_js` + BarretenbergBackend) |
| proof 검증 위치 | 로컬 (항상 `true` 반환) | NEAR 스마트 컨트랙트 온체인 `verify_proof()` |
| risk_score 위치 | 서버 메모리 (즉시 소각) | IronClaw TEE 메모리 (즉시 소각) |
| 브라우저 관여 | 없음 | 없음 |
| proof bytes 저장 | `analysis_results.zkp_proof_hash` DB 저장 | 동일 + 온체인 검증 결과 hash 추가 저장 |
| Vercel 배포 | 가능 (더미 구현으로 번들 제한 회피) | 가능 — proof는 IronClaw TEE 내부에서 생성. 웹 서버에 WASM 미설치 (단, TEE API 60초 타임아웃 초과 시 Docker 전환 검토) |

### 6-4. Hash vs ZKP Proof bytes — 차이와 역할

둘 다 원본 값(`risk_score`)을 역추적할 수 없다는 점에서 겉으로 비슷해 보인다. 그러나 목적과 검증 방식이 근본적으로 다르다.

| 항목 | Hash (해시) | ZKP Proof bytes |
|---|---|---|
| 출력 형태 | 고정 길이 hex 문자열 (예: SHA-256 → 64자) | 수학적 증명 구조체 (가변 바이트 배열) |
| 목적 | 데이터 무결성 확인 | 조건 충족 여부를 값 노출 없이 증명 |
| 검증 방법 | 같은 입력을 다시 해싱해서 비교 | proof bytes + public input을 verifier에 넣어 true/false 반환 |
| 원본 역추적 | 불가 | 불가 |

**결정적 차이**: 해시는 "이 데이터가 맞다/아니다"만 답할 수 있다. ZKP proof는 "이 데이터가 특정 조건을 만족한다"를 값 노출 없이 답할 수 있다.

**보험사 관점에서의 의미**

- 해시만 받으면: `risk_score`의 동일성만 확인 가능 — "자격이 되는지"는 알 수 없음.
- ZKP proof bytes를 받으면: `risk_score` 수치 없이도 `risk_score >= threshold` 조건 충족 여부를 수학적으로 검증 가능.

본 시스템이 단순 해시 대신 ZKP proof를 사용하는 이유가 여기에 있다. 보험사는 유전자 수치를 전혀 알지 못하면서도, proof bytes만으로 보험 자격 여부를 신뢰할 수 있다.

### 6-5. Phase 2 전환 시 교체 지점

```
src/lib/zkp/prover.ts      — generateZkpProof() 구현체 교체
src/lib/zkp/verifier.ts    — verifyZkpProof() → 온체인 컨트랙트 호출로 교체
circuits/insurance_eligibility/src/main.nr — 회로 파일 재사용 (변경 없음)
```

Phase 0에서 작성된 Noir 회로(`main.nr`)는 Phase 2에서 그대로 사용한다. 교체 대상은 proof 생성·검증 래퍼 함수뿐이다.

---

## 관련 문서
- [비즈니스 기획안](../01_Concept_Design/GENETIC_AI_INSURANCE_AGENT.md)
- [AI 매칭 파이프라인](../04_Logic_Progress/AI_MATCHING_PIPELINE.md)
- [품질 보증 및 보안 검증 시나리오](../05_QA_Validation/SECURITY_CHECKLIST.md)
