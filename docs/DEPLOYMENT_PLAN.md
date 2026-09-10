# Deployment plan

**Do not deploy in Gate 5A.** This is the runbook for Phase 8.

---

## Environments

| Name | Chain id | RPC | Explorer | chainKey ETH mainnet |
|---|---|---|---|---|
| local | 31337 | Anvil | — | mock |
| cc3-testnet (demo) | **102031** | https://rpc.cc3-testnet.creditcoin.network | https://creditcoin-testnet.blockscout.com | **3** |
| cc3-mainnet | 102030 | https://mainnet3.creditcoin.network | https://creditcoin.blockscout.com | **1** — **out of scope** |

WSS: `wss://rpc.cc3-testnet.creditcoin.network`

---

## RPC requirements

- CC3: `eth_chainId` must be `0x18e8f` (102031) before broadcast
- Ethereum: receipt fetch for demo tx (public RPC OK)
- Proof Builder: `GET /api/v1/health` and prove endpoint

---

## Wallet requirements

| Key | Role |
|---|---|
| `DEPLOYER_PRIVATE_KEY` | Broadcast create txs; fund with tCTC |
| `RELAY_PRIVATE_KEY` | Optional gas for `submitProof` |
| Demo user | Deposit/draw/repay (can be deployer) |

Faucet: Creditcoin Discord `#token-faucet` `/faucet address:<EVM>` ([docs](https://docs.creditcoin.org/wallets/using-testnet-faucet.md)).

**BLOCKER:** without a funded deployer, Phase 8 cannot complete.

Use `--legacy` if CC3 rejects EIP-1559 (prior run noted this; **re-verify** with a dry `forge script`).

---

## Deployment order

1. `MockUSD`
2. `BlacklistVerifier` (precompile `0x0FD2`, chainKey 3, **immutable** emitter USDC from config, window from config)
3. `EligibilityLedger` (verifier address)
4. `GatedCreditLine` (ledger, MockUSD, ltvBps)
5. Mint demo MockUSD to operator/borrower
6. Verify config via `eth_call` (expectedChainKey, emitter)
7. `submitProof` for demo tx (or wallet)
8. Record addresses in a **gitignored** `deployment.local.json`; publish addresses in README only after they exist on-chain

Dependencies: ledger needs verifier; credit line needs ledger + token. No circular deploys.

---

## Environment variables

See `.env.example`. After deploy fill `VERIFIER_ADDRESS`, `LEDGER_ADDRESS`, `CREDIT_LINE_ADDRESS`, `MOCK_USD_ADDRESS`.

Never commit filled `.env`.

---

## Verification

- Blockscout contract pages (bytecode)
- `statusOf(demoAccount)` before/after proof
- `Restricted` log on ledger
- Optional: `verifyAndEmit` tx on Blockscout

---

## Rollback

Contracts are not upgradeable (MVP). Rollback = **redeploy** a new set and abandon the old addresses. Do not `selfdestruct` unless an ADR says so (default: **no selfdestruct**).

A wrong `expectedEmitter` cannot be patched in place (immutable). Redeploy with the correct Circle USDC address from `config/networks.example.json`. Already-written statuses on the abandoned deployment remain there (honest limitation). Owner can still retune chainKey/window on a live deployment.

---

## Deployment validation / smoke

```text
1. eth_chainId == 102031
2. code at 0x0FD2 nonempty
3. Proof Builder /api/v1/health
4. forge script --broadcast (or documented failure)
5. statusOf(0xe05F…) after proof == RESTRICTED
6. draw reverts; repay succeeds
```

---

## Post-deploy

Update DEMO spec with live tx hashes. Update ASSUMPTIONS if Proof Builder health is degraded (`cc3_rpc_connected: false` was previously observed while proofs still served from cache — **UNVERIFIED now**; re-check).
