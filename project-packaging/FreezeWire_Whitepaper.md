# FreezeWire — Technical Whitepaper

**DeFi · Creditcoin CC3**  
**Tagline:** Prove the event. Enforce the outcome.  
**Status:** LIVE on Creditcoin CC3 **testnet** (chainId `102031`) — **not** mainnet production  
**Primary PDF:** [`FreezeWire_Whitepaper.pdf`](./FreezeWire_Whitepaper.pdf)  
**HTML source (renders PDF):** [`whitepaper/whitepaper.html`](./whitepaper/whitepaper.html)

> **“The backend never told Creditcoin the address was blacklisted. The Attestcoin proof did.”**

---

## Live links (verified 2026-09-13)

| Resource | URL |
|---|---|
| Frontend (Vercel) | https://frontend-bice-pi-49.vercel.app |
| Backend (Render) | https://freezewire-backend.onrender.com |
| Health | https://freezewire-backend.onrender.com/v1/health |
| GitHub | https://github.com/CodewithJha/freeze-wire |
| ETH source tx | https://etherscan.io/tx/0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787 |
| CC3 submitProof | https://creditcoin-testnet.blockscout.com/tx/0x07e30451fb38776aa972603e94aeb8f779f182a5047a371195df2d598a4dfc45 |

**Architecture:** Browser → Vercel → Render → Ethereum / Proof Builder / Creditcoin CC3  
**Mac-independent:** no localhost / Cloudflare Quick Tunnel required for the public path.

---

## 01 — Executive summary

Creditcoin cannot natively read Ethereum logs. FreezeWire inherits Circle USDC **address** `Blacklisted` / `UnBlacklisted` facts into CC3 gated credit **without** a backend eligibility oracle.

```text
ETH Mainnet → USDC Blacklisted → Attestcoin proof → 0x0FD2
  → consumer checks → EligibilityLedger → RESTRICTED → draw reverts
```

No `setStatus` / `setRestricted`. Worker/UI = untrusted transport.

---

## 02–03 — Problem & Attestcoin load-bearing

**Oracle trap:** `setRestricted` makes one key the compliance oracle.  
**Desired property:** Restricted only after cryptographic proof + independent consumer verification.

**Removal test:** If Attestcoin / BlockProver `0x0FD2` is removed, FreezeWire cannot move an address to `RESTRICTED` — no owner setter, eligibility DB, or worker privilege invents Circle’s blacklist.

**`0x0FD2` proves:** inclusion + continuity.  
**Does not prove:** receipt success, emitter, topic, account (FreezeWire consumer checks).

---

## 04–05 — Live evidence & contracts

