# FreezeWire

**Proof-driven compliance gate for Creditcoin:** attested Circle USDC blacklist state on Ethereum becomes enforceable eligibility on CC3 — without trusting FreezeWire’s backend as an oracle.

open-source Creditcoin project · Creditcoin CC3 + Attestcoin readability.

---

## What FreezeWire Does

Circle can `blacklist` an address on Ethereum USDC. A Creditcoin credit line does not see that unless someone **tells** it. FreezeWire removes that someone as an authority:

1. **Discover** a real Ethereum USDC `Blacklisted` / `UnBlacklisted` transaction (demo uses a pinned mainnet tx).
2. **Prove** inclusion + continuity via Attestcoin Proof Builder.
3. **Verify** on Creditcoin at BlockProver (`0x0FD2`), then apply FreezeWire consumer checks the precompile does not do.
4. **Bind** the account from the verified log into `EligibilityLedger` → `ELIGIBLE` | `RESTRICTED`.
5. **Enforce** on `GatedCreditLine`: new credit and escrow release fail when `RESTRICTED`; repay and unused-fund withdrawal stay open.

The off-chain worker only discovers and relays. `submitProof` is permissionless. There is no `setRestricted` owner path.

This is not CEL. CEL gates an *instrument* (`Paused`). FreezeWire gates a *counterparty* (`Blacklisted`).

---

## Problem / Solution

| Problem | Solution |
|---|---|
| CTC credit/escrow either ignores Ethereum address-level compliance or trusts a backend/indexer that *asserts* the flag. | Attestcoin proof of the canonical USDC event is verified on-chain; eligibility writes require `0x0FD2` success + consumer checks. |
| A lying, lagging, or offline oracle diverges CTC state from Circle. | Worker and UI are outside the trust boundary. A forged proof fails verification or binder checks. |
| Freezing repayment turns compliance into a hostage situation. | Selective enforcement: restricted accounts can still repay and withdraw unused funds. |

---

## Architecture

```text
Ethereum USDC Blacklisted / UnBlacklisted
        ↓  real source event
Attestcoin Merkle + continuity proof (Proof Builder = liveness)
        ↓  cryptographic verification at BlockProver 0x0FD2
FreezeWire consumer checks
  (receipt status · emitter · event · account · chainKey · window · replay)
        ↓
EligibilityLedger     address → ELIGIBLE | RESTRICTED
        ↓
GatedCreditLine       draw / release fail; repay / unused withdraw succeed
```

```text
ETH USDC ──► Proof Builder ──► Worker (untrusted) ──► BlacklistVerifier
                                      ▲                      │
Any relayer ──────────────────────────┘                      ▼
UI (untrusted) ──► worker / contracts              EligibilityLedger
                                                         │
                                                   GatedCreditLine + MockUSD
```

Trust flows from Attestcoin attestors and Creditcoin validators. The worker and UI cannot authorize eligibility.

---

## Security Properties

Only properties implemented in contracts / worker / tests (see `docs/SECURITY_MODEL.md`, `docs/THREAT_MODEL.md`):

| Property | How |
|---|---|
| Backend is not an eligibility authority | No `setStatus` / `setRestricted` API or owner path; worker only discovers / proves / relays |
| Proof must verify on-chain | Ledger writes require successful `0x0FD2` verification via `BlacklistVerifier` |
| Canonical USDC emitter is fixed | `expectedEmitter` is constructor-immutable (ADR-0016); no `setExpectedEmitter` |
| Only issuer blacklist events bind | Consumer checks require matching emitter + `Blacklisted` / `UnBlacklisted` topics |
| Account binding | Bound account is topic\[1\] of the verified log — no cross-account write |
| Failed source receipts never write | Receipt status must succeed |
| Replay-safe | `(chainKey, height, txIndex)` cannot write eligibility twice |
| Selective financial enforcement | Restricted: draw / protected transfer / escrow lock·release revert; repay / unused withdraw succeed |
| Permissionless submission | Anyone can call `submitProof` with a valid proof |
| Owner operational limits | Owner may set chainKey / height window; cannot set eligibility or rotate emitter |
| Secrets stay off-protocol | Deployer/relayer keys in local env only; never required in frontend bundles |

Honest remaining trust: Creditcoin validators, Attestcoin attestor set, Circle FiatToken fidelity, Proof Builder **liveness**, discovery completeness, and attestation lag (gates **new** credit, not same-block CTC txs). Default `ELIGIBLE` is Circle’s model until proven otherwise — not a cleanliness certificate.

---

## Demo Flow

Judge-facing path (~150s). Details in `docs/DEMO_SPECIFICATION.md`.

1. Show status **ELIGIBLE** and that a draw can succeed before a proof is submitted (default ≠ proven clean).
2. Open the **real** Ethereum mainnet USDC `blacklist` tx on a public explorer (pinned demo evidence; not a mock event).
3. **Fetch proof** via worker `GET /v1/prove/{txHash}` (or UI). Say in order: inclusion · status · emitter · event · account — then window, replay, decoys skipped.
4. **Submit** `submitProof` to Creditcoin (`POST /v1/relay` or wallet calldata). Ledger emits `Restricted` for the bound account — no `setRestricted`.
5. Credit access matrix: draw / protected transfer / escrow lock·release blocked; repay / withdraw unused available.
6. Closer: *The backend never told Creditcoin the address was blacklisted. The Attestcoin proof did.*

Worker endpoints used by the demo: `/v1/health`, `/v1/evidence/demo`, `/v1/prove/{tx}`, `/v1/relay`, `/v1/status/{address}`, `/v1/discover`.

