# Attestcoin integration

Attestcoin is **load-bearing**. Eligibility cannot move without a proof that BlockProver accepts. This page freezes the integration against official docs fetched **2026-09-10**. See `RESEARCH_BASELINE.md` for provenance.

**Submission one-pager:** [`ATTESTCOIN_INTEGRATION_SUMMARY.md`](./ATTESTCOIN_INTEGRATION_SUMMARY.md) (14 points + removal test + live evidence).
**Live verified facts:** [`ATTESTCOIN_EVIDENCE.md`](./ATTESTCOIN_EVIDENCE.md) · **Attack matrix:** [`SECURITY_EVIDENCE.md`](./SECURITY_EVIDENCE.md).

### Proof chain (short)

```text
ETH USDC Blacklisted → Proof Builder bundle → submitProof → 0x0FD2
  → consumer checks → EligibilityLedger → GatedCreditLine (Restricted on draw)
```

`0x0FD2` proves inclusion + continuity only. Receipt success, emitter, event, and account are ASC checks. Removal of Attestcoin removes the only path to `RESTRICTED`.

---

## 1. Source chain

| Item | Demo value | Classification |
|---|---|---|
| Chain | Ethereum **mainnet** | FACT (product) |
| Contract | Circle USDC `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | FACT |
| Events | `Blacklisted(address indexed _account)`, `UnBlacklisted(address indexed _account)` | FACT (Circle source) |
| Demo tx | `0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787` | FACT (receipt re-verified) |

Sepolia is **not** the demo source. It exists on CC3 testnet as chainKey **1** and must be rejected when expected key is **3**.

---

## 2. chainKey

From [Attestcoin Protocol Chains — Environments](https://docs.attestcoin.org/attestcoin-protocol/attestcoin-protocol-chains-environments) (2026-09-10):

**CC3 testnet**

| Source | chainKey |
|---|---|
| Ethereum Sepolia | 1 |
| Ethereum mainnet | 3 |

**CC3 mainnet** (do not deploy this demo)

| Source | chainKey |
|---|---|
| Ethereum mainnet | 1 |

`chainKey` is **not** EVM `chainId`. Configured per Creditcoin environment (`INT-001`). Verifier reverts `WrongChainKey` if proof `chainKey != expected`.

---

## 3. Proof request

Base URL (FACT, official docs): `https://proof-gen-api.cc3-testnet.creditcoin.network`

Live OpenAPI (FACT, HTTP 200 this pass): `/api/swagger/openapi.json`  
Title: `Proof Gen API Server 1.0`

Primary demo path:

```http
GET /api/v1/proof-by-tx/{chain_key}/{tx_hash}
```

Example: `/api/v1/proof-by-tx/3/0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787`

Alternate:

```http
GET /api/v1/proof/{chain_key}/{header_number}/{tx_index}
```

Demo position FACT: height `25705174`, txIndex `18`.

Coordination:

```http
GET /api/v1/attested-height/{chain_key}
GET /api/v1/health
```

Health is **`/api/v1/health`**. Root `/health` was 404 this pass.

Batch (protocol max 10 queries sharing continuity — FACT docs home):

```http
POST /api/v1/proof-batch/{chain_key}
POST /api/v1/proof-batch-by-tx/{chain_key}
```

MVP does not require batch. Optional later for gas.

**Auth:** OpenAPI does not document a required API key. Prior run used the public endpoint successfully (**UNVERIFIED this pass**). Config reserves `PROOF_BUILDER_API_KEY` if the host starts requiring it.

**Alias:** `https://prover.cc3-testnet.creditcoin.network` served the same OpenAPI size this pass. Prefer the docs URL.

---

## 4. Proof structure

From live OpenAPI `SingleContinuityResponse`:

| Field | Type | Role |
|---|---|---|
| `chainKey` | uint64 | Must equal expected |
| `headerNumber` | uint64 | Source block height |
| `txIndex` | uint64 | Informational; **on-chain index recovered from Merkle path** |
| `txHash` | hex \| null | Correlate |
| `txBytes` | hex \| null | Encoded tx+receipt; this is what gets verified and decoded |
| `merkleProof.root` | bytes32 hex | Tx tree root |
| `merkleProof.siblings[]` | `{hash, isLeft}` | Inclusion path |
| `continuityProof.lowerEndpointDigest` | bytes32 | Digest of block before the chain (queryHeight−1) |
| `continuityProof.roots[]` | bytes32[] | Merkle roots; digest computed on-chain. Index 0 is the query block |
| `cached` | bool | Liveness metadata |
| `generatedAt` | datetime | Liveness metadata |

Empty `txBytes` must not be submitted (precompile rejects empty tx data — Gluwa proof-gen PR).

---

## 5. Verification

ASC calls BlockProver at `0x0000000000000000000000000000000000000FD2`.

Functions (FACT, architecture docs):

- `verify(...)` — view, no event
- `verifyAndEmit(...)` — state-changing, emits `TransactionVerified`

FreezeWire uses **`verifyAndEmit`** so Blockscout shows the verification event (demo). Tests may use a mock.

Canonical example signature (Attestcoin smart-contract docs):

```text
verifyAndEmit(
  uint64 chainKey,
  uint64 height,
  bytes encodedTransaction,
  MerkleProof merkleProof,
  ContinuityProof continuityProof
) → bool
```

Structs:

