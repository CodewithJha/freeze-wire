# ADR-0005: TypeScript readability worker

- Status: Accepted
- Date: 2026-09-10

## Decision

Implement the worker in TypeScript, using `@gluwa/usc-sdk` where it matches Proof Builder types.

## Alternatives

Python FastAPI (abandoned implementation).

## Why rejected

Proof structs are ABI-precise; one typed stack with the SDK reduces encoder bugs. Python is not forbidden later, but not the baseline.