---

## Technology Stack

| Layer | Stack |
|---|---|
| Contracts | Solidity **0.8.23**, Foundry (`forge`, `forge-std`), Creditcoin CC3 EVM |
| Attestcoin | BlockProver `0x0FD2`, hosted Proof Builder, `@gluwa/usc-sdk` |
| Worker | TypeScript, Node ≥ 20, `viem`, `zod`, `dotenv` |
| Frontend | React 19, Vite, TypeScript, Tailwind CSS 4, Radix/shadcn primitives, Motion |
| 3D hero | Three.js, React Three Fiber / Drei |
| Chain I/O | `viem` (frontend + worker) |
| CI | GitHub Actions: `forge fmt/build/test`, backend `tsc` + tests, frontend build |

Target environment: Creditcoin **CC3 testnet** (chain id **102031**). Attestcoin **readability only** for this demo.

---

## Repository Structure

```text
freeze-wire/
├── foundry.toml              Foundry config (src/test under contracts/)
├── remappings.txt
├── docs/                     PRD, architecture, security, demo, ADRs
├── contracts/
│   ├── src/                  BlacklistVerifier, EligibilityLedger, GatedCreditLine, MockUSD
│   ├── test/                 Unit, security boundary, gated live Attestcoin tests
│   └── lib/forge-std/        Vendored Foundry stdlib
├── backend/                  Readability worker (HTTP API)
├── frontend/                 Demo workspace + 3D hero
│   └── public/models/        Third-party Bitcoin GLB + attribution
├── config/                   Network / deployment examples
├── scripts/                  Ops helpers
├── tests/                    Cross-cutting notes / future e2e
├── .github/workflows/        CI
├── .env.example              Placeholders only
├── LICENSE                   MIT
└── README.md
```

---

## Local Development

**Requirements:** Node ≥ 20, Foundry (`forge`), copy env placeholders locally.

```bash
cp .env.example .env
# Optional frontend overrides:
cp frontend/.env.example frontend/.env
```

Fill contract addresses and (optionally) `RELAY_PRIVATE_KEY` after deploy. Never commit `.env`.

**Contracts**

```bash
forge fmt --check && forge build && forge test
```

**Worker**

```bash
cd backend && npm ci && npm run build && npm test
npm start   # default http://127.0.0.1:8000
```

Live Attestcoin checks (not CI):

```bash
LIVE_ATTESTCOIN=1 npm test
```

**Frontend**

```bash
cd frontend && npm ci && npm run dev    # http://localhost:5173
npm run build
```

Point `VITE_API_BASE_URL` at the worker (default `http://127.0.0.1:8000`). Network examples: `config/networks.example.json`.

---

## Testing

| Suite | Command |
|---|---|
| Solidity (Foundry) | `forge test` |
| Format / build | `forge fmt --check && forge build` |
| Worker unit | `cd backend && npm test` |
| Frontend typecheck + bundle | `cd frontend && npm run build` |
| Live Attestcoin (optional) | `cd backend && LIVE_ATTESTCOIN=1 npm test` |
| Live relay broadcast (optional, funded) | `LIVE_ATTESTCOIN=1 LIVE_RELAY_BROADCAST=1 npm test` |

Contract coverage includes consumer checks, replay, immutable emitter, and selective credit/escrow enforcement (`T-SEC-*`, `T-FIN-*`, `T-SC-*`). See `docs/TEST_STRATEGY.md`.

---

## Security Documentation

| Document | Owns |
|---|---|
| [`docs/SECURITY_MODEL.md`](docs/SECURITY_MODEL.md) | Invariants, trust boundaries, owner risk |
| [`docs/THREAT_MODEL.md`](docs/THREAT_MODEL.md) | Actors and abuse cases |
| [`docs/SYSTEM_ARCHITECTURE.md`](docs/SYSTEM_ARCHITECTURE.md) | Component boundaries |
| [`docs/ATTESTCOIN_INTEGRATION.md`](docs/ATTESTCOIN_INTEGRATION.md) | chainKey, Proof Builder, precompile |
| [`docs/SMART_CONTRACT_SPECIFICATION.md`](docs/SMART_CONTRACT_SPECIFICATION.md) | On-chain behavior |
| [`docs/API_SPECIFICATION.md`](docs/API_SPECIFICATION.md) | Worker HTTP surface |
| [`docs/PRD.md`](docs/PRD.md) / [`docs/REQUIREMENTS.md`](docs/REQUIREMENTS.md) | Product musts |
| [`docs/adr/`](docs/adr/) | Architecture decisions (e.g. ADR-0016 immutable emitter) |

If code and docs diverge, docs win until an ADR updates them (`docs/SOURCE_OF_TRUTH.md`).

---

## Credits / Third-Party Assets

### Bitcoin 3D model (`frontend/public/models/bitcoin.glb`)

- **License:** [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
- **Author:** Taohid Animation
- **Source:** Sketchfab export (`bitcoin_3d_model.glb`)
- **Usage:** Hero product render. Materials and lighting are remapped in-app; the mesh and authored texture remain the original asset. Attribution required when redistributing.

FreezeWire does **not** claim original authorship of this model. See `frontend/public/models/README.md`.

### Other

- Circle USDC / FiatToken event semantics (Ethereum) — referenced as the canonical compliance source.
- Creditcoin / Attestcoin protocol surfaces — BlockProver, Proof Builder, CC3 testnet.
- `forge-std` — Foundry standard library (vendored under `contracts/lib/`).

---

## License

MIT — see [`LICENSE`](LICENSE).
