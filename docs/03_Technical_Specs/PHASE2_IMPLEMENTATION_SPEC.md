# [기술 명세] Phase 2 구현 명세서

- **작성일**: 2026-04-05
- **최종 수정일**: 2026-04-05
- **레이어**: 03_Technical_Specs
- **상태**: Draft v1.0 (Phase 2 착수 전 사전 설계)

---

## 개요

Phase 0(해커톤 데모)에서 Mock 또는 부분 구현으로 남긴 3가지 핵심 기술 항목의 실연동 구현 명세.
각 항목은 독립적으로 착수 가능하며, 난이도 낮은 순으로 권장 착수 순서를 기술한다.

| 항목 | 착수 난이도 | 예상 기간 |
|---|---|---|
| 1. Confidential Intents SDK 연동 | 낮음 | 1~2주 |
| 2. v1.signer MPC Chain Signatures | 중간 | 2~4주 |
| 3. Noir ultraplonk 온체인 수학적 검증 | 높음 | 4~8주 |

---

## 1. Confidential Intents SDK 연동

### 1-1. 현재 상태 (Phase 0)

- `CheckoutClient.tsx`에 Confidential Intent 데이터 구조를 UI로만 시각화.
- 실제 Defuse Protocol Solver 네트워크에 인텐트가 제출되지 않음.
- NEAR 트랜잭션은 단순 Transfer (`wrap.testnet`으로 0.001 NEAR).

### 1-2. Phase 2 목표

- `@defuse-protocol/intents-sdk`를 사용해 실제 Confidential Intent를 Solver 네트워크에 제출.
- 보험료(USDC)를 Private Shard에서 기밀 정산.
- ZKP proof hash를 intent calldata에 첨부 — 보험사는 자격 증명만 확인.

### 1-3. 선결 조건

```
@defuse-protocol/intents-sdk v0.58.2 기준:
  near-api-js@5.x 요구 (현재 프로젝트: near-api-js@7.x)
```

**해결 방법 (택1)**:
- A안: `@defuse-protocol/intents-sdk`의 near-api-js v7 대응 버전 출시 대기 후 설치.
- B안: SDK 없이 Defuse Protocol REST API 직접 호출 (인텐트 서명 + 제출).
- C안: near-api-js를 npm workspace로 분리하여 버전 충돌 격리.

**권장: A안** — SDK v1.0 stable 출시 예정 확인 후 재검토.

### 1-4. 구현 절차

```
1. npm install @defuse-protocol/intents-sdk (버전 충돌 해소 후)

2. chain-signatures.ts 교체:
   현재: wallet.signAndSendTransaction({ transfer: { deposit } })
   교체: IntentsClient.submitIntent({
     type: "insurance_premium_payment",
     zkpProofHash: data.zkpProofHash,
     productIds: data.products.map(p => p.id),
     amountUsdc: data.totalMonthlyUsdc,
     network: "near_testnet",
   })

3. CheckoutClient.tsx:
   - ConfidentialIntentPanel의 "Phase 2 예정" 라벨 제거
   - 실제 intent 제출 결과 (intentId, solverTxHash) 표시

4. next.config.ts CSP:
   connect-src에 Defuse Protocol 엔드포인트 추가
   (https://*.defuse.org 또는 확정 도메인)

5. completeCheckout / confirmCheckout:
   - txHash 대신 intentId + solverTxHash 저장
   - transactions.network: "near_confidential_shard"로 교체
```

### 1-5. 관련 파일

| 파일 | 변경 내용 |
|---|---|
| `src/lib/near/chain-signatures.ts` | Intent 제출 함수로 교체 |
| `src/components/modules/CheckoutClient.tsx` | Intent 결과 UI 업데이트 |
| `src/actions/confirmCheckout.ts` | intentId 저장 필드 추가 |
| `src/lib/db/schema.ts` | transactions 테이블 intentId 컬럼 추가 |
| `next.config.ts` | CSP connect-src 추가 |

---

## 2. v1.signer MPC Chain Signatures 실연동

### 2-1. 개념

