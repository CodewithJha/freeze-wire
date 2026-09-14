# Project description / metadata fields

**Note:** Structured as reusable paste blocks for project metadata (name, sector, description, Attestcoin summary, links). Technical VALUE blocks are product copy. Personal contact/identity sections are *Potentially packaging-only*.

Copy the `VALUE` blocks as needed. Do not paste secrets, private keys, or `.env` values.

---

## Project Name

**FIELD:** Project Name  
**VALUE:** FreezeWire  
**CHARACTER LIMIT:** not specified  

---

## Project Logo

**FIELD:** Project Logo  
**VALUE:** *(leave blank unless you host a PNG/SVG/AI image URL)*  
**CHARACTER LIMIT:** not specified (formats: PNG, SVG, or AI — URL)  
**Note:** Optional.

---

## Project Sector

**FIELD:** Project Sector  
**VALUE:** DeFi  
**CHARACTER LIMIT:** not specified  
**Note:** Product fit = gated credit/lending on Creditcoin → **DeFi**.

---

## Project Description

**FIELD:** Project Description  
**VALUE:**

```text
FreezeWire inherits Circle USDC address blacklists from Ethereum mainnet into Creditcoin CC3 credit gating — without a backend oracle.

Flow:
1. A real Ethereum mainnet Circle USDC Blacklisted event (canonical FiatToken).
2. An Attestcoin proof (Merkle inclusion + header continuity) for that transaction.
3. On-chain verification via Creditcoin BlockProver 0x0FD2, then FreezeWire consumer checks (receipt status, immutable USDC emitter, event topic, account, chainKey, window, replay).
4. EligibilityLedger moves the proven address to RESTRICTED.
5. GatedCreditLine rejects draw / extractive ops for that address while repay and unused withdraw remain allowed.

There is no setStatus / setRestricted. The worker and UI only discover and relay; they cannot invent Restricted. Demo evidence is on Creditcoin CC3 testnet (chainId 102031) with Attestcoin chainKey 3 for Ethereum mainnet.

GitHub: https://github.com/CodewithJha/freeze-wire
```

**CHARACTER LIMIT:** not specified  

---

## Attestcoin Protocol Integration Summary

**FIELD:** Attestcoin Protocol Integration Summary  
**VALUE:**

```text
FreezeWire uses Attestcoin readability so Creditcoin CC3 can inherit a real Ethereum mainnet Circle USDC Blacklisted / UnBlacklisted fact without trusting a backend oracle.

Source: Ethereum mainnet Circle USDC 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48.
CC3 testnet: EVM chainId 102031; Attestcoin chainKey for Ethereum mainnet = 3 (not EVM chainId; Sepolia is chainKey 1).
Proof Builder: GET /api/v1/proof-by-tx/3/{tx} on proof-gen-api.cc3-testnet.creditcoin.network.
On-chain: EligibilityLedger.submitProof is permissionless. BlacklistVerifier calls BlockProver 0x0FD2 via verifyAndEmit (inclusion + continuity). Precompile success alone does not authorize eligibility.

Consumer checks FreezeWire performs after 0x0FD2: receiptStatus == 1; log.address == constructor-immutable Circle USDC; topic0 ∈ {Blacklisted, UnBlacklisted}; account from topics[1]; expected chainKey; height window; txIndex recovered from Merkle isLeft bits; replay key keccak256(chainKey, height, txIndex).

Demo evidence (public): ETH tx 0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787 → CC3 submitProof 0x07e30451fb38776aa972603e94aeb8f779f182a5047a371195df2d598a4dfc45 → statusOf(0xe05F…) = RESTRICTED → GatedCreditLine draw reverts Restricted() (selector 0xccc08913).

Removal test: without Attestcoin / 0x0FD2, FreezeWire has no path that can move an address to RESTRICTED (no owner setter, no eligibility DB, no worker privilege).

Full writeup: docs/ATTESTCOIN_INTEGRATION_SUMMARY.md in the GitHub repo.
```

**CHARACTER LIMIT:** not specified  
**Note:** Useful whenever an Attestcoin integration summary is requested.

---

## GitHub Repository URL

