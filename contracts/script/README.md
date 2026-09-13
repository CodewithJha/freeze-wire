# contracts/script/

Foundry broadcast scripts for Creditcoin CC3 testnet (chain id **102031**).

| Script | Role |
|---|---|
| `DeployCC3Testnet.s.sol` | Deploy MockUSD → BlacklistVerifier → EligibilityLedger → GatedCreditLine |

## Prerequisites

- Funded `DEPLOYER_PRIVATE_KEY` in repo-root `.env` (tCTC on CC3 testnet)
- Config from `.env` / `config/networks.example.json`: `SOURCE_USDC_ADDRESS`, `BLOCK_PROVER_ADDRESS` (`0x0FD2`), `ATTESTCOIN_CHAIN_KEY=3`, optional height window

## Deploy (live CC3)

```bash
set -a && source .env && set +a
mkdir -p deployments
forge script contracts/script/DeployCC3Testnet.s.sol:DeployCC3Testnet \
  --rpc-url "$CC3_RPC_URL" \
  --broadcast \
  --legacy \
  --evm-version shanghai \
  --slow \
  --gas-estimate-multiplier 500
```

Prefer `./scripts/deploy-cc3-testnet.sh` (sets the same flags). `foundry.toml` sets `bypass_prevrandao = true` for CC3 simulation.

On success writes **gitignored** `deployments/cc3-testnet.json` (public addresses only).

If EIP-1559 fails on CC3, keep `--legacy` (re-verify if the network later accepts type-2 txs).

## Local dry-run (Anvil)

```bash
anvil --chain-id 31337 &
export DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
export CC3_CHAIN_ID=31337
export DEPLOYMENT_OUT_PATH=deployments/local-anvil.json
export DEPLOYMENT_NETWORK=local-anvil
export BLOCK_PROVER_ADDRESS=0x0000000000000000000000000000000000000FD2
forge script contracts/script/DeployCC3Testnet.s.sol:DeployCC3Testnet \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast
```

Local Anvil cannot exercise real Attestcoin `0x0FD2` verification. Use it only to validate create bytecode and registry write.

## Missing key

Without `DEPLOYER_PRIVATE_KEY`, the script reverts `MissingDeployerPrivateKey` — do not invent a successful CC3 deploy.
