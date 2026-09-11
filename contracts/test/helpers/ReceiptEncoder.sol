// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {EvmV1Decoder} from "../../src/libraries/EvmV1Decoder.sol";
import {EventSelectors} from "../../src/libraries/EventSelectors.sol";
import {EventKinds} from "../../src/libraries/EventKinds.sol";
import {INativeQueryVerifier} from "../../src/interfaces/INativeQueryVerifier.sol";

/// @notice Builds Gluwa EVM V1 `txBytes` fixtures. Generic over logs — not demo-tx-only.
library ReceiptEncoder {
    struct Log {
        address emitter;
        bytes32[] topics;
        bytes data;
    }

    function encodeReceipt(uint8 txType, uint8 receiptStatus, Log[] memory logs) internal pure returns (bytes memory) {
        require(txType <= 4, "bad type");
        bytes memory chunk0 =
            abi.encode(uint64(1), uint64(21_000), address(0xBEEF), false, address(0xCAFE), uint256(0), bytes(""));
        bytes memory chunk1 = _typeChunk(txType);
        bytes memory receiptChunk = _receiptChunk(receiptStatus, logs);

        uint256 n = txType <= 2 ? 3 : 4;
        bytes[] memory chunks = new bytes[](n);
        chunks[0] = chunk0;
        chunks[1] = chunk1;
        if (txType <= 2) {
            chunks[2] = receiptChunk;
        } else {
            chunks[2] = bytes("");
            chunks[3] = receiptChunk;
        }
        return abi.encode(txType, chunks);
    }

    function encodeType2(uint8 receiptStatus, Log[] memory logs) internal pure returns (bytes memory) {
        return encodeReceipt(2, receiptStatus, logs);
    }

    function kindLog(address emitter, address account, uint8 kind) internal pure returns (Log memory log) {
        bytes32[] memory topics = new bytes32[](2);
        if (kind == EventKinds.BLACKLISTED) {
            topics[0] = EventSelectors.BLACKLISTED;
        } else if (kind == EventKinds.UNBLACKLISTED) {
            topics[0] = EventSelectors.UNBLACKLISTED;
        } else {
            topics[0] = bytes32(uint256(1));
        }
        topics[1] = bytes32(uint256(uint160(account)));
        log = Log({emitter: emitter, topics: topics, data: ""});
    }

    function topicLog(address emitter, bytes32 topic0, address account) internal pure returns (Log memory log) {
        bytes32[] memory topics = new bytes32[](2);
        topics[0] = topic0;
        topics[1] = bytes32(uint256(uint160(account)));
        log = Log({emitter: emitter, topics: topics, data: ""});
    }

    function merkleForIndex(uint64 txIndex) internal pure returns (INativeQueryVerifier.MerkleProof memory proof) {
        if (txIndex == 0) {
            return proof;
        }
        uint256 bits = 0;
        uint64 t = txIndex;
        while (t > 0) {
            unchecked {
                ++bits;
                t >>= 1;
            }
        }
        proof.root = bytes32(uint256(0x11));
        proof.siblings = new INativeQueryVerifier.MerkleProofEntry[](bits);
        for (uint256 i; i < bits; ++i) {
            proof.siblings[i] = INativeQueryVerifier.MerkleProofEntry({
                hash: keccak256(abi.encode(txIndex, i)),
                // i < 64 for any uint64 index bit width.
                // forge-lint: disable-next-line(unsafe-typecast)
                isLeft: (txIndex & (uint64(1) << uint64(i))) != 0
            });
        }
    }

    function _typeChunk(uint8 txType) private pure returns (bytes memory) {
        if (txType == 0) {
            return abi.encode(uint128(1), uint256(27), bytes32(0), bytes32(0));
        }
        EvmV1Decoder.AccessListEntryBytes32[] memory al;
        if (txType == 1) {
            return abi.encode(uint64(1), uint128(1), al, uint8(0), bytes32(0), bytes32(0));
        }
        return abi.encode(uint64(1), uint128(1), uint128(1), al, uint8(0), bytes32(0), bytes32(0));
    }

    function _receiptChunk(uint8 receiptStatus, Log[] memory logs) private pure returns (bytes memory) {
        EvmV1Decoder.LogEntryTuple[] memory tuples = new EvmV1Decoder.LogEntryTuple[](logs.length);
        for (uint256 i; i < logs.length; ++i) {
            tuples[i] =
                EvmV1Decoder.LogEntryTuple({address_: logs[i].emitter, topics: logs[i].topics, data: logs[i].data});
        }
        return abi.encode(receiptStatus, uint64(21_000), tuples, bytes(""));
    }
}
