# contracts/

Foundry Solidity tree (`src/`, `test/`, `script/`).

`foundry.toml` lives at the **repository git root** because Foundry treats the git root as the project root. Paths in that file point here (`contracts/src`, `contracts/test`, `contracts/script`, `contracts/lib`). Run `forge build` / `forge test` / `forge fmt --check` from the repository root.

Phase 2: `BlacklistVerifier` (mocked fact extraction), `EligibilityLedger`, `GatedCreditLine`, `MockUSD`, plus the Phase 1 `ToolchainProbe` compile fixture. Real Attestcoin verification is Phase 3.

```text
contracts/
├── src/                  Protocol contracts
│   ├── interfaces/       INativeQueryVerifier, IBlacklistVerifier, IEligibilityLedger, IGatedCreditLine
│   ├── libraries/        EventKinds, Phase 2 mock fact codec
│   └── ...
├── test/                 forge tests (eligibility, finance, security)
├── script/               deploy / submitProof scripts (Phase 8)
└── lib/forge-std         vendored forge-std v1.16.2 (not a git submodule)
```

## Purpose

- `src/` — BlacklistVerifier, EligibilityLedger, GatedCreditLine, MockUSD, interfaces
- `test/` — unit and security invariant tests with a mocked native verifier
- `script/` — broadcastable Foundry scripts (Phase 8)

See `docs/SMART_CONTRACT_SPECIFICATION.md` and ADR-0002 (Foundry).
