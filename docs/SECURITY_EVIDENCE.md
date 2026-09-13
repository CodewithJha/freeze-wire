# Security evidence (verified attack matrix)

Judge-facing map from threats → attack input → expected → actual → tests.
Labels: **VERIFIED** (Foundry / worker / live), **RESIDUAL** (accepted / disclosed), **OUT OF SCOPE**.

Do not invent attacks or claim coverage without a linked test.
Owner `setExpectedChainKey` / `setWindow` residuals are **DOCUMENT ONLY** in this push (no redeploy) — see [`IMPROVEMENT_PLAN.md`](./IMPROVEMENT_PLAN.md).

---

## Attack matrix

| Attack / threat | Attack input | Expected | Actual | Test(s) | Label |
|---|---|---|---|---|---|
| Impostor emitter (fake USDC) | Receipt log emitter ≠ constructor USDC | No bind / status unchanged | Events length 0; ELIGIBLE | `AdversarialReceipts.t.sol` `test_T_SEC_EMITTER_*`; `BlacklistVerifier.t.sol` | VERIFIED |
| Wrong topic0 (Transfer / Pause) | Correct emitter, Transfer/Paused topic | Ignored | No Restricted | `test_T_SEC_EVENT_*`, `test_T_SEC_DECOY_*` | VERIFIED |
| Cross-account redirect | Caller claims alice; log indexes bob | Only bob Restricted | alice ELIGIBLE | `test_incorrectAccountClaimCannotRedirect`; EligibilityLedger account tests | VERIFIED |
| Failed source receipt | `status != 1` + Blacklisted log | Revert `SourceTxFailed` | Revert; not processed | `test_T_SEC_STATUS_*` | VERIFIED |
| Wrong Attestcoin chainKey | `submitProof` with chainKey≠expected | `WrongChainKey` | Revert | `test_fixture9_wrongChainKey`; `BlacklistVerifier.t.sol` | VERIFIED |
| Outside height window | Height outside owner window | `OutsideWindow` | Revert | `BlacklistVerifier.t.sol` T-SEC-WINDOW | VERIFIED |
| Caller-supplied forged txIndex | Merkle path implies index N; caller wants M | Replay key uses recovered N | M ignored | `TxIndex.t.sol`; `test_T_SEC_TXINDEX_*`; backend prove mismatch reject | VERIFIED |
| Invalid Merkle sibling | Corrupted sibling hash / mock reject | `ProofRejected` | Revert; no write | `test_invalidMerkleSibling_revertsProofRejected` | VERIFIED |
| Corrupted continuity | Bad continuity roots / mock reject | `ProofRejected` | Revert; no write | `test_corruptedContinuity_revertsProofRejected` | VERIFIED |
| Replay same `(chainKey,height,txIndex)` | Second identical submit | `QueryAlreadyProcessed` | Revert | `test_fixture11_replayedProof` | VERIFIED |
| Older UnBlacklisted overrides newer Blacklisted | Lower height restore after restrict | Skipped / monotonic | Remains Restricted | `test_fixture10_*`; T-SC-RESTORE | VERIFIED |
| Backend / UI invents Restricted | POST `/v1/set-status` etc. | 404 / not provided | No setter | `SecurityBoundaries.t.sol`; backend `T-API-NOSETTER` | VERIFIED |
| Owner rotates Circle emitter | Call `setExpectedEmitter` | No such function | Compile/API absent | `BlacklistVerifier` / `SecurityBoundaries` T-SEC-OWNER | VERIFIED |
| Restricted draw / transfer / extract | draw as Restricted | `Restricted()` | Revert `0xccc08913` | `GatedCreditLine.t.sol` T-FIN-*; live demo evidence | VERIFIED |
| Restricted repay / unused withdraw | repay / withdraw unused | Allowed | Succeed | `GatedCreditLine.t.sol` T-FIN-REPAY / T-FIN-WITHDRAW | VERIFIED |
| Proof Builder lie | Fake bundle via worker | On-chain `0x0FD2` + consumer checks | Worker not authority | Architecture + live path `ATTESTCOIN_EVIDENCE.md` | VERIFIED (design); live demo VERIFIED |
| Oversized POST | Body > 1 MiB | 413 | Rejected | `backend` body-size tests | VERIFIED |
| Unbounded discover scan | One-sided `fromBlock`/`toBlock` | 400 | Rejected | `discover.test.ts` / `reliability.test.ts` | VERIFIED |
| Rate-limit map growth | Expired buckets | Pruned periodically | `pruneRateBuckets` | `reliability.test.ts` | VERIFIED |
| PB/RPC timeout flap | HTTP 5xx / timeout / transport | Bounded retries then fail | Retries ≤2; transport `retriable` honored | `retry.ts` + `reliability.test.ts` | VERIFIED |
| Worker invents Restricted | Relay-only / junk proof | On-chain reject; no status write | No setter; worker encodes `submitProof` only | Architecture + `SecurityBoundaries` | VERIFIED |

