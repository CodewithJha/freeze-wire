# backend/src

Phase 4 readability worker sources. Layout:

| Dir | Role |
|---|---|
| `config/` | Env + networks resolution. Relayer key optional; prove-path URLs fail fast. |
| `domain/` | Typed models, ABI fragments, hex helpers, API errors. No Solidity business logic. |
| `clients/` | Proof Builder + CC3/ETH JSON-RPC transport. |
| `services/` | discover / prove / relay / health / status / evidence. |
| `api/` | Thin HTTP handlers (`docs/API_SPECIFICATION.md`). |
| `observability/` | Structured logs; secrets redacted. |

Entry: `index.ts` (`npm start` → HTTP on `WORKER_HOST`:`WORKER_PORT`).
