# backend/

Off-chain **readability worker**. Implements `docs/API_SPECIFICATION.md` (Phase 4). The worker is **not an authority**.

## Purpose

Discover relevant Ethereum logs, request Attestcoin proofs, and relay them to `EligibilityLedger.submitProof`.

A compromised backend cannot move eligibility without a proof that `0x0FD2` accepts and that consumer checks bind. There is no `setRestricted` / status-setter API.

Modules:

```text
backend/src/
├── config/          env + typed network config (relayer key optional)
├── domain/          proof/event types, ABI fragments, errors — no Solidity business logic
├── clients/         Proof Builder, CC3 RPC, ETH RPC (transport only)
├── services/        discover, prove, relay, health/status/evidence
├── api/             HTTP surface
└── observability/   structured logs (secrets redacted)
```

## Run

```text
cd backend && npm ci && npm run build && npm test
npm start   # requires prove-path env (see ../.env.example)
```

Live (gated, not CI):

```text
LIVE_ATTESTCOIN=1 npm test
# Optional funded broadcast only:
# LIVE_ATTESTCOIN=1 LIVE_RELAY_BROADCAST=1 npm test
```

## API (summary)

| Method | Path | Notes |
|---|---|---|
| GET | `/v1/health` | Liveness + upstream checks |
| GET | `/v1/prove/{txHash}` | Proof Builder bundle; does **not** update eligibility |
| POST | `/v1/relay` | `submitProof` broadcast or `404 RELAY_DISABLED` + calldata |
| GET | `/v1/evidence/demo` | Static demo pointers |
| GET | `/v1/discover` | Candidate USDC blacklist txs (+ pinned demo) |
| GET | `/v1/status/{address}` | Convenience `statusOf` read |

If `RELAY_PRIVATE_KEY` is unset: **404 `RELAY_DISABLED`** with `{ submitProof: { to, data } }` for wallet submission.

No database. See `docs/DATA_MODEL.md` / ADR-0004.