NEAR의 `v1.signer` MPC 컨트랙트는 다수의 MPC 노드가 분산 키 생성(DKG)으로 파생 키를 생성하고, NEAR 계정 하나로 Ethereum, Bitcoin, Solana 등 타 체인 트랜잭션에 서명하는 기능이다.

```
rogulus.testnet
    └─ v1.signer.near 호출 (sign request)
         └─ MPC 노드 네트워크 (임계값 서명)
              └─ ETH 파생 주소: 0xABC... 로 ETH 트랜잭션 서명
                   └─ Ethereum 노드에 브로드캐스트
```

사용자는 NEAR 지갑만으로 ETH/BTC 보험료를 결제할 수 있다 — 멀티체인 지갑 불필요.

### 2-2. 결제 흐름 전체 시나리오

사용자 `rogulus.testnet`이 ETH로 보험료를 결제하는 흐름을 단계별로 설명한다.

```
사용자: rogulus.testnet (NEAR 계정)
  │
  ├─ [사전 준비] v1.signer MPC 컨트랙트로 파생 ETH 주소 생성
  │     deriveEthAddress("rogulus.testnet", "insurance,1")
  │     → 결과: 0xABC... (rogulus.testnet이 MPC로 제어하는 ETH 주소)
  │
  ├─ [사전 준비] 파생 주소(0xABC...)에 ETH 충전 필요
  │     → Ethereum Sepolia Faucet에서 테스트 ETH 충전
  │     → 이 주소는 NEAR 지갑으로만 제어 가능 (개인키 없음)
  │
  └─ [결제 시] 5단계 흐름
        1. 앱이 ETH 트랜잭션 구성 (0xABC... → 보험사 주소, 금액)
        2. ETH 트랜잭션 해시를 v1.signer MPC 컨트랙트에 전달
        3. NEAR 지갑 팝업 → 사용자가 NEAR 트랜잭션에 서명
        4. MPC 노드들이 분산 서명 → ETH 트랜잭션 완성
        5. Ethereum Sepolia에 브로드캐스트 → ETH txHash 반환
```

**핵심**: 사용자는 NEAR 지갑 하나만으로 ETH 보험료를 결제한다. ETH 개인키나 MetaMask가 필요 없다.

**파생 주소의 특성**
- `rogulus.testnet` + `"insurance,1"` 경로의 조합으로 항상 동일한 ETH 주소가 결정론적으로 파생됨
- 해당 ETH 주소의 개인키는 존재하지 않음 — MPC 노드 네트워크만이 서명 가능
- 경로(`"insurance,1"`)를 바꾸면 다른 ETH 주소가 파생됨 (용도별 주소 분리 가능)

### 2-3. 현재 상태 (Phase 0)

- `chain-signatures.ts`: WalletSelector로 NEAR Testnet Transfer 트랜잭션만 처리.
- 타 체인 파생 키 생성 및 서명 미구현.

### 2-4. Phase 2 구현 절차

#### Step 1: 파생 주소 생성

```typescript
// src/lib/near/chain-signatures.ts 추가

import { nearAPI } from "near-api-js";

const MPC_CONTRACT = "v1.signer-prod.testnet"; // testnet
// mainnet: "v1.signer.near"

// NEAR 계정에서 ETH 파생 주소 계산 (view call, 비용 없음)
export async function deriveEthAddress(
  nearAccountId: string,
  derivationPath: string = "insurance,1" // 보험 결제 전용 경로
): Promise<string> {
  const result = await viewFunction({
    contractId: MPC_CONTRACT,
    methodName: "derived_public_key",
    args: { path: derivationPath, predecessor: nearAccountId },
  });
  // compressed secp256k1 공개키 → ETH 주소 변환
  return publicKeyToEthAddress(result);
}
```

#### Step 2: MPC 서명 요청

```typescript
// NEAR 트랜잭션 FunctionCall: v1.signer에 서명 요청
export async function requestMpcSignature(
  wallet: Wallet,
  payload: Uint8Array, // 32바이트 해시 (ETH tx hash 등)
  derivationPath: string
): Promise<{ bigR: string; s: string }> {
  const result = await wallet.signAndSendTransaction({
    receiverId: MPC_CONTRACT,
    actions: [{
      functionCall: {
        methodName: "sign",
        args: { request: { payload: Array.from(payload), path: derivationPath, key_version: 0 } },
        gas: "250000000000000", // 250 Tgas
        deposit: "1", // 1 yoctoNEAR
      },
    }],
  });
  return extractMpcSignature(result);
}
```

