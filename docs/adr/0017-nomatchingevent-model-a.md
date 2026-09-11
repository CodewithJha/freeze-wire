# ADR-0017: Burn no-match proofs without reverting (Model A)

- Status: Accepted
- Date: 2026-09-10

## Context

Phase 2 specs said: after a successful `verifyAndEmit` and a successful receipt scan, mark the replay key **then** revert `NoMatchingEvent` so a tx with no canonical USDC Blacklisted/UnBlacklisted could never be retried.

In the EVM, a revert undoes storage writes in the same transaction. `processed[key] = true; revert NoMatchingEvent()` therefore **does not burn** the position. Phase 2 tests recorded this (`processed` stayed false after the revert). Docs and code were contradictory with the EVM.

Retrying a no-match proof cannot help: the canonical emitter is constructor-immutable (ADR-0016). The educational ASC minter snippet marks replay then requires content validation (which reverts and would also undo the mark). FreezeWire must not copy that bug.

## Decision

**Model A.** After successful native verify **and** `receiptStatus == 1` with a complete log walk:

1. Write `processed[keccak256(abi.encodePacked(chainKey, height, recoveredTxIndex))] = true`.
2. If there is no canonical matching log, emit `ProcessedWithoutFact(replayKey)` and **return**. Do not revert.
3. Eligibility is unchanged. A second submit of the same position reverts `QueryAlreadyProcessed`.

Do **not** mark replay if verify failed, the window/chainKey check failed, decode failed, or `receiptStatus != 1`. Those remain hard reverts with `processed` unchanged.

Stale events (older than `lastPos` for that account) continue to be **skipped**, not a whole-tx revert (Phase 2 contract spec).

## Alternatives (Model B)

Revert `NoMatchingEvent` **without** marking replay, so the caller can retry after a supposed config fix. Rejected: emitter cannot be rotated; retries only waste gas. A two-contract “commit then revert” pattern would burn the key but adds an extra hop and is unnecessary.

## Consequences

- `NoMatchingEvent` is no longer a revert. Callers observe success plus `ProcessedWithoutFact` (and no `Restricted`/`Restored`).
- Specs in `ATTESTCOIN_INTEGRATION.md`, `SMART_CONTRACT_SPECIFICATION.md`, and architecture text must match this EVM-real behavior.
- Tests: empty/decoy-only receipts burn the replay key without changing eligibility.
