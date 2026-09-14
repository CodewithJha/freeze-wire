# Competitive positioning

Sources: related-project READMEs fetched 2026-09-10 and earlier peer research notes. **No superiority claims without evidence.** Completeness bar in this field is high (ChargeProof, CEL, Deadswitch, etc.).

**Memorize:** *CEL freezes the instrument; FreezeWire freezes the counterparty — only after Attestcoin proves the Ethereum fact.*

---

## FreezeWire

**What we do:** Inherit Circle USDC **address-level** `Blacklisted`/`UnBlacklisted` into CTC **credit and escrow** via Attestcoin, with consumer checks and never-trap-exits.

**Key difference vs field:** Object is the **counterparty**, not collateral instrument, not reputation score, not EV session, not vault withdrawal.

**Live (CC3 testnet):** Deployed contracts + permissionless `submitProof` → `RESTRICTED` + draw revert evidenced (see README / `DEPLOYMENT_PLAN.md`). Still a testnet demo — do not claim production completeness over mature peers.

**Common objection:** “Isn’t this CEL with a different event?”
**Our answer:** CEL freezes the *instrument* (e.g. issuer `Paused`). We freeze the *counterparty* Circle flagged — after Attestcoin proves the fact. Same Attestcoin spine, different economic gate: the dollar can still exist; **new credit to that address** cannot. We do **not** claim more tests, polish, or packaging than CEL has shown.

---

## CEL (Collateral Eligibility Ledger)

**What they do:** Prove issuer **pause/restore** of an asset; flip **instrument** eligibility; gate **new** lending; never block exit. Live on CC3 with a real mainnet `Paused` (sNUSD) and published addresses/tests (README 2026-09-10).

**What we do:** Address `Blacklisted`, not asset `Paused`.

**Key difference:** Primary key = address vs asset. Event family = Circle blacklist vs pause.

**Common objection:** “CEL already shipped this pattern; you are late and thinner.”
**Answer:** Acknowledge CEL as a completeness-bar peer and **honestly reuse the pattern** (consumer checks, no owner-write, never-gate-exits). Differentiation is the **object** (counterparty compliance) plus a live Restricted consequence on a Circle blacklist. Do not claim we are “better than CEL” overall.

---

## Corolary

**What they do:** Prove Ethereum **lending history** (and even Chainlink answers) to improve **collateral efficiency** (still over-collateralized). Attestcoin is the product.

**What we do:** We do not score reputation; we inherit a **compliance flag**.

**Key difference:** Solvency/reputation vs issuer blacklist.

**Common objection:** “Creditcoin is for credit; why aren’t you scoring?”
**Answer:** Scoring is crowded (Corolary). Compliance inheritance is a different story: CTC credit that **refuses** Circle-flagged counterparties without an oracle vendor.

---

## Deadswitch

**What they do:** Collateral on **Sepolia**; debt on CTC; prove `CollateralWithdrawn`; liquidate when remaining < min. Permissionless proof; no price feed.

**What we do:** No source vault we deploy for the demo; we read **canonical USDC** on **mainnet**.

**Key difference:** Their source contract is theirs; ours is Circle’s. Liquidation vs credit freeze.

**Common objection:** “You didn’t even lock collateral on the source chain.”
**Answer:** Intentional: writability/source vault is a different product. We inherit an **issuer control-plane event** that already exists in production.

---

## Toxa

**What they do:** Lock ETH on Sepolia → prove `Locked` → loan on CTC + score. README notes demo mode can be **simulated**.

**What we do:** Real mainnet issuer event; credit **restriction**, not origination from a lock.

**Key difference:** Lock-to-lend vs blacklist-to-deny.

**Common objection:** “Toxa is also proof-gated credit.”
**Answer:** Same spine, opposite verb: they **enable** a loan from a proven lock; we **disable** new credit from a proven blacklist. We will not run a simulated demo mode that fakes Attestcoin.

---

## Attestable

**What they do:** Parametric coverage for infra failure (e.g. oracle silence), settled from proven facts.

**What we do:** Not insurance.

**Key difference:** Coverage vs compliance inheritance.

**Common objection:** “Why not insure lag instead of gating credit?”
**Answer:** Different buyer. FreezeWire is for a CTC venue that must **not originate** to a flagged address.

---

## ChargeProof

**What they do:** DePIN EV settlement: Sepolia session proof releases CTC escrow; replay rejected; hosted demo. Completeness bar for the full Attestcoin loop.

**What we do:** Not DePIN; not session settlement.

**Key difference:** Domain (charging vs stablecoin compliance).

**Common objection:** “ChargeProof already showed the full Attestcoin loop.”
**Answer:** Agree the loop is the bar. We must show the **same loop** on a **mainnet Circle blacklist** with a **financial consequence on CTC**. We do not claim a better dashboard.

---

## ThirdCheck (relevant)

From peer writeups: consumer checks after precompile (status/emitter/event). FreezeWire **must** implement that class of checks or auditors will say “you only called 0x0FD2.” We do not claim to be ThirdCheck.

---

## Handshake / Credo / others (relevant, not primary)

Handshake: two-lock DvP; writability gap led to operator-signed Ethereum release — **we refuse that cheat**. Credo: inverse cash/asset placement. FreezeWire does not do DvP.

---

## Credal (infrastructure, not a protocol peer)

Hosted Creditcoin API for loans/data. We do not integrate it. If asked “why not Credal?”: Credal is transport; it does not verify Ethereum receipts. Attestcoin does.
