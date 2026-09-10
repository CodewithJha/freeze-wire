# ADR-0008: Default ELIGIBLE

- Status: Accepted
- Date: 2026-09-10

## Decision

Missing ledger keys read as `ELIGIBLE`.

## Alternatives

`NO_PROOF` fail-closed (CEL-like instrument states).

## Why rejected for this product

Circle’s model is not-blacklisted-until-blacklisted. Fail-closed would claim more than we prove. **Must be disclosed in demo.**
