#!/usr/bin/env bash
# CC3 connectivity smoke (no secrets printed). Exit non-zero on hard failure.
# Note: Attestcoin BlockProver is a precompile — eth_getCode is empty by design.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f .env ]]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

CC3_RPC_URL="${CC3_RPC_URL:-https://rpc.cc3-testnet.creditcoin.network}"
CC3_CHAIN_ID="${CC3_CHAIN_ID:-102031}"
PROOF_BUILDER_URL="${PROOF_BUILDER_URL:-https://proof-gen-api.cc3-testnet.creditcoin.network}"
BLOCK_PROVER_ADDRESS="${BLOCK_PROVER_ADDRESS:-0x0000000000000000000000000000000000000FD2}"

echo "== FreezeWire CC3 smoke =="
echo "rpc=$CC3_RPC_URL"
echo "expectedChainId=$CC3_CHAIN_ID"

chain_hex="$(cast chain-id --rpc-url "$CC3_RPC_URL")"
chain_dec=$((chain_hex))
echo "eth_chainId=$chain_dec"
if [[ "$chain_dec" != "$CC3_CHAIN_ID" ]]; then
  echo "FAIL: chain id mismatch"
  exit 1
fi

code="$(cast code "$BLOCK_PROVER_ADDRESS" --rpc-url "$CC3_RPC_URL")"
echo "blockProver eth_getCode=$code (expected empty for native precompile)"

# Probe precompile via calculateTxIndex on empty merkle (index 0).
if out="$(cast call "$BLOCK_PROVER_ADDRESS" \
  'calculateTxIndex((bytes32,(bytes32,bool)[]))' \
  '(0x0000000000000000000000000000000000000000000000000000000000000000,[])' \
  --rpc-url "$CC3_RPC_URL" 2>/dev/null)"; then
  echo "blockProver.calculateTxIndex(empty)=$out"
else
  echo "WARN: calculateTxIndex eth_call failed (precompile may be unavailable on this RPC)"
fi

pb_health="$(curl -fsS "$PROOF_BUILDER_URL/api/v1/health" || true)"
if [[ -z "$pb_health" ]]; then
  echo "WARN: Proof Builder health unreachable"
else
  echo "proofBuilderHealth=$pb_health"
fi

if [[ -f deployments/cc3-testnet.json ]]; then
  echo "registry=deployments/cc3-testnet.json present"
else
  echo "registry=deployments/cc3-testnet.json ABSENT (undeployed)"
fi

if [[ -z "${DEPLOYER_PRIVATE_KEY:-}" ]]; then
  echo "blocker=DEPLOYER_PRIVATE_KEY unset — live CC3 deploy cannot run"
else
  echo "deployerKey=set (value not printed)"
fi

echo "OK: CC3 RPC smoke passed (chainId=$chain_dec)"
