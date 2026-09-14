# Research baseline

**Fetched:** 2026-09-10. Reuses earlier peer research (CEL/Corolary/Deadswitch/Toxa/Attestable/ChargeProof READMEs, notes from the stopped abandoned implementation). This pass **re-verified Attestcoin, Creditcoin, Credal, Circle, and the demo source transaction** from official docs and chain RPC. It did **not** repeat a full peer-project crawl.

Labels: **FACT** / **ASSUMPTION** / **INFERENCE** / **UNVERIFIED** / **BLOCKER**. Never promote assumption to fact.

---

## Official sources used this pass

| Source | URL | Result |
|---|---|---|
| Attestcoin home | https://docs.attestcoin.org/ | FACT: readability + ASC; batch up to 10 queries sharing a continuity proof; ~15s Creditcoin verification once attested |
| Attestcoin environments | https://docs.attestcoin.org/attestcoin-protocol/attestcoin-protocol-chains-environments | FACT: CC3 testnet Proof Builder, decoder, chainKeys |
| Attestcoin smart contracts | https://docs.attestcoin.org/attestcoin-protocol/dapp-builder-infrastructure/attestcoin-smart-contracts | FACT: `0x0FD2` `verify` / `verifyAndEmit`; precompile does **not** check receipt success; ASC **MUST** check status `0x1`; replay protection is ASC-side |
| Attestcoin architecture | https://docs.attestcoin.org/attestcoin-protocol/architecture.md | FACT: Merkle + continuity; `verify()` view, `verifyAndEmit()` state-changing |
| Attestcoin readability | https://docs.attestcoin.org/attestcoin-protocol/attestcoin-readability.md | FACT: attestors → proof gen → ASC → precompile → decode |
| Attestcoin writability | https://docs.attestcoin.org/attestcoin-protocol/attestcoin-writability.md | FACT: writability still “undergoing 3rd party testing and audits”; not treated as available |
| Attestcoin gas | https://docs.attestcoin.org/attestcoin-protocol/attestcoin-readability/gas-costs.md | FACT: continuity length dominates gas; txs >500 KB may exceed block gas limit; prove recent txs when possible |
| Creditcoin endpoints | https://docs.creditcoin.org/smart-contract-guides/creditcoin-endpoints.md | FACT: testnet HTTPS RPC, chain id 102031, Blockscout |
| Creditcoin testnet | https://docs.creditcoin.org/environments/testnet.md | FACT: EVM chain id 102031; WSS RPC |
| Creditcoin faucet | https://docs.creditcoin.org/wallets/using-testnet-faucet.md | FACT: Discord `#token-faucet` `/faucet address:<EVM>` |
| Creditcoin Attestcoin page | https://docs.creditcoin.org/attestcoin-protocol.md | FACT: docs migrated to docs.attestcoin.org |
| Credal | https://docs.creditcoin.org/cc-enterprise/faq.md ; https://creditcoin.org/blog/credal-101-creditcoins-api-explained/ | FACT: Credal is Creditcoin’s hosted API (loan write/read; analogized to Infura). Not required for FreezeWire MVP. |
| Proof Builder OpenAPI | `GET https://proof-gen-api.cc3-testnet.creditcoin.network/api/swagger/openapi.json` (HTTP 200, title “Proof Gen API Server 1.0”) | FACT: live OpenAPI this pass |
| Same OpenAPI on alias | `https://prover.cc3-testnet.creditcoin.network/api/swagger/openapi.json` | FACT: identical size/body this pass — treat as alias, prefer official docs URL |
| Circle Blacklistable | https://raw.githubusercontent.com/circlefin/stablecoin-evm/master/contracts/v1/Blacklistable.sol | FACT: `Blacklisted(address indexed _account)`, `UnBlacklisted(address indexed _account)` |
| Ethereum receipt | `eth_getTransactionReceipt` via `https://ethereum.publicnode.com` | FACT: demo tx (below) |
| Event topics | `cast keccak` | FACT: selectors below |

