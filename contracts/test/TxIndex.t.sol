// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {INativeQueryVerifier} from "../src/interfaces/INativeQueryVerifier.sol";
import {TxIndex} from "../src/libraries/TxIndex.sol";

/// @notice Official BlockProver calculateTxIndex vectors (gluwa/creditcoin3).
contract TxIndexTest is Test {
    function _proof(bool[] memory isLeft) internal pure returns (INativeQueryVerifier.MerkleProof memory proof) {
        proof.root = bytes32(uint256(1));
        proof.siblings = new INativeQueryVerifier.MerkleProofEntry[](isLeft.length);
        for (uint256 i; i < isLeft.length; ++i) {
            proof.siblings[i] =
                INativeQueryVerifier.MerkleProofEntry({hash: bytes32(uint256(i + 2)), isLeft: isLeft[i]});
        }
    }

    function test_emptySiblingsIsZero() public pure {
        INativeQueryVerifier.MerkleProof memory proof;
        assertEq(TxIndex.fromMerkle(proof), 0);
    }

    function test_singleSiblingLeftIsOne() public pure {
        bool[] memory bits = new bool[](1);
        bits[0] = true;
        assertEq(TxIndex.fromMerkle(_proof(bits)), 1);
    }

    function test_singleSiblingRightIsZero() public pure {
        bool[] memory bits = new bool[](1);
        bits[0] = false;
        assertEq(TxIndex.fromMerkle(_proof(bits)), 0);
    }

    function test_indexTwoFirstRightSecondLeft() public pure {
        bool[] memory bits = new bool[](2);
        bits[0] = false;
        bits[1] = true;
        assertEq(TxIndex.fromMerkle(_proof(bits)), 2);
    }

    function test_demoTxIndexEighteen() public pure {
        // 18 = 0b10010
        bool[] memory bits = new bool[](5);
        bits[0] = false;
        bits[1] = true;
        bits[2] = false;
        bits[3] = false;
        bits[4] = true;
        assertEq(TxIndex.fromMerkle(_proof(bits)), 18);
    }

    function test_patternTwentyOne() public pure {
        bool[] memory bits = new bool[](5);
        bits[0] = true;
        bits[1] = false;
        bits[2] = true;
        bits[3] = false;
        bits[4] = true;
        assertEq(TxIndex.fromMerkle(_proof(bits)), 21);
    }

    function test_tooManySiblingsReverts() public {
        INativeQueryVerifier.MerkleProof memory proof;
        proof.siblings = new INativeQueryVerifier.MerkleProofEntry[](65);
        vm.expectRevert(TxIndex.TooManySiblings.selector);
        this.externalFromMerkle(proof);
    }

    function externalFromMerkle(INativeQueryVerifier.MerkleProof memory proof) external pure returns (uint64) {
        return TxIndex.fromMerkle(proof);
    }
}
