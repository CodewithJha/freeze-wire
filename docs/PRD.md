# Product Requirements Document — FreezeWire

**Status:** Product freeze for implementation (specs under `docs/` are source of truth)

---

## Problem

Stablecoin **address-level** compliance is decided on Ethereum by the issuer (Circle `blacklist` / `unBlacklist` on USDC). Credit and escrow on Creditcoin do not automatically inherit that flag.

Today, a CTC lending or escrow contract either:

1. ignores Ethereum compliance and keeps extending credit to an address Circle has already flagged, or
2. trusts a backend, indexer, or “monitoring vendor” that *asserts* the flag.

There is no path where the Creditcoin contract **verifies the issuer event itself**.

This is a different problem from asset pause (CEL) and from solvency/reputation (Corolary). The object is the **counterparty**, not the instrument.

## Target user

Primary: a **Creditcoin credit or escrow operator** who must refuse **new** exposure to an address that the canonical USDC issuer has blacklisted on Ethereum, without appointing FreezeWire’s servers as an oracle.

Secondary (demo personas):

- **Lender / protocol** — wants draws and escrow release to fail once the flag is proven
- **Borrower** — must still be able to repay and withdraw unused own funds (no hostage)
- **Auditor** — must independently re-read Etherscan + Blockscout + precompile, not our database

## Current workflow

1. Circle blacklister calls `blacklist(account)` on Ethereum USDC.
2. Ethereum indexers and compliance vendors update off-chain lists.
3. A CTC app, if it cares at all, polls a vendor API or runs a privileged `setRestricted(account)` from a backend key.
4. If the backend lies, lags, or is down, CTC credit diverges from issuer state.

## Pain point

The destination chain has **Attestcoin readability** — cryptographic inclusion of the source transaction — but typical CTC credit apps still treat compliance as an **off-chain opinion**. That fails the product bar (Attestcoin must be load-bearing) and fails a real auditor: “who told Creditcoin this address was blacklisted?”

A freeze that also locks repayment converts compliance into a hostage situation. Selective enforcement is part of the product, not a nicety.

## Product

FreezeWire is a Creditcoin protocol that:

1. Accepts an Attestcoin proof of a **canonical USDC** `Blacklisted` or `UnBlacklisted` log on **Ethereum mainnet**.
2. Verifies inclusion + continuity at BlockProver `0x0FD2`.
3. Applies **consumer checks** the precompile does not do (receipt status, emitter, event, account, chainKey, freshness window, replay).
4. Writes **address-keyed** compliance state: `ELIGIBLE` | `RESTRICTED`.
5. Enforces that state on a demo **gated credit line** (and minimal escrow): new credit and release fail when `RESTRICTED`; repay and unused withdrawal succeed.

The off-chain worker only **discovers** and **relays**. `submitProof` is permissionless.

## Core value proposition

CTC dollars used as credit/escrow can **inherit Circle’s address-level flag** with an explorer-verifiable proof, without FreezeWire’s backend as the authority.

What becomes possible: an auditor can open a real Ethereum `blacklist` transaction, see the proof verify on Creditcoin, see the ledger flip, and see a draw revert — and the sentence is true:

> The backend never told Creditcoin the address was blacklisted. The Attestcoin proof did.

## User journey

```text
1. Operator deploys Verifier, Ledger, CreditLine, MockUSD on CC3 testnet.
2. Demo borrower (any address; for the live evidence path, the Circle-blacklisted account) deposits MockUSD and draws while ELIGIBLE.
3. A real Ethereum USDC Blacklisted tx exists (demo: 0xc9edfdbb…f787).
4. Worker (or any relayer) fetches Proof Builder bundle for chainKey=3.
5. Anyone calls EligibilityLedger.submitProof(proof…).
6. Ledger binds the account from the verified log; state → RESTRICTED.
7. draw / protectedTransfer / escrow release revert; repay / withdraw unused succeed.
8. A later proven UnBlacklisted (newer position) restores ELIGIBLE.
```

Discovery of *which* tx to prove can be assisted by the worker. Verification cannot.