| Field | Value |
|---|---|
| ETH tx | `0xc9edfdbb…ff787` · block `25705174` · txIndex `18` |
| Account B | `0xe05F529f5284D75624eBa386CB716928c3b54A2A` → `RESTRICTED` |
| USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` (constructor-immutable) |
| chainKey | `3` (ETH mainnet on CC3 testnet; ≠ EVM chainId) |
| submitProof | `0x07e30451…dfc45` |
| draw as B | reverts `Restricted()` · selector `0xccc08913` |
| Actor A | `0x6b07454d70896cad371982A57037933e24F4cD52` (eligible demo path) |
| Deploy block | `5479278` · LTV `5000` · window `(0,0)` unbounded (disclosed) |

| Contract | Address |
|---|---|
| BlacklistVerifier | `0x6bf238291Bb8262918A1989831856DC6BC47D869` |
| EligibilityLedger | `0xde64d5037cA820D4aDFa703C4FaF5451be840C9d` |
| GatedCreditLine | `0xB04fFca20e0a992474E6AD501A061973dC9Ed340` |
| MockUSD | `0x6943EB32EAb562791f095E91ee288627ADDdC5B3` (demo ERC-20 — **not** Circle USDC) |

**Demo honesty:** B is already RESTRICTED from prior permissionless `submitProof`. A shows “before.” Default unset = ELIGIBLE is fail-open — not “proven clean.”

---

## 06 — Public application & API

- `GET /v1/health` · `GET /v1/evidence/demo` · `GET /v1/prove/{tx}` · `GET /v1/status/{address}` · `POST /v1/relay`
- Without relay key → **`404 RELAY_DISABLED` + `submitProof` calldata** (security property, verified live).

---

## 07–08 — Architecture & contracts

Three-contract separation (ADR-0003): Verifier (no storage) · Ledger (only eligibility writer, permissionless `submitProof`) · GatedCreditLine (consumes `statusOf`, no Attestcoin logic).

**5-stage spine:** Inclusion (`0x0FD2`) → Status → Emitter → Event → Account.

---

## 09–10 — Security & replay (ADR-0017 Model A)

```text
key = keccak256(abi.encodePacked(chainKey, height, recoveredTxIndex))
```

Caller-supplied txIndex ignored; recovered from Merkle `isLeft` bits.  
Model A: after successful verify + `receiptStatus==1` scan, mark processed; no canonical match → `ProcessedWithoutFact` return (no revert). Failed verify/status does not mark replay.

---

## 11–12 — Decoder, backend, frontend, credit enforcement

- Vendored Gluwa `EvmV1Decoder`; log order / `logIndex` preserved.
- Backend: Node ≥20, TypeScript, viem, zod, `@gluwa/usc-sdk` — transport only.
- Frontend: React 19, Vite, Tailwind 4, viem, R3F — honesty states; no success before chain confirm.
- Restricted: draw / protected transfer / escrow extract revert; repay / unused withdraw / deposit allowed.

---

## 13–14 — Tests & threat/trust (verified 2026-09-13)

| Suite | Result |
|---|---|
| Foundry | **95 passed**, 0 failed, **1 skipped** |
| Backend | **46 passed** |
| Frontend Vitest | **17 passed** |
| Frontend build | PASS |

**Trusted:** ETH / Attestcoin / CC3 consensus, immutable USDC, contract logic.  
**Untrusted:** FE, backend, relayer, user input, caches, RPC until on-chain verify.

---

## 15–17 — Oracle comparison, product, differentiation

CEL freezes the **instrument**; FreezeWire freezes the **counterparty** — only after Attestcoin proves the Ethereum fact. Not a scoring product (Corolary-class); not lock-to-lend.

---

## 18–19 — Reproducibility & repo

```bash
git clone https://github.com/CodewithJha/freeze-wire.git
cp .env.example .env   # public RPCs/addresses only — never commit secrets
forge test
cd backend && npm ci && npm test && npm run build && npm start
cd frontend && npm ci && npm test && npm run build && npm run dev
```

Prefer live Vercel + Render for verification.

```text
freeze-wire/{contracts,backend,frontend,deployments,docs,config,scripts,project-packaging}
```

---

## 20–22 — Deployment verification, limitations, roadmap

Verified: FE 200, health 200 (cc3/eth/PB), CORS, explorers, `statusOf` RESTRICTED, `RELAY_DISABLED` + calldata.

**Limitations (honest):** CC3 testnet only; window `(0,0)`; owner chainKey/window residual; MockUSD ≠ Circle; already-RESTRICTED demo choreography; no audit claim.

**Roadmap (not shipped):** bounded windows → more facts/chains. Out of scope: eligibility DB, writability-as-authority, rotatable emitter.

---

## 23–24 — Evidence-backed summary

Meaningful Attestcoin depth · real mainnet Circle event · live CC3 Restricted + draw reject · no setter · Mac-independent public stack · verified tests · clear CEL differentiation · disclosed residuals.

---

## Regenerating the PDF

```bash
node project-packaging/whitepaper/render-pdf.mjs
# or:
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=project-packaging/FreezeWire_Whitepaper.pdf \
  "file://$PWD/project-packaging/whitepaper/whitepaper.html"
# then stamp page numbers via render-pdf.mjs / pymupdf
```

Fonts are vendored under `whitepaper/assets/` for offline print. Accent `#D6FF3F`. Layout uses a `.pad` wrapper (~9.5% L/R) so Chrome print keeps dark inset margins.
