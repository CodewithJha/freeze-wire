// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {INativeQueryVerifier} from "../interfaces/INativeQueryVerifier.sol";

/// @title TxIndex
/// @notice Recover source-tx index from a Merkle inclusion path. Never take index from the caller.
/// @dev Matches Creditcoin BlockProver `calculateTxIndex` (`gluwa/creditcoin3` precompile):
///      siblings are leaf → root; `isLeft == true` means the current node was the right child (bit = 1).
library TxIndex {
    uint256 internal constant MAX_SIBLINGS = 64;

    error TooManySiblings();

    /// @notice Reconstruct the leaf index from Merkle sibling position flags.
    function fromMerkle(INativeQueryVerifier.MerkleProof memory proof) internal pure returns (uint64 txIndex) {
        uint256 n = proof.siblings.length;
        if (n > MAX_SIBLINGS) revert TooManySiblings();
        for (uint256 i; i < n; ++i) {
            if (proof.siblings[i].isLeft) {
                // i < 64 because siblings.length is capped at MAX_SIBLINGS.
                // forge-lint: disable-next-line(unsafe-typecast)
                txIndex |= uint64(1) << uint64(i);
            }
        }
    }
}
