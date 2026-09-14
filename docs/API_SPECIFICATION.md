# API specification

The worker HTTP API is a **convenience**. It is not an authority. The frontend must not depend on undocumented behavior. Unnecessary APIs are omitted (no user accounts, no `setRestricted`).

Base: `http://127.0.0.1:8000` (config). JSON, UTF-8.

**Authentication:** none for GET. `POST /v1/relay` is **localhost-only** in demo (or shared secret in env `RELAY_GATE` — optional). This protects gas, not eligibility.

**Rate limits (demo):** 30 req/min/IP in-process. Exceeded → 429 `{code: RATE_LIMITED}`.

**Validation:** JSON schema per route; unknown fields ignored; extra path chars rejected.

---

## GET `/v1/health`

| | |
|---|---|
| Purpose | Liveness of worker + upstreams |
| Auth | None |
| Request | — |
| Response 200 | `{ "status": "ok"\|"degraded", "cc3Rpc": bool, "ethRpc": bool, "proofBuilder": { "ok": bool, "raw": object\|null }, "chainId": 102031, "expectedChainKey": 3 }` |
| Errors | 503 if worker cannot boot config |
| Validation | — |
| Rate limits | 60/min |
| Dependencies | CC3 RPC `eth_chainId`; Proof Builder `GET /api/v1/health`; optional ETH RPC |
| Requirements | NFR-005, INT-004 |

Do not claim Proof Builder `true` if HTTP failed.

---

## GET `/v1/status/{address}`

| | |
|---|---|
| Purpose | Convenience read of `statusOf` |
| Auth | None |
| Request | `address` 20-byte hex |
| Response 200 | `{ "address": "0x…", "status": "ELIGIBLE"\|"RESTRICTED", "source": "chain", "ledger": "0x…" }` |
| Errors | 400 `INVALID_ADDRESS`; 502 `CC3_RPC_FAILED` |
| Validation | EIP-55 optional; lowercase compare |
| Dependencies | CC3 `eth_call` ledger |
| Requirements | FR-025 |

UI should still be able to `eth_call` directly.

---

## GET `/v1/discover`

| | |
|---|---|
| Purpose | List candidate USDC blacklist txs (including demo tx as a pinned row) |
| Auth | None |
| Query | `fromBlock`, `toBlock` optional; `address` optional filter |
| Response 200 | `{ "candidates": [ { "txHash": "0x…", "blockNumber": 25705174, "txIndex": 18, "account": "0x…", "kind": "Blacklisted" } ] }` |
| Errors | 502 `ETH_RPC_FAILED` |
| Validation | block numbers uint |
| Dependencies | Ethereum `eth_getLogs` |
| Requirements | FR-022 |

Pinned demo tx always included if configured, even if log scan range missed it (still fetched via receipt, not invented).

---

## GET `/v1/prove/{txHash}`

| | |
|---|---|
| Purpose | Fetch Proof Builder bundle; **do not** mark eligibility |
| Auth | None |
| Response 200 | `{ "chainKey": 3, "headerNumber": n, "txIndex": n, "txBytes": "0x…", "merkleProof": {…}, "continuityProof": {…}, "attestedHeight": n\|null }` |
| Errors | 400 `INVALID_TXHASH`; 404 `TX_NOT_FOUND`; 422 `BLOCK_NOT_READY`; 502 `PROOF_BUILDER_FAILED`; 501 `TX_HASH_LOOKUP_UNIMPLEMENTED` |
| Validation | 32-byte hash |
| Dependencies | INT-002, INT-003, INT-005 |
| Requirements | FR-023 |

Pass through Proof Builder `code`/`retriable` when present.

---

## POST `/v1/relay`

| | |
|---|---|
| Purpose | Broadcast `submitProof` with a previously fetched (or body-supplied) bundle |
| Auth | Localhost or `RELAY_GATE` |
| Request | `{ "txHash": "0x…" }` **or** full prove payload fields |
| Response 200 | `{ "ctcTx": "0x…", "restricted": ["0x…"], "restored": ["0x…"] }` |
| Errors | 400 validation; 401 if gate set and missing; 502 RPC; 400 `CONTRACT_REVERT` with `error` name |
| Validation | Must include proof fields; worker may re-fetch by hash |
| Dependencies | `RELAY_PRIVATE_KEY`, `LEDGER_ADDRESS`, CC3 RPC |
| Requirements | FR-024, SEC-001 |

If `RELAY_PRIVATE_KEY` unset: **404 `RELAY_DISABLED`** and return `{ "submitProof": { "to", "data" } }` so the UI wallet can send (preferred for transparent demos).

---

## GET `/v1/evidence/demo`

| | |
|---|---|
| Purpose | Static demo pointers (config) |
| Auth | None |
| Response 200 | `{ "sourceTx": "0x…", "account": "0x…", "usdc": "0x…", "etherscan": "https://…", "block": 25705174 }` |
| Requirements | DEMO-001 |

No proof bytes cached as authority.

---

## Explicitly not provided

- `POST /v1/restrict`
- user login
- webhooks
- Credal proxy
- admin status editor

---

## Frontend contract

The UI may call these routes. It **must** also work if the worker is down for **wallet-submitted** `submitProof` (user pastes proof JSON) — Phase 5 stretch. MVP: worker up for demo.

Error body shape (all errors):

```json
{ "code": "BLOCK_NOT_READY", "message": "…", "retriable": true }
```

Additional machine-readable codes used by the Phase 4 worker (beyond the per-route tables above): `WRONG_CHAIN`, `GAS_ESTIMATION_FAILED`, `TRANSACTION_REJECTED`, `TRANSACTION_BROADCAST_FAILED`, `UNAUTHORIZED`, `INVALID_REQUEST`. Prefer the route-specific codes when both apply. Client-facing bodies never include stack traces, private keys, or full proof payloads.
