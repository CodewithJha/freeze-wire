# Data model

**No application database.** Eligibility and credit state live on Creditcoin. A SQL/Redis store would become a competing oracle and violate SEC-001.

The worker may keep **process-memory** caches (last health, last prove JSON) with TTL. They are not durable and not authoritative.

---

## On-chain entities

### E-01 EligibilityRecord

| Field | Type | Constraints |
|---|---|---|
| account | address | mapping key |
| status | enum {ELIGIBLE, RESTRICTED} | default ELIGIBLE if unset |
| lastHeight | uint64 | 0 if never bound |
| lastTxIndex | uint64 | |
| lastLogIndex | uint256 | |

| | |
|---|---|
| Lifecycle | Created implicitly on first successful bind; updated on newer events |
| Ownership | Ledger contract |
| Relationships | Referenced by GatedCreditLine via `statusOf(account)` |
| Indexing | Chain events `Restricted`/`Restored` for explorers; no off-chain index required |
| Validation | Only `submitProof` path |

### E-02 ReplayRecord

| Field | Type | Constraints |
|---|---|---|
| replayKey | bytes32 | `keccak256(chainKey, height, txIndex)` |
| processed | bool | true once admitted |

Lifecycle: set true, never cleared. Ownership: ledger.

### E-03 VerifierConfig

| Field | Type | Constraints |
|---|---|---|
| expectedChainKey | uint64 | testnet demo: 3; owner-settable |
| expectedEmitter | address | nonzero; **constructor-immutable** (ADR-0016) |
| minHeight | uint64 | owner-settable |
| maxHeight | uint64 | 0 = unbounded max; owner-settable |

Ownership: verifier owner for chainKey/window only. Lifecycle: emitter set once in the constructor; chainKey/window constructor + `set*` with `ConfigUpdated`.

### E-04 CreditAccount

| Field | Type | Constraints |
|---|---|---|
| user | address | key |
| deposited | uint256 | MockUSD |
| debt | uint256 | |
| lockedCollateral | uint256 | derived or stored; must match LTV invariant |

Lifecycle: deposit/draw/repay/withdraw. Ownership: user + credit line. Validation: withdraw ≤ unused.

### E-05 Escrow

| Field | Type | Constraints |
|---|---|---|
| id | bytes32 | unique |
| locker | address | |
| amount | uint256 | >0 when open |
| open | bool | |

Lifecycle: lock → release or refund. Ownership: locker. Validation: unknown id reverts.

### E-06 MockUSD token

Standard ERC20 balances + minter. **Not** a USD claim.

### E-07 ProofBundle (ephemeral, worker)

Mirrors Proof Builder `SingleContinuityResponse`. Not persisted. Validation: schema in API spec.

### E-08 DiscoverCandidate (ephemeral)

`txHash, blockNumber, txIndex, account, kind`. From Ethereum logs/receipts only.

---

## Why no DB

| Need | How we meet it |
|---|---|
| Source of truth | Ledger + receipts |
| Demo history | Explorers |
| Worker restart | Re-fetch Proof Builder; chain unchanged |
| Rate limit | In-memory |

A DB would be justified later for a production monitor UI of *all* Circle blacklists. That is future scope and still would not write eligibility.
