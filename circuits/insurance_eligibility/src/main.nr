// MyDNA Insurance Eligibility ZKP Circuit
//
// Proves that a user's genetic risk score meets the insurer's threshold
// WITHOUT revealing the actual score.
//
// Private input: risk_score - computed inside TEE, never leaves secure memory
// Public  input: threshold  - insurer's publicly known eligibility cutoff
//
// Phase 0: Circuit is compiled but proof is generated as a dummy in prover.ts
// Phase 2: @noir-lang/noir_js + BarretenbergBackend will generate real proofs

fn main(risk_score: u8, threshold: pub u8) {
    // Assert eligibility: risk score must meet or exceed the threshold
    assert(risk_score >= threshold);
}
