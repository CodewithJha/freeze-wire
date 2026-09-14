# Technical specification

This document specifies **how** FreezeWire components work. Solidity surfaces are detailed in `SMART_CONTRACT_SPECIFICATION.md`. Attestcoin wire format is in `ATTESTCOIN_INTEGRATION.md`. HTTP is in `API_SPECIFICATION.md`.

---

## 1. Software engineering rules (normative)

### Modularity

Do not ship:

- one 1500-line contract
- one 2000-line worker file
- one giant React component

Contracts (Phase 2+):

```text
contracts/src/
  interfaces/     INativeQueryVerifier, IEligibilityLedger, IBlacklistVerifier, IGatedCreditLine
  libraries/      EvmV1Decoder adapter, TxIndex, EventSelectors
  BlacklistVerifier.sol
  EligibilityLedger.sol
  GatedCreditLine.sol
  MockUSD.sol
```

Worker:

```text
backend/src/
  config/         loadEnv, NetworkConfig type, zod/valibot validation
  domain/         Status, BoundEvent, ProofBundle types
  clients/        ethRpc, proofBuilder, cc3
  services/       discover, prove, relay
  api/            http handlers
  observability/  logger
```

Frontend: screens/components split (status panel, explorer links, actions). No business authorization in the UI.

### No hard-coded business logic

**Config / env (must not scatter as literals):** RPC URLs, chain ids, chainKey, Proof Builder URL, USDC address (constructor argument), freshness window, deployed addresses, CORS, log level, demo tx hash.

**Documented immutable protocol constants (Solidity `constant` OK):**

| Constant | Why immutable |
|---|---|
| `BLOCK_PROVER = 0x…0FD2` | Creditcoin precompile address (FACT) |
| `topic0 Blacklisted` / `UnBlacklisted` | keccak of Circle event signatures |
| Solidity version `^0.8.23` | Match official ASC examples (ADR-0011) |

**Constructor immutables (from network config at deploy; not owner-settable later):**

| Value | Why immutable after deploy |
|---|---|
| `expectedEmitter` | Canonical Circle USDC identity for this deployment (ADR-0016) |
| `verifier` on BlacklistVerifier / ledger | Prevent swapping a verifier with a different emitter |

Even `0x0FD2` should be **constructor-injected in tests** (mock precompile). Production deploy passes the real address from config.

**Owner-configurable operational params (not identity):** `expectedChainKey`, `minHeight` / `maxHeight`. These remain settable so environments can retune without replacing Circle USDC.

### Separation of concerns

| Layer | Lives in | Must not |
|---|---|---|
| Domain | ledger status machine, event binding | HTTP, RPC |
| Infrastructure | RPC, Proof Builder HTTP | decide eligibility |
| Presentation | frontend | write ledger except via user wallet `submitProof` |
| Config | `config/` + env | secrets in git |
| Security | verifier checks, authn of HTTP (public read) | trust worker |
| Observability | structured logs | print keys |

### SOLID (where useful)

- **SRP:** Verifier does not store eligibility; ledger does not implement LTV; credit line does not verify proofs.
- **DIP:** Credit line depends on `IEligibilityLedger`, not a concrete layout.
- No strategy-pattern zoo. Use a pattern only when it removes duplication or a testing pain.

### Error handling

Every boundary maps to a typed error. Worker HTTP uses the error catalog in `API_SPECIFICATION.md`. Contracts use custom errors in the smart-contract spec. Frontend surfaces `message` + explorer link, never raw secrets.

### Configuration environments

| Env | Use |
|---|---|
| `local` | Foundry / Anvil, mocked `0x0FD2` |
| `test` | CI unit tests |
| `cc3-testnet` | Public deploy + demo (**staging analog**) |
| `cc3-mainnet` | Documented only; not used |

There is no separate production FreezeWire deployment yet. `cc3-testnet` is the demo environment.

### Observability

Log fields (JSON lines):

- `level`, `msg`, `service`, `env`
- `sourceTx`, `chainKey`, `height`, `txIndex`, `account`
- `ctcTx`, `proofCached` (from Proof Builder)
- `error.code`

Never: `privateKey`, mnemonic, `Authorization` headers, raw `.env`.

Metrics (optional, Phase 6): prove latency, 422 count, relay success. Not required for MVP.

---

## 2. Stack

