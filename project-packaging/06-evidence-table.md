# Evidence verification table

**Method:** Read-only inspection of repo artifacts. Labels: **VERIFIED** (consistent across cited sources), **MISMATCH / NOTE** (report only — do not fix under freeze).  
**Public GitHub:** https://github.com/CodewithJha/freeze-wire  

Explorer bases used below:
- Etherscan: `https://etherscan.io/tx/{hash}`
- Blockscout CC3 testnet: `https://creditcoin-testnet.blockscout.com/tx/{hash}`
- GitHub raw: `https://raw.githubusercontent.com/CodewithJha/freeze-wire/master/{path}`

---

## Evidence table

| Evidence | Value | Source in repo | Public URL if available | Verified? |
|---|---|---|---|---|
| GitHub URL | `https://github.com/CodewithJha/freeze-wire` | README quickstart | https://github.com/CodewithJha/freeze-wire | **VERIFIED** (HTTP 200) |
| README present | Yes (root `README.md`) | `/README.md` | https://github.com/CodewithJha/freeze-wire/blob/master/README.md | **VERIFIED** |
| Network / chainId | Creditcoin CC3 testnet `102031` | `deployments/demo-evidence-public.json`; README; ATTESTCOIN_EVIDENCE | Public JSON on GitHub | **VERIFIED** (JSON ↔ README ↔ docs) |
| Attestcoin chainKey (ETH mainnet on CC3 testnet) | `3` | demo-evidence `prove.chainKey`; demo-proof-public; ATTESTCOIN_INTEGRATION_SUMMARY; README | Public JSONs | **VERIFIED** |
| BlockProver | `0x0000000000000000000000000000000000000FD2` | README; ATTESTCOIN_*; local `cc3-testnet.json` | Documented in README/docs (protocol address) | **VERIFIED** in docs/README; also in **local** `deployments/cc3-testnet.json` (**gitignored** — see notes) |
| Deploy block | `5479278` | README; ATTESTCOIN_EVIDENCE; ATTESTCOIN_INTEGRATION_SUMMARY; local `cc3-testnet.json` | Stated in README (not inside `demo-evidence-public.json`) | **VERIFIED** across README + Attestcoin docs + local registry; **NOTE:** not duplicated in committed `demo-evidence-public.json` |
| Proof window | `minHeight=0`, `maxHeight=0` (unbounded) | README; ATTESTCOIN_*; local `cc3-testnet.json` | README disclosure | **VERIFIED** (disclosed residual) |
| Circle USDC (source) | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | README; ATTESTCOIN_*; local `cc3-testnet.json` `sourceUsdc` | README | **VERIFIED** |
| MockUSD | `0x6943EB32EAb562791f095E91ee288627ADDdC5B3` | demo-evidence-public `addresses.mockUsd`; README | Public JSON | **VERIFIED** |
| BlacklistVerifier | `0x6bf238291Bb8262918A1989831856DC6BC47D869` | demo-evidence-public; README; ATTESTCOIN_* | Public JSON | **VERIFIED** |
| EligibilityLedger | `0xde64d5037cA820D4aDFa703C4FaF5451be840C9d` | demo-evidence-public; README; ATTESTCOIN_* | Public JSON | **VERIFIED** |
| GatedCreditLine | `0xB04fFca20e0a992474E6AD501A061973dC9Ed340` | demo-evidence-public; README; ATTESTCOIN_* | Public JSON | **VERIFIED** |
| Demo ETH source tx | `0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787` | demo-evidence-public; demo-proof-public; README; DEMO_* | https://etherscan.io/tx/0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787 | **VERIFIED** (same hash in both public JSONs + README) |
| ETH header / block | `25705174` | demo-evidence `prove.headerNumber`; demo-proof-public; DEMO_SPEC | Public JSONs | **VERIFIED** |
| txIndex | `18` | demo-evidence; demo-proof-public; ATTESTCOIN_EVIDENCE | Public JSONs | **VERIFIED** |
| Proof sibling / continuity counts | siblings `9`; continuity roots `27` | demo-evidence; demo-proof-public; ATTESTCOIN_INTEGRATION_SUMMARY | Public JSONs | **VERIFIED** |
| submitProof tx | `0x07e30451fb38776aa972603e94aeb8f779f182a5047a371195df2d598a4dfc45` | demo-evidence-public; README; DEMO_* | https://creditcoin-testnet.blockscout.com/tx/0x07e30451fb38776aa972603e94aeb8f779f182a5047a371195df2d598a4dfc45 | **VERIFIED** |
| submitProofStatus | `success` | demo-evidence-public | Public JSON | **VERIFIED** (artifact claim) |
| Restricted account (B) | `0xe05F529f5284D75624eBa386CB716928c3b54A2A` | demo-evidence `demoAccount`; README; DEMO_* | Public JSON | **VERIFIED** |
| statusOf(B) | `RESTRICTED` | demo-evidence-public; README; DEMO_SPEC | Public JSON | **VERIFIED** (artifact); docs state already-RESTRICTED for demo honesty |
| Eligible actor (A) | `0x6b07454d70896cad371982A57037933e24F4cD52` | demo-evidence `eligibleActor`; README; DEMO_* | Public JSON | **VERIFIED** |
| Restricted() selector | `0xccc08913` | demo-evidence `drawAsRestricted.message`; ATTESTCOIN_EVIDENCE (`cast sig`) | Public JSON | **VERIFIED** |
| Draw as restricted | `reverted: true` with signature `0xccc08913` | demo-evidence-public | Public JSON | **VERIFIED** (artifact) |
| Public evidence JSON | `deployments/demo-evidence-public.json` | tracked in git (`git ls-files`) | https://github.com/CodewithJha/freeze-wire/blob/master/deployments/demo-evidence-public.json | **VERIFIED** committed |
| Public proof JSON | `deployments/demo-proof-public.json` | tracked in git | https://github.com/CodewithJha/freeze-wire/blob/master/deployments/demo-proof-public.json | **VERIFIED** committed |
| Attestcoin integration summary | `docs/ATTESTCOIN_INTEGRATION_SUMMARY.md` | docs/ | https://raw.githubusercontent.com/CodewithJha/freeze-wire/master/docs/ATTESTCOIN_INTEGRATION_SUMMARY.md | **VERIFIED** (HTTP 200) |
| Attestcoin evidence doc | `docs/ATTESTCOIN_EVIDENCE.md` | docs/ | GitHub blob | **VERIFIED** present |
| Security evidence matrix | `docs/SECURITY_EVIDENCE.md` | docs/ | GitHub blob | **VERIFIED** present |
| Competitive positioning doc | `docs/COMPETITIVE_POSITIONING.md` | docs/ | GitHub blob | **VERIFIED** present |
| Demo runbook / spec | `docs/DEMO_RUNBOOK.md`, `docs/DEMO_SPECIFICATION.md` | docs/ | GitHub blob | **VERIFIED** present |

