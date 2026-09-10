# ADR-0007: Permissionless submitProof

- Status: Accepted
- Date: 2026-09-10

## Decision

Anyone may call `submitProof`. There is no `setRestricted`. Relayer keys pay gas only.

## Why

SEC-001 / INV-1. If we add an owner setter, Attestcoin is decorative.
