# Pitch deck (markdown slides → export PDF later)

**Audience:** technical / product reviewers  
**Theme emphasis:** Attestcoin depth is load-bearing for the product story  
**Export:** Copy into Google Slides / Keynote / Marp → PDF → host if needed  
**Slide count:** 10

Do not claim first / revolutionary / production-ready / superior. CC3 testnet scope only.

---

## Slide 1 — TITLE / HOOK

**Title:** FreezeWire

**Exact copy:**
- Prove the event. Enforce the outcome.
- Circle USDC `Blacklisted` on Ethereum → Attestcoin proof → Creditcoin gated credit
- DeFi · CC3 testnet chainId `102031`

**Visual recommendation:** Dark/neutral full-bleed title; small Creditcoin + Attestcoin marks; no dashboard clutter. One hero line + subtitle.

**Evidence/source:** README tagline; sector DeFi.

**Speaker notes:** Open with the sentence audiences must remember: credit on Creditcoin only freezes after a proven Ethereum fact — not after an API call.

---

## Slide 2 — THE TRUST PROBLEM

**Title:** Creditcoin cannot see Ethereum logs natively

**Exact copy:**
- When Circle blacklists an address on Ethereum USDC, CTC credit markets stay blind unless something bridges the fact.
- Naive path: a keeper calls `setRestricted(address)` — single key becomes the compliance oracle.
- Compromise, downtime, or censorship of that key = wrong freezes or continued lending to flagged addresses.
- Liquidity providers are asked to trust a server narrative, not cryptography.

**Visual recommendation:** Two-column: left “Oracle setter” with `onlyOwner setRestricted`; right red X. Minimal icons.

**Evidence/source:** README “Oracle Trap”; SECURITY_MODEL / ATTESTCOIN_INTEGRATION_SUMMARY (no `setStatus`).

**Speaker notes:** Do not attack competitors here. Frame the failure mode FreezeWire refuses.

---

## Slide 3 — FREEZEWIRE SOLUTION

**Title:** Inherit the flag. Gate the counterparty.

**Exact copy:**
- FreezeWire turns a real Ethereum mainnet Circle USDC `Blacklisted` / `UnBlacklisted` event into a Creditcoin eligibility state.
- Path: Attestcoin proof → BlockProver `0x0FD2` → consumer checks → `EligibilityLedger` → `GatedCreditLine`.
- Permissionless `submitProof`. No `setStatus` / `setRestricted`.
- Worker/UI = untrusted transport only.
- Object of the gate: the **counterparty address**, not the dollar instrument.

**Visual recommendation:** One horizontal spine diagram matching README ASCII (ETH → Proof Builder → CC3 contracts). Highlight “no setter.”

**Evidence/source:** ATTESTCOIN_INTEGRATION_SUMMARY; PRODUCT / README differentiation table.

**Speaker notes:** Say out loud: “The backend never told Creditcoin the address was blacklisted. The Attestcoin proof did.” (DEMO-005 closer — preview).

---

## Slide 4 — REAL ETHEREUM EVENT

**Title:** Source fact: Circle USDC on Ethereum mainnet

