# Contributing

FreezeWire is an independent open-source project. Documentation in `docs/` is the **source of truth**. Code follows the docs; docs are not rewritten after the fact to match improvisation.

## Before writing application code

1. Read `docs/SOURCE_OF_TRUTH.md`.
2. Confirm the change maps to a requirement ID in `docs/REQUIREMENTS.md`.
3. If the change is architectural, add or update an ADR under `docs/adr/` and a row in `docs/DECISION_LOG.md`.
4. Do not hard-code network IDs, RPC URLs, contract addresses, or secrets. Use `config/` and environment variables (see `.env.example`).

## Repository rules

- FreezeWire is a **standalone Git repository**. Do not mix unrelated project trees into this repo.
- Do not commit `.env`, keys, or mnemonics.
- Do not nest a second git repository inside this tree.
- Keep commits logically grouped. Examples: `docs: establish product requirements`, `feat: implement compliance ledger`. Do not use messages like `final` or `working`.

## Engineering rules (non-negotiable)

Documented in `docs/TECHNICAL_SPECIFICATION.md`:

- Modularity (no monoliths)
- Configuration over hard-coded business values
- Separation of domain / infra / presentation / config / security / observability
- Explicit error handling at every external boundary
- Attestcoin is load-bearing: eligibility state must not move without a verified proof

## Tests

Every new requirement needs a test mapping in `docs/TEST_STRATEGY.md` before or with the implementation.

## Review

If implementation reality forces a spec change:

```text
Code change → update the relevant specification → record the decision → update tests
```
