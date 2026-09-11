// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @notice Attestcoin BlockProver surface (`0x0FD2`). Injected so tests mock verification.
/// @dev Matches official `precompiles/metadata/sol/block_prover.sol` single-query + calculateTxIndex.
///      Production config points at `0x0FD2`. Tests MUST inject a mock — do not hardwire the precompile.
interface INativeQueryVerifier {
    struct MerkleProofEntry {
        bytes32 hash;
        bool isLeft;
    }

    struct MerkleProof {
        bytes32 root;
        MerkleProofEntry[] siblings;
    }

    struct ContinuityProof {
        bytes32 lowerEndpointDigest;
        bytes32[] roots;
    }

    event TransactionVerified(uint64 indexed chainKey, uint64 indexed height, uint64 transactionIndex);

    function verify(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external view returns (bool);

    function verifyAndEmit(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        MerkleProof calldata merkleProof,
        ContinuityProof calldata continuityProof
    ) external returns (bool);

    /// @notice Recover tx index from Merkle sibling `isLeft` flags (leaf → root).
    function calculateTxIndex(MerkleProof calldata merkleProof) external view returns (uint64);
}
