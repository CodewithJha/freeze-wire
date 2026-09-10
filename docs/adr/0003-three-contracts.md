# ADR-0003: Three-contract split

- Status: Accepted
- Date: 2026-09-10

## Context

Attestcoin docs allow combined ASC+logic or separated contracts. A monolith mixes proof decoding with LTV accounting.

## Decision

`BlacklistVerifier` (no eligibility storage) → `EligibilityLedger` (only status writer) → `GatedCreditLine` (no `0x0FD2`).

## Consequences

More deploys; clearer invariants and tests; credit line cannot accidentally “help” verification.
