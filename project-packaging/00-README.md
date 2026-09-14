# FreezeWire — Project docs index

**Engineering status:** **FROZEN**  
**Workspace:** `/Users/priyanshujha/Projects/freeze-wire`  
**Public GitHub:** https://github.com/CodewithJha/freeze-wire  
**This folder:** project packaging docs (whitepaper, demo script, Q&A, evidence). No application code was modified here.

---

## File index

| File | Purpose |
|---|---|
| [01-project-fields.md](./01-project-fields.md) | Project description / metadata paste blocks (*Potentially packaging-only* personal sections) |
| [02-pitch-deck.md](./02-pitch-deck.md) | 10-slide deck copy (export PDF yourself) |
| [03-demo-video-script.md](./03-demo-video-script.md) | ~3 min timestamped demo script (honest already-RESTRICTED B) |
| [04-faq.md](./04-faq.md) | Technical FAQ (20 Q&A) |
| [05-competitive-positioning.md](./05-competitive-positioning.md) | Product differentiation vs peers + CEL |
| [06-evidence-table.md](./06-evidence-table.md) | Evidence verification table + notes |
| [07-packaging-checklist.md](./07-packaging-checklist.md) | *Potentially packaging-only* hosting checklist |
| [00-README.md](./00-README.md) | This index |
| [FreezeWire_Whitepaper.pdf](./FreezeWire_Whitepaper.pdf) | Primary whitepaper PDF (13 pp) |
| [FreezeWire_Whitepaper.md](./FreezeWire_Whitepaper.md) | Editable summary companion |
| [whitepaper/](./whitepaper/) | HTML source + fonts + FE screenshot used to render PDF |

---

## ENGINEERING STATUS

**FROZEN**

- No code, contracts, deployment, frontend, backend, config, README, or git history changes in this prep.
- No commits. No redeploy. No product “improvements.”

---

## MATERIALS STATUS

| Material | Status |
|---|---|
| GitHub | **READY** — https://github.com/CodewithJha/freeze-wire |
| README | **READY** |
| CC3 deployment | **READY** — chainId `102031`; public addresses in README / `demo-evidence-public.json` |
| Attestcoin evidence | **READY** — docs + public JSONs; chainKey `3`; BlockProver `0x0FD2` |
| Project description | **PREPARED** — `01-project-fields.md` |
| Attestcoin summary | **PREPARED** — `01-project-fields.md` (+ repo `docs/ATTESTCOIN_INTEGRATION_SUMMARY.md`) |
| Pitch deck | **PREPARED (markdown)** — `02-pitch-deck.md` · **PDF URL NOT HOSTED** |
| Demo video | **SCRIPT READY** — `03-demo-video-script.md` · **NOT RECORDED** |
| Whitepaper | **READY** — `FreezeWire_Whitepaper.pdf` / `.md` |

---

## Key values

| Field | Value |
|---|---|
| Project Name | **FreezeWire** |
| Sector | **DeFi** |
| GitHub | **https://github.com/CodewithJha/freeze-wire** |

---

## Evidence verification result

**Core hashes/addresses/chainId/chainKey/Restricted selector:** consistent across committed `deployments/demo-*-public.json`, README, and Attestcoin docs.

**Non-blocking notes (not fixed under freeze):**
- Full `deployments/cc3-testnet.json` is gitignored; verifiers use README + `*-public.json`.
- `deployBlock` is in README/docs but not in `demo-evidence-public.json` (values agree where present).
- `PRODUCT.md` “APIs are authoritative” wording is ambiguous vs security model (UI honesty vs eligibility authority).
- Deck PDF URL + demo video URL still missing (human hosting).

Details: [06-evidence-table.md](./06-evidence-table.md).

---

## OPTIONAL HUMAN FOLLOW-UPS

1. **Export** `02-pitch-deck.md` → PDF → **host** publicly if needed.  
2. **Record** demo from `03-demo-video-script.md` (~3 min; already-RESTRICTED B honesty) → **upload** if needed.  
3. Reuse paste blocks from `01-project-fields.md` for project descriptions / metadata.  
4. Keep engineering freeze unless a true blocker appears.

---

## NOTE

Use Attestcoin depth story (`0x0FD2` vs consumer checks + removal test) in deck/video; stay honest that account B is already RESTRICTED.
