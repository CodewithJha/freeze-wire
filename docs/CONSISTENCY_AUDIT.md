# Consistency audit (documentation correction gate)

Performed after repository-layout amendment (ADR-0001) and emitter trust-model decision (ADR-0016). Contradictions found were **fixed in the docs**. Application code was not added.

Labels: **FACT** (observed or sourced), **ASSUMPTION**, **INFERENCE**, **UNVERIFIED**, **BLOCKER**. Do not treat ASSUMPTION / UNVERIFIED as verified.

---

## Repository layout

| | |
|---|---|
| Classification | **FACT** |
| Claim | FreezeWire is a standalone Git repository at the FreezeWire repository root with its own `.git` and history. It is not nested in Kaggriculture and does not use Kaggriculture’s Git. |
| Evidence | `pwd` / `git rev-parse --show-toplevel`; `.git` present; `git remote -v` empty; Kaggriculture exists separately and has no `freeze-wire/` subdirectory. |
| Docs | ADR-0001 (amended), `PROJECT_RESET.md` relocation section, `README.md`, `ASSUMPTIONS_AND_CONSTRAINTS.md`, `PRD.md` workspace constraint, `CONTRIBUTING.md`. |
| Historical only | Nested `kaggriculture/freeze-wire/` layout is recorded as **obsolete**, not current. |

Dedicated remote: **FACT** (updated): public GitHub `https://github.com/CodewithJha/freeze-wire` tracks `origin/master`. Earlier “none configured” row is **historical** from the documentation-correction gate.

---

## Emitter trust model

| | |
|---|---|
| Classification | **FACT** (architectural decision ADR-0016) |
| Claim | Canonical USDC `expectedEmitter` is constructor-immutable. Owner may still set `expectedChainKey` and height window. Owner cannot `setExpectedEmitter`, cannot `setStatus` / `setRestricted`, and cannot rotate the ledger’s verifier in MVP. |
| Why | Product inherits Circle USDC blacklist, not whichever token an owner last set. Post-deploy emitter rotation is a source-of-truth replacement. Testnet/mainnet/mock addresses are constructor/config. |
| Docs aligned | `REQUIREMENTS.md` FR-003/FR-027, `SMART_CONTRACT_SPECIFICATION.md`, `SECURITY_MODEL.md`, `THREAT_MODEL.md` T-16, `TECHNICAL_SPECIFICATION.md`, `DATA_MODEL.md` E-03, `DEPLOYMENT_PLAN.md`, `SYSTEM_ARCHITECTURE.md`, `ATTESTCOIN_INTEGRATION.md`, `TEST_STRATEGY.md` T-SEC-OWNER, `PRD.md`, `DEMO_SPECIFICATION.md`, `config/README.md`, `DECISION_LOG.md`. |

---

## chainKey consistency

| | |
|---|---|
| Classification | **FACT** (from Attestcoin / Creditcoin docs, recorded in research baseline) |
| Claim | CC3 **testnet** EVM chain id **102031**. On CC3 testnet, Ethereum **mainnet** chainKey = **3**; Ethereum **Sepolia** = **1**. On CC3 **mainnet**, Ethereum mainnet chainKey = **1** (different table). `chainKey` ≠ EVM `chainId`. |
| Docs | `DEPLOYMENT_PLAN.md`, `ASSUMPTIONS_AND_CONSTRAINTS.md`, `ATTESTCOIN_INTEGRATION.md`, `config/networks.example.json`, `PRD.md`, `REQUIREMENTS.md` INT-001/INT-009, `DEMO_SPECIFICATION.md`. |
| Check | Values are **not reversed** in current docs. |

---

## Attestcoin readability scope

| | |
|---|---|
| Classification | **FACT** (official docs: writability still in audit) |
| Claim | MVP uses **readability only**. No writability dependency, no Ethereum source vault, no handshake writeback. |
| Docs | ADR-0009, `PRD.md` out of scope, `REQUIREMENTS.md` NR-001, `README.md`. |

---

## Replay ordering

| | |
|---|---|
| Classification | **FACT** (ADR-0017 Model A) |
| Claim | Replay key = `keccak256(chainKey, height, txIndex)` with `txIndex` recovered from Merkle `isLeft` path, not caller metadata. After successful `verifyAndEmit` **and** successful receipt scan, mark replay even if no canonical log, and **do not revert** (`ProcessedWithoutFact`). A revert would undo the mark. Do not mark if verify/decode/status failed. Emitter immutability removes any “retry after rotation” rationale. |
| Docs | `ATTESTCOIN_INTEGRATION.md` decision freeze, `SMART_CONTRACT_SPECIFICATION.md`, `DATA_MODEL.md` E-02, FR-010 / SEC-006. |

---

## Default ELIGIBLE semantics

| | |
|---|---|
| Classification | **FACT** (product decision ADR-0008) |
| Claim | Unset ledger keys read as `ELIGIBLE`. This matches Circle’s not-blacklisted-until-blacklisted model and is **explicitly not** a cleanliness attestation. Must be disclosed in the demo (DEMO-003). |
| Docs | ADR-0008, FR-008, `SECURITY_MODEL.md`, `DEMO_SPECIFICATION.md`, `TECHNICAL_SPECIFICATION.md` state machine. |

