# FreezeWire

**Prove the event. Enforce the outcome.**

FreezeWire turns a real Ethereum Circle USDC `Blacklisted` / `UnBlacklisted` event into a cryptographically verified eligibility state on Creditcoin CC3. An Attestcoin inclusion and continuity proof is checked on-chain at BlockProver `0x0FD2`; FreezeWire consumer contracts then bind the account and gate credit behavior. The backend discovers and relays proofs — it is not the compliance oracle.

open-source Creditcoin project · Creditcoin CC3 · Attestcoin readability · MIT

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://img.shields.io/badge/CI-Foundry%20%7C%20Worker%20%7C%20Frontend-0B3D2E.svg)](.github/workflows/ci.yml)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.23-363636.svg)](foundry.toml)
[![TypeScript](https://img.shields.io/badge/TypeScript-React%20%2B%20Node-3178C6.svg)](frontend/package.json)

---

## The problem

Creditcoin contracts cannot treat an Ethereum log as authoritative by reading another chain. Address-level compliance facts — for example Circle USDC marking an address `Blacklisted` — only affect Creditcoin if something carries them across.

A worker or indexer that simply asserts “this address is restricted” is not enough: that server becomes the oracle. If it lies, lags, or goes offline, Creditcoin credit state drifts from Circle’s source of truth. FreezeWire exists so eligibility changes require a verified Attestcoin proof of a canonical USDC event, not an application API claim.

---

## The solution

**Ethereum event → Attestcoin proof → on-chain verification → Creditcoin eligibility → gated credit**

FreezeWire pins a real Ethereum mainnet USDC blacklist transaction, asks Attestcoin Proof Builder for a Merkle + continuity bundle, and submits that bundle to Creditcoin. `BlacklistVerifier` requires BlockProver success plus consumer checks the precompile does not perform. Only then does `EligibilityLedger` write `ELIGIBLE` or `RESTRICTED`, which `GatedCreditLine` enforces.

There is no `setRestricted` / `setStatus` path. `submitProof` is permissionless. The worker and UI sit outside the trust boundary for eligibility writes.

This is not CEL. CEL pauses an *instrument*. FreezeWire gates a *counterparty*.

---

## How it works

```text
Ethereum Mainnet
      ↓
Circle USDC Blacklisted / UnBlacklisted event
      ↓
Attestcoin Proof Builder
      ↓
BlacklistVerifier
      ↓
BlockProver / native verification (0x0FD2)
      ↓
EligibilityLedger
      ↓
GatedCreditLine
      ↓
ALLOW / RESTRICT
```

1. **Source event** — Circle FiatToken on Ethereum emits `Blacklisted(address)` or `UnBlacklisted(address)`. Demo evidence is a pinned mainnet receipt, not a mock log.
2. **Proof Builder** — Hosted Attestcoin service returns inclusion and continuity material for `(chainKey, height, tx)` (CC3 testnet Ethereum mainnet `chainKey = 3`).
3. **BlacklistVerifier** — Calls `verifyAndEmit` on the injected native verifier, recovers `txIndex` from the Merkle path, requires receipt status success, and binds only constructor-immutable USDC emitter + matching event topics.
4. **EligibilityLedger** — Permissionless `submitProof` applies bound events to `statusOf`: `RESTRICTED` or restored `ELIGIBLE`. Replay key `(chainKey, height, txIndex)` can write once.
5. **GatedCreditLine** — Reads the ledger on each protected call. Restricted accounts cannot draw, protected-transfer, or lock/release escrow; they can still repay and withdraw unused collateral. Demo asset is `MockUSD` (not Circle reserves).

---

## Why Attestcoin matters

Attestcoin is the load-bearing bridge: it lets Creditcoin verify that a specific Ethereum transaction is included under attested history, instead of trusting FreezeWire’s server to narrate the blacklist.

**The backend submits evidence; Creditcoin contracts decide whether the evidence is valid.**

A forged or mismatched bundle fails `0x0FD2` or FreezeWire’s binder checks. Proof Builder provides liveness; it does not authorize eligibility. FreezeWire uses Attestcoin **readability** for this demo (inbound proofs), not writability features.

---

## Security / trust model

| Component | Trust |
|---|---|
| Ethereum USDC event | Source fact |
| Attestcoin proof + BlockProver | Cryptographic evidence / verification |
| Backend worker | Untrusted transport / discovery / optional gas relay |
| Frontend | Presentation only |
| `BlacklistVerifier` | Validates proof + canonical event binding |
| `EligibilityLedger` | Persistent eligibility |
| `GatedCreditLine` | Access policy enforcement |
| Creditcoin validators / Attestcoin attestors / Circle FiatToken | Remaining protocol trust |

**Implemented protections** (contracts + tests; see `docs/SECURITY_MODEL.md`):

- Immutable canonical USDC `expectedEmitter` (owner cannot rotate the token identity)
- Canonical `Blacklisted` / `UnBlacklisted` topic matching; decoy emitters skipped
- Receipt status must succeed (`SourceTxFailed` otherwise)
- `txIndex` derived from the Merkle path; wrong `chainKey` rejected
- Inclusive height window (`setWindow`; `0,0` = unbounded)
- Replay protection on `(chainKey, height, txIndex)`; multi-log binding with strictly-newer ordering per account
- No backend or owner `setStatus`; permissionless `submitProof`; relayer pays gas only
- Selective financial enforcement (draw/escrow gated; repay/unused withdraw open)

Honest limits: default `ELIGIBLE` is Circle’s model until proven otherwise — not a cleanliness certificate. Attestation lag gates *new* credit after a proof lands, not same-block CTC activity. Discovery may miss events; it must not invent them.

---

## The demo

Judge path (~150s). Full script: [`docs/DEMO_SPECIFICATION.md`](docs/DEMO_SPECIFICATION.md).

**Pinned Ethereum evidence (verified receipt):**

| Field | Value |
|---|---|
| Tx | [`0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787`](https://etherscan.io/tx/0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787) |
| Block | `25705174` · txIndex `18` |
| USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Account | `0xe05F529f5284D75624eBa386CB716928c3b54A2A` |
| Method | `blacklist` → `Blacklisted` |

**Story**

1. Account reads `ELIGIBLE` before a ledger write (default ≠ proven clean).
2. Load the real mainnet blacklist tx (explorer + `GET /v1/evidence/demo`).
3. Fetch Attestcoin proof (`GET /v1/prove/{txHash}`).
4. Verify inclusion · status · emitter · event · account (then window, replay, decoys skipped).
5. Submit `submitProof` (`POST /v1/relay` or wallet calldata) once contracts are deployed and funded.
6. Ledger emits `Restricted` → status `RESTRICTED`.
7. Protected draw / transfer / escrow lock·release revert; repay and unused withdraw remain available.
8. A later verified `UnBlacklisted` proof can restore `ELIGIBLE` when that real event is submitted.

**What works today without CC3 deploy:** contract unit/adversarial tests, worker health / discover / prove against live Proof Builder (optional `LIVE_ATTESTCOIN=1`), and the frontend demo loop against the worker. **On-chain `Restricted` + live credit gating** require Phase 8: funded CC3 deployer, deployed addresses in env, and (for server relay) `RELAY_PRIVATE_KEY` + `LEDGER_ADDRESS`. Until then the UI stays honest — empty `VITE_*` addresses mean chain writes are not claimed.

Worker surface: `/v1/health`, `/v1/evidence/demo`, `/v1/discover`, `/v1/prove/{tx}`, `/v1/relay`, `/v1/status/{address}`.

---

## Architecture

```text
                ┌─────────────────────┐
                │   Ethereum Mainnet  │
                │   Circle USDC       │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ Attestcoin Proof    │
                │ Builder             │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ BlacklistVerifier   │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ EligibilityLedger   │
                └──────────┬──────────┘
                           │
                           ▼
                ┌─────────────────────┐
                │ GatedCreditLine     │
                │ (+ MockUSD)         │
                └─────────────────────┘

Backend: discovery / proof retrieval / optional relay / HTTP API
Frontend: demonstration and visualization only
```

- **Solidity** — Verification boundary, eligibility store, gated credit, demo ERC-20.
- **Backend** — TypeScript worker: config, Ethereum discovery, Proof Builder client (`@gluwa/usc-sdk` / HTTP), CC3 `eth_call` / broadcast helpers. Stateless; no eligibility database.
- **Frontend** — React demo workspace: evidence → proof → status → access matrix, with a Three.js Bitcoin hero for presentation.

Target chain: Creditcoin **CC3 testnet** (chain id **102031**).

---

## Repository structure

```text
freeze-wire/
├── contracts/            Solidity sources, Foundry tests, Phase 8 scripts/
├── backend/              Readability worker (HTTP API)
├── frontend/             Demo UI + public/models (3D asset + attribution)
├── config/               Network / deployment examples
├── docs/                 PRD, architecture, security, demo, ADRs
├── scripts/              Ops helpers
├── tests/                Cross-cutting notes / future e2e
├── .github/workflows/    CI (forge + worker + frontend)
├── foundry.toml          Foundry root config (src/test under contracts/)
├── .env.example          Placeholders only
├── LICENSE               MIT
└── README.md
```

---

## Tech stack

| Layer | Stack |
|---|---|
| Contracts | Solidity **0.8.23**, Foundry (`forge`, forge-std) |
| Attestcoin / CTC | BlockProver `0x0FD2`, CC3 Proof Builder, `@gluwa/usc-sdk` |
| Worker | Node ≥ 20, TypeScript, `viem`, `zod`, `dotenv` |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, Radix/shadcn primitives, Motion |
| 3D | Three.js, React Three Fiber / Drei |
| CI | GitHub Actions: `forge fmt/build/test`, worker `tsc` + tests, frontend build |

---

## Run locally

**Prerequisites:** Node.js ≥ 20, Foundry (`forge`), Git.

```bash
git clone <this-repo-url>
cd freeze-wire
cp .env.example .env
# Optional UI overrides:
cp frontend/.env.example frontend/.env
```

Fill post-deploy addresses and optional `RELAY_PRIVATE_KEY` / `DEPLOYER_PRIVATE_KEY` only after you deploy. Never commit `.env`.

**Contracts**

```bash
forge fmt --check && forge build && forge test
```

**Worker** (default `http://127.0.0.1:8000`)

```bash
cd backend && npm ci && npm run build && npm test
npm start
```

Optional live Attestcoin integration tests (not required for CI):

```bash
LIVE_ATTESTCOIN=1 npm test
# Funded relay broadcast (optional):
LIVE_ATTESTCOIN=1 LIVE_RELAY_BROADCAST=1 npm test
```

**Frontend** (`http://localhost:5173`)

```bash
cd frontend && npm ci && npm run dev
# Production bundle check:
npm run build
```

Point `VITE_API_BASE_URL` at the worker. Important env groups (see `.env.example`): `CC3_RPC_URL`, `ETH_RPC_URL`, `PROOF_BUILDER_URL`, `ATTESTCOIN_CHAIN_KEY`, `SOURCE_USDC_ADDRESS`, `DEMO_SOURCE_TX`, and after deploy `VERIFIER_ADDRESS` / `LEDGER_ADDRESS` / `CREDIT_LINE_ADDRESS` / `MOCK_USD_ADDRESS`. Network examples: `config/networks.example.json`.

---

## Verification / tests

Baseline verified in this repository:

| Suite | Result / command |
|---|---|
| Foundry | **92 passed, 0 failed, 1 skipped** (`forge test`) |
| Worker | **30 passed** (`cd backend && npm test`) |
| Frontend | Production build succeeds (`cd frontend && npm run build`) |

Contract coverage includes consumer checks, replay, immutable emitter, adversarial receipts, and selective credit/escrow enforcement (`T-SEC-*`, `T-FIN-*`, and related suites). The single Foundry skip is the gated live Attestcoin suite when not opted in. There is no formal verification claim. See [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md).

---

## Project documentation

| Document | Topic |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | Product intent |
| [`docs/SYSTEM_ARCHITECTURE.md`](docs/SYSTEM_ARCHITECTURE.md) | Component boundaries |
| [`docs/TECHNICAL_SPECIFICATION.md`](docs/TECHNICAL_SPECIFICATION.md) | Technical behavior |
| [`docs/SMART_CONTRACT_SPECIFICATION.md`](docs/SMART_CONTRACT_SPECIFICATION.md) | On-chain API |
| [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) | Invariants and trust |
| [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md) | Actors and abuse cases |
| [`docs/TEST_STRATEGY.md`](docs/TEST_STRATEGY.md) | Test map |
| [`docs/ATTESTCOIN_INTEGRATION.md`](docs/ATTESTCOIN_INTEGRATION.md) | chainKey, Proof Builder, precompile |
| [`docs/DEMO_SPECIFICATION.md`](docs/DEMO_SPECIFICATION.md) | Judge demo script |
| [`docs/DEVELOPMENT_PLAN.md`](docs/DEVELOPMENT_PLAN.md) | Phases and status |

API surface: [`docs/API_SPECIFICATION.md`](docs/API_SPECIFICATION.md). Decisions: [`docs/adr/`](docs/adr/).

---

## Limitations / current status

| Area | Status |
|---|---|
| Solidity protocol + Foundry suite | Implemented and locally verified |
| Worker HTTP API + unit tests | Implemented |
| Frontend demo workspace | Implemented |
| Live Proof Builder prove path | Optionally live-tested (`LIVE_ATTESTCOIN=1`) |
| CC3 deployment of verifier / ledger / credit line | **Script ready** — live broadcast blocked until funded `DEPLOYER_PRIVATE_KEY` (see `docs/DEPLOYMENT_PLAN.md`) |
| On-chain `Restricted` demo tx on Creditcoin | **Deployment-dependent** (`scripts/submit-demo-proof.mjs`) |
| Server-side `POST /v1/relay` broadcast | Needs `LEDGER_ADDRESS` + `RELAY_PRIVATE_KEY` (else calldata for a wallet) |
| CC3 mainnet / writability / Credal | Out of scope for this submission |

FreezeWire currently proves the verification and enforcement design end-to-end in tests, and the evidence → proof path against Attestcoin infrastructure. A public Creditcoin state change is honest only after addresses are deployed and a funded `submitProof` lands.

---

## Attribution

### Bitcoin 3D model (`frontend/public/models/bitcoin.glb`)

- **Author:** Taohid Animation
- **License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Details:** [`frontend/public/models/README.md`](frontend/public/models/README.md)

FreezeWire does not claim original authorship of this model. Materials and lighting are remapped in-app; the mesh and authored texture remain the original asset.

### Other

- Circle USDC / FiatToken event semantics (Ethereum) — compliance source referenced, not owned.
- Creditcoin / Attestcoin — BlockProver, Proof Builder, CC3 testnet.
- `forge-std` — vendored under `contracts/lib/`.

---

## License

MIT — see [`LICENSE`](LICENSE).
