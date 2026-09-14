# frontend/

FreezeWire demo UI workspace (Phase 5). Vite + React + TypeScript + Tailwind + shadcn/ui primitives. The UI is untrusted — eligibility and credit gating are enforced on Creditcoin contracts; the worker is convenience only.

## Run

```bash
cp .env.example .env   # optional overrides
npm ci
npm run dev            # http://localhost:5173
npm run build
npm test               # honesty / SM Vitests
```

Requires the Phase 4 worker at `VITE_API_BASE_URL` (default `http://127.0.0.1:8000`) for prove / relay / status / demo evidence.

## Demo path (two-account — see operator runbook)

Live account **B** (`0xe05F…`) is already **RESTRICTED** from a prior permissionless `submitProof`. Do **not** claim a live ELIGIBLE→RESTRICTED flip on that address.

1. Confirm worker health in the header.
2. **TRACE EVENT** — real Ethereum Blacklisted tx for **B** from `GET /v1/evidence/demo`.
3. Status may already read **RESTRICTED** from the ledger (prior commit). Say so; open Blockscout `0x07e3…`.
4. **FETCH PROOF BUNDLE** — `GET /v1/prove/{txHash}` (does not mutate eligibility; UI says **PROOF BUNDLE READY**, not verified).
5. **COMMIT TO CREDITCOIN** — `POST /v1/relay` optional. Replay may no-op; if relay is disabled, calldata dialog for a client wallet (**NOT BROADCAST** until receipt).
6. Show consequence as **B**: DRAW blocked; REPAY / WITHDRAW UNUSED available. Prefer live `Restricted()` when `VITE_CREDIT_LINE_ADDRESS` is set.
7. **Account A** (`0x6b0745…`) for the “before” draw — use wallet/explorer, not LOAD DEMO (UI binds B).

Operator checklist: [`docs/DEMO_RUNBOOK.md`](../docs/DEMO_RUNBOOK.md). Product specification: [`docs/DEMO_SPECIFICATION.md`](../docs/DEMO_SPECIFICATION.md).

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