Gluwa SDK README cites `CREDITCOIN_PROOF_BUILDER_URL=https://prover.cc3-testnet.creditcoin.network/`. Official Attestcoin docs cite `https://proof-gen-api.cc3-testnet.creditcoin.network/`. **Decision:** config default is the **docs.attestcoin.org** URL. Alias is optional fallback (INFERENCE: same service).

---

## Attestcoin — CC3 testnet (FACT, 2026-09-10)

| Item | Value |
|---|---|
| ASC dashboard | https://dashboard.cc3-testnet.creditcoin.network/ |
| Proof Builder | https://proof-gen-api.cc3-testnet.creditcoin.network/ |
| Decoder contract | `0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f` |
| ChainInfo precompile | `0x0000000000000000000000000000000000000fd3` |
| BlockProver precompile | `0x0000000000000000000000000000000000000FD2` |
| SDK | `@gluwa/usc-sdk` |
| Ethereum **Sepolia** chainKey | **1** |
| Ethereum **mainnet** chainKey | **3** |

## Attestcoin — CC3 mainnet (FACT; out of current deploy scope)

| Item | Value |
|---|---|
| Ethereum mainnet chainKey | **1** (not 3) |
| Proof Builder | https://proofbuilder.cc3-mainnet-usc.creditcoin.network/ |
| Decoder | `0x9D094C9f22B10FCf842c2fC6A0981630A4F94B5C` |
| BlockProver | `0x0000000000000000000000000000000000000FD2` |

**Invariant:** `chainKey` is environment-specific. Never hard-code `3` as “Ethereum” globally.

## Proof Builder API (FACT from live OpenAPI)

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/v1/health` | Upstream health (`status`, `cc3_rpc_connected`, `eth_rpc_connected`, `uptime_seconds`) |
| GET | `/api/v1/attested-height/{chain_key}` | Last attested height |
| GET | `/api/v1/proof-by-tx/{chain_key}/{tx_hash}` | Continuity + Merkle + `txBytes` by hash |
| GET | `/api/v1/proof/{chain_key}/{header_number}/{tx_index}` | Same by position |
| POST | `/api/v1/proof-batch/{chain_key}` | Batch by header/txIndexes |
| POST | `/api/v1/proof-batch-by-tx/{chain_key}` | Batch by tx hash |

Errors: 400 invalid, 404 not found, 422 `BlockNotReady` / `UnsupportedBlockFormat` / (Gluwa PR) `EmptyBlockTxProof`, 501 tx-hash lookup not implemented.

Proof object (`SingleContinuityResponse`): `chainKey`, `headerNumber`, `txIndex`, `continuityProof{lowerEndpointDigest, roots[]}`, `merkleProof{root, siblings[{hash, isLeft}]}`, `txBytes`, `txHash`, `cached`, `generatedAt`.

**UNVERIFIED this pass:** whether `/api/v1/proof-by-tx/3/{demoTx}` still returns a bundle (an earlier verification pass reported yes; not re-fetched here to avoid treating cache as a spec). Re-check in Phase 3.

**FACT:** `GET /health` (no `/api/v1`) returned HTTP 404 this pass. Use `/api/v1/health`.

## Creditcoin CC3 testnet (FACT)

| Item | Value |
|---|---|
| HTTPS RPC | https://rpc.cc3-testnet.creditcoin.network |
| WSS RPC | wss://rpc.cc3-testnet.creditcoin.network |
| EVM chain id | 102031 |
| Native token (wallet docs) | tCTC / CTC (docs disagree on symbol; treat as testnet CTC) |
| Blockscout | https://creditcoin-testnet.blockscout.com |
| Subscan | https://creditcoin3-testnet.subscan.io |
| Faucet | Creditcoin Discord `#token-faucet` |

## Credal (FACT)

