# IronClaw WASM 툴 등록 가이드 (16-2)

## 현황 (2026-04-19 확인)

`nearai registry` CLI는 2025-10-31 폐기 (410 Gone).
신규 플랫폼: **https://cloud.near.ai**

WASM 툴 등록은 `cloud.near.ai` 웹 인터페이스 또는 새 API를 통해 진행해야 합니다.
NEAR AI 팀에 문의하거나 `cloud.near.ai` 문서 업데이트를 확인하세요.

---

## 등록할 WASM 바이너리

```
zkp-prover-wasm/dist/zkp-prover.wasm  (137KB, wasm32-wasip2)
```

## 툴 스펙 (등록 시 참고)

```json
{
  "name": "zkp-prover",
  "version": "0.1.0",
  "description": "Insurance eligibility ZKP prover — HMAC-SHA256 commitment, wasm32-wasip2",
  "category": "tool",
  "tags": ["zkp", "insurance", "tee", "wasm"],
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
```

## 에이전트에 툴 연결 (등록 완료 후)

IronClaw 에이전트 설정에서 `tools` 배열에 등록:

```json
{
  "tools": ["azerckid.near/zkp-prover/0.1.0"]
}
```

---

Phase 3 업그레이드 경로:
- Barretenberg ultraplonk 지원 시 동일 인터페이스로 교체 → `v0.2.0`으로 재등록
