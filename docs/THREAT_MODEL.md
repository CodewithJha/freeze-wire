# Threat model

Each scenario: Threat → Attack → Impact → Mitigation → Test (maps to REQUIREMENTS).

---

## T-01 Fake source event

**Threat:** Attacker wants Restricted without a real USDC blacklist.  
**Attack:** Submit random bytes or a mocked receipt as `encodedTransaction`.  
**Impact:** If accepted, false Restricted / theft of demo credibility.  
**Mitigation:** `verifyAndEmit` must succeed (INV-2). Forged bytes fail Merkle/continuity.  
**Test:** `T-SEC-FAKE` / SEC-002. Foundry: mock precompile returns false → `ProofRejected`. Live: mutated sibling → reject.

## T-02 Fake emitter

**Threat:** Impostor contract emits `Blacklisted(Alice)`.  
**Attack:** Prove a real tx on an impostor (or a receipt with only impostor logs).  
**Impact:** Alice Restricted without Circle action.  
**Mitigation:** `log.address == expectedEmitter` (FR-003, SEC-003). Emitter is constructor-immutable (ADR-0016).  
**Test:** `T-SEC-EMITTER`.

## T-03 Wrong event

**Threat:** Use a real USDC tx that is not blacklist.  
**Attack:** Prove USDC `Transfer` or `Paused`.  
**Impact:** Wrong economic meaning (pause vs address flag).  
**Mitigation:** topic0 allowlist Blacklisted/UnBlacklisted only (FR-004, SEC-004).  
**Test:** `T-SEC-EVENT`.

## T-04 Wrong account

**Threat:** Restrict Alice using Bob’s blacklist.  
**Attack:** Submit a valid Blacklisted(Bob) proof and hope the credit line keys on msg.sender or a parameter.  
**Impact:** Alice cannot draw.  
**Mitigation:** Ledger keys on decoded topic[1] only (FR-005, SEC-005). Credit line reads `statusOf(user)`.  
**Test:** `T-SEC-ACCOUNT`.

## T-05 Replay

**Threat:** Re-apply the same proof to toggle or grief.  
**Attack:** `submitProof` twice.  
**Impact:** Extra events; possible restore/restrict thrash if combined with other logs.  
**Mitigation:** `processed[keccak(chainKey,height,txIndex)]` (FR-010, SEC-006).  
**Test:** `T-SEC-REPLAY`.

## T-06 Stale proof

**Threat:** Ancient UnBlacklisted restores after a newer Blacklisted, or unbounded historical grief.  
**Attack:** Submit older position after newer one; or prove a very old tx when window is tight.  
**Impact:** Incorrect current status; gas grief.  
**Mitigation:** last-position ordering (FR-007, SEC-013); optional height window (FR-013, SEC-007).  
**Test:** `T-SEC-WINDOW`, `T-SC-RESTORE`.

## T-07 Failed transaction

**Threat:** Include a reverted tx that still has logs in some encodings.  
**Attack:** Prove a receipt with `status != 1`.  
**Impact:** Inherit a non-executed blacklist.  
**Mitigation:** `receiptStatus == 1` (FR-011, SEC-008). Precompile does **not** do this.  
**Test:** `T-SEC-STATUS`.

## T-08 Compromised backend

**Threat:** Attacker controls worker HTTP.  
**Attack:** `POST /relay` with a JSON `{account, restricted: true}` and no proof; or swap proof bytes.  
**Impact:** If the API wrote chain state, total compromise.  
**Mitigation:** No such API. Relay only submits `submitProof` calldata. Junk proofs fail T-01. SEC-001, SEC-011, INV-1.  
**Test:** `T-SEC-PERM`, `T-API-NOSETTER`. Grep CI: no `setRestricted`.

## T-09 Unauthorized contract caller

**Threat:** Call credit internals or forge ledger.  
**Attack:** Direct storage writes (can’t); `draw` without eligibility; impersonate ledger.  
**Impact:** Drain MockUSD.  
**Mitigation:** Standard Solidity; credit line holds tokens; `statusOf` on `msg.sender`; no delegatecall to user. SEC-010.  
**Test:** `T-FIN-DRAW`, `T-SEC-AUTH`.

## T-10 Malicious frontend

**Threat:** UI shows ELIGIBLE while chain is RESTRICTED, or crafts a setStatus tx.  
**Attack:** Modified JS; phishing.  
**Impact:** User confusion; cannot actually set status.  
**Mitigation:** All writes on-chain; demo instructs judges to read Blockscout. SEC-011.  
**Test:** `T-FE-STATUS` reads chain; manual DEMO checklist.

## T-11 RPC manipulation

**Threat:** Ethereum RPC omits logs or CC3 RPC returns fake `statusOf`.  
**Attack:** MITM worker’s RPC.  
**Impact:** Missed discovery (fail-open until proof); fake UI reads.  
**Mitigation:** Discovery fail-open is **stated**; verification is on-chain. Judges use public explorers. Worker checks `eth_chainId` / CC3 chain id. SEC-012.  
**Test:** `T-API-DISC` error path; manual RPC chain-id check.

## T-12 Invalid state transition

**Threat:** Restore via Transfer; UnBlacklisted older than Blacklisted; Restricted draw.  
**Attack:** Malformed apply order; skip eligible check.  
**Impact:** Wrong status or credit leak.  
**Mitigation:** State machine in ledger; gated functions. SEC-013, INV-7/8.  
**Test:** `T-SC-RESTORE`, `T-FIN-*`.

## T-13 Wrong chainKey

**Threat:** Sepolia blacklist (chainKey 1) restricts a mainnet-bound ledger.  
**Attack:** Submit a valid Sepolia proof.  
**Impact:** Cross-environment confusion.  
**Mitigation:** `expectedChainKey == 3` on CC3 testnet demo (SEC-009, INT-001).  
**Test:** `T-SEC-CHAIN`.

## T-14 Decoy logs

**Threat:** Receipt contains impostor Blacklisted + real USDC Transfer.  
**Attack:** Bind the impostor.  
**Impact:** Wrong account.  
**Mitigation:** Scan all logs; skip non-matches; only canonical topic+emitter (FR-028).  
**Test:** `T-SEC-DECOY`.

## T-15 Relayer grief / gas drain

**Threat:** Public `/relay` burns operator funds on junk.  
**Attack:** Spam relay.  
**Mitigation:** Bind worker to localhost for demo; rate limit; permissionless users can self-submit from wallets. Not an eligibility bypass.  
**Test:** `T-API-RATELIMIT` (manual/unit).

## T-16 Owner cannot replace canonical emitter

**Threat:** Compromised owner replaces Circle USDC as the source of truth.  
**Attack:** Hypothetical `setExpectedEmitter`, or swapping the ledger’s verifier for one with a different emitter.  
**Impact:** Attacker’s token events would start binding.  
**Mitigation:** `expectedEmitter` is constructor-immutable; ledger → verifier is constructor-immutable in MVP (ADR-0016). Owner may still set chainKey/window. Still no `setStatus`. Wrong emitter ⇒ redeploy.  
**Test:** `T-SEC-OWNER`.

---

## Residual risk (accepted for the demo)

- Attestor compromise (protocol)
- Circle contract bug
- Proof Builder downtime (liveness)
- Long continuity proof gas on old demo tx
- Default ELIGIBLE fail-open until a proof is submitted
