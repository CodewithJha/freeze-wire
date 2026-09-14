# Deployment plan

Phase 8 runbook + **live CC3 testnet** public facts. Do not commit secrets, `.env`, or deployment JSON that embeds private keys.

---

## Live CC3 Testnet Deployment

**Status:** Deployed and evidenced on Creditcoin CC3 Testnet (**chainId `102031`**). Public addresses and txs below match committed `deployments/demo-evidence-public.json` (and local `deployments/cc3-testnet.json` when present; non-`*-public.json` registries remain gitignored).

### Registry (public)

| Field | Value |
|---|---|
| network | `cc3-testnet` |
| chainId | `102031` |
| deployBlock | `5479278` |
| attestcoinChainKey | `3` (Ethereum mainnet on CC3 testnet) |
| proofMinHeight / proofMaxHeight | `0` / `0` (unbounded — testnet default; disclose) |

**Window ops note (DOCUMENT ONLY):** Live deploy keeps `(0,0)` so demo header `25705174` stays admissible. Production should call owner `setWindow(min,max)` after measuring Attestcoin lag — **not executed in this push** (requires deployer key; avoid printing secrets). See `docs/SECURITY_EVIDENCE.md` and `docs/IMPROVEMENT_PLAN.md`.
| ltvBps | `5000` |
| sourceUsdc (immutable emitter) | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| blockProver | `0x0000000000000000000000000000000000000FD2` |
| MockUSD | `0x6943EB32EAb562791f095E91ee288627ADDdC5B3` |
| BlacklistVerifier | `0x6bf238291Bb8262918A1989831856DC6BC47D869` |
| EligibilityLedger | `0xde64d5037cA820D4aDFa703C4FaF5451be840C9d` |
| GatedCreditLine | `0xB04fFca20e0a992474E6AD501A061973dC9Ed340` |

### Demo / evidence (public)

| Field | Value |
|---|---|
| demo source tx (ETH) | `0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787` |
| demo account (RESTRICTED) | `0xe05F529f5284D75624eBa386CB716928c3b54A2A` |
| eligible actor | `0x6b07454d70896cad371982A57037933e24F4cD52` |
| prove meta | height `25705174`, txIndex `18`, siblings `9`, continuity roots `27` |
| submitProof tx | `0x07e30451fb38776aa972603e94aeb8f779f182a5047a371195df2d598a4dfc45` |
| submitProofStatus | `success` |
| statusOf(demo) | `RESTRICTED` |
| draw as restricted | reverted |

**Disclosures:** Testnet demo only. MockUSD is test collateral on CC3; Circle USDC is the Ethereum source fact. No production-security claims. Featured demo account may already be RESTRICTED — use two-account demo script (`DEMO_SPECIFICATION.md`).

Explorers: https://creditcoin-testnet.blockscout.com · RPC: https://rpc.cc3-testnet.creditcoin.network

---

## Re-deploy / smoke runbook (if redeploying)

1. `./scripts/smoke-cc3.sh` — `eth_chainId == 102031`, probe `0x0FD2`, Proof Builder health.
2. Fund deployer via faucet; set `DEPLOYER_PRIVATE_KEY` in `.env` (**never commit**).
3. `./scripts/deploy-cc3-testnet.sh` — MockUSD → BlacklistVerifier → EligibilityLedger → GatedCreditLine → gitignored `deployments/cc3-testnet.json`.
4. `node scripts/sync-deployment-env.mjs` — public addresses into local env files.
5. `node scripts/submit-demo-proof.mjs` — prove demo tx then permissionless `submitProof`; expect `statusOf(0xe05F…) == RESTRICTED`.
6. Fund MockUSD / deposit; protected `draw` must revert; repay / unused withdraw remain available.
7. Publish **public** addresses/hashes in README; keep keys and private JSON out of git.

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
| `RELAY_PRIVATE_KEY` | Optional gas for `submitProof` (empty → wallet path) |
| Demo users | Eligible actor for deposit/draw; restricted account for consequence |

Faucet: Creditcoin Discord `#token-faucet` `/faucet address:<EVM>` ([docs](https://docs.creditcoin.org/wallets/using-testnet-faucet.md)).

Use `--legacy` if CC3 rejects EIP-1559 (re-verify with a dry `forge script`).

---

## Deployment order

1. `MockUSD`
2. `BlacklistVerifier` (precompile `0x0FD2`, chainKey 3, **immutable** emitter USDC, window from config)
3. `EligibilityLedger` (verifier address)
4. `GatedCreditLine` (ledger, MockUSD, ltvBps)
5. Mint demo MockUSD to operator / eligible actor
6. Verify config via `eth_call` (expectedChainKey, emitter)
7. `submitProof` for demo tx (or wallet)
8. Record addresses in **gitignored** local `cc3-testnet.json`; commit scrubbed `*-public.json` evidence for auditors; publish public addresses in README

Dependencies: ledger needs verifier; credit line needs ledger + token. No circular deploys.

---

## Environment variables

See `.env.example`. After deploy fill `VERIFIER_ADDRESS`, `LEDGER_ADDRESS`, `CREDIT_LINE_ADDRESS`, `MOCK_USD_ADDRESS`.

Never commit filled `.env`.

---

## Verification

- Blockscout contract pages (bytecode)
- `statusOf(demoAccount)` after proof == `RESTRICTED`
- `Restricted` log on ledger
- Optional: `verifyAndEmit` / `submitProof` tx on Blockscout
- Draw revert + repay success on gated line

---

## Rollback

Contracts are not upgradeable (MVP). Rollback = **redeploy** a new set and abandon the old addresses. Do not `selfdestruct` unless an ADR says so (default: **no selfdestruct**).

A wrong `expectedEmitter` cannot be patched in place (immutable). Redeploy with the correct Circle USDC address from `config/networks.example.json`. Already-written statuses on the abandoned deployment remain there (honest limitation). Owner can still retune chainKey/window on a live deployment.

---

## Deployment validation / smoke

```text
1. eth_chainId == 102031
2. 0x0FD2 responds to calculateTxIndex (eth_getCode is empty for precompiles)
3. Proof Builder /api/v1/health
4. statusOf(0xe05F…) == RESTRICTED (post-proof)
5. draw reverts; repay succeeds
```

---

## Post-deploy

Keep `DEMO_SPECIFICATION.md` and README aligned with live hashes. Re-check Proof Builder health if discovery degrades. CC3 mainnet remains out of scope for the current public deploy.