#### Step 3: ETH 트랜잭션 브로드캐스트

```typescript
// MPC 서명 → ETH 트랜잭션 복원 후 브로드캐스트
import { ethers } from "ethers";

export async function broadcastEthTransaction(
  signedPayload: { bigR: string; s: string },
  unsignedTx: ethers.TransactionRequest
): Promise<string> { // ETH txHash
  const signature = reconstructEthSignature(signedPayload);
  const signedTx = ethers.Transaction.from({ ...unsignedTx, signature });
  const provider = new ethers.JsonRpcProvider("https://rpc.sepolia.org");
  const receipt = await provider.broadcastTransaction(signedTx.serialized);
  return receipt.hash;
}
```

### 2-5. 필요 패키지

```bash
npm install ethers           # ETH 트랜잭션 구성
npm install @solana/web3.js  # SOL 트랜잭션 구성 (Phase 3)
```

### 2-6. 관련 파일

| 파일 | 변경 내용 |
|---|---|
| `src/lib/near/chain-signatures.ts` | deriveEthAddress, requestMpcSignature, broadcastEthTransaction 추가 |
| `src/components/modules/CheckoutClient.tsx` | 체인 선택 UI (NEAR / ETH / SOL) 추가 |
| `src/lib/db/schema.ts` | transactions.network에 "ethereum_sepolia", "solana_devnet" 추가 |
| `next.config.ts` | CSP connect-src에 ETH RPC 엔드포인트 추가 |

### 2-7. 참고 자료

- MPC 컨트랙트 주소: `v1.signer-prod.testnet` (testnet), `v1.signer.near` (mainnet)
- NEAR Chain Signatures 공식 문서: https://docs.near.org/concepts/abstraction/chain-signatures
- 예제 레포: https://github.com/near-examples/near-multichain

---

## 3. Noir ultraplonk 온체인 수학적 검증

> **[교정 2026-04-06]** 아래 3-3절 "클라이언트 사이드 proof 생성"은 `NEAR_PRIVACY_STACK_ARCH.md` 6-1절/6-2절과 불일치한다.
> 아키텍처 설계에 따르면 ZKP proof 생성은 **IronClaw TEE 내부**에서 수행되며, `risk_score`가 TEE 외부로 나오지 않아야 한다.
> `@noir-lang/noir_js` + `@aztec/bb.js`를 우리 웹 서버나 브라우저에 설치하는 방식은 `risk_score`가 TEE 외부에 노출되어 프라이버시 모델을 무력화한다.
> 올바른 구현: IronClaw TEE 내부에서 Noir 회로 실행 → proof bytes만 API 응답으로 수신 → 온체인 검증 제출.
> 아래 3-3절의 코드 예시는 **TEE 내부 구현 참고용**으로만 유효하며, 우리 웹 서버 코드(`prover.ts`)에는 TEE API 호출 래퍼로 교체해야 한다.

### 3-1. 현재 상태 (Phase 0)

- `zkp.rogulus.testnet` 컨트랙트: proof hash를 온체인에 **등록**만 함.
- 실제 ultraplonk 수학적 검증(pairing check)은 컨트랙트 내에서 실행되지 않음.
- 클라이언트 사이드 검증도 미구현 (`@noir-lang/noir_js` 미설치).

### 3-2. Phase 2 목표

- 클라이언트(`@noir-lang/noir_js` + `@aztec/bb.js`)에서 실제 proof 생성.
- 생성된 proof bytes를 `zkp.rogulus.testnet`에 제출 → 컨트랙트가 ultraplonk pairing check 실행.
- 검증 통과한 proof만 보험 결제 진행 허용.

### 3-3. 클라이언트 사이드 proof 생성

