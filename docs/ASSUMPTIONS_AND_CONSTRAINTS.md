# Assumptions and constraints

Never promote ASSUMPTION to FACT.

---

## FACT

- FreezeWire is an independent Git repository at the FreezeWire repository root with its own history. It is not nested in Kaggriculture and does not use Kaggriculture’s Git. A dedicated remote is not claimed (none configured at this audit).
- Historical (reset): the Kaggriculture project directory workspace had **no commits**; abandoned code was untracked `freezewire/`. That nested layout is not current (`PROJECT_RESET.md`, ADR-0001 amended).
- Project deadline **13 Sep 2026 23:59 ET** (prior gates + mentor brief).
- Attestcoin docs: BlockProver `0x0FD2`; does not check receipt success; ASC must check status `0x1`.
- CC3 testnet: Ethereum mainnet chainKey **3**, Sepolia **1**; Proof Builder `https://proof-gen-api.cc3-testnet.creditcoin.network/`; decoder `0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f`; ChainInfo `0x0fd3`.
- CC3 mainnet: Ethereum mainnet chainKey **1** (different table).
- Creditcoin testnet chain id **102031**; HTTPS RPC `https://rpc.cc3-testnet.creditcoin.network`.
- Credal is a Creditcoin hosted API, not Attestcoin verification.
- Circle `Blacklisted` / `UnBlacklisted` signatures and topic0 values via `cast keccak`.
- Demo tx receipt: success, USDC, Blacklisted `0xe05F…4A2A`, block 25705174, txIndex 18.
- Proof Builder OpenAPI live 2026-09-10; `/api/v1/health` (not `/health`).
- Batch proofs up to 10 sharing continuity; txs >500 KB may exceed gas.
- Writability still in audit per official docs.
- Faucet is Discord `#token-faucet`.

## ASSUMPTION

- Freshness window `0,0` (unbounded) for the demo so the August 2026 tx is admissible.
- Default LTV 50% is enough for a demo credit line.
- Localhost-only relay is enough to limit gas grief.
- Mentor can fund a CC3 wallet before Phase 8.
- `txIndex` recovered from Merkle `isLeft` path matches Gluwa / `0x0FD2.calculateTxIndex` (FACT this Phase 3 pass: demo siblings recover 18, precompile returns `0x12`).
- Marking replay after a successful verify+receipt with no matching logs, **without reverting**, is the EVM-correct burn (ADR-0017). The prior “mark then revert NoMatchingEvent” wording was contradictory with the EVM.
- MAX_LOGS cap 64 is enough for USDC blacklist receipts.
- TypeScript worker will map Proof Builder JSON to ABI without a custom encoder bug.
- `--legacy` may be required on CC3 broadcasts.

## INFERENCE

- `prover.cc3-testnet` and `proof-gen-api.cc3-testnet` are the same service (identical OpenAPI size this pass).
- Attestation lag is minutes (competitor READMEs + worker docs).
- `verifyAndEmit` is better for demo than `verify`.
- CEL-style never-gate-exits is what judges will expect after CEL’s writeup.

## Observed in Phase 3 (2026-09-10, not fabricated)

- Proof Builder `GET /api/v1/proof-by-tx/3/{demoTx}` returned HTTP 200 `SingleContinuityResponse` matching live OpenAPI.
- Health: `status=healthy`, `cc3_rpc_connected=true`, `eth_rpc_connected=true`.
- Demo bundle: chainKey 3, headerNumber 25705174, recovered txIndex 18, txBytes 1568 bytes, 9 siblings, 27 continuity roots.
- `eth_chainId` CC3 testnet `0x18e8f` (102031).
- `0x0FD2.calculateTxIndex` = 18; `0x0FD2.verify` = true; `eth_estimateGas(verifyAndEmit)` = 69512. Under the 500 KB source-tx / block-gas concern for this proof.
- Decoder: tx type 2, `receiptStatus == 1`, emitter canonical USDC, topic0 Blacklisted, account `0xe05F…4A2A`.
- Public Proof Builder required **no** API key this pass. Keep `PROOF_BUILDER_API_KEY` optional.
- FreezeWire ledger was **not** submitted on CC3 (no funded deploy). Eligibility write is not claimed.

## Still UNVERIFIED / residual

- EIP-1559 vs `--legacy` for CC3 **broadcasts** of `submitProof` (Phase 8). **Phase 4 worker:** prefer provider fee estimation (EIP-1559 when `baseFeePerGas` present; else legacy `eth_gasPrice`). Not hardcoded gas prices.
- Gas of a full `EligibilityLedger.submitProof` on CC3 (only precompile `verifyAndEmit` was estimated ~69512). Ledger not deployed this phase → submitProof estimate/broadcast blocked until addresses + funded key.

## BLOCKER

- **Funded CC3 testnet deployer key** for Phase 8 on-chain Restricted event.
- Dedicated public GitHub / public remote is an **open future decision**, not a current remote. Not blocked by Kaggriculture (FreezeWire is already a standalone repo).

## Constraints

- ~3 days after this gate
- No writability
- No real USDC on CTC
- No Credal
- Do not modify Kaggriculture (separate repository; out of this workspace)
- Do not implement application code in Gate 5A / this documentation correction gate
