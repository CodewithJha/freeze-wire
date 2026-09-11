# frontend/

Judge-facing FreezeWire demo workspace (Phase 5). Vite + React + TypeScript + Tailwind + shadcn/ui primitives. The UI is untrusted — eligibility and credit gating are enforced on Creditcoin contracts; the worker is convenience only.

## Run

```bash
cp .env.example .env   # optional overrides
npm ci
npm run dev            # http://localhost:5173
npm run build
```

Requires the Phase 4 worker at `VITE_API_BASE_URL` (default `http://127.0.0.1:8000`) for prove / relay / status / demo evidence.

## Demo path (~150s)

1. Confirm worker health in the header.
2. **LOAD DEMO EVIDENCE** — real Ethereum Blacklisted tx from `GET /v1/evidence/demo`.
3. Status reads `GET /v1/status/{account}` (ELIGIBLE until proven on-chain).
4. **FETCH PROOF** — `GET /v1/prove/{txHash}` (does not mutate eligibility).
5. **SUBMIT TO CREDITCOIN** — `POST /v1/relay`. If relay is disabled, calldata dialog for a client wallet.
6. Status becomes **RESTRICTED** when the ledger reflects the proof.
7. Credit access matrix: DRAW / PROTECTED TRANSFER / ESCROW LOCK / RELEASE blocked; REPAY / WITHDRAW UNUSED available. Prefer live `Restricted` revert when `VITE_CREDIT_LINE_ADDRESS` is set.

See `docs/DEMO_SPECIFICATION.md`.

## Structure

```text
src/
  components/{evidence,status,credit,transaction,ui}/
  features/{eligibility,credit-line}/
  hooks/
  lib/{api,formatting,constants}/
```

## Env

| Variable | Purpose |
|---|---|
| `VITE_API_BASE_URL` | Worker base URL |
| `VITE_CC3_CHAIN_ID` | Expected CC3 chain id |
| `VITE_CC3_RPC_URL` | Public CC3 RPC |
| `VITE_CREDIT_LINE_ADDRESS` | Live credit line (from `deployments/cc3-testnet.json`) |
| `VITE_LEDGER_ADDRESS` | Live ledger |
| `VITE_ALLOW_SIMULATION` | Opt-in `SIMULATION` mode only; default missing addresses → `NOT_DEPLOYED` |

Credit actions report explicit modes: **LIVE** / **NOT_DEPLOYED** / **UNAVAILABLE** / **SIMULATION**. The UI never implies on-chain enforcement when undeployed.
