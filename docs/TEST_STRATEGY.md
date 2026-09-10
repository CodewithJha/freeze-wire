# Test strategy

Tests prove requirements. Coverage goals are **MVP-realistic**, not a fake 100%.

| Layer | Goal |
|---|---|
| Foundry (consumer checks + finance) | All SEC-* that are on-chain; all FR-001–021, FR-027–028 |
| Worker unit | FR-022–024, INT-003–005, API errors |
| Frontend | Smoke: status render, links, error on reject |
| Live integration | INT-001/002/009; `0x0FD2` on saved or fetched proof |
| Manual demo | DEMO-001–006 |

CI (once code exists): `forge test`, worker unit, fmt. Live CC3 not required in CI.

---

## Unit tests (Solidity)

| ID | Covers | Idea |
|---|---|---|
| T-SC-DEFAULT | FR-008 | Unseen address ELIGIBLE |
| T-SC-RESTRICT | FR-006 | Blacklisted → RESTRICTED |
| T-SC-RESTORE | FR-007 | Newer UnBlacklisted restores; older does not |
| T-SC-VERIFY | FR-001 | Mock false → revert |
| T-SC-DECODE | FR-002 | Bound account from encoded bytes, not extra arg |
| T-FIN-DRAW | FR-015 | Restricted draw reverts |
| T-FIN-XFER | FR-016 | |
| T-FIN-ESCROW | FR-017 | |
| T-FIN-REPAY | FR-018 | Restricted repay ok |
| T-FIN-WITHDRAW | FR-019 | Unused ok; locked not |
| T-FIN-DEPOSIT | FR-020 | |
| T-FIN-REFUND | FR-021 | |

Use a **MockNativeQueryVerifier** and a **TxEncoder** fixture. Include a fixture built from the **real** demo `txBytes` once Phase 3 fetches them (`T-SC-REALBYTES`) — decode Circle Blacklisted without calling live precompile.

## Security tests (Solidity)

| ID | Req |
|---|---|
| T-SEC-FAKE | SEC-002 |
| T-SEC-EMITTER | SEC-003 |
| T-SEC-EVENT | SEC-004 |
| T-SEC-ACCOUNT | SEC-005 |
| T-SEC-REPLAY | SEC-006 |
| T-SEC-WINDOW | SEC-007 |
| T-SEC-STATUS | SEC-008 |
| T-SEC-CHAIN | SEC-009 |
| T-SEC-PERM | SEC-001, FR-009 — no setStatus; stranger can submit valid proof |
| T-SEC-OWNER | FR-027, T-16 — no `setExpectedEmitter`; owner can set chainKey/window; owner cannot setStatus |
| T-SEC-DECOY | FR-028 |
| T-SEC-TXINDEX | FR-014 — caller cannot pick index |
| T-SEC-AUTH | SEC-010 |

## Integration / live

| ID | Req | Notes |
|---|---|---|
| T-INT-LIVE | FR-001, INT-002 | Gated (`LIVE_ATTESTCOIN=1`). Backend live test fetches Proof Builder, recovers txIndex, decodes receipt, `eth_call` `0x0FD2.verify`. Skip in CI. Do not fabricate a pass. |
| T-INT-CHAINID | INT-009 | RPC `eth_chainId == 0x18e8f` (102031) |
| T-CFG | FR-026 | worker refuses boot if required env missing |

## API tests

| ID | Req |
|---|---|
| T-API-DISC | FR-022 |
| T-API-PROVE | FR-023, INT-003 |
| T-API-RELAY | FR-024 |
| T-API-NOSETTER | SEC-001 — 404 on `/restrict` |
| T-API-RATELIMIT | T-15 |
| T-API-HEALTH | INT-004 |

## Frontend

| ID | Req |
|---|---|
| T-FE-STATUS | FR-025 | Render ELIGIBLE/RESTRICTED from mocked chain |
| T-FE-LINKS | DEMO-006 | Etherscan + Blockscout URLs |

## E2E (manual or later Playwright)

Happy path on Anvil with mock precompile: deposit, draw, submitProof, draw reverts, repay.

Live e2e after deploy: DEMO script.

## Manual demo tests

Checklist in `DEMO_SPECIFICATION.md`. Pass/fail against DEMO-001–006.

## Mapping summary

Every SEC-001–014 has a T-SEC-* or T-API-* or residual (T-11 explorers). Every FR-001–028 has a row above or is config (FR-026).

---

## What we will not fake

Do not assert `0x0FD2` success in unit tests without a mock. Do not commit secrets. Do not skip emitter/event tests because “the demo uses a real tx.”
