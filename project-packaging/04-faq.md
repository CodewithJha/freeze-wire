# Technical FAQ

Keep answers short enough for live conversation. Sources: README, ATTESTCOIN_*, SECURITY_EVIDENCE, COMPETITIVE_POSITIONING, DEMO_SPECIFICATION.

---

### 1. What exactly is FreezeWire?

FreezeWire inherits Circle USDC **address** `Blacklisted` / `UnBlacklisted` facts from Ethereum mainnet into Creditcoin CC3 eligibility, then gates new credit (`draw` / extractive ops) for Restricted addresses — via Attestcoin proofs, not a backend oracle.

---

### 2. Why does this need Attestcoin?

Creditcoin contracts cannot natively read Ethereum logs. Attestcoin supplies cryptographic inclusion + continuity proofs so CC3 can accept an Ethereum fact without trusting a keeper. Without that path, you fall back to `setRestricted`-style oracles.

---

### 3. What does BlockProver `0x0FD2` actually prove?

When `verify` / `verifyAndEmit` succeeds: Merkle **inclusion** of the submitted encoded transaction under an attested header, plus **continuity** of the supplied continuity proof toward the attested tip. It emits explorer-friendly verification events when using `verifyAndEmit`.

---

### 4. What does FreezeWire verify itself?

After precompile success: `receiptStatus == 1`; emitter == constructor-immutable Circle USDC; topic0 ∈ {Blacklisted, UnBlacklisted}; account from `topics[1]`; expected `chainKey`; height window; `txIndex` recovered from Merkle `isLeft` bits; replay / ordering. Then ledger write and credit gating.

---

### 5. Why can't the backend simply set RESTRICTED?

There is no privileged write path for eligibility. The worker discovers proofs and may relay calldata/gas; on-chain contracts ignore unauthenticated narrative. A lying Proof Builder or worker still fails `0x0FD2` or consumer checks.

---

### 6. Is there a `setStatus` / `setRestricted` function?

No. Eligibility moves only through permissionless `submitProof` after verification. SecurityBoundaries / API tests assert no setter.

---

### 7. Why is the frontend not trusted?

UI can display wrong labels or fail closed. Only on-chain `statusOf` and explorer txs are authoritative for Restricted. Demo language: **PROOF BUNDLE READY** ≠ ledger write.

---

### 8. What happens if the proof is replayed?

Replay key = `keccak256(chainKey, height, txIndexRecovered)`. Second submit → `QueryAlreadyProcessed`.

---

### 9. What happens if receipt status is failed?

Consumer check requires `receiptStatus == 1`. Otherwise revert `SourceTxFailed`; no ledger Restricted write for that path.

---

### 10. What happens if the emitter is fake?

Logs whose `address` ≠ constructor-immutable Circle USDC are skipped. Impostor tokens cannot bind. (Foundry T-SEC-EMITTER-*).

---

### 11. What happens if the event topic is wrong?

Only Circle `Blacklisted` / `UnBlacklisted` topic0 bind. Transfer / Paused / decoys ignored. Issuer `Paused` is CEL’s object — not ours.

---

### 12. What happens if the account topic is wrong?

Indexed account comes from `topics[1]`. Caller cannot redirect Alice’s claim onto Bob’s log; only the logged account is restricted.

---

### 13. Why Creditcoin?

The venue that must refuse the draw is where the proof verifies. FreezeWire’s financial consequence (`GatedCreditLine`) lives on CC3 beside Attestcoin’s BlockProver — the chain that can enforce “no new credit to this address.”

---

### 14. Why DeFi?

FreezeWire is Attestcoin-gated credit access — lending / liquidity-style product on Creditcoin. (RWA is a weaker alternate framing.)

---

### 15. How is this different from Corolary?

Corolary (visible peer): prove Ethereum **lending history** (reputation/solvency) to improve collateral efficiency. FreezeWire does not score history; it inherits a **compliance flag** and **denies** new credit to the proven address.

---

### 16. How is this different from CEL?

**CEL freezes the instrument** (e.g. issuer `Paused` → asset eligibility). **FreezeWire freezes the counterparty** after a proven Circle blacklist → address eligibility. Same Attestcoin spine class; different economic object. We do not claim to be “better than CEL” overall.

---

### 17. What happens if Attestcoin is removed?

**Removal test:** Without Attestcoin / BlockProver `0x0FD2`, FreezeWire cannot move an address to `RESTRICTED`. There is no owner setter, eligibility DB, or worker privilege that invents Circle’s blacklist. Consumer checks alone cannot create Restricted without a verified inclusion+continuity path.

---

### 18. What is the current production limitation?

**CC3 testnet** only. MockUSD is demo collateral — not Circle USDC reserves on CTC. Proof window is `(0,0)` unbounded (disclosed). Owner can still retune `chainKey`/window (operational residual, not emitter swap). No production-security or mainnet credit-bureau claims.

---

### 19. How would this scale?

Architecture supports permissionless submitters and batching up to protocol limits; gas scales with continuity length (prefer proving soon after attestation). Production would add bounded freshness windows, monitoring, and possibly newer blacklist txs as attestation lag moves — not a trusted eligibility database.

---

### 20. What would you build next?

(Opinion / roadmap — not shipped:) bounded production windows; optional newer live blacklist demo choreography; CEI polish on credit line; CC3 mainnet chainKey table (`1` for ETH mainnet) when in scope; richer discovery without ever adding a setter. Writability / handshake writeback remains out of scope by design.

---

## Fast rebuttals

| Challenge | Reply |
|---|---|
| “Already Restricted — fake?” | Prior permissionless `submitProof` on Blockscout `0x07e3…`. A shows before; B shows consequence. Architecture cannot invent Restricted. |
| “Oracle?” | Permissionless proof; lying worker fails `0x0FD2` or binder. |
| “MockUSD = USDC?” | No. We inherit the Ethereum flag; MockUSD is CC3 test collateral. |
| “Precompile checks status?” | No. We do. |
| “Wrong chain?” | Sepolia is chainKey `1`; we bind `3` on CC3 testnet. |
