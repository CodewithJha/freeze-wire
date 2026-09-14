# Demo video script (2–4 min)

**Target duration:** **~3:00** (range 2:00–4:00).  
**Operator source of truth:** `docs/DEMO_RUNBOOK.md` + `docs/DEMO_SPECIFICATION.md`  
**Hard honesty rule:** Do **NOT** claim a live ELIGIBLE→RESTRICTED transition on account B (`0xe05F…`). B is **already RESTRICTED**.

### Roles

| Role | Address | Use |
|---|---|---|
| **A — Eligible actor** | `0x6b07454d70896cad371982A57037933e24F4cD52` | Deposit/draw “before” |
| **B — Restricted counterparty** | `0xe05F529f5284D75624eBa386CB716928c3b54A2A` | Explorer + draw revert |

### Pinned links (pre-open tabs)

- Etherscan: https://etherscan.io/tx/0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787  
- Blockscout submitProof: https://creditcoin-testnet.blockscout.com/tx/0x07e30451fb38776aa972603e94aeb8f779f182a5047a371195df2d598a4dfc45  

### Banned phrases

- “Watch it flip from eligible to restricted” (on B)
- “The UI / API blacklisted them”
- “MockUSD is USDC”
- “Default eligible means clean”
- first / unhackable / production credit bureau

---

## Timestamped script

### 0:00–0:20 — Problem + canonical USDC

| | |
|---|---|
| **Timestamp** | 0:00–0:20 |
| **Screen action** | Title card or FreezeWire UI hero; optional slide of Circle USDC address |
| **What appears** | Product name + one-line problem |
| **Narration** | “Circle blacklists an address on Ethereum. Creditcoin credit won’t inherit that unless you trust an API. We don’t. FreezeWire proves the Circle USDC event with Attestcoin, then enforces it on Creditcoin.” |
| **Evidence/link** | Circle USDC `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |

---

### 0:20–0:45 — Eligible actor A (before)

| | |
|---|---|
| **Timestamp** | 0:20–0:45 |
| **Screen action** | Wallet connected as **A** (`0x6b0745…`). Show status ELIGIBLE (or unset→ELIGIBLE). Deposit + small draw if balances ready; else show prior successful draw tx from evidence. |
| **What appears** | Successful draw / Blockscout success for A |
| **Narration** | “This is a separate eligible actor. Default ELIGIBLE is fail-open — it is not a proven clean certificate. Drawing works until a verified blacklist proof restricts the address.” |
| **Evidence/link** | `eligibleActor` in `deployments/demo-evidence-public.json`; optional `drawOkTx` `0xf36521081f0f8b955e79ba2a2d4b6eb876aa19b75d501039bcc499ec15328dcd` |

---

### 0:45–1:10 — Real Ethereum Blacklisted event (B)

| | |
|---|---|
| **Timestamp** | 0:45–1:10 |
| **Screen action** | Switch to Etherscan demo tx. Scroll to Success, USDC contract, Logs → `Blacklisted` for B. |
| **What appears** | Public mainnet blacklist evidence |
| **Narration** | “Here is the real Ethereum mainnet Circle USDC blacklist transaction targeting account B. Receipt success. Not a mocked event.” |
| **Evidence/link** | https://etherscan.io/tx/0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787 |

---

### 1:10–1:35 — Fetch Attestcoin proof bundle

| | |
|---|---|
| **Timestamp** | 1:10–1:35 |
| **Screen action** | FreezeWire UI Prove / TRACE for the demo tx, **or** worker `/v1/prove/{tx}` JSON. Stop at **PROOF BUNDLE READY**. |
| **What appears** | Proof JSON fields: chainKey `3`, header `25705174`, txIndex `18`, siblings, continuity roots |
| **Narration** | “We fetch an Attestcoin proof bundle: Merkle inclusion plus continuity. Spoken checks after the precompile: inclusion, status, emitter, event, account. This bundle is evidence — it is not yet a Creditcoin ledger write.” |
| **Evidence/link** | `deployments/demo-proof-public.json`; Proof Builder path `…/proof-by-tx/3/0xc9edfd…` |

---

### 1:35–2:05 — Commit path honesty + prior submitProof

| | |
|---|---|
| **Timestamp** | 1:35–2:05 |
| **Screen action** | Show UI prepare/relay or calldata path briefly. Then open Blockscout **prior** `submitProof` tx. Do not claim “we just flipped B live.” |
| **What appears** | Blockscout success for `0x07e3…`; ledger / Restricted context for B |
| **Narration** | “Anyone can call permissionless submitProof. On chain, BlockProver 0x0FD2 verifies inclusion and continuity; FreezeWire consumer checks bind Circle’s event. Account B is already Restricted from this prior successful submit — here is the public Creditcoin transaction. We are not faking a live eligible-to-restricted animation.” |
| **Evidence/link** | https://creditcoin-testnet.blockscout.com/tx/0x07e30451fb38776aa972603e94aeb8f779f182a5047a371195df2d598a4dfc45 |

---

### 2:05–2:25 — Chain-backed RESTRICTED status

| | |
|---|---|
| **Timestamp** | 2:05–2:25 |
| **Screen action** | UI LOAD DEMO / TRACE for B showing RESTRICTED, **or** `cast call` `statusOf(B)`. |
| **What appears** | `statusOf` = RESTRICTED |
| **Narration** | “Creditcoin eligibility for B is Restricted. That state came from the proof path — there is no setStatus for the backend to call.” |
| **Evidence/link** | EligibilityLedger `0xde64d5037cA820D4aDFa703C4FaF5451be840C9d`; demo-evidence `statusOf: RESTRICTED` |

---

### 2:25–2:50 — Restricted draw rejected; repay allowed

| | |
|---|---|
| **Timestamp** | 2:25–2:50 |
| **Screen action** | Wallet as **B** attempt draw → revert. Optionally show repay succeeds. If wallet B unavailable: show evidence JSON draw revert + `cast` simulate. |
| **What appears** | Revert `Restricted()` / signature `0xccc08913` |
| **Narration** | “Financial consequence: draw reverts Restricted — selector 0xccc08913. Repay and unused withdraw stay open so exits are not trapped.” |
| **Evidence/link** | GatedCreditLine `0xB04fFca20e0a992474E6AD501A061973dC9Ed340`; demo-evidence `drawAsRestricted` |

---

### 2:50–3:10 — Closer (DEMO-005)

| | |
|---|---|
| **Timestamp** | 2:50–3:10 (end by ~3:00–3:15; stretch to 4:00 only if explorers need slow scroll) |
| **Screen action** | Face cam or final slide with GitHub URL |
| **What appears** | Closer quote + https://github.com/CodewithJha/freeze-wire |
| **Narration** | “The backend never told Creditcoin the address was blacklisted. The Attestcoin proof did.” |
| **Evidence/link** | DEMO_SPECIFICATION DEMO-005 |

---

## Optional +30–45s (only if under 2:30)

- Point at consumer-check list on UI sequence 01–04.  
- Open `docs/ATTESTCOIN_INTEGRATION_SUMMARY.md` Removal test paragraph.  
- Show Foundry file name `SecurityBoundaries.t.sol` — do not run full suite on video.

---

## Recording checklist

- [ ] `VITE_ALLOW_SIMULATION` unset/false if showing LIVE UI  
- [ ] Worker `/v1/health` OK  
- [ ] Wallet A funded (or use committed creditLineTxs)  
- [ ] Two explorer tabs pre-opened  
- [ ] Mic check; timer visible  
- [ ] Upload → public URL if hosting the recording  
- [ ] Engineering freeze: no code changes for the video
