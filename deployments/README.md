# deployments/

Live address registries and **public** evidence artifacts.

| File | Role | Git |
|---|---|---|
| `cc3-testnet.json` | Written by `DeployCC3Testnet` on Creditcoin CC3 (chain id **102031**) | **gitignored** |
| `cc3-testnet.example.json` | Schema / placeholders | committed |
| `local-anvil.json` | Optional local Anvil dry-run output | gitignored |
| `demo-evidence-public.json` | Public demo addresses + txs (no keys) | **committed** (`*-public.json`) |
| `demo-proof-public.json` | Public prove metadata for the demo source tx | **committed** |

After a successful CC3 deploy, sync into runtime env (or point the worker at the registry):

```bash
# Worker / scripts read deployments/cc3-testnet.json when env addresses are empty.
# Frontend Vite vars must be set explicitly (or via scripts/sync-deployment-env.mjs).
node scripts/sync-deployment-env.mjs
```

Do not commit filled non-public `*.json` registries or private keys.
Do commit `*-public.json` evidence (scrub secrets first).
