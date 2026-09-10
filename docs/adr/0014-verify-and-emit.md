# ADR-0014: verifyAndEmit

- Status: Accepted
- Date: 2026-09-10

## Decision

Call `verifyAndEmit` (state-changing, emits `TransactionVerified`) rather than view `verify`, so explorers show verification. Tests may mock either.
