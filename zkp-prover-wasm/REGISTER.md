# IronClaw WASM 툴 등록 가이드 (16-2)

## 사전 조건

```bash
pip3 install nearai
nearai login   # NEAR 계정으로 인증 (rogulus.testnet)
```

## 메타데이터 초기화

```bash
cd zkp-prover-wasm
nearai registry metadata-template
```

`metadata.json` 생성 후 아래 내용으로 수정:

```json
{
  "name": "zkp-prover",
  "version": "0.1.0",
  "description": "Insurance eligibility ZKP prover — HMAC-SHA256 commitment, wasm32-wasip2",
  "category": "tool",
  "tags": ["zkp", "insurance", "tee", "wasm"],
  "details": {
    "input_schema": {
      "risk_score": "u8 (private — never leaves TEE)",
      "threshold": "u8 (public — insurer baseline)",
      "nonce": "string (UUID)"
    },
    "output_schema": {
      "proof_bytes": "hex string (HMAC-SHA256 commitment, 64 chars)",
      "public_inputs": { "threshold": "u8", "nonce": "string" },
      "verification_key": "string (VK_HASH)",
      "assertion_passed": "bool"
    }
  }
}
```

## 업로드

```bash
nearai registry upload \
  --local-path dist/zkp-prover.wasm \
  --name "azerckid.testnet/zkp-prover/0.1.0"
```

## 에이전트에 툴 연결

IronClaw 에이전트 설정에서 `tools` 배열에 등록:

```json
{
  "tools": ["azerckid.testnet/zkp-prover/0.1.0"]
}
```

## 검증

```bash
nearai registry info azerckid.testnet/zkp-prover/0.1.0
```

---

Phase 2 완료 후 Phase 3 업그레이드 경로:
- Barretenberg ultraplonk 지원 시 동일 인터페이스로 교체
- `nearai registry upload --name "azerckid.testnet/zkp-prover/0.2.0"`
