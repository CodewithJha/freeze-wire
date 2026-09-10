# Security model

## Goal

CTC credit/escrow must inherit Circle’s **address-level** USDC flag if and only if an Attestcoin-verified, consumer-checked receipt says so.

## Invariants (never violate)

| ID | Invariant |
|---|---|
| INV-1 | A backend request must never independently authorize a restricted-state transition. |
| INV-2 | Eligibility writes require `0x0FD2` success on the submitted bytes. |
| INV-3 | Only constructor-set canonical emitter + Blacklisted/UnBlacklisted bind. |
| INV-4 | Bound account is topic[1] of that log; no cross-account write. |
| INV-5 | Failed source receipts never write. |
| INV-6 | Replays of `(chainKey, height, txIndex)` never write twice. |
| INV-7 | Restricted cannot draw / protected-transfer / lock or release escrow. |
| INV-8 | Restricted can repay and withdraw unused. |
| INV-9 | Owner cannot `setStatus`. |
| INV-10 | Frontend / RPC / Proof Builder cannot become an oracle. |

## Assets

- Integrity of `EligibilityLedger.status`
- Integrity of credit/escrow accounting
- Demo credibility (real mainnet event)
- Relayer/deployer keys (ops, not protocol)
- User MockUSD balances

## Actors

| Actor | Intent | Privilege |
|---|---|---|
| Borrower | Draw/repay | User |
| Lender/operator | Demo liquidity | Minter of MockUSD (demo) |
| Honest relayer | Submit proofs | Gas only |
| Malicious relayer | Submit junk/forgeries | Same as honest — must fail checks |
| Compromised backend | Lie about blacklist | HTTP only |
| Malicious borrower | Bypass Restricted | User |
| Attacker replaying proofs | Double-apply | User |
| Malicious source contract | Fake Blacklisted | Unrelated emitter |
| Malicious frontend | Trick user | Browser |
| RPC manipulator | Lie to worker | Off-chain |
| Circle blacklister | Real flag | Ethereum (out of our control) |
| Attestors / CC3 validators | Protocol | Trusted |
| Verifier owner | Rotate chainKey/window | Operational config only; **cannot** change `expectedEmitter` or eligibility |

## Trust boundaries

| Component | May trust | Must not trust |
|---|---|---|
| Ledger | Verifier output after on-chain call | Worker JSON |
| Verifier | `0x0FD2` boolean; decoded **verified** bytes | Calldata logs pasted beside a proof |
| Credit line | `statusOf` this tx | Cached UI status |
| Worker | Nothing for writes | — |
| UI | Nothing for writes | — |
| Proof Builder | Nothing for writes | — |

## Trust remaining (stated honestly)

- Creditcoin validators and Attestcoin attestor set
- Circle FiatToken emitting faithfully
- Hosted Proof Builder for **liveness**
- Discovery completeness (we may miss a tx; we must not invent one)
- Owner cannot replace canonical USDC identity after deploy (`expectedEmitter` immutable)
- Default ELIGIBLE ≠ proven clean
- Attestation lag

## Authentication / authorization

- HTTP API: public read; relay may require local-only bind (`127.0.0.1`) in demo to avoid random strangers draining relayer gas. **Not** an authorization of eligibility.
- Contracts: permissionless `submitProof`; financial functions `msg.sender` as the user.
- No JWT “compliance role.”

## Secrets

Deployer and relayer keys in env. Never in repo, logs, or frontend bundles.

## Default ELIGIBLE

Matches Circle: not blacklisted until blacklisted. **Must be spoken in the demo.** Absence of a FreezeWire proof is not a clean bill of health on Ethereum.

## Lag

Not a same-block circuit breaker. Gates **new** draws/releases after a proven source event.

## Tokens

MockUSD is not USDC. We inherit **compliance state**, not reserves.

## Owner risk

`expectedEmitter` is constructor-immutable (ADR-0016). The owner **cannot** rotate FreezeWire onto a malicious token after deploy. A wrong emitter is a redeploy. Compromised owner can still change `expectedChainKey` and the height window (stall or admit a different Attestcoin source chain) — operational, not a replacement of Circle USDC identity on this deployment. Tests show there is no `setExpectedEmitter` and no `setStatus`.

## Observability for security

Log rejected proofs with reason codes. Monitor unexpected `ConfigUpdated`. Never log keys.
