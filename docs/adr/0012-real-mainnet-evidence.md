# ADR-0012: Real mainnet USDC blacklist as demo evidence

- Status: Accepted
- Date: 2026-09-10

## Decision

Demo uses Circle’s real `blacklist` tx `0xc9edfdbb…f787` (receipt re-verified), not a self-emitted mock.

## Consequences

Continuity proof may be long (gas risk). Fallback: newer real Blacklisted tx, same binder. Never a fake event.
