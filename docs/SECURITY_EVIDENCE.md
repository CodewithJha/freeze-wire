# Security evidence (verified attack matrix)

Judge-facing map from threats → mitigations → Foundry / worker tests.  
Labels: **VERIFIED** (test or live artifact), **RESIDUAL** (accepted / disclosed), **OUT OF SCOPE**.

Do not invent attacks or claim coverage without a linked test.

---

## Attack matrix

| Attack / threat | Mitigation | Evidence | Label |
|---|---|---|---|
| Impostor emitter (fake USDC) | Constructor-immutable `expectedEmitter` | `AdversarialReceipts.t.sol`, `BlacklistVerifier.t.sol` (T-SEC-EMITTER / T-SEC-OWNER) | VERIFIED |
| Wrong topic0 (Transfer / Pause / decoy) | Topic allowlist Blacklisted / UnBlacklisted only | `AdversarialReceipts.t.sol` (T-SEC-EVENT / T-SEC-DECOY) | VERIFIED |
| Cross-account redirect | Account from indexed `topic[1]` only | `EligibilityLedger.t.sol`, decoder tests (T-SEC-ACCOUNT / FR-005) | VERIFIED |
| Failed source receipt (`status != 1`) | ASC checks receipt status; precompile does not | `AdversarialReceipts.t.sol` (T-SEC-STATUS) | VERIFIED |
| Wrong Attestcoin `chainKey` | `WrongChainKey` | `BlacklistVerifier.t.sol` (T-SEC-CHAIN) | VERIFIED |
| Outside height window | `OutsideWindow` | `BlacklistVerifier.t.sol` (T-SEC-WINDOW) | VERIFIED |
| Caller-supplied forged `txIndex` | Recover from Merkle `isLeft` (`TxIndex`) | `TxIndex.t.sol`, `AdversarialReceipts.t.sol` (T-SEC-TXINDEX); backend `recoverTxIndex` + prove mismatch reject | VERIFIED |
| Replay same `(chainKey,height,txIndex)` | `processed` / `QueryAlreadyProcessed` | `EligibilityLedger.t.sol` (T-SEC-REPLAY) | VERIFIED |
| Older UnBlacklisted overrides newer Blacklisted | Position monotonicity | `EligibilityLedger.t.sol` (T-SC-RESTORE) | VERIFIED |
| Backend / UI invents Restricted | No `setStatus`; worker has no setter API | `SecurityBoundaries.t.sol` (T-SEC-PERM / T-SEC-AUTH); backend `T-API-NOSETTER` | VERIFIED |
| Owner rotates Circle emitter | No `setExpectedEmitter` | `BlacklistVerifier.t.sol` / `SecurityBoundaries.t.sol` (T-SEC-OWNER) | VERIFIED |
| Restricted draw / transfer / escrow extract | `Restricted()` | `GatedCreditLine.t.sol` (T-FIN-*), `SecurityBoundaries.t.sol` | VERIFIED |
| Restricted repay / unused withdraw trapped | Allowed exits | `GatedCreditLine.t.sol` (T-FIN-REPAY / T-FIN-WITHDRAW) | VERIFIED |
| Proof Builder lie | On-chain `0x0FD2` + consumer checks | Architecture + live `0x0FD2` path in `ATTESTCOIN_EVIDENCE.md` | VERIFIED (design); live demo VERIFIED separately |
| Oversized POST / unbounded eth_getLogs | Body size + discover range caps | `backend/src/api/index.ts`, `discover.ts` + tests | VERIFIED |

---

## Residuals (ship with known risks)

| Residual | Why accepted for the demo | Label |
|---|---|---|
| Owner can still `setExpectedChainKey` / `setWindow` | Operational stall / wrong source chain — **not** emitter swap; redeploy required to make chainKey immutable | RESIDUAL |
| Default unset = `ELIGIBLE` | Circle-compatible fail-open; must be spoken in demo (DEMO-003) | RESIDUAL (disclosed) |
| Proof window `(0,0)` unbounded | Demo historical tx admissible; not production freshness | RESIDUAL (disclosed) |
| CEI / reentrancy polish on `GatedCreditLine` | External ERC-20 calls after local accounting updates; MockUSD + trusted demo asset; full CEI rewrite deferred | RESIDUAL |
| Discovery completeness | Worker may miss events; must not invent candidates | RESIDUAL |
| Relayer key / gas grief | Localhost / optional `RELAY_GATE`; not eligibility authority | RESIDUAL (ops) |

---

## What 0x0FD2 does **not** prove

BlockProver proves **inclusion + continuity** of the submitted encoded transaction against attested headers. It does **not** prove receipt success, emitter identity, event topic, or account. Those are FreezeWire consumer checks. See `ATTESTCOIN_EVIDENCE.md`.

---

## Related

- Normative model: [`SECURITY_MODEL.md`](./SECURITY_MODEL.md), [`THREAT_MODEL.md`](./THREAT_MODEL.md)
- Test IDs: [`TEST_STRATEGY.md`](./TEST_STRATEGY.md)
- Live Attestcoin facts: [`ATTESTCOIN_EVIDENCE.md`](./ATTESTCOIN_EVIDENCE.md)
