# deployments/

Gitignored live address registries. Public fields only — never private keys.

| File | Role |
|---|---|
| `cc3-testnet.json` | Written by `DeployCC3Testnet` on Creditcoin CC3 (chain id **102031**) |
| `cc3-testnet.example.json` | Schema / placeholders (committed) |
| `local-anvil.json` | Optional local Anvil dry-run output |

After a successful CC3 deploy, sync into runtime env (or point the worker at the registry):

```bash
# Worker / scripts read deployments/cc3-testnet.json when env addresses are empty.
# Frontend Vite vars must be set explicitly (or via scripts/sync-deployment-env.mjs).
node scripts/sync-deployment-env.mjs
```

Do not commit filled `*.json` registries. Do not put live addresses in `.env.example`.