## Functional requirements (summary)

Normative IDs: `docs/REQUIREMENTS.md`.

- Verify Attestcoin proofs on-chain; reject unverified bytes.
- Bind only canonical USDC `Blacklisted` / `UnBlacklisted` logs.
- Key state by **address**, not by asset.
- Permissionless `submitProof`; no `setRestricted` owner path.
- Selective financial enforcement (never trap exits).
- Demo UI that shows the full proof chain with a real mainnet event.
- Worker: discover / prove / relay / health — no authorization.

## Non-functional requirements (summary)

- Security: backend untrusted; consumer checks complete; replay-safe.
- Reliability: explicit errors at RPC, proof, and contract boundaries.
- Observability: structured logs with source tx, proof ids, CTC tx hashes; never keys.
- Determinism: ordering by `(chainKey, height, txIndex, logIndex)` recovered from proof/receipt, not caller metadata.
- Maintainability: modular contracts and worker packages; config-driven networks.
- Performance: single-tx proofs in MVP; prove as soon as attested to limit continuity gas (docs).
- Extensibility: chainKey and freshness window remain owner-configurable operational params. Canonical USDC emitter is constructor-immutable (ADR-0016); a later issuer is a new deployment or future ADR, not owner rotation.

## Constraints

| Constraint | Detail |
|---|---|
| Attestcoin | Readability available on CC3 testnet. Writability **not** in scope (docs: still in audit). |
| Environment | CC3 testnet chain id **102031**. Public RPC. |
| Infra | Hosted Proof Builder (liveness). Public Ethereum RPC (liveness). No Credal dependency. |
| Wallets | A **funded** CC3 EVM key is required for deploy/relay. Faucet is Discord `#token-faucet`. |
| Deployment | Current public deploy is **testnet only**. Mainnet chainKeys differ (ETH mainnet is chainKey 1 there). |
| Evidence | Demo must use a **real** Ethereum mainnet USDC `Blacklisted`, not a mock event we emit. |
| Workspace | Standalone repo at the FreezeWire repository root. Kaggriculture is a separate project; do not modify it. |
| Scope | MVP, not a production compliance engine. |

## Success criteria (measurable)

1. `forge test` covers consumer checks listed in SEC/INT (see TEST_STRATEGY).
2. Live CC3: `0x0FD2` accepts a Proof Builder bundle for the demo source tx (**or** a documented replacement if that bundle is no longer served).
3. After `submitProof`, Blockscout shows ledger state `RESTRICTED` for `0xe05F…4A2A` (or the bound account) **without** an owner setter.
4. Restricted `draw` reverts; `repay` succeeds on the same account.
5. A short live demo script in `DEMO_SPECIFICATION.md` can be executed against explorers.
6. Forgery cases (wrong emitter, wrong event, failed receipt, replay, wrong chainKey) revert in tests.

## Out of scope (MVP)

- Attestcoin **writability** / messages back to Ethereum
- Bridging or wrapping real USDC onto Creditcoin
- Claiming MockUSD is USDC or a claim on Circle reserves
- Full KYC/AML, travel rule, or regulator integrations
- Multi-issuer registry UI (demo is USDC only; a later issuer requires a new deployment or future ADR, not owner rotation of `expectedEmitter`)
- Unblacklisting **in the live demo walkthrough** (must exist in tests and spec; optional in live demo when time is short)
- Production mainnet deploy
- Credal
- A privileged compliance officer role that writes eligibility
- Same-block circuit breaker of in-flight CTC transactions
- Batch proofs (optional gas optimization, not required)
- Database / indexer product
- Mobile apps

## Future scope

- Multiple emitters (EURC, other FiatToken chains) via new deployments or a future ADR — not post-deploy owner rotation of this deployment’s canonical USDC identity
- Batch proofs (up to 10) after MVP
- Paid third-party readability relayers when Gluwa offers them
- Tighter freshness policy for production
- Optional “explicit ELIGIBLE only after UnBlacklisted” mode (would invert default; not Circle’s model)
- Mainnet deploy with CC3-mainnet chainKey **1** for Ethereum
