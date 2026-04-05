// MyDNA Insurance -- ZKP Proof Registry
//
// Stores proof hashes on-chain after client-side ultraplonk verification.
// Mathematical proof verification runs in the browser via @noir-lang/noir_js.
// This contract acts as the on-chain registry: "this proof was verified and accepted."
//
// Phase 2: Replace submit_proof with full ultraplonk verifier (Barretenberg Rust port)

use near_sdk::{env, near, store::LookupMap, AccountId, PanicOnDefault};

#[derive(near_sdk::BorshStorageKey)]
#[near]
enum StorageKey {
    ProofRegistry,
}

#[near(serializers = [borsh])]
pub struct ProofRecord {
    pub wallet_address: AccountId,
    pub cart_id: String,
    pub submitted_at: u64,
}

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct ZkpVerifier {
    proof_registry: LookupMap<String, ProofRecord>,
    vk_hash: String,
    owner_id: AccountId,
}

#[near]
impl ZkpVerifier {
    #[init]
    pub fn new(owner_id: AccountId, vk_hash: String) -> Self {
        assert!(!env::state_exists(), "Already initialized");
        Self {
            proof_registry: LookupMap::new(StorageKey::ProofRegistry),
            vk_hash,
            owner_id,
        }
    }

    // Called by the app after client-side proof verification succeeds.
    // proof_hash: SHA256 hex of the raw proof bytes
    // cart_id: links this proof to the specific checkout cart
    pub fn submit_proof(&mut self, proof_hash: String, cart_id: String) {
        assert!(!proof_hash.is_empty(), "proof_hash required");
        assert!(!cart_id.is_empty(), "cart_id required");
        assert!(
            self.proof_registry.get(&proof_hash).is_none(),
            "Proof already submitted"
        );
        let record = ProofRecord {
            wallet_address: env::predecessor_account_id(),
            cart_id,
            submitted_at: env::block_timestamp(),
        };
        self.proof_registry.insert(proof_hash, record);
    }

    // Returns true if a proof_hash has been registered on-chain.
    pub fn is_proof_registered(&self, proof_hash: String) -> bool {
        self.proof_registry.get(&proof_hash).is_some()
    }

    // Returns the wallet address, cart_id and timestamp for a registered proof.
    pub fn get_proof_record(&self, proof_hash: String) -> Option<(String, String, u64)> {
        self.proof_registry.get(&proof_hash).map(|r| {
            (
                r.wallet_address.to_string(),
                r.cart_id.clone(),
                r.submitted_at,
            )
        })
    }

    // Returns the verifying key hash used to validate proofs off-chain.
    pub fn get_vk_hash(&self) -> String {
        self.vk_hash.clone()
    }

    // Owner-only: update vk_hash when circuit is upgraded.
    pub fn update_vk_hash(&mut self, new_vk_hash: String) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Owner only"
        );
        self.vk_hash = new_vk_hash;
    }
}
