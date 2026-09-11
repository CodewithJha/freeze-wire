# FreezeWire

## What it is
FreezeWire turns an externally verified Ethereum compliance event into a Creditcoin financial-access decision — via cryptographic proof, not trust.

## Who it is for
Protocol builders, credit operators, and auditors who need honest evidence → proof → ledger → access behavior.

## Product truth (non-negotiable)
- App state and APIs are authoritative. Never fabricate ELIGIBLE, tx hashes, metrics, or success.
- UNKNOWN / NOT YET ATTESTED is honest — never imply clean.
- Relay-disabled returns calldata; UI must not claim broadcast.
- Contracts remain the source of truth for eligibility and gating.

## Unique mechanism
Evidence travels a provenance spine: Ethereum event → cryptographic proof → Creditcoin ledger → financial access boundary.

## Assumptions (from redesign brief)
- Demo workspace is both product story and operable console.
- Display typeface target is ABC Paloma (Dinamo); until licensed, a temporary OFL stand-in may ship labeled UNVERIFIED.
