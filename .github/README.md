# .github/

Phase 1 enables a single lightweight workflow: `.github/workflows/ci.yml`.

It runs:

- `forge fmt --check`, `forge build`, `forge test`
- worker `npm ci && npm run build && npm test`
- frontend `npm ci && npm run build`

No live CC3 RPC, Proof Builder, or secret-scanning jobs. See ADR-0010 (amended) and `docs/DEVELOPMENT_PLAN.md`.
