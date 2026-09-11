// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title EventSelectors
/// @notice Canonical Circle USDC topic0 values. Bind on hashes, never event-name strings.
library EventSelectors {
    /// @dev keccak256("Blacklisted(address)")
    bytes32 internal constant BLACKLISTED = keccak256("Blacklisted(address)");
    /// @dev keccak256("UnBlacklisted(address)")
    bytes32 internal constant UNBLACKLISTED = keccak256("UnBlacklisted(address)");
}
