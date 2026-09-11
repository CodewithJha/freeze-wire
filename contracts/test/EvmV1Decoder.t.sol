// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {EvmV1Decoder} from "../src/libraries/EvmV1Decoder.sol";
import {EventSelectors} from "../src/libraries/EventSelectors.sol";
import {EventKinds} from "../src/libraries/EventKinds.sol";
import {ReceiptEncoder} from "./helpers/ReceiptEncoder.sol";

/// @notice T-SC-DECODE: generic EVM V1 walk, not demo-tx-only.
contract EvmV1DecoderTest is Test {
    function test_documentedTopic0Hashes() public pure {
        assertEq(
            EventSelectors.BLACKLISTED, bytes32(0xffa4e6181777692565cf28528fc88fd1516ea86b56da075235fa575af6a4b855)
        );
        assertEq(
            EventSelectors.UNBLACKLISTED, bytes32(0x117e3210bb9aa7d9baff172026820255c6f6c30ba8999d1c2fd88e2848137c4e)
        );
        assertEq(
            keccak256("Paused(address)"), bytes32(0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258)
        );
    }

    function test_T_SC_DECODE_accountFromIndexedTopic() public pure {
        address account = address(0xe05F529f5284D75624eBa386CB716928c3b54A2A);
        ReceiptEncoder.Log[] memory logs = new ReceiptEncoder.Log[](1);
        logs[0] = ReceiptEncoder.kindLog(
            address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48), account, EventKinds.BLACKLISTED
        );
        bytes memory encoded = ReceiptEncoder.encodeType2(1, logs);
        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encoded);
        assertEq(receipt.receiptStatus, 1);
        assertEq(receipt.receiptLogs.length, 1);
        assertEq(receipt.receiptLogs[0].topics.length, 2);
        assertEq(address(uint160(uint256(receipt.receiptLogs[0].topics[1]))), account);
    }

    function test_decodeUnblacklistedAndUnrelatedLogs() public pure {
        ReceiptEncoder.Log[] memory logs = new ReceiptEncoder.Log[](3);
        logs[0] = ReceiptEncoder.topicLog(address(1), keccak256("Transfer(address,address,uint256)"), address(2));
        logs[1] = ReceiptEncoder.kindLog(address(3), address(4), EventKinds.UNBLACKLISTED);
        logs[2] = ReceiptEncoder.topicLog(address(3), keccak256("Paused(address)"), address(4));
        bytes memory encoded = ReceiptEncoder.encodeType2(1, logs);
        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encoded);
        assertEq(receipt.receiptLogs.length, 3);
        assertEq(receipt.receiptLogs[1].topics[0], EventSelectors.UNBLACKLISTED);
        assertEq(receipt.receiptLogs[0].topics[0], keccak256("Transfer(address,address,uint256)"));
    }

    function test_decodeFailedReceiptStatus() public pure {
        ReceiptEncoder.Log[] memory logs = new ReceiptEncoder.Log[](1);
        logs[0] = ReceiptEncoder.kindLog(address(1), address(2), EventKinds.BLACKLISTED);
        bytes memory encoded = ReceiptEncoder.encodeType2(0, logs);
        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(encoded);
        assertEq(receipt.receiptStatus, 0);
    }

    function test_decodeType0AndType2() public pure {
        ReceiptEncoder.Log[] memory logs = new ReceiptEncoder.Log[](0);
        bytes memory t0 = ReceiptEncoder.encodeReceipt(0, 1, logs);
        bytes memory t2 = ReceiptEncoder.encodeReceipt(2, 1, logs);
        assertEq(EvmV1Decoder.getTransactionType(t0), 0);
        assertEq(EvmV1Decoder.getTransactionType(t2), 2);
        assertTrue(EvmV1Decoder.isValidTransactionType(0));
        assertTrue(EvmV1Decoder.isValidTransactionType(4));
        assertFalse(EvmV1Decoder.isValidTransactionType(5));
        assertEq(EvmV1Decoder.decodeReceiptFields(t0).receiptStatus, 1);
        assertEq(EvmV1Decoder.decodeReceiptFields(t2).receiptStatus, 1);
    }

    function test_malformedEmptyReverts() public {
        vm.expectRevert(bytes("EvmV1Decoder: Empty"));
        this.decode(bytes(""));
    }

    function decode(bytes calldata data) external pure returns (EvmV1Decoder.ReceiptFields memory) {
        return EvmV1Decoder.decodeReceiptFields(data);
    }

    function test_T_SC_REALBYTES_demoTxBytes() public view {
        string memory raw = vm.readLine("contracts/test/fixtures/demo-txbytes.hex");
        bytes memory txBytes = vm.parseBytes(raw);
        assertEq(EvmV1Decoder.getTransactionType(txBytes), 2);
        EvmV1Decoder.ReceiptFields memory receipt = EvmV1Decoder.decodeReceiptFields(txBytes);
        assertEq(receipt.receiptStatus, 1);
        assertEq(receipt.receiptLogs.length, 1);
        assertEq(receipt.receiptLogs[0].address_, 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48);
        assertEq(receipt.receiptLogs[0].topics[0], EventSelectors.BLACKLISTED);
        assertEq(
            address(uint160(uint256(receipt.receiptLogs[0].topics[1]))), 0xe05F529f5284D75624eBa386CB716928c3b54A2A
        );
    }
}
