# Attestcoin evidence (live verified facts)

Public-only facts for auditors and integrators. Prefer this file + `deployments/demo-evidence-public.json` over chat claims.
Labels: **VERIFIED** (artifact / observed), **DOES NOT PROVE**, **REMOVAL TEST**.

---

## Network

| Item | Value | Label |
|---|---|---|
| Creditcoin CC3 testnet chainId | `102031` (`0x18e8f`) | VERIFIED |
| Attestcoin chainKey (Ethereum **mainnet** on CC3 testnet) | `3` | VERIFIED |
| BlockProver | `0x0000000000000000000000000000000000000FD2` | VERIFIED (protocol address) |
| Canonical Circle USDC | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | VERIFIED |
| Topic0 Blacklisted | `0xffa4e6181777692565cf28528fc88fd1516ea86b56da075235fa575af6a4b855` | VERIFIED (`EventSelectors` / `cast keccak`) |
| Topic0 UnBlacklisted | `0x117e3210bb9aa7d9baff172026820255c6f6c30ba8999d1c2fd88e2848137c4e` | VERIFIED |

---

## Deployed contracts (CC3 testnet)

| Contract | Address |
|---|---|
| MockUSD | `0x6943EB32EAb562791f095E91ee288627ADDdC5B3` |
| BlacklistVerifier | `0x6bf238291Bb8262918A1989831856DC6BC47D869` |
| EligibilityLedger | `0xde64d5037cA820D4aDFa703C4FaF5451be840C9d` |
| GatedCreditLine | `0xB04fFca20e0a992474E6AD501A061973dC9Ed340` |

Deploy block: `5479278` · window `minHeight=0`, `maxHeight=0` (unbounded — disclosed testnet default).

---

## Source event + proof path

| Item | Value | Label |
|---|---|---|
| Demo ETH source tx | `0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787` | VERIFIED (Etherscan) |
| Header / block | `25705174` | VERIFIED (artifact) |
| Recovered txIndex | `18` | VERIFIED (Merkle `isLeft` + Phase 3 `0x0FD2.calculateTxIndex`) |
| Restricted account | `0xe05F529f5284D75624eBa386CB716928c3b54A2A` | VERIFIED |
| Eligible demo actor (separate) | `0x6b07454d70896cad371982A57037933e24F4cD52` | VERIFIED |
| CC3 `submitProof` tx | `0x07e30451fb38776aa972603e94aeb8f779f182a5047a371195df2d598a4dfc45` | VERIFIED (Blockscout / artifact) |
| `statusOf(demo)` | `RESTRICTED` | VERIFIED (artifact) |
| `Restricted()` selector | `0xccc08913` (`cast sig "Restricted()"`) | VERIFIED |
| Draw as restricted | reverted with that signature | VERIFIED (`demo-evidence-public.json`) |

Proof Builder (CC3 testnet): `GET /api/v1/proof-by-tx/3/{demoTx}` — Phase 3 pass observed HTTP 200; re-verify live before demos if attestation lag or cache changes.

---

## What `0x0FD2` proves / does not prove

**Proves (when `verify` / `verifyAndEmit` succeeds):** Merkle inclusion of the encoded transaction under an attested header, plus continuity of the supplied continuity proof toward the attested tip.

**Does not prove:**

- Receipt success (`receiptStatus == 1`) — ASC must check
- Emitter == Circle USDC — ASC must check
- Topic0 ∈ {Blacklisted, UnBlacklisted} — ASC must check
- Account identity from topic[1] — ASC must check
- Eligibility semantics / credit gating — FreezeWire ledger + consumers

---

## Removal test (load-bearing)

**If Attestcoin / BlockProver `0x0FD2` is removed, FreezeWire cannot move an address to `RESTRICTED`.**
There is no `setStatus`, no eligibility database, and no worker privilege that can invent a blacklist. Gated credit therefore cannot inherit Circle’s flag without a proof the precompile accepts.

---

## Proof chain (short)

```text
Ethereum USDC Blacklisted log
  → Proof Builder bundle (untrusted transport)
  → EligibilityLedger.submitProof (permissionless)
  → BlacklistVerifier → 0x0FD2 verifyAndEmit
  → consumer checks (status, emitter, event, account, chainKey, window)
  → ledger write + replay key
  → GatedCreditLine.statusOf → Restricted() on draw / extractive ops
```

Normative detail: [`ATTESTCOIN_INTEGRATION.md`](./ATTESTCOIN_INTEGRATION.md) · one-pager: [`ATTESTCOIN_INTEGRATION_SUMMARY.md`](./ATTESTCOIN_INTEGRATION_SUMMARY.md).
