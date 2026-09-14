# Smart contract specification

Solidity 0.8.23. Foundry. Custom errors. No owner eligibility setter. Interfaces in `contracts/src/interfaces/`. Implementation **not** in the documentation baseline.

---

## Contract map

| Contract | SRP | Writes | Reads Attestcoin |
|---|---|---|---|
| `BlacklistVerifier` | Proof + consumer checks | config only | yes |
| `EligibilityLedger` | Address compliance state | status, replay, last position | via verifier |
| `GatedCreditLine` | Credit + escrow accounting | balances, debt, escrow | no |
| `MockUSD` | Demo ERC20 | balances | no |

Libraries: vendored `EvmV1Decoder` (Gluwa `@gluwa/asc-contracts@0.2.1` encoding), `TxIndex` (Merkle `isLeft` path → index, matching `0x0FD2.calculateTxIndex`).

---

## Interfaces (documentation)

```text
interface INativeQueryVerifier {
  struct MerkleProofEntry { bytes32 hash; bool isLeft; }
  struct MerkleProof { bytes32 root; MerkleProofEntry[] siblings; }
  struct ContinuityProof { bytes32 lowerEndpointDigest; bytes32[] roots; }

  function verify(
    uint64 chainKey, uint64 height, bytes calldata encodedTransaction,
    MerkleProof calldata merkleProof, ContinuityProof calldata continuityProof
  ) external view returns (bool);

  function verifyAndEmit(
    uint64 chainKey, uint64 height, bytes calldata encodedTransaction,
    MerkleProof calldata merkleProof, ContinuityProof calldata continuityProof
  ) external returns (bool);
}

interface IBlacklistVerifier {
  struct BoundEvent {
    address account;
    uint8 kind; // 1 Blacklisted, 2 UnBlacklisted
    uint64 chainKey;
    uint64 height;
    uint64 txIndex;
    uint256 logIndex;
  }

  function verifyAndBind(
    uint64 chainKey,
    uint64 height,
    bytes calldata encodedTransaction,
    INativeQueryVerifier.MerkleProof calldata merkleProof,
    INativeQueryVerifier.ContinuityProof calldata continuityProof
  ) external returns (BoundEvent[] memory events, uint64 txIndex);
}

interface IEligibilityLedger {
  enum Status { ELIGIBLE, RESTRICTED }
  function statusOf(address account) external view returns (Status);
  function submitProof(
    uint64 chainKey,
    uint64 height,
    bytes calldata encodedTransaction,
    INativeQueryVerifier.MerkleProof calldata merkleProof,
    INativeQueryVerifier.ContinuityProof calldata continuityProof
  ) external;
}

interface IGatedCreditLine {
  function deposit(uint256 amount) external;
  function draw(uint256 amount) external;
  function repay(uint256 amount) external;
  function withdraw(uint256 amount) external;
  function protectedTransfer(address to, uint256 amount) external;
  function lockEscrow(bytes32 id, uint256 amount) external;
  function releaseEscrow(bytes32 id, address to) external;
  function refundEscrow(bytes32 id) external;
}
```

If the live precompile exposes `calculateTxIndex`, it may be used; otherwise implement `TxIndex.fromMerkle(MerkleProof)` matching Gluwa sibling `isLeft` rules. **Never** take txIndex from the caller. Confirm helper existence in Phase 2 against Blockscout source for `0x0FD2` (currently specified via official example’s Solidity path calc).

---

## BlacklistVerifier

### State

| Var | Type | Access |
|---|---|---|
| `verifier` | `INativeQueryVerifier` | immutable |
| `expectedChainKey` | uint64 | owner |
| `expectedEmitter` | address | **immutable** (constructor; ADR-0016) |
| `minHeight` | uint64 | owner |
| `maxHeight` | uint64 | owner |
| `owner` | address | Ownable2Step |

`maxHeight == 0` means no max (document in natspec). `minHeight == 0 && maxHeight == 0` → unbounded.

### Functions

- `verifyAndBind(...)` — performs FR-001–004, FR-011–014, FR-028. No eligibility storage.
- constructor: sets immutable `verifier` and `expectedEmitter` (nonzero or `ZeroEmitter`).
- owner: `setExpectedChainKey`, `setWindow` — emit `ConfigUpdated`. **No** `setExpectedEmitter`. **Cannot** set account status.

### Validation order

1. `chainKey == expectedChainKey` else `WrongChainKey`
2. window else `OutsideWindow`
3. `verifyAndEmit` else `ProofRejected`
4. decode type supported else `MalformedTx`
5. `receiptStatus == 1` else `SourceTxFailed`
6. scan logs; collect matches
7. return collected matches (possibly empty). **Do not revert** here — the ledger marks replay and, if empty, emits `ProcessedWithoutFact` without reverting (ADR-0017: a revert would undo the mark; emitter cannot be rotated).

### Events

```text
event ConfigUpdated(uint64 chainKey, uint64 minHeight, uint64 maxHeight);
```

(Precompile also emits `TransactionVerified`.)

### Custom errors

`WrongChainKey`, `OutsideWindow`, `ProofRejected`, `MalformedTx`, `SourceTxFailed`, `ZeroEmitter`

### Invariants

- I-V1: No mapping from address → status in this contract.
- I-V2: Owner cannot bind events without a proof (owner only changes expected chainKey/window; `expectedEmitter` is immutable).

---

## EligibilityLedger

