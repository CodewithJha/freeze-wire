// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {INativeQueryVerifier} from "./INativeQueryVerifier.sol";

/// @notice Sole persistent eligibility store. Default missing key is ELIGIBLE.
interface IEligibilityLedger {
    enum Status {
        ELIGIBLE,
        RESTRICTED
    }

    function statusOf(address account) external view returns (Status);

    function submitProof(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external;
}
