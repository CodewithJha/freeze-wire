# scripts/

Operator and demo helper scripts (Phase 6+). Not application business logic.

Intended later:

- `check-env.sh` — validate `.env` against `.env.example` keys (no secret printing)
- `smoke-cc3.sh` — RPC chain id, precompile bytecode presence, Proof Builder health
- demo evidence fetch (read-only)

Do not put private keys in scripts. Foundry broadcast lives in `contracts/script/`.