Credal is a hosted API for Creditcoin credit operations / data retrieval ([FAQ](https://docs.creditcoin.org/cc-enterprise/faq.md), [blog](https://creditcoin.org/blog/credal-101-creditcoins-api-explained/)). FreezeWire talks to **public CC3 RPC + Proof Builder + Ethereum RPC**. Credal is **out of MVP path**. Do not imply Credal attestation.

## Circle / USDC (FACT)

From `Blacklistable.sol`:

```solidity
event Blacklisted(address indexed _account);
event UnBlacklisted(address indexed _account);
```

Canonical Ethereum USDC: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`.

`cast keccak` (2026-09-10):

| Event | topic0 |
|---|---|
| `Blacklisted(address)` | `0xffa4e6181777692565cf28528fc88fd1516ea86b56da075235fa575af6a4b855` |
| `UnBlacklisted(address)` | `0x117e3210bb9aa7d9baff172026820255c6f6c30ba8999d1c2fd88e2848137c4e` |
| `Paused(address)` (decoy) | `0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258` |

## Demo source transaction (FACT, re-verified 2026-09-10)

`eth_getTransactionReceipt(0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787)`:

| Field | Value |
|---|---|
| status | `0x1` success |
| block | 25,705,174 (`0x1883ad6`) |
| transactionIndex | 18 |
| to | USDC `0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48` |
| from | `0x0a06be16275b95a7d2567fbdae118b36c7da78f9` |
| logs | 1 |
| log0 | `Blacklisted`, emitter USDC, account `0xe05f529f5284d75624eba386cb716928c3b54a2a` |

Blockscout UI also shows method `blacklist`, timestamp 2026-08-07 19:27:47 UTC.

Checksum account: `0xe05F529f5284D75624eBa386CB716928c3b54A2A`.

**Previously observed, not re-verified this pass:** live `eth_call` of `0x0FD2.verify` on CC3 returning `true` for that proof; Proof Builder serving the bundle. Treat as **UNVERIFIED until Phase 3**.

## Precompile consumer obligations (FACT from Attestcoin docs)

The BlockProver validates **inclusion + continuity only**. It does **not** validate:

- receipt success
- emitter
- event signature
- indexed account
- business meaning

ASCs **must** check `receiptStatus == 1` and then bind logs. Replay protection is **application-side** (`processedQueries` in official examples).

Official examples compute `txIndex` from the Merkle sibling path, then key `keccak(chainKey, height, txIndex)`. FreezeWire **must not trust a caller-supplied txIndex**.

`verify()` is view; `verifyAndEmit()` is state-changing and emits `TransactionVerified`. Prefer `verifyAndEmit` so explorers show verification (INFERENCE: better demo; both are specified).

Batch: protocol supports up to **10** queries sharing one continuity proof. MVP uses **single-tx** proofs. Batch is future/optional (gas), not a demo requirement.

## What prior research established (reused, not re-crawled)

Product context: Attestcoin-backed consumer checks are mandatory for FreezeWire. Completeness bar includes ChargeProof, CEL, Deadswitch, ThirdCheck-class consumer checks.

| Project | Object (from their READMEs, 2026-09-10) |
|---|---|
| CEL | Instrument eligibility; source `Paused`; gates new credit |
| Corolary | Proven Ethereum lending history → collateral efficiency |
| Deadswitch | Sepolia vault withdrawal proof → Creditcoin liquidation |
| Toxa | Sepolia ETH lock proof → Creditcoin loan + score |
| Attestable | Parametric coverage settled from proven infra-failure facts |
| ChargeProof | EV session on Sepolia → escrow release on CTC |
| FreezeWire | Address-level Circle `Blacklisted` → CTC credit/escrow gate |

See `COMPETITIVE_POSITIONING.md`.

## Intentionally not in this baseline

- Full peer-project recrawl of every related listing
- Discord (login-walled)
- Implementing or copying the stopped `freezewire/` contracts
