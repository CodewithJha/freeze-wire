# Requirements

IDs are stable. Implementation, tests, and demo evidence must cite them.

Traceability:

```text
Requirement → Design (architecture / tech / contract / API) → Implementation → Test → Demo evidence
```

---

## Functional

| ID | Statement | Design | Tests | Demo |
|---|---|---|---|---|
| FR-001 | System verifies source-chain transaction inclusion and continuity via Attestcoin BlockProver `0x0FD2` before any eligibility write. | ARCH, ATTEST, SC | T-SC-VERIFY | DEMO-001 |
| FR-002 | System extracts logs only from **verified** transaction bytes, not from unauthenticated calldata invented by the worker. | ATTEST, SC | T-SC-DECODE | DEMO-001 |
| FR-003 | Only logs whose emitter equals the constructor-set canonical USDC address (`expectedEmitter`, immutable) are eligible to bind. | SC, TECH | T-SEC-EMITTER | DEMO-002 |
| FR-004 | Only `Blacklisted(address)` and `UnBlacklisted(address)` event signatures bind. Other logs (Transfer, Paused, decoys) are skipped. | SC | T-SEC-EVENT | DEMO-002 |
| FR-005 | Bound account is the indexed `_account` topic; it is the only address whose ledger row may change from that log. | SC, DATA | T-SEC-ACCOUNT | DEMO-001 |
| FR-006 | `Blacklisted` for account A sets A to `RESTRICTED`. | SC | T-SC-RESTRICT | DEMO-001 |
| FR-007 | `UnBlacklisted` for account A sets A to `ELIGIBLE` only if its source position is **strictly newer** than the current bound event for A. | SC | T-SC-RESTORE | — |
| FR-008 | Default ledger status is `ELIGIBLE` (no proof yet). This is not a cleanliness attestation. | SC, SEC | T-SC-DEFAULT | DEMO-003 |
| FR-009 | `submitProof` is permissionless. There is no owner/backend function that sets eligibility. | SC, SEC | T-SEC-PERM | DEMO-001 |
| FR-010 | Replay of the same `(chainKey, height, txIndex)` is rejected. | SC | T-SEC-REPLAY | — |
| FR-011 | Source `receiptStatus != 1` is rejected; no write. | SC, ATTEST | T-SEC-STATUS | — |
| FR-012 | Proofs with `chainKey !=` configured expected key are rejected. | SC, CONFIG | T-SEC-CHAIN | — |
| FR-013 | Proofs outside the configured inclusive height window are rejected. Window `0,0` means “no bound” and must be explicit in deployment config. | SC, CONFIG | T-SEC-WINDOW | — |
| FR-014 | `txIndex` is recovered from the Merkle proof path (or a precompile helper if present). Caller-supplied index is ignored. | SC, ATTEST | T-SEC-TXINDEX | — |
| FR-015 | While `RESTRICTED`, `draw` reverts. | SC | T-FIN-DRAW | DEMO-004 |
| FR-016 | While `RESTRICTED`, `protectedTransfer` reverts. | SC | T-FIN-XFER | — |
| FR-017 | While `RESTRICTED`, escrow **release** (and new escrow lock) reverts. | SC | T-FIN-ESCROW | — |
| FR-018 | While `RESTRICTED`, `repay` succeeds. | SC | T-FIN-REPAY | DEMO-004 |
| FR-019 | While `RESTRICTED`, withdraw of **unused** funds (deposit minus locked collateral) succeeds; locked collateral cannot be stripped. | SC | T-FIN-WITHDRAW | DEMO-004 |
| FR-020 | `deposit` remains available when `RESTRICTED`. | SC | T-FIN-DEPOSIT | — |
| FR-021 | Escrow **refund** of unused own funds succeeds when `RESTRICTED`. | SC | T-FIN-REFUND | — |
| FR-022 | Worker can discover candidate source txs (USDC blacklist logs). Discovery failure is observable; it must not invent events. | API, TECH | T-API-DISC | — |
| FR-023 | Worker can request a Proof Builder bundle by tx hash and by position. | API, ATTEST | T-API-PROVE | DEMO-001 |
| FR-024 | Worker can relay a bundle to `submitProof`. Relay does not skip on-chain verification. | API | T-API-RELAY | DEMO-001 |
| FR-025 | Frontend displays current ledger status, source tx link, and last CTC tx hash from chain (or worker as cache of chain). | DEMO spec | T-FE-STATUS | DEMO-001 |
| FR-026 | All network parameters (RPC, chainKey, emitter, window, Proof Builder URL, contract addresses) load from config/env. | TECH, CONFIG | T-CFG | — |
| FR-027 | Owner of verifier config may rotate expected chainKey and window. Canonical USDC `expectedEmitter` is constructor-immutable (ADR-0016). Owner **cannot** write an address’s eligibility. | SC, SEC | T-SEC-OWNER | — |
| FR-028 | Multiple matching logs in one receipt are scanned; impostors skipped; only canonical matches bind; latest matching log in that receipt wins for that account within the receipt. | SC | T-SEC-DECOY | — |

