# Competitive / product positioning

**Sources:** `docs/COMPETITIVE_POSITIONING.md` (repo); public descriptions of peer products Corolary, Remitcredit, Riya, Aniwere, Handshake (notes ~2026-09-10).  
**Rule:** No superiority claims. Describe **observable differences** only. FreezeWire facts from this repo’s public evidence.

**Memorize:** *CEL freezes the instrument; FreezeWire freezes the counterparty — only after Attestcoin proves the Ethereum fact.*

---

## FreezeWire (this product)

| Dimension | Observable claim |
|---|---|
| Object | Address-level **counterparty** restriction |
| Source fact | Real Ethereum **mainnet** Circle USDC `Blacklisted` |
| Trust primitive | Attestcoin proof → BlockProver `0x0FD2` + consumer checks |
| Proof path | Permissionless `submitProof`; **no** eligibility setter/oracle |
| Consequence | On-chain `RESTRICTED` → `GatedCreditLine` draw reverts (`Restricted()` / `0xccc08913`) |
| Exits | Repay / unused withdraw remain allowed |
| Venue | Creditcoin CC3 testnet `102031`, chainKey `3` |

---

## Peer comparison (public positioning)

### Corolary

| | Corolary (public positioning) | FreezeWire |
|---|---|---|
| Goal | Prove Ethereum **lending history** (and related facts) to improve **collateral efficiency** (still over-collateralized) | Inherit a **compliance flag**; deny new credit |
| Attestcoin role | Core product spine for history/oracle answers | Core spine for Circle blacklist inclusion |
| Output | Better borrowing terms / efficiency narrative | `RESTRICTED` eligibility + gated draw |
| Difference | Solvency / reputation | Counterparty compliance |

**Talking point:** Scoring products are common; compliance inheritance is a different CEIP story.

---

### Remitcredit

| | Remitcredit (public positioning) | FreezeWire |
|---|---|---|
| Goal | Remittance → on-chain **credit line** origination narrative | **Restrict** credit after proven blacklist |
| Verb | Enable / originate credit from remittance proofs | Disable new draw from compliance proofs |
| Difference | Credit formation from remittance flow | Credit refusal from Circle control-plane event |

Do not claim knowledge of Remitcredit’s internal security model beyond publicly stated positioning.

---

### Riya

| | Riya (public positioning) | FreezeWire |
|---|---|---|
| Goal | Cross-chain **self-repaying loan** via attested Aave yield | Gate credit on Circle blacklist |
| Source signal | Yield / repayment mechanics on attested positions | Issuer `Blacklisted` on USDC |
| Difference | Productive loan loop | Compliance gate |

---

### Aniwere

| | Aniwere (public positioning) | FreezeWire |
|---|---|---|
| Goal | Insurance **payouts** on proven liquidations | Credit **restriction** on proven blacklist |
| Economic action | Pay when proven condition hits | Refuse draw when proven condition hits |
| Difference | Coverage / claims | Lending access control |

---

### Handshake

| | Handshake (public positioning) | FreezeWire |
|---|---|---|
| Goal | Cross-chain **DvP** settlement (two-lock) | Readability-only compliance inheritance |
| Writability | DvP designs often need writeback; prior field notes warn operator-signed Ethereum release as a cheat pattern | **Refuse** writability cheat; readability only (ADR-0009) |
| Difference | Settlement coordination | Eligibility gate |

FreezeWire does **not** do DvP.

---

## CEL (conceptual — completeness bar, not “we beat them”)

| | CEL | FreezeWire |
|---|---|---|
| Primary key | **Asset / instrument** | **Address / counterparty** |
| Typical event family | Issuer **pause / restore** | Circle **Blacklisted / UnBlacklisted** |
| Gate | New lending against ineligible **instrument** | New credit to ineligible **address** |
| Shared pattern | Attestcoin proof, consumer checks, no owner-write eligibility, never-gate-exits class | Same class of spine |
| Honest stance | Acknowledge CEL as a mature completeness-bar pattern | Differentiate on **object** + live Circle blacklist consequence; **do not** claim more polish/tests overall |

**Objection:** “Isn’t this CEL with a different event?”  
**Answer:** Same Attestcoin spine family; different economic gate. The dollar can still exist; **new credit to that address** cannot after proof.

---

## What FreezeWire does **not** claim vs peers

- Not “deeper Attestcoin than everyone” without side-by-side audit of each repo.
- Not “more production-ready.”
- Not better dashboards / packaging than ChargeProof-class completeness bars.
- Not that Remitcredit/Riya/Aniwere/Handshake lack Attestcoin — several are Attestcoin-themed DeFi builds; differentiation is **problem object**, not shared use of the precompile.

---

## One-sentence field map

| Project | One sentence |
|---|---|
| FreezeWire | Prove Circle blacklist → restrict counterparty credit on CTC |
| CEL | Prove instrument pause → restrict asset eligibility |
| Corolary | Prove lending history → improve collateral efficiency |
| Remitcredit | Remittance proofs → credit line narrative |
| Riya | Attested yield → self-repaying loan narrative |
| Aniwere | Proven liquidation → insurance payout |
| Handshake | Cross-chain DvP settlement |
