# scripts/

Operator helpers for CC3 deploy / smoke. Do not put private keys in scripts.

| Script | Role |
|---|---|
| `smoke-cc3.sh` | `eth_chainId`, precompile code at `0x0FD2`, Proof Builder health, registry presence |
| `deploy-cc3-testnet.sh` | Broadcast `DeployCC3Testnet` when `DEPLOYER_PRIVATE_KEY` is funded |
| `sync-deployment-env.mjs` | Copy public addresses from `deployments/cc3-testnet.json` into `.env` / `frontend/.env.local` |
| `submit-demo-proof.mjs` | Proof Builder → `submitProof` for demo tx (needs registry + funded key) |

```bash
chmod +x scripts/*.sh
./scripts/smoke-cc3.sh
./scripts/deploy-cc3-testnet.sh   # exits 2 if deployer key missing
node scripts/submit-demo-proof.mjs
```
