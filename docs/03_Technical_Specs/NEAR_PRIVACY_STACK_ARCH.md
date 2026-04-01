# [기술 명세] NEAR AI 프라이버시 스택 기반 유전자 데이터 처리 아키텍처

- **작성일**: 2026-03-31
- **최종 수정일**: 2026-04-01
- **레이어**: 03_Technical_Specs
- **상태**: Draft v1.0

---

## 1. 아키텍처 개요 (Architectural Overview)
본 시스템은 개인의 민감한 유전자 데이터(DNA Raw Data)를 처리하기 위해 'Security-First' 접근 방식을 채택합니다. 모든 연산은 격리된 환경에서 수행되며, 데이터 소유권은 완벽히 사용자에게 귀속됩니다.

### 1.1 핵심 기술 구성 요소 (Key Components)
- **NEAR Private Cloud (NPC)**: 사용자별 암호화 스토리지. 유전자 원본 데이터(VCF, PDF)가 보관되는 금고 역할.
- **IronClaw Runtime (in NEAR TEE)**: AI 에이전트가 격리된 엔클레이브(Enclave) 내에서 가동되도록 보장하는 오픈소스 런타임. 외부의 메모리 스캔이나 조작이 불가능함.
- **Private Shards (Confidential Layer)**: 2026.02 도입. 허가된 검증자 셋이 운영하는 전 전용 샤드로서, 거래 상세 내역을 퍼블릭 멤풀에 노출하지 않음.
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

### Step 3: 결과 도출 및 기밀 계약 (Result & Settlement)
1. AI 에이전트가 최적의 보험 상품 조합 리포트 생성.
2. 리포트는 사용자에게만 전달되며, 보험사에는 '검증된 AI에 의해 설계된 적정 상품 코드'만 전달됨.
3. **Confidential Intents**를 통해 실제 가입 및 보험료 결제 프로세스 진행.

---

## 3. 보안 원칙 (Security Principles)
1.  **Zero-Knowledge Proof (ZKP) 활용**: 사용자의 실제 유전자 수치를 공개하지 않고도 '고위험군 여부' 등 조건 충족 사실만 증명.
    - **ZK 라이브러리**: [Noir](https://noir-lang.org/) (Aztec 개발, Rust 기반 ZK DSL) 사용. NEAR 스마트 컨트랙트에서 Noir로 컴파일된 회로(circuit)를 on-chain에서 검증 가능.
    - **회로 로직 예시**: `assert(risk_score >= threshold)` — 실제 risk_score 수치는 회로 내부(private input)에 머물고, 임계값 초과 여부(public output)만 보험사에 전달.
    - **증명 생성 위치**: TEE 내부에서 Noir 증명 생성 후, 증명 데이터(proof bytes)만 사용자 지갑으로 반환. 원본 수치는 TEE 외부로 절대 노출되지 않음.
2.  **Volatile Analysis**: 모든 분석은 휘발성 메모리(TEE) 내에서만 이루어지며, 원본은 NPC 외부로 절대 유출되지 않음.
3.  **User-Owned AI**: AI 에이전트의 분석 로직은 투명하게 공개되되, 분석 시점은 사용자의 승인 하에만 작동.

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
- **On-chain Attestation**: TEE 내에서 수행된 분석 결과에 대한 신뢰성을 온체인 증명서로 발급.

---

## 관련 문서
- [비즈니스 기획안](../01_Concept_Design/GENETIC_AI_INSURANCE_AGENT.md)
- [품질 보증 및 보안 검증 시나리오](../05_QA_Validation/SECURITY_CHECKLIST.md)
