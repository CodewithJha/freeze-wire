# Demo specification (~150 seconds)

**Must prove:**

```text
REAL SOURCE EVENT → ATTESTCOIN PROOF → CRYPTOGRAPHIC VERIFICATION
        → CTC STATE CHANGE → FINANCIAL CONSEQUENCE
```

**Closer (DEMO-005, do not skip):**

> The backend never told Creditcoin the address was blacklisted. The Attestcoin proof did.

**Visuals:** frontend + Etherscan/Blockscout Ethereum + Creditcoin Blockscout. Backup: raw `cast call` / worker JSON if UI fails.

**Evidence object (FACT 2026-09-10):**

- Tx `0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787`
- Block 25,705,174 — 2026-08-07 19:27:47 UTC
- USDC `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Account `0xe05F529f5284D75624eBa386CB716928c3b54A2A`
- Method `blacklist`, receipt success, txIndex 18
- CC3 testnet chainKey **3**

If Proof Builder cannot serve this height at demo time, **swap to a newer real USDC Blacklisted tx** with the same checks. Do not mock.

---

## Script

| Time | Screen | Action | Expected result | Judge takeaway |
|---|---|---|---|---|
| 0:00–0:20 | Slide / UI header | Say: compliance is decided on Ethereum; CTC credit does not inherit it unless a backend is believed. Show USDC token page. | Canonical USDC identified. | Problem is real and specific. |
| 0:20–0:45 | FreezeWire UI, account **not yet proven** (demo operator account **or** the restricted account before submit) | Show status ELIGIBLE. Deposit. Draw a small amount. It succeeds. | Draw tx success on Blockscout. | FR-008 / DEMO-003: default is Circle’s model, **not** a cleanliness proof. Say that sentence. |
| 0:45–1:15 | Ethereum explorer | Open the real `blacklist` tx. Point at Success, USDC, `Blacklisted` account. | Public explorer, not our site. | DEMO-001 real source event. |
| 1:15–1:45 | Worker `/v1/prove` **or** UI “Prove” + optional `cast call` to `0x0FD2` | Show chainKey=3, height, txIndex, `verify` true. Say in order: **INCLUSION · STATUS · EMITTER · EVENT · ACCOUNT**. Then: window, replay, decoys skipped. | Proof JSON; precompile true. | Attestcoin is load-bearing; consumer checks are ours (DEMO-002). |
| 1:45–2:10 | UI Submit / Blockscout ledger | `submitProof`. Show `Restricted` event for `0xe05F…`. No `setRestricted`. | Ledger state RESTRICTED. | CTC **state change** from proof. |
| 2:10–2:30 | UI credit line | Draw reverts `Restricted`. Repay succeeds. Optional unused withdraw. | Financial consequence. | DEMO-004; CEL honesty: exits not trapped. |
| 2:28–2:30 | Face / last slide | Speak DEMO-005 closer. | — | Backend is not the oracle. |

If already Restricted from rehearsal, **start from a fresh demo borrower** for the 0:20 draw, then switch to the blacklisted account for the proof — **or** restore via UnBlacklisted in tests only. Do not fake UnBlacklisted on stage unless a real event exists.

---

## Backup if deploy missing

Show Foundry `T-SEC-*` + live `eth_call` verify true + honest line: “ledger write needs the funded deploy.” This is **weaker**; Phase 8 should land.

---

## Judge Q&A (short)

See also `COMPETITIVE_POSITIONING.md` and `SECURITY_MODEL.md`.

| Q | A |
|---|---|
| CEL clone? | Instrument vs counterparty. |
| Why CTC? | Readability is inbound; the venue that refuses the draw must live where the proof verifies. |
| Oracle? | Permissionless `submitProof`; lying worker fails 0x0FD2 or binder. |
| Default ELIGIBLE = clean? | No. |
| Can they repay? | Yes. |
| MockUSD = USDC? | No. We inherit the flag, not the reserves. |
| Can owner change which token you inherit? | No. Canonical USDC emitter is constructor-immutable (ADR-0016). |
| Wrong chain? | Sepolia is chainKey 1; we bind 3. |
| Precompile checks status? | No. We do. |

---

## Props / prep

- Two explorer tabs pre-opened
- Worker healthy (`/v1/health`)
- Funded demo wallets
- Timer 150s visible to presenter