---

## Residuals (ship with known risks) — DOCUMENT ONLY

| Residual | Attack / concern | Why accepted | Label |
|---|---|---|---|
| Owner `setExpectedChainKey` / `setWindow` | Stall proofs / widen freshness | Not emitter swap; not `setStatus`; **no Attestcoin bypass**. Immutable chainKey needs redeploy — deferred. | RESIDUAL |
| Window `(0,0)` unbounded | Stale historical proofs admissible | Demo height must remain valid; production should `setWindow` after measuring attested lag — **ops note only** (do not call without controlled deployer session). | RESIDUAL (disclosed) |
| Default unset = `ELIGIBLE` | “Cleanliness” misread | Circle-compatible fail-open; demo script DEMO-003 | RESIDUAL (disclosed) |
| GatedCreditLine CEI polish | Reentrancy via malicious ERC-20 | MockUSD trusted demo asset; CEI rewrite = redeploy risk | RESIDUAL |
| Discovery completeness | Missed eth_getLogs | Worker may miss; must not invent candidates | RESIDUAL |
| Relayer key / gas grief | Exhaust local relay | Localhost / optional `RELAY_GATE`; not eligibility authority | RESIDUAL (ops) |
| Reentrancy on `processed` check-then-act | Would need callback from `nativeVerifier` | Production `0x0FD2` is not an attacker callback surface | OUT OF SCOPE / residual ops |

### Optional live `setWindow` (ops note — not executed here)

If a funded **owner** key is available in a locked-down shell (never print the key):

1. Measure current attested height and demo source header (`25705174`).
2. Choose `minHeight` / `maxHeight` that still admit the demo proof with lag margin.
3. Call `BlacklistVerifier.setWindow(min, max)` once; verify `OutsideWindow` for stale heights in Foundry first.
4. Record public tx hash in evidence — **do not** commit private keys.

This push **does not** perform that call (avoid ops risk mid-submission).

---

## Pre-submission red-team (re-verified)

Read-only pass confirmed: **no exploitable Attestcoin → ledger → credit-line bypass**. Restricted extractive ops still require a newer proven Circle `UnBlacklisted` (or never Restricted). Owner/window/CEI remain residuals only. Matrix rows above re-confirmed against named Foundry / backend tests — update as re-verify, not as a new finding.

---

## What 0x0FD2 does **not** prove

BlockProver proves **inclusion + continuity** of the submitted encoded transaction against attested headers. It does **not** prove receipt success, emitter identity, event topic, or account. Those are FreezeWire consumer checks. See `ATTESTCOIN_EVIDENCE.md`.

---

## Related

- Change plan: [`IMPROVEMENT_PLAN.md`](./IMPROVEMENT_PLAN.md)
- Normative model: [`SECURITY_MODEL.md`](./SECURITY_MODEL.md), [`THREAT_MODEL.md`](./THREAT_MODEL.md)
- Test IDs: [`TEST_STRATEGY.md`](./TEST_STRATEGY.md)
- Live Attestcoin facts: [`ATTESTCOIN_EVIDENCE.md`](./ATTESTCOIN_EVIDENCE.md)
- Demo ops: [`DEMO_RUNBOOK.md`](./DEMO_RUNBOOK.md)
