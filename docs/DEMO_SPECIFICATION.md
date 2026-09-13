# Demo specification (~3 minutes)

**Must prove:**

```text
REAL SOURCE EVENT → ATTESTCOIN PROOF → CRYPTOGRAPHIC VERIFICATION
        → CTC STATE CHANGE → FINANCIAL CONSEQUENCE
```

**Closer (DEMO-005 — do not skip):**

> The backend never told Creditcoin the address was blacklisted. The Attestcoin proof did.

**Visuals:** frontend + Etherscan (Ethereum) + Creditcoin Blockscout. Backup: raw `cast call` / worker JSON if UI fails.

---

## Two-account reality (mandatory)

Live ledger evidence already has the Circle-blacklisted account as **`RESTRICTED`**. Do **not** claim a live ELIGIBLE→RESTRICTED transition on that address during the talk.

| Role | Address | Use |
|---|---|---|
| **A — Eligible actor** | `0x6b07454d70896cad371982A57037933e24F4cD52` | Deposit / draw / repay / withdraw (shows “before” + fail-open default) |
| **B — Restricted counterparty** | `0xe05F529f5284D75624eBa386CB716928c3b54A2A` | Consequence: draw reverts; repay / unused withdraw allowed |

---

## Pinned evidence (public)

Verified against `deployments/demo-evidence-public.json` / `deployments/cc3-testnet.json`:

| Field | Value |
|---|---|
| Demo ETH tx | `0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787` |
| Ethereum block | `25,705,174` — 2026-08-07 |
| Circle USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Method | `blacklist` → `Blacklisted`; receipt success; txIndex `18` |
| CC3 chainId | `102031` · chainKey **`3`** |
| EligibilityLedger | `0xde64d5037cA820D4aDFa703C4FaF5451be840C9d` |
| GatedCreditLine | `0xB04fFca20e0a992474E6AD501A061973dC9Ed340` |
| submitProof tx | `0x07e30451fb38776aa972603e94aeb8f779f182a5047a371195df2d598a4dfc45` |
| statusOf(B) | `RESTRICTED` |

If Proof Builder cannot serve this height, **swap to a newer real USDC Blacklisted tx** with the same checks. Do not mock.

---

## Script (0:00–3:00)

| Time | Screen | Action | Expected result | Judge takeaway |
|---|---|---|---|---|
| **0:00–0:20** | Slide / UI | “Circle blacklists an address on Ethereum. Creditcoin credit won’t inherit that unless you trust an API. We don’t.” Show canonical USDC. | Problem framed. | Specific, real. |
| **0:20–0:45** | UI as **account A** (`0x6b0745…`) | Show `ELIGIBLE`. Deposit. Draw a small amount — succeeds. Say: **default ELIGIBLE ≠ proven clean**. | Draw success on Blockscout. | DEMO-003 honesty. |
| **0:45–1:10** | Etherscan | Open demo `blacklist` tx. Point at Success, USDC emitter, `Blacklisted` for **B** (`0xe05F…`). | Public explorer. | DEMO-001 real source. |
| **1:10–1:35** | Worker `/v1/prove` or UI Prove | Speak **INCLUSION · STATUS · EMITTER · EVENT · ACCOUNT**. Bundle ready ≠ ledger write. | Proof JSON; precompile path clear. | Attestcoin load-bearing (DEMO-002). |
| **1:35–2:05** | Blockscout ledger / prior tx | Show `submitProof` `0x07e3…` and/or live wallet submit. `Restricted` for **B**. No `setStatus`. | Ledger `RESTRICTED`. | CTC state from proof. |
| **2:05–2:35** | UI / wallet as **B** | Draw → reverts `Restricted()`. Repay succeeds. Optional unused withdraw. | Financial consequence. | DEMO-004; exits not trapped. |
| **2:35–3:00** | Face / last slide | Speak DEMO-005 closer verbatim. | — | Backend is not the oracle. |

---

## Do not say (banned / weak claims)

- “First-ever” / “unhackable” / “production credit bureau”
- Writability / handshake writeback
- That the UI or worker “verified” eligibility (say **proof bundle ready** / on-chain `submitProof`)
- That MockUSD is Circle USDC
- That default `ELIGIBLE` means the address is clean
- Live ELIGIBLE→RESTRICTED on `0xe05F…` unless you truly re-demo a fresh blacklist

---

## Judge Q&A (short)

See `COMPETITIVE_POSITIONING.md` and `SECURITY_MODEL.md`.

| Q | A |
|---|---|
| CEL clone? | CEL freezes the **instrument**; we freeze the **counterparty** after Attestcoin proves Circle’s blacklist. |
| Why CTC? | The venue that refuses the draw must live where the proof verifies. |
| Oracle? | Permissionless `submitProof`; lying worker fails `0x0FD2` or binder. |
| Already Restricted — fake? | Prior permissionless submit; show explorer `0x07e3…`; A shows before, B shows consequence. |
| Default ELIGIBLE = clean? | No. |
| Can they repay? | Yes. |
| MockUSD = USDC? | No. We inherit the flag, not the reserves. |
| Owner change emitter? | No — constructor-immutable (ADR-0016). |
| Wrong chain? | Sepolia is chainKey 1; we bind 3. |
| Precompile checks status? | No. We do. |

---

## Props / prep

- Two explorer tabs pre-opened (Etherscan demo tx + Blockscout `submitProof`)
- Worker healthy (`/v1/health`)
- Funded wallets for **A** (and **B** if showing live draw revert)
- Timer visible; rehearse 3:00 closer
- Backup: `cast call` `statusOf` + Foundry `T-SEC-*` if UI fails