| Layer | Choice | ADR |
|---|---|---|
| Contracts | Solidity 0.8.23, Foundry | 0002, 0011 |
| Worker | TypeScript, Node, official `@gluwa/usc-sdk` where it maps 1:1 to Proof Builder types | 0005 |
| HTTP | Lightweight (Hono or Fastify) — pick in Phase 4, same API spec |
| Frontend | React + Vite + viem (read) + wallet connect for user actions | 0006 |
| Persistence | None (on-chain + process memory) | 0004 |

---

## 3. Domain model (runtime)

### Status

```text
enum Status { ELIGIBLE = 0, RESTRICTED = 1 }
```

Default mapping: missing key → `ELIGIBLE` (FR-008).

### Position

```text
struct Position {
  uint64 chainKey;
  uint64 height;
  uint64 txIndex;
  uint256 logIndex; // from receipt walk, not caller
}
```

Ordering: `(height, txIndex, logIndex)` lexicographic on the same chainKey.

### BoundEvent

```text
struct BoundEvent {
  address account;
  enum Kind { Blacklisted, UnBlacklisted }
  Position pos;
}
```

### Replay key

```text
bytes32 replayId = keccak256(abi.encodePacked(chainKey, height, txIndex));
```

Matches official ASC example intent (position-keyed). Log-level uniqueness is handled by scanning; a second submit of the **same tx** is a replay even if the caller wanted another log.

---

## 4. State machine

```text
ELIGIBLE --proven Blacklisted (newer than current pos)--> RESTRICTED
RESTRICTED --proven UnBlacklisted (newer than current pos)--> ELIGIBLE
RESTRICTED --older UnBlacklisted--> RESTRICTED (no write / revert or no-op documented as revert `StaleRestore`)
* --failed checks--> unchanged + revert
```

Spoken claim: absence of proof ≠ proven clean.

---

## 5. Selective enforcement

| Action | ELIGIBLE | RESTRICTED |
|---|---|---|
| deposit | ok | ok |
| draw | ok (if LTV/liquidity) | revert `Restricted` |
| protectedTransfer | ok | revert `Restricted` |
| lockEscrow | ok | revert `Restricted` |
| releaseEscrow | ok | revert `Restricted` |
| repay | ok | ok |
| withdraw unused | ok | ok |
| refundEscrow | ok | ok |

Unused = `deposits[user] - collateralLockedForDebt(user)` with ceil-div on LTV. Withdraw must not strip locked collateral.

MVP LTV is **config** (constructor), default 50% for a simple demo (ASSUMPTION: demo simplicity, not a risk model). Document in deploy notes.

---

## 6. Worker algorithm (no code)

### Discover

1. `eth_getLogs` (or getReceipt for the demo tx) for USDC + topic0 Blacklisted/UnBlacklisted.
2. Validate `address == configured USDC`.
3. Return candidates `{txHash, blockNumber, txIndex, account, kind}`.
4. On RPC error: `ETH_RPC_FAILED`. Do not synthesize logs.

### Prove

1. Optionally `GET /api/v1/attested-height/{chainKey}`; if `blockNumber > attestedHeight`, `BLOCK_NOT_READY`.
2. `GET /api/v1/proof-by-tx/{chainKey}/{txHash}`.
3. Map JSON → contract submit args (`txBytes`, merkle siblings, continuity).
4. Map HTTP errors to API catalog.

### Relay

1. Encode `submitProof`.
2. Broadcast from `RELAY_PRIVATE_KEY` if set; otherwise return unsigned tx for the user wallet.
3. Wait receipt; return `ctcTx` and decoded events. On revert, return revert data decoded if possible.

The worker **must not** call a hypothetical `setStatus`.

---

## 7. Frontend behavior

- Read `statusOf` via CC3 RPC (preferred) or worker `/status` as a convenience cache labeled “from chain via worker.”
- Actions: deposit, draw, repay, withdraw, submitProof (wallet).
- Always show Ethereum tx URL and, after relay, Blockscout URL.
- No hidden admin panel.

---

## 8. Testing seams

- `INativeQueryVerifier` injected so Foundry tests mock `verifyAndEmit`.
- Worker Proof Builder client interface mocked in unit tests.
- Live `0x0FD2` check is integration-only (`T-INT-LIVE`), not CI-blocking if RPC down.

---

## 9. Implementation anti-patterns (forbidden)

- `onlyOwner` eligibility setter
- `setExpectedEmitter` / post-deploy rotation of canonical USDC identity
- Trusting worker JSON `account` without on-chain decode
- Using Sepolia chainKey 1 as Ethereum mainnet on CC3 testnet
- Using CC3 **mainnet** chainKey table on testnet
- Storing eligibility in the frontend or a DB as source of truth
- Gating `repay`