### State

| Var | Type | Notes |
|---|---|---|
| `blacklistVerifier` | IBlacklistVerifier | immutable |
| `status` | mapping(address => Status) | 0 = ELIGIBLE |
| `lastPos` | mapping(address => packed position) | for restore ordering |
| `processed` | mapping(bytes32 => bool) | replay |
| `owner` | none in MVP | verifier address is **immutable** (ADR-0016); no status setter |

MVP: **immutable verifier**. Verifier rotation would reintroduce source-of-truth replacement and requires a new ADR. Still no status setter.

### `submitProof`

Permissionless (`FR-009`).

1. `txIndex = TxIndex.fromMerkle(merkleProof)` (ignore any caller integer; there is no txIndex argument)
2. `key = keccak256(abi.encodePacked(chainKey, height, txIndex))`
3. if `processed[key]` revert `QueryAlreadyProcessed`
4. `(events, recovered) = blacklistVerifier.verifyAndBind(...)` — if this reverts, `processed` stays false
5. `processed[key] = true`
6. if `events.length == 0` emit `ProcessedWithoutFact` and return (position burned; eligibility unchanged; **no revert** — ADR-0017)
7. for each event in log order: apply if `event.pos > lastPos[account]`
   - Blacklisted → `RESTRICTED`, emit `Restricted(account, key)`
   - UnBlacklisted → `ELIGIBLE`, emit `Restored(account, key)`
8. if event pos ≤ lastPos: skip that event (`StaleEvent` not a hard revert for other events in the same tx)

If verifyAndBind reverts (`ProofRejected`, `WrongChainKey`, `OutsideWindow`, `SourceTxFailed`, `MalformedTx`), processed is unchanged. A successful verify + successful receipt with no canonical USDC log **marks** replay and returns (ADR-0017).

### Events

```text
event Restricted(address indexed account, bytes32 replayKey);
event Restored(address indexed account, bytes32 replayKey);
event ProcessedWithoutFact(bytes32 replayKey);
```

### Errors

`QueryAlreadyProcessed`, `ZeroVerifier`

### Invariants

- I-L1: **A backend request must never independently authorize a restricted-state transition.** (SEC-001)
- I-L2: `status[A]` changes only in `submitProof` after bind.
- I-L3: Same `replayKey` never applied twice.
- I-L4: UnBlacklisted cannot override a newer Blacklisted.
- I-L5: `statusOf` returns ELIGIBLE for unset keys.

### Access

No `onlyOwner setStatus`. Tests must include `test_owner_cannot_set_status` (there is no such function).

---

## GatedCreditLine

### State

Balances, debt, escrow map, `ledger`, `asset` (MockUSD), `ltvBps` (constructor config), `owner` only for rescue of **wrong-token** sends if needed — **not** for bypassing Restricted. Prefer no rescue in MVP.

### Checks

`_requireEligible(address a)` for draw, protectedTransfer, lockEscrow, releaseEscrow.

No check on deposit, repay, withdraw unused, refundEscrow.

### Escrow MVP

Minimal: `lockEscrow(id, amount)` pulls from user; `releaseEscrow(id, to)` pays `to` if caller is locker or a designated role — **MVP:** locker-only release, still Restricted-gated; `refundEscrow` returns to locker, not Restricted-gated.

Do not build a marketplace.

### Invariants

- I-C1: Restricted user cannot increase protocol credit exposure (`draw`) or release control of locked value to a third party.
- I-C2: Restricted user can always repay and withdraw unused.
- I-C3: Withdraw cannot reduce collateral below that required for outstanding debt.
- I-C4: Contract never calls `0x0FD2`.
- I-C5: Status is read from ledger **each** call (no sticky memory).

### Errors

`Restricted`, `InsufficientAvailable`, `UnknownEscrow`, `NotEscrowOwner`, `ZeroAddress`

### Events

`Deposited`, `Drawn`, `Repaid`, `Withdrawn`, `TransferProtected`, `EscrowLocked`, `EscrowReleased`, `EscrowRefunded`

---

## MockUSD

Minimal ERC20 + `mint(address,uint256)` for demo (owner/minter). **Natspec: not USDC.**

---

## Replay protection

Position-keyed as above. `txIndex` from Merkle path.

---

## External calls

- Verifier → precompile (`verifyAndEmit`)
- Ledger → verifier (`verifyAndBind`)
- Credit line → ERC20 `transfer`/`transferFrom`; ledger `statusOf` (view)

Checks-effects-interactions on token pulls. No untrusted callbacks (MockUSD is ours).

---

## Professional Solidity practices (checklist)

- SPDX MIT, pragma `^0.8.23`
- Explicit visibility
- Custom errors
- Indexed event fields for account + replayKey
- NatSpec on public functions
- No `tx.origin`
- No unbounded log copy without memory care (receipt log count on a USDC blacklist is small; still cap `MAX_LOGS` e.g. 64 as a DoS bound — ASSUMPTION)
- Foundry `forge fmt` + tests

---

## What we reuse from CEL (honesty, not code copy of product)

Reuse **ideas:** skip unmatched logs; never gate exits; no owner-write of the object; position replay.

Do not reuse: asset-level Paused; NO_PROOF/IMPAIRED nouns; instrument as primary key.

Vendoring `EvmV1Decoder.sol` from Gluwa examples is allowed; do not copy CEL’s EligibilityLedger as FreezeWire’s — different key and events.
