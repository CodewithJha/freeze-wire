# Attestcoin Integration Summary

**Product:** FreezeWire  
**Project:** open-source Creditcoin project  
**Audience:** reviewers (submission-ready)  
**Normative detail:** [`ATTESTCOIN_INTEGRATION.md`](./ATTESTCOIN_INTEGRATION.md)  
**Live public evidence:** `deployments/cc3-testnet.json`, `deployments/demo-evidence-public.json` (verified locally; typically gitignored)

FreezeWire uses **Attestcoin readability** so Creditcoin CC3 can inherit a real Ethereum mainnet Circle USDC `Blacklisted` / `UnBlacklisted` fact **without** trusting a backend oracle. Eligibility moves only through permissionless `submitProof` → BlockProver `0x0FD2` → consumer checks → `EligibilityLedger`. There is **no** `setStatus` / `setRestricted`.

---

## 1. Source chain

| Item | Value |
|---|---|
| Chain | Ethereum **mainnet** (not Sepolia) |
| Contract | Circle USDC `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| Events | `Blacklisted(address indexed _account)`, `UnBlacklisted(address indexed _account)` |
| Demo tx | `0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787` |

---

## 2. chainKey

On **CC3 testnet**, Ethereum mainnet = Attestcoin **chainKey `3`** (Sepolia = `1`).  
`chainKey` is **not** EVM `chainId`. FreezeWire expects `3`; wrong key → `WrongChainKey`.  
CC3 mainnet (mainnet ETH = key `1`) is **out of scope** for this demo.

---

## 3. Proof request

Proof Builder (CC3 testnet): `https://proof-gen-api.cc3-testnet.creditcoin.network`

```http
GET /api/v1/proof-by-tx/3/0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787
```

Also: `/api/v1/proof/{chain_key}/{header_number}/{tx_index}`, `/api/v1/attested-height/{chain_key}`, `/api/v1/health`.  
Worker maps this to `GET /v1/prove/{tx}` (untrusted transport only).

---

## 4. Proof structure

Payload includes `chainKey`, `headerNumber`, `txIndex` (informational), `txBytes` (encoded tx+receipt), `merkleProof` (`root` + `siblings[{hash,isLeft}]`), `continuityProof` (`lowerEndpointDigest` + `roots[]`).  
On-chain **txIndex is recovered from Merkle `isLeft` bits**, not trusted from the API field. Empty `txBytes` must not be submitted.

Demo evidence (public artifact): height `25705174`, txIndex `18`, siblings `9`, continuity roots `27`.

---

## 5. Verification

ASC calls BlockProver at `0x0000000000000000000000000000000000000FD2` via **`verifyAndEmit`** (inclusion + continuity; emits `TransactionVerified` for explorers).  
`false` / revert → `ProofRejected`; no ledger write. Precompile does **not** alone authorize eligibility.

---

## 6. Receipt status

Official rule: BlockProver does **not** prove the source tx succeeded. FreezeWire requires decoded `receiptStatus == 1` or reverts `SourceTxFailed`.

---

## 7. Emitter validation

After status, walk receipt logs; keep only `log.address == expectedEmitter`.  
`expectedEmitter` is **constructor-immutable** Circle USDC (ADR-0016). Impostor tokens emitting `Blacklisted` are skipped.

---

## 8. Event validation

Keep log iff `topics[0]` is Circle `Blacklisted` or `UnBlacklisted`.  
Indexed account = `topics[1]`. Issuer `Paused` (CEL’s object) must **not** bind. Decoy logs in the same receipt are ignored.

---

## 9. Replay protection

```text
key = keccak256(abi.encodePacked(chainKey, height, txIndexRecovered))
```

Application-side processed map (Model A / ADR-0017): after successful verify + successful receipt scan, mark replay even if no canonical match (`ProcessedWithoutFact`, no revert). Replay → `QueryAlreadyProcessed`.

---

## 10. Freshness (window)

Application `[minHeight, maxHeight]`; **`(0, 0)` = unbounded** on the live demo deploy (disclosed). Production should bound age. Continuity gas grows with lag.

---

## 11. Failure behavior

| Condition | Result |
|---|---|
| Not attested / empty block proof | Proof Builder error; worker does not invent success |
| Precompile false | `ProofRejected` |
| status ≠ 1 | `SourceTxFailed` |
| No canonical event | Success + `ProcessedWithoutFact`; eligibility unchanged |
| Replay | `QueryAlreadyProcessed` |
| Malformed / wrong chain / outside window | Custom errors; no forged RESTRICTED |

---

## 12. Limits

Batch up to 10 queries sharing continuity (MVP uses 1). Oversized source txs can hit CC3 gas limits (USDC `blacklist` is small). Attestation lag is typically minutes — product claim is **new credit after proof**, not intra-block freeze.

---

## 13. Gas implications

Cost scales with continuity length. Historical demo tx (Aug 2026) has a long continuity proof; live `submitProof` succeeded once (see evidence). Prefer proving soon after attestation; do not mock events if gas is heavy — swap to a newer real `Blacklisted` tx with the same checks.

---

## 14. Decoder

FreezeWire vendors Gluwa `EvmV1Decoder` in-process (official CC3 decoder listing exists separately). Walk **original** log order so `logIndex` / ordering remain meaningful.

---

## Removal test (load-bearing Attestcoin)

**If Attestcoin / BlockProver `0x0FD2` is removed, FreezeWire cannot move an address to `RESTRICTED`.** There is no owner setter, eligibility database, or worker privilege that can invent a blacklist. Gated credit therefore cannot inherit Circle’s flag without a proof the precompile accepts. Consumer checks alone cannot create state without a verified inclusion+continuity path.

---

## Live evidence (CC3 testnet — public only)

Verified against local `deployments/cc3-testnet.json` + `deployments/demo-evidence-public.json`:

| Field | Value |
|---|---|
| chainId | `102031` |
| chainKey | `3` |
| deployBlock | `5479278` |
| window | `0` / `0` |
| BlacklistVerifier | `0x6bf238291Bb8262918A1989831856DC6BC47D869` |
| EligibilityLedger | `0xde64d5037cA820D4aDFa703C4FaF5451be840C9d` |
| GatedCreditLine | `0xB04fFca20e0a992474E6AD501A061973dC9Ed340` |
| MockUSD | `0x6943EB32EAb562791f095E91ee288627ADDdC5B3` |
| Demo account | `0xe05F529f5284D75624eBa386CB716928c3b54A2A` |
| Eligible actor (separate) | `0x6b07454d70896cad371982A57037933e24F4cD52` |
| submitProof tx | `0x07e30451fb38776aa972603e94aeb8f779f182a5047a371195df2d598a4dfc45` |
| submitProofStatus | `success` |
| statusOf(demo) | `RESTRICTED` |
| draw as restricted | reverted (`Restricted()` selector `0xccc08913` evidenced) |

**Demo honesty:** The featured demo account may **already** be `RESTRICTED`. Do not claim a live ELIGIBLE→RESTRICTED transition on `0xe05F…` during presentation; use the eligible actor for “before,” explorers / restricted account for consequence. See [`DEMO_SPECIFICATION.md`](./DEMO_SPECIFICATION.md).

**Scope honesty:** Testnet demo only. MockUSD is test collateral on CC3; Circle USDC is the Ethereum source fact. No production-security claims.
