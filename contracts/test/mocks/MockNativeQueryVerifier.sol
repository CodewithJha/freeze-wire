// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {INativeQueryVerifier} from "../../src/interfaces/INativeQueryVerifier.sol";
import {TxIndex} from "../../src/libraries/TxIndex.sol";

/// @notice Test double for Attestcoin BlockProver. Does not implement Merkle/continuity.
/// @dev `calculateTxIndex` uses the same isLeft algorithm as the real precompile so unit tests
///      recover index from the proof path, not from a caller-chosen integer.
contract MockNativeQueryVerifier is INativeQueryVerifier {
    bool public accepted = true;

    function setAccepted(bool accepted_) external {
        accepted = accepted_;
    }

    function verify(uint64, uint64, bytes calldata, MerkleProof calldata, ContinuityProof calldata)
        external
        view
        override
        returns (bool)
    {
        return accepted;
    }

    event NativeQueryChecked(bool accepted);

    function verifyAndEmit(uint64, uint64, bytes calldata, MerkleProof calldata, ContinuityProof calldata)
        external
        override
        returns (bool)
    {
        emit NativeQueryChecked(accepted);
        return accepted;
    }

    function calculateTxIndex(MerkleProof calldata merkleProof) external pure override returns (uint64) {
        return TxIndex.fromMerkle(merkleProof);
    }
}