**Exact copy:**
- Emitter (immutable in contracts): `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Demo tx: `0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787`
- Block `25,705,174` · method `blacklist` → event `Blacklisted`
- Account B: `0xe05F529f5284D75624eBa386CB716928c3b54A2A`
- Not Sepolia. Not a self-issued mock blacklist on Ethereum.

**Visual recommendation:** Screenshot crop of Etherscan Success + Logs (`Blacklisted`). QR or short link to Etherscan.

**Evidence/source:** demo-evidence-public.json; DEMO_SPECIFICATION; Etherscan URL in README.

**Speaker notes:** Emphasize viewers can open the explorer themselves. MockUSD on CC3 is **not** this token.

---

## Slide 5 — ATTESTCOIN PROOF (LOAD-BEARING)

**Title:** What Attestcoin / `0x0FD2` does — and does not do

**Exact copy:**
- CC3 testnet: Ethereum mainnet = Attestcoin **chainKey `3`** (`chainKey` ≠ EVM `chainId`).
- Proof Builder returns Merkle inclusion + continuity for the encoded tx/receipt.
- On-chain: `verifyAndEmit` at BlockProver `0x0000…0FD2`.
- **Proves:** inclusion under an attested header + continuity toward the attested tip.
- **Does not prove:** receipt success, USDC emitter, event topic, account identity, eligibility semantics.
- Those consumer checks are FreezeWire’s. Precompile alone never writes Restricted.

**Visual recommendation:** Split panel “0x0FD2 PROVES” vs “FREEZEWIRE CHECKS” with bullets above. Mark chainKey `3` prominently.

**Evidence/source:** ATTESTCOIN_EVIDENCE.md; ATTESTCOIN_INTEGRATION_SUMMARY §§5–8; SECURITY_EVIDENCE “What 0x0FD2 does not prove.”

**Speaker notes:** This slide carries Attestcoin-depth credibility. Do not say “Attestcoin did all the checks.”

---

## Slide 6 — CREDITCOIN ENFORCEMENT

**Title:** From verified fact → RESTRICTED → draw reject

**Exact copy:**
- `BlacklistVerifier` binds only constructor-immutable Circle USDC logs.
- `EligibilityLedger` stores status; replay key = `(chainKey, height, txIndexRecovered)`.
- `GatedCreditLine` on Restricted: `draw` / protected transfer / escrow extract revert.
- Exits preserved: `repay` and unused `withdraw` still allowed.
- Default unset = `ELIGIBLE` (fail-open) — **not** “proven clean.”

**Visual recommendation:** Simple state machine ELIGIBLE ↔ RESTRICTED with check/X icons for draw vs repay.

**Evidence/source:** README architecture; DEMO_SPECIFICATION DEMO-003/004; SECURITY_EVIDENCE T-FIN-*.

**Speaker notes:** Mention never-trap-exits once; do not oversell as a full credit bureau.

---

## Slide 7 — LIVE DEMO / EVIDENCE

**Title:** Live CC3 testnet evidence (public)

**Exact copy:**
| Item | Value |
|---|---|
| chainId | `102031` |
| chainKey | `3` |
| BlacklistVerifier | `0x6bf238291Bb8262918A1989831856DC6BC47D869` |
| EligibilityLedger | `0xde64d5037cA820D4aDFa703C4FaF5451be840C9d` |
| GatedCreditLine | `0xB04fFca20e0a992474E6AD501A061973dC9Ed340` |
| submitProof | `0x07e30451fb38776aa972603e94aeb8f779f182a5047a371195df2d598a4dfc45` |
| statusOf(B) | `RESTRICTED` |
| draw as B | reverts `Restricted()` · selector `0xccc08913` |
| Actor A (eligible demo) | `0x6b07454d70896cad371982A57037933e24F4cD52` |

**Honesty line (must appear on slide):** Account B is **already RESTRICTED** from a prior permissionless `submitProof`. We do not fake a live ELIGIBLE→RESTRICTED flip on B. A shows “before”; explorers show the proof path; B shows consequence.

**Visual recommendation:** Two explorer screenshots side-by-side (Etherscan + Blockscout submitProof). Tiny footer: `deployments/demo-evidence-public.json`.

**Evidence/source:** demo-evidence-public.json; README deployment table; Blockscout tx link.

**Speaker notes:** If asked “already restricted — fake?”: prior permissionless submit on public Blockscout; architecture cannot invent Restricted without Attestcoin + checks.

---

## Slide 8 — SECURITY / TRUST BOUNDARIES

**Title:** Attack surface we actually close

**Exact copy:**
- Impostor emitter / wrong topic / failed receipt / wrong chainKey / bad Merkle or continuity → no Restricted write (Foundry T-SEC-*).
- Forged caller `txIndex` ignored — recovered from Merkle path.
- Replay → `QueryAlreadyProcessed`.
- No backend setter path (API has no `setStatus`).
- **Removal test:** If Attestcoin / BlockProver `0x0FD2` is removed, FreezeWire cannot move an address to `RESTRICTED` — there is no alternate authority that invents the Ethereum fact.
- Disclosed residuals (not Attestcoin bypass): owner can retune chainKey/window; live window `(0,0)` unbounded; testnet scope.

**Visual recommendation:** Compact attack→result table (3–5 rows). Footnote residuals in smaller type.

**Evidence/source:** SECURITY_EVIDENCE.md; ATTESTCOIN_EVIDENCE removal test; ATTESTCOIN_INTEGRATION_SUMMARY.

**Speaker notes:** Speak removal test calmly — it is architectural dependency, not a boast of unbreakability.

---

## Slide 9 — DIFFERENTIATION + PRODUCT VALUE

**Title:** Same Attestcoin spine. Different economic gate.

**Exact copy:**
- **CEL:** freezes the **instrument** (e.g. issuer `Paused`) → asset eligibility.
- **FreezeWire:** freezes the **counterparty** after a proven Circle `Blacklisted` → address eligibility for new credit.
- **Corolary-class:** score/solvency / collateral efficiency — we inherit a compliance flag, not a reputation score.
- Value for CTC credit venues: refuse new draw to Circle-flagged addresses without hiring an oracle vendor — and without trapping repay/exit.

**Visual recommendation:** 2×2 or 3-row comparison (object / event / gate). No “we are better” column — only “difference.”

**Evidence/source:** docs/COMPETITIVE_POSITIONING.md; README differentiation box.

**Speaker notes:** Acknowledge CEL as the completeness bar for the pattern. Differentiation = object of the freeze.

---

## Slide 10 — ARCHITECTURE / LINKS / CONTRACTS

**Title:** Links you can verify

**Exact copy:**
- GitHub: https://github.com/CodewithJha/freeze-wire
- Attestcoin summary: `docs/ATTESTCOIN_INTEGRATION_SUMMARY.md`
- Public evidence: `deployments/demo-evidence-public.json` · `demo-proof-public.json`
- Etherscan source: `0xc9edfdbb…f787`
- Blockscout submitProof: `0x07e30451…fc45`
- Closer: *The backend never told Creditcoin the address was blacklisted. The Attestcoin proof did.*

**Visual recommendation:** Link list + QR codes if available. End with DEMO-005 closer as large footer quote.

**Evidence/source:** README; ATTESTCOIN_INTEGRATION_SUMMARY; DEMO_SPECIFICATION.

**Speaker notes:** Offer to walk explorers live. Mention Foundry 95 / backend 45 / frontend 17 only if asked — depth > badge spam.

---

## Export checklist (human)

1. Convert these 10 slides to a clean PDF.
2. Host publicly if you need a shareable PDF URL (Drive “anyone with link”, GitHub Release asset, etc.).
3. Prefer also hosting `FreezeWire_Whitepaper.pdf` as the long-form technical document.
4. Keep engineering freeze — do not change product code for the deck.
