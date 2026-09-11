# ADR-0016: Immutable canonical USDC emitter

- Status: Accepted
- Date: 2026-09-10

## Context

FreezeWire’s product claim is that CTC credit inherits **Circle USDC** address-level compliance — not “whatever token the verifier owner last configured.” Prior specs allowed `setExpectedEmitter`. Security docs already noted that rotating the emitter to a malicious token would inherit that token’s events (T-16).

Multi-issuer support is **out of MVP scope**. A later issuer (EURC, another FiatToken) was listed as extensibility, not a hard requirement to mutate identity after deploy.

Testnet vs mainnet Circle USDC addresses, and mock emitters in Foundry tests, can be chosen at **deployment time** from `config/networks.example.json` / constructor arguments. `expectedChainKey` and the freshness window remain environment-specific operational parameters.

## Decision

For MVP:

- Canonical USDC `expectedEmitter` is **constructor-immutable**.
- Each Creditcoin environment deploys with the correct Circle USDC address from network config. Tests inject a mock emitter.
- Owner **may** still set `expectedChainKey` and the height window.
- Owner **cannot** `setExpectedEmitter`.
- Owner still **cannot** `setStatus` / `setRestricted`.
- MVP: `EligibilityLedger`’s verifier address is also **constructor-immutable**, so the owner cannot swap in a different verifier with a different emitter. Verifier rotation would be a new ADR.
- A later issuer is a **new deployment** or a **future ADR**, not post-deploy owner rotation of this deployment’s canonical identity.

## Alternatives

Post-deploy `setExpectedEmitter` with 2-step Ownable and `ConfigUpdated` (prior FR-027). Rejected: 2-step Ownable does not make canonical USDC identity cryptographically immutable. Owner rotation is a trust-model hole equivalent to replacing the source of truth, which contradicts the claim that FreezeWire inherits Circle’s flag.

## Consequences

- Constructor must receive a nonzero emitter or revert `ZeroEmitter`.
- A wrong emitter is fixed by **redeploy** (MVP contracts are not upgradeable).
- `ConfigUpdated` covers chainKey and window only; it does not imply emitter mutability.
- T-16 / T-SEC-OWNER assert there is no `setExpectedEmitter`, and that owner cannot set eligibility.
- chainKey and window stay owner-configurable; they are not made immutable by this decision.
