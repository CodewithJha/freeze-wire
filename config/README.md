# config/

Typed, environment-specific configuration. **Not secrets.**

| File | Role |
|---|---|
| `networks.example.json` | CC3 testnet / local / (future) mainnet parameters |
| `.env.example` at repo root | Runtime secrets placeholders |
| `deployments/cc3-testnet.json` | **Gitignored** live address registry (public fields only) |
| `deployments/cc3-testnet.example.json` | Schema / placeholders |

Immutable protocol constants (precompile address `0x0FD2`, event signatures) are documented in `docs/ATTESTCOIN_INTEGRATION.md` and may be Solidity constants **because they are protocol-fixed**, not because they are convenient.

Network-specific values (`chainKey`, RPC, Proof Builder URL, Circle USDC address, freshness window) **must** come from this config / env, not from scattered literals.

On-chain: `sourceUsdc` / `expectedEmitter` is passed to the constructor and is **immutable** after deploy (ADR-0016). `chainKey` and the height window remain owner-configurable operational parameters.

After deploy, the worker fills empty `VERIFIER_ADDRESS` / `LEDGER_ADDRESS` / `CREDIT_LINE_ADDRESS` / `MOCK_USD_ADDRESS` from `deployments/cc3-testnet.json`. Frontend Vite still needs `VITE_*` via `node scripts/sync-deployment-env.mjs` (or manual copy) — never hardcode addresses in React.
