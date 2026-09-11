// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @notice Bound-event kind tags shared by verifier and ledger. Not Circle topic0 values.
library EventKinds {
    uint8 internal constant BLACKLISTED = 1;
    uint8 internal constant UNBLACKLISTED = 2;
}
