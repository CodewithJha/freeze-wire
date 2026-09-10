# contracts/src/

Solidity sources. Phase 2 protocol contracts live here. See `docs/SMART_CONTRACT_SPECIFICATION.md`.

```text
interfaces/     INativeQueryVerifier, IBlacklistVerifier, IEligibilityLedger, IGatedCreditLine, IERC20Minimal
auth/           Ownable2Step (operational config only)
libraries/      EventKinds, EventSelectors, TxIndex, vendored EvmV1Decoder
BlacklistVerifier.sol   Verification boundary; real receipt walk; no eligibility storage
EligibilityLedger.sol   Sole persistent eligibility (ADR-0017 Model A replay)
GatedCreditLine.sol     Selective enforcement
MockUSD.sol             Demo ERC-20 (not Circle USDC)
ToolchainProbe.sol      Phase 1 compiler fixture
```

`BlacklistVerifier` calls the injected `INativeQueryVerifier` (`0x0FD2` in production, mock in tests), recovers `txIndex` from the Merkle path, requires `receiptStatus == 1`, and binds only constructor-immutable USDC `Blacklisted` / `UnBlacklisted` logs.
