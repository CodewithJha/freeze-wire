# Improvement plan (post-baseline escalation)

Ranked gaps from parallel audits after the ~84 tech baseline.
**Rule:** IMPLEMENT high ROI / low risk only. Owner/window/CEI = **DOCUMENT ONLY** (no live redeploy).

Labels: **IMPLEMENT** · **DOCUMENT ONLY** · **SKIP**

| Priority | Change | Impact (EST) | Risk | Effort | Implement? |
|---:|---|---:|---|---|---|
| 1 | Commit public evidence JSON (`*-public.json`) + fix “gitignored” docs | +1–2 evidence clarity | Low | S | **IMPLEMENT** |
| 2 | README Worker badge 33→current + FE Vitest honesty tests + CI | +1–2 testing/FE | Low | M | **IMPLEMENT** |
| 3 | Backend bounded PB/RPC retries + rate-limit prune + Retry-After | +0.5–1 reliability | Low | S | **IMPLEMENT** |
| 4 | Discover: reject one-sided unbounded eth_getLogs | +0.5 reliability/sec | Low | S | **IMPLEMENT** |
| 5 | Request lifecycle logs (`requestId`, sanitized) | +0.5 ops | Low | S | **IMPLEMENT** |
| 6 | Named Foundry cases: invalid Merkle sibling / corrupted continuity | +0.5 security evidence | Low | S | **IMPLEMENT** |
| 7 | Upgrade `SECURITY_EVIDENCE.md` threat matrix (input/expected/actual) | +0.5 auditor clarity | None | S | **IMPLEMENT** |
| 8 | Document unbounded window + optional live `setWindow` ops note | +0.5 honesty | Ops if executed | S | **DOCUMENT ONLY** |
| 9 | Owner-tunable `setExpectedChainKey` / `setWindow` → immutable | +1–2 security | **Redeploy / evidence loss** | L | **DOCUMENT ONLY** |
| 10 | Bound live proof window via `setWindow` | +0.5–1 freshness | Ops key + demo break risk | M | **DOCUMENT ONLY** (prefer docs) |
| 11 | GatedCreditLine CEI / reentrancy polish | +0.5–1 style | Redeploy or risky patch | L | **DOCUMENT ONLY** |
| 12 | Full continuous indexer | +1 scalability narrative | Scope creep | XL | **SKIP** |
| 13 | Playwright e2e wallet flow | +1 demo confidence | Flaky / time | L | **SKIP** (unless free) |
| 14 | Fake live ELIGIBLE→RESTRICTED on demo account | — | Honesty break | — | **SKIP** |

## Owner / window / CEI (DOCUMENT ONLY)

| Topic | Current | Why not change now |
|---|---|---|
| `setExpectedChainKey` | Owner-tunable | Cannot rotate Circle emitter; cannot `setStatus`; wrong chainKey stalls proofs — **governance residual**, not Attestcoin bypass. Redeploy for immutability invalidates live evidence. |
| Window `(0,0)` | Unbounded (disclosed) | Demo source height `25705174` must remain admissible. Production should set a bounded window after attested lag is measured. |
| Optional live `setWindow` | Possible via owner key | **Do not call in this push** unless deployer key is available in a controlled ops session **without printing secrets**. Prefer documenting the recommended production bound. |
| GatedCreditLine CEI | External ERC-20 after local updates | MockUSD / trusted demo asset; full CEI rewrite needs redeploy — deferred. |

## Done in this push

Committed public evidence · badge sync · SECURITY_EVIDENCE upgrade · backend retries/prune/discover/logs · Foundry named ProofRejected cases · frontend Vitest honesty · fresh technical audit.

## Explicit non-goals

No redeploy · no `setStatus` · no CEI rewrite · no Model A replay change.
