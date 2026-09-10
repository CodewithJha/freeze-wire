# ADR-0010: Deferred CI workflows

- Status: Accepted (Amended 2026-09-10, Phase 1)
- Date: 2026-09-10

## Context

Empty `forge test` / `npm test` workflows would fail before application code existed.

## Original decision

Document quality gates; do not add a GitHub Action that runs `forge test` until Phase 1+ has code.

## Why

A workflow in Gate 5A would fail and create noise. `.github/README.md` recorded the intent.

## Amended decision (Phase 1)

Phase 1 tooling exists. Add a single lightweight `.github/workflows/ci.yml`:

- `forge fmt --check`, `forge build`, `forge test`
- worker `npm run build` and `npm test`
- frontend `npm run build`

Do not add live CC3, Proof Builder, or funded-key jobs.