---

## Backend trust boundary

| | |
|---|---|
| Classification | **FACT** (security invariant INV-1 / SEC-001) |
| Claim | Worker discovers, fetches proofs, relays, exposes convenience APIs and observability. It **must not** independently authorize eligibility. Frontend is untrusted. No privileged `setRestricted` / `setStatus`. `submitProof` is permissionless. Proof Builder and RPCs are untrusted for writes. |
| Docs | `SECURITY_MODEL.md`, `SYSTEM_ARCHITECTURE.md`, `API_SPECIFICATION.md`, ADR-0007, `TECHNICAL_SPECIFICATION.md` worker algorithm. |

Load-bearing path (must remain): real Ethereum USDC event → Attestcoin proof → `0x0FD2` → consumer validation → eligibility → CTC financial consequence. No off-chain oracle.

---

## Owner capabilities

| Allowed (MVP) | Forbidden |
|---|---|
| `setExpectedChainKey` | `setExpectedEmitter` |
| `setWindow` (`minHeight` / `maxHeight`) | `setStatus` / `setRestricted` |
| Ownable2Step for the above operational params | Rotating ledger → verifier |
| MockUSD minter (demo liquidity; not eligibility) | Binding events without a proof |

Wrong emitter ⇒ **redeploy**. Compromised owner can still retune chainKey/window (operational stall or wrong source chain), not replace Circle USDC identity on this deployment.

---

## Restricted vs allowed financial ops

| Restricted | Allowed when Restricted |
|---|---|
| `draw` fail | `repay` |
| `protectedTransfer` fail | unused `withdraw` |
| new escrow `lock` fail | `deposit` |
| escrow `release` fail | permitted escrow `refund` |

Matches FR-015–021, INV-7/8, `TECHNICAL_SPECIFICATION.md` selective enforcement.

---

## Demo evidence

**FACT (requirement):** Demo must use a **real** Ethereum mainnet USDC `Blacklisted` (ADR-0012, DEMO-001). No fake source event. Canonical USDC `0xA0b8…eB48`. Demo tx documented; swap only to another **real** USDC blacklist if Proof Builder cannot serve that height.

---

## Source-of-truth hierarchy

Unchanged: `SECURITY_MODEL` / `THREAT_MODEL` > `REQUIREMENTS` > `PRD` > architecture/tech specs > development plan. ADR index and `DECISION_LOG` agree through **0016**.

---

## Other checks

| Check | Result |
|---|---|
| PRD object vs architecture | Address-level USDC flag → verifier → ledger → credit line. Match. |
| Only Blacklisted / UnBlacklisted bind | FR-004, SEC-004. Match. |
| Account from indexed topic | FR-005. Match. |
| `receiptStatus == 1` required | FR-011, SEC-008. Precompile does not check this. Match. |
| Worker not authoritative | SEC-001. Match. |
| No secrets in repo | `.env.example` placeholders only (**FACT** of scaffolding; no filled `.env` committed this pass). |
| ADR index vs DECISION_LOG | 0001–0016 aligned. Match. |
| Application / product code | **NONE** added this gate. Scaffolding READMEs unchanged in role. |

---

## Remaining UNVERIFIED / residual

Phase 3 live checks (2026-09-10) observed Proof Builder 200 for the demo tx, `0x0FD2.verify == true`, `calculateTxIndex == 18`, health CC3+ETH connected, verifyAndEmit estimate 69512 gas. Those observations remain valid for that pass.

**Phase 8 complete (supersedes deploy BLOCKER):** live CC3 deploy + `submitProof` + `RESTRICTED` evidenced in `deployments/demo-evidence-public.json` / README. Do not treat “ledger not deployed” as current.

Residual (not code-deploy blockers):

- EIP-1559 vs `--legacy` for future broadcasts (worker uses provider fees)
- Owner-tunable `expectedChainKey` / window (emitter immutable) — see `SECURITY_EVIDENCE.md`
- packaging submit / video / deck — **NEXT HUMAN ACTION**

---

## Remaining BLOCKERS

- ~~**Funded CC3 testnet deployer key** for Phase 8 on-chain `Restricted` event~~ — **SUPERSEDED** by live Phase 8 complete.
- Platform submission completeness (packaging) is a **human deadline residual**, not an internal docs contradiction.

No remaining internal documentation contradiction that would make the live deploy contradict security invariants. Contracts, worker, and demo evidence are on `master`.

---

## This pass vs Gate 5A

Prior Gate 5A audit did not record standalone-repo current layout or immutable emitter. Those are corrected here. Do not treat the previous audit row “chainKey documented everywhere” as a substitute for re-checking after edits — re-checked this pass: **FACT** values still 102031 / testnet ETH mainnet key 3 / mainnet ETH mainnet key 1.

**Later note (90+ push):** stale “pending deploy / Phase 8 BLOCKER” language above was marked superseded; see `ASSUMPTIONS_AND_CONSTRAINTS.md` Live deploy section and `ATTESTCOIN_EVIDENCE.md`.
