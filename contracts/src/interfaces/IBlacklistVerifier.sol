// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {INativeQueryVerifier} from "./INativeQueryVerifier.sol";

/// @notice Verification boundary. Does not store eligibility.
/// @dev BoundEvent.kind is 1 = Blacklisted, 2 = UnBlacklisted (`EventKinds`).
interface IBlacklistVerifier {
    struct BoundEvent {
        address account;
        uint8 kind;
        uint64 chainKey;
        uint64 height;
        uint64 txIndex;
        uint256 logIndex;
    }

    function verifyAndBind(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external returns (BoundEvent[] memory events, uint64 txIndex);
}
