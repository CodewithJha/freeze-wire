# Decision log

Meaningful decisions only. Details in `docs/adr/`.

| Date | ID | Decision | Alternatives | Why |
|---|---|---|---|---|
| 2026-09-10 | ADR-0001 | **Amended:** FreezeWire is a standalone Git repository at the FreezeWire repository root with its own history. It does not use Kaggriculture’s Git. A dedicated remote is a future decision, not claimed here. | Nested subdirectory using Kaggriculture git (original 0001) | Layout changed: subtree-split extraction; Kaggriculture remains a separate untouched project. |
| 2026-09-10 | ADR-0002 | Foundry for Solidity | Hardhat | Official-adjacent fast tests; `forge test` / scripts; Gluwa examples are Foundry-friendly. |
| 2026-09-10 | ADR-0003 | Three contracts: Verifier / Ledger / CreditLine | Monolithic ASC | Attestcoin docs allow both; SoC + testability + credit line must not call `0x0FD2`. |
| 2026-09-10 | ADR-0004 | No application database | Postgres/Redis | Would compete with chain as oracle (SEC-001). |
| 2026-09-10 | ADR-0005 | TypeScript worker + `@gluwa/usc-sdk` where useful | Python FastAPI (stopped run) | Typed proof structs; official SDK; one less language. |
| 2026-09-10 | ADR-0006 | React + Vite demo UI | Plain HTML | Fast demo; still untrusted. |
| 2026-09-10 | ADR-0007 | Permissionless `submitProof`; no `setStatus` | Owner oracle | Attestcoin must be load-bearing. |
| 2026-09-10 | ADR-0008 | Default ELIGIBLE | Fail-closed NO_PROOF | Matches Circle; must be disclosed. |
| 2026-09-10 | ADR-0009 | Readability only | Writability / source vault | Writability not treated as available (official docs). |
| 2026-09-10 | ADR-0010 | CI workflows deferred until code exists; **amended in Phase 1** to add lightweight `.github/workflows/ci.yml` (`forge` fmt/build/test, worker build+test, frontend build) | Empty failing `ci.yml` / large DevOps platform | Gate 5A had no code. Phase 1 now has placeholder tests, so CI can run without live CC3. |
| 2026-09-10 | ADR-0011 | Solidity `^0.8.23` | 0.8.20 / 0.8.26 | Match official ASC snippets. |
| 2026-09-10 | ADR-0012 | Demo evidence = real mainnet USDC `blacklist` tx `0xc9edfdbb…` | Deploy our own blacklist | Judges can open Etherscan; not a self-issued event. |
| 2026-09-10 | ADR-0013 | Proof Builder URL from **docs.attestcoin.org** (`proof-gen-api…`) | SDK `prover.cc3-testnet…` alias | Official environments page is source of truth; alias observed equal OpenAPI this pass. |
| 2026-09-10 | ADR-0014 | `verifyAndEmit` not view `verify` | view-only | Explorer-visible verification for demo. |
| 2026-09-10 | ADR-0015 | MIT license | Apache/none | Simple open-source sharing. |
| 2026-09-10 | ADR-0016 | Canonical USDC `expectedEmitter` is constructor-immutable. Owner may still set chainKey and window. | Post-deploy `setExpectedEmitter` | Product inherits Circle USDC, not whichever token the owner last set. Owner rotation of emitter is a source-of-truth replacement. Testnet/mainnet/mock addresses are constructor/config, not a live setter. |
| 2026-09-10 | ADR-0017 | **Model A:** after successful verify + successful receipt, mark replay even with no canonical USDC log, and **do not revert**. Emit `ProcessedWithoutFact`. | Mark then revert `NoMatchingEvent` (EVM-impossible); revert without marking (retryable no-ops) | A revert undoes `processed[key]=true`. Emitter is immutable, so retry cannot help. |
| 2026-09-10 | — | Phase 4 worker fee strategy: EIP-1559 when RPC exposes `baseFeePerGas`, else legacy `eth_gasPrice`; `GAS_LIMIT_MULTIPLIER` after `eth_estimateGas`. Relayer key optional → `404 RELAY_DISABLED` + calldata. | Hardcoded gas price; always broadcast | CC3 fee market not assumed; do not fake broadcast without key. |

Stopped Gate 5 implementation is **not** a decision to keep; it was reverted (`PROJECT_RESET.md`).