```text
MerkleProofEntry { bytes32 hash; bool isLeft; }
MerkleProof { bytes32 root; MerkleProofEntry[] siblings; }
ContinuityProof { bytes32 lowerEndpointDigest; bytes32[] roots; }
```

If `false` or revert → `ProofRejected`, no ledger write.

`verify()` vs `verifyAndEmit()`: both validate the same proofs; only the latter emits. Do not skip verification by decoding `txBytes` first.

---

## 6. Receipt status

**FACT:** “The block prover precompile does **not** validate if a transaction was successful… ASC **MUST** check the status field… `0x1` → success.”

FreezeWire: decode `receiptStatus` via `EvmV1Decoder`; require `== 1` or `SourceTxFailed`.

---

## 7. Emitter validation

After status check, walk **all** logs in the verified receipt.

Keep log iff `log.address == expectedEmitter` (checksum-insensitive compare of 20-byte address). `expectedEmitter` is constructor-immutable (ADR-0016).

Impostor `Blacklisted` on another address: skip (FR-003, SEC-003).

---

## 8. Event validation

Keep log iff `topics[0]` is:

- `keccak256("Blacklisted(address)")` = `0xffa4e6181777692565cf28528fc88fd1516ea86b56da075235fa575af6a4b855`
- `keccak256("UnBlacklisted(address)")` = `0x117e3210bb9aa7d9baff172026820255c6f6c30ba8999d1c2fd88e2848137c4e`

`Paused(address)` = `0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258` must **not** bind (CEL’s object, not ours).

Indexed account = `address(uint160(uint256(topics[1])))`. Require `topics.length >= 2`.

---

## 9. Replay protection

Application-side (FACT: official ASC `processedQueries`).

```text
key = keccak256(abi.encodePacked(chainKey, height, txIndexRecovered))
```

If `processed[key]` → `QueryAlreadyProcessed`.

Mark processed **after** successful precompile verify, **before** applying business writes (same as official example order: verify, then mark, then logic). If content validation fails after mark, that tx can never be retried — therefore **decode/status/emitter/event checks should run before marking replay**, or a failed content check would permanently burn the position.

**FreezeWire order (normative; ADR-0017 Model A — the educational minter’s “mark then require” is EVM-broken):**

1. chainKey + window
2. recover txIndex from Merkle `isLeft` path (same algorithm as precompile `calculateTxIndex`); replay check (read)
3. `verifyAndEmit` — if this fails, do **not** mark replay
4. decode + `receiptStatus == 1` + bind logs (emitter immutable, ADR-0016)
5. after successful verify **and** successful receipt with scan complete: mark replay even if no canonical match
6. if no matching event: emit `ProcessedWithoutFact` and **return** (do not revert — a revert would undo the mark)
7. apply ledger writes

**Decision freeze (ADR-0017):** If verify failed, decode failed, or `receiptStatus != 1`, do not mark. If receipt succeeded and no canonical USDC Blacklisted/UnBlacklisted log, **burn the position without reverting**. Retrying cannot help; the emitter cannot be rotated.

---

## 10. Freshness

Not a protocol field. Application window `[minHeight, maxHeight]` inclusive; `0,0` = unbounded (demo default for the August 2026 demo tx). Production should set a max age. Continuity gas grows with lag (FACT gas docs: ~10× after a day of checkpoint thinning).

`OutsideWindow` if bounds set and height outside.

---

## 11. Failure behavior

| Condition | Result |
|---|---|
| Block not attested | Proof Builder 422; worker does not submit |
| Empty block tx proof | 422 EmptyBlockTxProof |
| Precompile false | `ProofRejected` |
| status ≠ 1 | `SourceTxFailed` |
| no canonical event | success + `ProcessedWithoutFact` (replay **marked**; eligibility unchanged; ADR-0017) |
| replay | `QueryAlreadyProcessed` |
| txBytes empty / decode fail | `MalformedTx` |
| Unsupported tx type | follow decoder `isValidTransactionType` |

---

## 12. Limits

- Batch up to **10** queries sharing continuity (FACT). MVP: 1.
- Source tx **> 500 KB** may exceed CC3 block gas (FACT). USDC `blacklist` is tiny (demo receipt gas ~37k).
- Attestation delay: **several minutes** typical (INFERENCE from Toxa/CEL writeups + worker docs). Product claim: **new** credit after proof, not intra-block freeze.

---

## 13. Gas implications

From official gas page: cost ≈ base + hash ops × continuity length. Prove soon after attestation. Demo historical tx (Aug 2026) may have a **long** continuity proof — **RISK**: submit may be expensive or fail gas. Mitigation: measure `eth_estimateGas` in Phase 3; if too heavy, document and consider a **newer** real `Blacklisted` tx as demo evidence (same checks). Do not mock the event.

---

## 14. Decoder

Official CC3 testnet decoder listing: `0x731c345d79Fb8BbDC541f9DF3b6317585F849F9f`. FreezeWire vendors Gluwa `EvmV1Decoder` in-process (like CEL). Do not treat an on-chain decoder call as mandatory if the library matches encoding.

Walk **original** log order; do not use a filter helper that drops `logIndex` if ordering matters (Corolary warning — apply here for FR-007 / FR-028).

---

## 15. Writability

**Out of scope.** Official writability page: still in third-party testing/audits. Handshake-class writeback is rejected as a design.

---

## 16. Worker mapping to official pattern

Official readability worker: monitor source → wait attestation → Proof Builder → call ASC.

FreezeWire worker is that worker. Relayers are permissionless; our process is convenience (`SEC-014`).