---

## Cross-check: public JSON ↔ local registry

Local `deployments/cc3-testnet.json` (present on this machine):

| Field | demo-evidence-public | local cc3-testnet.json | Match? |
|---|---|---|---|
| chainId | `102031` | `102031` | Yes |
| addresses.* | four contracts | same four | Yes |
| attestcoinChainKey / prove.chainKey | `3` | `3` | Yes |
| BlockProver | (via docs/README) | `0x…0FD2` | Yes (docs align) |

---

## Mismatches / notes (report only — freeze: do not fix)

1. **`deployments/cc3-testnet.json` is gitignored** (pattern `deployments/*.json`) while `demo-*-public.json` are force-tracked. External verifiers **cannot** fetch the full local registry from GitHub; they must use README + `*-public.json`. Deploy block / BlockProver / window appear in README/docs, not all in the public evidence JSON. **Not a value contradiction** — a **packaging asymmetry**.

2. **`deployBlock` `5479278` is absent from `demo-evidence-public.json`** but present in README + ATTESTCOIN docs + local registry. Values agree where stated; public evidence JSON is incomplete relative to README table.

3. **`PRODUCT.md` wording:** “App state and APIs are authoritative.” In context this means **do not fabricate UI state**, but it can be misread as “API authorizes eligibility,” which contradicts SECURITY_MODEL / README (contracts are eligibility authority). **Ambiguous wording mismatch** vs security docs — reported only.

4. **`docs/CONSISTENCY_AUDIT.md`** still contains a **historical** row that once said git remote was empty; the same file later marks public GitHub as FACT. Treat older “empty remote” sentence as historical, not current.

5. **No hosted deck PDF URL or demo video URL** exists in the repo (expected gap; human host).

6. **Live on-chain re-verification of Blockscout/Etherscan** was not re-executed in this prep pass beyond prior artifacts + GitHub HTTP checks. Artifact-internal consistency: **pass**.

---

## Evidence verification result (summary)

| Area | Result |
|---|---|
| Core addresses / txs / chainId / chainKey / Restricted selector | **Consistent** across committed public JSONs + README + Attestcoin docs |
| Blocking contradictions in evidence-critical hashes | **None found** |
| Non-blocking notes | gitignored full registry; deployBlock not in public evidence JSON; PRODUCT.md authority wording ambiguity; missing PDF/video URLs (human) |
