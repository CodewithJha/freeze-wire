# DEMO_RUNBOOK.md

Operator checklist for the live judge demo. Narrative/timing: [`DEMO_SPECIFICATION.md`](./DEMO_SPECIFICATION.md).

**Hard rule:** Do **not** invent a live ELIGIBLE→RESTRICTED transition on `0xe05F529f5284D75624eBa386CB716928c3b54A2A`.

---

## 0. Purpose & non-goals

**Prove:** real Circle `Blacklisted` → Attestcoin proof → `0x0FD2` + consumer checks → CTC ledger → credit consequence.

**Non-goals:** live freeze animation on B; production claims; MockUSD = USDC; UI/worker as eligibility authority.

---

## 1. Roles & addresses

| Role | Address | Wallet? | UI? | Explorer? |
|---|---|---|---|---|
| **A — Eligible actor** | `0x6b07454d70896cad371982A57037933e24F4cD52` | YES (MetaMask primary for DEMO-003) | Optional `statusOf` via worker | Blockscout draw success |
| **B — Restricted counterparty** | `0xe05F529f5284D75624eBa386CB716928c3b54A2A` | YES if showing live `Restricted()` | **LOAD DEMO / TRACE** binds **B** | Etherscan source + Blockscout `submitProof` `0x07e3…` |

Pinned hashes: see `DEMO_SPECIFICATION.md` and `deployments/*-public.json`.

---

## 2. Honesty rule — no fake live transition

- **BEFORE talk:** `statusOf(B) == RESTRICTED` is an **EXPECTED PASS**, not a surprise.
- When UI shows RESTRICTED after LOAD DEMO / TRACE: say *“Already restricted from prior permissionless `submitProof` — here’s the explorer tx.”*
- **NEVER:** “Watch it go from eligible to restricted” on B.
- Optional re-prove / re-relay: only to show bundle + path; if revert/replay, cut to Blockscout `0x07e30451fb38776aa972603e94aeb8f779f182a5047a371195df2d598a4dfc45`.
- If UI step 04 `accessResolved` stays incomplete without **this-session** `relayed`: ignore the checkmark; use explorers + wallet consequence.

---

## 3. Preflight (T−30)

### Infra

- [ ] Worker `/v1/health` OK; Proof Builder reachable
- [ ] Frontend `.env`: LIVE addresses; `VITE_ALLOW_SIMULATION` unset/false
- [ ] `eth_chainId == 102031`
- [ ] `statusOf(A)` = ELIGIBLE (or unset → ELIGIBLE); `statusOf(B)` = RESTRICTED

### Tabs

- [ ] Etherscan demo blacklist tx
- [ ] Blockscout `submitProof` `0x07e3…` + ledger Restricted
- [ ] Optional: GatedCreditLine on Blockscout

### Wallets / balances

- [ ] Wallet A funded (CTC gas + MockUSD) for deposit/draw
- [ ] Wallet B funded + credit position if live draw-revert (else explorer + `cast`)
- [ ] Relay key **or** rehearsed wallet `submitProof` calldata path

### Backup

- [ ] `cast` `statusOf` / draw simulate; Foundry T-SEC-* slide; `deployments/demo-evidence-public.json`

---

## 4. Pass/fail matrix (DEMO-001–006)

| ID | Pass criterion | Fail if |
|---|---|---|
| DEMO-001 | Real Etherscan `Blacklisted` + CTC Restricted for B via proof path | Mocked event; no explorer |
| DEMO-002 | Spoken INCLUSION · STATUS · EMITTER · EVENT · ACCOUNT; precompile ≠ consumer | “Attestcoin did all checks” |
| DEMO-003 | A draws; line “default ELIGIBLE ≠ proven clean” | Imply A is Circle-clean |
| DEMO-004 | B draw `Restricted()`; repay OK | Funds-trapped narrative |
| DEMO-005 | Closer verbatim | Backend-as-oracle claim |
| DEMO-006 | Both explorers shown | Screenshots only / no links |

---

## 5. Minute-by-minute operator sheet

| Time | Action |
|---|---|
| 0:00–0:20 | Problem + canonical USDC |
| 0:20–0:45 | **Wallet A** — deposit/draw (**not** load-demo account) |
| 0:45–1:10 | Etherscan B blacklist |
| 1:10–1:35 | UI prove → **PROOF BUNDLE READY** (say not ledger write) |
| 1:35–2:05 | Blockscout prior `submitProof` / Restricted — **not** “we just flipped” |
| 2:05–2:35 | Wallet B consequence (or `cast` if wallet missing) |
| 2:35–3:00 | DEMO-005 closer |

---

## 6. UI click path vs spoken path

- Hero TRACE / LOAD DEMO = **B evidence only**
- Do **not** use UI as A’s status story
- Sequence 01–04: what each checkmark means; skip re-commit of 03 if replay would confuse judges

---

## 7. Failure playbook

| Symptom | Class | Action |
|---|---|---|
| Already RESTRICTED on load | ACCEPTABLE | Explorer prior tx |
| RELAY_DISABLED / calldata path | DEMO ISSUE (ops) | Wallet broadcast; prepared ≠ committed |
| PB height unavailable | DEMO ISSUE (ops) | Newer **real** USDC Blacklisted; same binder |
| SIMULATION labels | DEMO ISSUE | Flip to LIVE or don’t claim on-chain |
| Draw as B succeeds | **REAL BUG** | Abort claim; investigate `statusOf` / subject |
| Draw as A reverts Restricted | **REAL BUG** / wrong wallet | Confirm connected account is A |
| UI says “verified” eligibility | DEMO ISSUE | Correct to PROOF BUNDLE READY / on-chain only |

---

## 8. Banned phrases

- Live ELIGIBLE→RESTRICTED on `0xe05F…`
- “UI verified” / “API blacklisted them”
- First-ever / unhackable / MockUSD is USDC / default = clean

---

## 9. Judge Q&A

See `COMPETITIVE_POSITIONING.md` + DEMO_SPEC Q&A. Short answer to “Already Restricted — fake?”: prior permissionless `submitProof` on public Blockscout; architecture forbids inventing that without Attestcoin + consumer checks.

---

## 10. Ownership

| Doc | Role |
|---|---|
| `DEMO_SPECIFICATION.md` | Narrative / timing |
| `DEMO_RUNBOOK.md` | Ops checklist (this file) |
| `deployments/*-public.json` | Canonical public hashes |