**FIELD:** GitHub Repository URL  
**VALUE:** https://github.com/CodewithJha/freeze-wire  
**CHARACTER LIMIT:** not specified  
**Note:** Public repo should include a README.

---

## Project Deck or Whitepaper (PDF URL)

**FIELD:** Project Deck or Whitepaper  
**VALUE:** `<<< PASTE PUBLIC PDF URL AFTER YOU HOST IT >>>`  
**CHARACTER LIMIT:** not specified (must be a **PDF URL**)  
**Prep:** Export `02-pitch-deck.md` or host `FreezeWire_Whitepaper.pdf`, then paste URL here.

---

## Prototype Demo Video URL

**FIELD:** Prototype Demo Video URL  
**VALUE:** `<<< PASTE PUBLIC VIDEO URL AFTER YOU HOST IT >>>`  
**CHARACTER LIMIT:** not specified (duration/format/host not specified)  
**Prep:** Record using `03-demo-video-script.md`, upload (YouTube/Loom/etc.), paste URL.

---

## First & Last Name

**FIELD:** First & Last Name  
**VALUE:** `<<< YOUR LEGAL NAME >>>`  
**CHARACTER LIMIT:** not specified  
**Note:** *Potentially packaging-only* (personal)

---

## Email

**FIELD:** Email  
**VALUE:** `<<< YOUR CONTACT EMAIL >>>`  
**CHARACTER LIMIT:** not specified  
**Note:** *Potentially packaging-only* (personal)

---

## Telegram ID

**FIELD:** Telegram ID  
**VALUE:** `<<< optional >>>`  
**CHARACTER LIMIT:** not specified  

---

## X / Twitter

**FIELD:** X / Twitter  
**VALUE:** `<<< optional >>>`  
**CHARACTER LIMIT:** not specified  

---

## LinkedIn

**FIELD:** LinkedIn  
**VALUE:** `<<< optional >>>`  
**CHARACTER LIMIT:** not specified  

---

## Resume

**FIELD:** Resume  
**VALUE:** `<<< optional PDF URL >>>`  
**CHARACTER LIMIT:** not specified 

---

## Short Bio

**FIELD:** Short Bio  
**VALUE:**

```text
Builder working on Creditcoin / Attestcoin applications. Built FreezeWire: Attestcoin-proven Circle USDC blacklist inheritance into CC3 gated credit, with permissionless submitProof and no eligibility oracle. Focused on honest demos, on-chain evidence, and clear trust boundaries between precompile verification and consumer checks.
```

**CHARACTER LIMIT:** not specified  
**Note:** Edit to match your personal voice; keep factual.

---

## Role within the team

**FIELD:** Role within the team  
**VALUE:** Solo founder / engineer  
**CHARACTER LIMIT:** not specified  
**Note:** Adjust if your team structure differs.

---

## Country of Residence

**FIELD:** Country of Residence  
**VALUE:** `<<< YOUR COUNTRY OF RESIDENCE >>>`  
**CHARACTER LIMIT:** not specified  
**Note:** *Potentially packaging-only* (personal)

---

## Country of Citizenship

**FIELD:** Country of Citizenship  
**VALUE:** `<<< YOUR COUNTRY OF CITIZENSHIP >>>`  
**CHARACTER LIMIT:** not specified  
**Note:** *Potentially packaging-only* (personal)

---

## Optional supporting description (extra paste block)

**FIELD:** *(optional freeform notes)*  
**VALUE:**

```text
Live CC3 testnet (102031): BlacklistVerifier 0x6bf238291Bb8262918A1989831856DC6BC47D869 · EligibilityLedger 0xde64d5037cA820D4aDFa703C4FaF5451be840C9d · GatedCreditLine 0xB04fFca20e0a992474E6AD501A061973dC9Ed340.

Demo honesty: featured account 0xe05F… is already RESTRICTED from prior permissionless submitProof; eligible actor 0x6b0745… shows the “before” path. Do not interpret default ELIGIBLE as proven clean.

Public evidence: deployments/demo-evidence-public.json · deployments/demo-proof-public.json
```

**CHARACTER LIMIT:** not specified
