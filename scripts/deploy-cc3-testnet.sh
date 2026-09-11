#!/usr/bin/env bash
# Deploy FreezeWire stack to CC3 testnet (or fail clearly).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

if [[ -z "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
  echo "BLOCKER: DEPLOYER_PRIVATE_KEY is empty."
  echo "Fund a CC3 testnet account (tCTC faucet) and set DEPLOYER_PRIVATE_KEY in .env."
  echo "Dry-run path: see contracts/script/README.md (Anvil local broadcast)."
  exit 2
fi

CC3_RPC_URL="${CC3_RPC_URL:-https://rpc.cc3-testnet.creditcoin.network}"
CC3_CHAIN_ID="${CC3_CHAIN_ID:-102031}"
export CC3_CHAIN_ID
export DEPLOYMENT_OUT_PATH="${DEPLOYMENT_OUT_PATH:-deployments/cc3-testnet.json}"
export DEPLOYMENT_NETWORK="${DEPLOYMENT_NETWORK:-cc3-testnet}"

mkdir -p deployments

echo "Deploying to chainId=$CC3_CHAIN_ID rpc=$CC3_RPC_URL"
forge script contracts/script/DeployCC3Testnet.s.sol:DeployCC3Testnet \
  --rpc-url "$CC3_RPC_URL" \
  --broadcast \
  --legacy

echo "Wrote $DEPLOYMENT_OUT_PATH"
node scripts/sync-deployment-env.mjs
