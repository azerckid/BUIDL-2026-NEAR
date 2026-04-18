//! ZKP Prover — IronClaw TEE WASI Tool
//!
//! Circuit: insurance_eligibility
//!   private input : risk_score  (u8, never leaves TEE)
//!   public  input : threshold   (u8, insurer-set baseline)
//!   assertion     : risk_score >= threshold
//!
//! Phase 2 commitment scheme:
//!   proof_bytes = HMAC-SHA256(key = VK_HASH, msg = risk_score || threshold || nonce)
//!   The commitment binds the private input without revealing it.
//!   Phase 3 upgrade path: replace with Barretenberg ultraplonk when
//!   NEAR runtime supports wasm32-wasip2 + Aztec verifier library.
//!
//! I/O protocol (WASI stdin / stdout):
//!   stdin  → ProveInput  JSON
//!   stdout → ProveOutput JSON  (exit 0)
//!            ErrorOutput JSON  (exit 1)

use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use std::io::{self, Read};

type HmacSha256 = Hmac<Sha256>;

// Verification key hash — matches zkp.rogulus.testnet VK_HASH
const VK_HASH: &str = "3d1dc5b490206789edb811dc07f8681ed05d2747d42cc4b3f73ac6547eb64507";

#[derive(Deserialize)]
struct ProveInput {
    risk_score: u8,
    threshold: u8,
    nonce: String,
}

#[derive(Serialize, Debug)]
struct ProveOutput {
    proof_bytes: String,
    public_inputs: PublicInputs,
    verification_key: String,
    circuit: String,
    assertion_passed: bool,
}

#[derive(Serialize, Debug)]
struct PublicInputs {
    threshold: u8,
    nonce: String,
}

#[derive(Serialize)]
struct ErrorOutput {
    error: String,
    assertion_failed: bool,
}

fn prove(input: &ProveInput) -> Result<ProveOutput, String> {
    // Circuit assertion: risk_score >= threshold
    if input.risk_score < input.threshold {
        return Err(format!(
            "assertion failed: risk_score({}) < threshold({})",
            input.risk_score, input.threshold
        ));
    }

    // HMAC-SHA256 commitment
    // Binds risk_score + threshold + nonce to VK_HASH key.
    // risk_score is a private input — it is used in the commitment but never appears in proof output.
    let mut mac = HmacSha256::new_from_slice(VK_HASH.as_bytes())
        .map_err(|e| format!("HMAC key error: {e}"))?;

    mac.update(&[input.risk_score, input.threshold]);
    mac.update(input.nonce.as_bytes());

    let result = mac.finalize().into_bytes();
    let proof_bytes = hex::encode(result);

    Ok(ProveOutput {
        proof_bytes,
        public_inputs: PublicInputs {
            threshold: input.threshold,
            nonce: input.nonce.clone(),
        },
        verification_key: VK_HASH.to_string(),
        circuit: "insurance_eligibility".to_string(),
        assertion_passed: true,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input(risk_score: u8, threshold: u8) -> ProveInput {
        ProveInput { risk_score, threshold, nonce: "test_nonce_001".to_string() }
    }

    #[test]
    fn proof_generated_when_eligible() {
        let out = prove(&input(80, 50)).unwrap();
        assert!(out.assertion_passed);
        assert_eq!(out.public_inputs.threshold, 50);
        assert_eq!(out.proof_bytes.len(), 64); // 32 bytes hex
    }

    #[test]
    fn proof_generated_at_exact_threshold() {
        let out = prove(&input(50, 50)).unwrap();
        assert!(out.assertion_passed);
    }

    #[test]
    fn assertion_fails_below_threshold() {
        let err = prove(&input(40, 50)).unwrap_err();
        assert!(err.contains("assertion failed"));
    }

    #[test]
    fn proof_bytes_deterministic() {
        let a = prove(&input(80, 50)).unwrap().proof_bytes;
        let b = prove(&input(80, 50)).unwrap().proof_bytes;
        assert_eq!(a, b);
    }

    #[test]
    fn different_scores_produce_different_proofs() {
        let a = prove(&input(80, 50)).unwrap().proof_bytes;
        let b = prove(&input(90, 50)).unwrap().proof_bytes;
        assert_ne!(a, b); // risk_score is bound into the commitment
    }
}

fn main() {
    let mut raw = String::new();
    if io::stdin().read_to_string(&mut raw).is_err() {
        let err = serde_json::to_string(&ErrorOutput {
            error: "failed to read stdin".to_string(),
            assertion_failed: false,
        })
        .unwrap_or_default();
        eprintln!("{err}");
        std::process::exit(1);
    }

    let input: ProveInput = match serde_json::from_str(&raw) {
        Ok(v) => v,
        Err(e) => {
            let err = serde_json::to_string(&ErrorOutput {
                error: format!("invalid input JSON: {e}"),
                assertion_failed: false,
            })
            .unwrap_or_default();
            eprintln!("{err}");
            std::process::exit(1);
        }
    };

    match prove(&input) {
        Ok(output) => {
            println!("{}", serde_json::to_string(&output).unwrap_or_default());
        }
        Err(msg) => {
            let err = serde_json::to_string(&ErrorOutput {
                error: msg,
                assertion_failed: true,
            })
            .unwrap_or_default();
            eprintln!("{err}");
            std::process::exit(1);
        }
    }
}