## Non-functional

| ID | Statement |
|---|---|
| NFR-001 | Contracts are modular: verification, ledger, and financial ops are separate deployments (no 1500-line monolith). |
| NFR-002 | Worker modules split config / domain / clients / services / HTTP / observability. |
| NFR-003 | Every external boundary returns a typed error (RPC, proof, revert, wallet). No silent swallow. |
| NFR-004 | Secrets never committed; `.env.example` placeholders only. |
| NFR-005 | Structured logs include `sourceTx`, `chainKey`, `height`, `txIndex`, `ctcTx` when known. Never keys or mnemonics. |
| NFR-006 | Demo target: CC3 testnet only. |
| NFR-007 | Local Foundry tests do not require live Proof Builder (precompile mocked). Live verification is a separate integration test. |
| NFR-008 | Demo path completes in ~150 seconds of presentation time (not including attestation wait if already attested). |
| NFR-009 | Solidity `^0.8.23` to match official ASC examples unless an ADR changes it. |
| NFR-010 | Custom errors preferred over string reverts. |
| NFR-011 | Gas: MVP submits **one** proof per source tx; avoid >500 KB source txs (protocol limit). Prefer proofs once the height is attested. |

## Security

| ID | Statement |
|---|---|
| SEC-001 | A backend request must never independently authorize a restricted-state transition. |
| SEC-002 | Fake / malformed proofs fail `verifyAndEmit` or fail subsequent checks; no write. |
| SEC-003 | Impostor contract emitting `Blacklisted` does not bind. |
| SEC-004 | Canonical USDC `Paused` / `Transfer` does not bind. |
| SEC-005 | `Blacklisted(Bob)` does not change Alice. |
| SEC-006 | Replay of an admitted position reverts. |
| SEC-007 | Stale proofs outside window revert. |
| SEC-008 | Failed source receipts revert. |
| SEC-009 | Wrong chainKey (e.g. Sepolia `1` vs mainnet `3` on CC3 testnet) reverts. |
| SEC-010 | Unauthorized financial callers cannot bypass the ledger (credit line reads ledger; no alternate setter). |
| SEC-011 | Malicious frontend cannot set eligibility (no privileged UI API). |
| SEC-012 | RPC lying to the worker cannot write chain state; at worst it stalls discovery. |
| SEC-013 | Invalid state transitions (e.g. restore via Transfer log; older UnBlacklisted overriding newer Blacklisted) are rejected. |
| SEC-014 | Relayer key, if used, is only for gas; it confers no extra eligibility rights. |

## Integration

| ID | Statement |
|---|---|
| INT-001 | Expected CC3 testnet chainKey for Ethereum mainnet is **3** (config). |
| INT-002 | Proof Builder base URL defaults to `https://proof-gen-api.cc3-testnet.creditcoin.network`. |
| INT-003 | Worker uses `GET /api/v1/proof-by-tx/{chainKey}/{txHash}` and handles 400/404/422/501. |
| INT-004 | Worker uses `GET /api/v1/health` (not `/health`). |
| INT-005 | Worker may wait on `GET /api/v1/attested-height/{chainKey}` before proving. |
| INT-006 | Decoder compatibility: Gluwa `EvmV1Decoder` encoding of verified bytes. Official CC3 testnet decoder listing `0x731c…F9f` is the reference implementation; FreezeWire may vendor the library, not assume the on-chain decoder is called. |
| INT-007 | Ethereum USDC address is deploy-time config (constructor-immutable on-chain), defaulting to `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`. |
| INT-008 | No Credal API in the MVP path. |
| INT-009 | CC3 RPC default `https://rpc.cc3-testnet.creditcoin.network`, chain id 102031. |
| INT-010 | Event topic0 values are keccak of the Circle signatures (constants; documented). |

## Demo

| ID | Statement |
|---|---|
| DEMO-001 | Show REAL source event → Attestcoin proof → cryptographic verification → CTC state change → financial consequence. |
| DEMO-002 | State that consumer checks (status, emitter, event, account) are FreezeWire’s, not the precompile’s. |
| DEMO-003 | Eligible draw before proof, with explicit “not a cleanliness proof” line. |
| DEMO-004 | Restricted draw fails; repay succeeds. |
| DEMO-005 | Spoken closer: backend did not authorize; the proof did. |
| DEMO-006 | Explorers: Etherscan/Blockscout Ethereum + Creditcoin Blockscout. |

---

## Explicit non-requirements

- NR-001 Writability
- NR-002 Real USDC on Creditcoin
- NR-003 Owner `setRestricted`
- NR-004 Database of blacklist addresses as source of truth
- NR-005 Batch proofs in the live demo