```typescript
// src/lib/zkp/prover.ts 교체 내용
import { Noir } from "@noir-lang/noir_js";
import { UltraHonkBackend } from "@aztec/bb.js";
import circuit from "../../../circuits/insurance_eligibility/target/insurance_eligibility.json";

export async function generateZkpProof(input: {
  riskScore: number;
  threshold?: number;
}): Promise<ZkpProof> {
  const backend = new UltraHonkBackend(circuit.bytecode);
  const noir = new Noir(circuit);

  const { witness } = await noir.execute({
    risk_score: input.riskScore,
    threshold: input.threshold ?? 50,
  });

  const proof = await backend.generateProof(witness);
  const proofHex = Buffer.from(proof.proof).toString("hex");

  return {
    proofBytes: proofHex,
    publicInputs: { threshold: input.threshold ?? 50 },
    verificationKey: circuit.verification_key ?? "honk_vk",
  };
}
```

**주의**: `@aztec/bb.js`는 WASM 번들 약 30~50MB. Next.js에서 dynamic import + `next.config.ts`의 `serverExternalPackages` 설정 필요.

```typescript
// next.config.ts 추가
serverExternalPackages: ["@aztec/bb.js", "@noir-lang/noir_js"],
```

### 3-4. 온체인 수학적 검증 (Rust 컨트랙트)

Barretenberg의 ultraplonk verifier를 NEAR Rust 컨트랙트에 포팅하는 것이 가장 완전한 구현이나, 난이도가 매우 높다 (수주~수개월).

**현실적 대안 — 두 단계 검증**:

```
단계 1 (클라이언트): @aztec/bb.js로 proof 생성 + 로컬 검증
단계 2 (컨트랙트): proof bytes의 SHA256 해시만 온체인 등록
                   → "이 proof는 클라이언트에서 검증됐다"는 선언적 증명
```

**완전한 온체인 검증 구현 시 필요한 작업**:

```rust
// contracts/zkp_verifier/src/lib.rs 추가 예시
// barretenberg-sys Rust 바인딩 또는 순수 Rust ultraplonk verifier 필요

pub fn verify_proof_onchain(
    &self,
    proof_bytes: Vec<u8>,   // bb prove 출력
    public_inputs: Vec<u8>, // threshold 등 공개 입력
) -> bool {
    // ultraplonk pairing check
    // 현재 NEAR 공식 지원 없음 — Aztec와 협력 필요
    ultraplonk_verify(&self.vk_bytes, &proof_bytes, &public_inputs)
}
```

**필요 라이브러리**: `barretenberg-sys` (Rust FFI 바인딩) 또는 순수 Rust ultraplonk 구현체. 현재 NEAR 생태계에 공식 지원 없음. Aztec Protocol 팀과 협력 또는 별도 구현 필요.

### 3-5. 관련 파일

| 파일 | 변경 내용 |
|---|---|
| `src/lib/zkp/prover.ts` | `@noir-lang/noir_js` + `@aztec/bb.js` 실제 proof 생성으로 교체 |
| `src/lib/zkp/verifier.ts` | `@aztec/bb.js` 로컬 검증 + 온체인 제출 |
| `contracts/zkp_verifier/src/lib.rs` | `verify_proof_onchain` 함수 추가 (ultraplonk verifier 포팅 후) |
| `next.config.ts` | `serverExternalPackages` 설정 추가 |

### 3-6. 난이도 평가

| 작업 | 난이도 | 비고 |
|---|---|---|
| `@noir-lang/noir_js` 클라이언트 proof 생성 | 중간 | WASM 번들 크기 이슈 |
| proof bytes 온체인 등록 (현재 방식) | 완료 | zkp.rogulus.testnet |
| ultraplonk verifier NEAR Rust 포팅 | 매우 높음 | Aztec 팀 협력 필요 |

---

## 관련 문서

- [로드맵](../04_Logic_Progress/ROADMAP.md) — Stage 11 Phase 2 체크리스트
- [NEAR 프라이버시 스택 아키텍처](./NEAR_PRIVACY_STACK_ARCH.md)
- [Defuse Protocol 인텐트 SDK](https://github.com/defuse-protocol/intents-sdk)
- [NEAR Chain Signatures 공식 문서](https://docs.near.org/concepts/abstraction/chain-signatures)
- [Noir 공식 문서](https://noir-lang.org/docs)
- [Barretenberg bb.js](https://github.com/AztecProtocol/aztec-packages/tree/master/barretenberg/ts)
