// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {BlacklistVerifier} from "../src/BlacklistVerifier.sol";
import {Ownable2Step} from "../src/auth/Ownable2Step.sol";
import {EventKinds} from "../src/libraries/EventKinds.sol";
import {EventSelectors} from "../src/libraries/EventSelectors.sol";
import {IBlacklistVerifier} from "../src/interfaces/IBlacklistVerifier.sol";
import {INativeQueryVerifier} from "../src/interfaces/INativeQueryVerifier.sol";
import {FreezeWireTestBase} from "./FreezeWireTestBase.sol";
import {ReceiptEncoder} from "./helpers/ReceiptEncoder.sol";

/// @notice Verifier config, mock boundary, T-SEC-CHAIN, T-SEC-WINDOW, T-SEC-OWNER (emitter).
contract BlacklistVerifierTest is FreezeWireTestBase {
    function test_constructorSetsImmutableEmitter() public view {
        assertEq(verifier.expectedEmitter(), emitter);
        assertEq(verifier.expectedChainKey(), CHAIN_KEY);
        assertEq(address(verifier.nativeVerifier()), address(native));
        assertEq(verifier.owner(), owner);
    }

    function test_zeroEmitterReverts() public {
        vm.expectRevert(BlacklistVerifier.ZeroEmitter.selector);
        new BlacklistVerifier(native, address(0), CHAIN_KEY, 0, 0, owner);
    }

    function test_zeroNativeVerifierReverts() public {
        vm.expectRevert(BlacklistVerifier.ZeroVerifier.selector);
        new BlacklistVerifier(INativeQueryVerifier(address(0)), emitter, CHAIN_KEY, 0, 0, owner);
    }

    function test_T_SEC_CHAIN_wrongChainKeyReverts() public {
        bytes memory encoded = _encodeFact(alice, EventKinds.BLACKLISTED, 0, 1);
        vm.expectRevert(BlacklistVerifier.WrongChainKey.selector);
        verifier.verifyAndBind(1, 100, encoded, emptyMerkle, emptyContinuity);
    }

    function test_T_SEC_WINDOW_outsideWindowReverts() public {
        vm.prank(owner);
        verifier.setWindow(10, 20);
        bytes memory encoded = _encodeFact(alice, EventKinds.BLACKLISTED, 0, 1);
        vm.expectRevert(BlacklistVerifier.OutsideWindow.selector);
        verifier.verifyAndBind(CHAIN_KEY, 9, encoded, emptyMerkle, emptyContinuity);
        vm.expectRevert(BlacklistVerifier.OutsideWindow.selector);
        verifier.verifyAndBind(CHAIN_KEY, 21, encoded, emptyMerkle, emptyContinuity);
    }

    function test_windowInclusiveBoundsPass() public {
        vm.prank(owner);
        verifier.setWindow(10, 20);
        bytes memory encoded = _encodeFact(alice, EventKinds.BLACKLISTED, 0, 1);
        (IBlacklistVerifier.BoundEvent[] memory events,) =
            verifier.verifyAndBind(CHAIN_KEY, 10, encoded, emptyMerkle, emptyContinuity);
        assertEq(events.length, 1);
        (events,) = verifier.verifyAndBind(CHAIN_KEY, 20, encoded, emptyMerkle, emptyContinuity);
        assertEq(events.length, 1);
    }

    function test_unboundedWindowZeroZero() public {
        bytes memory encoded = _encodeFact(alice, EventKinds.BLACKLISTED, 0, 1);
        (IBlacklistVerifier.BoundEvent[] memory events, uint64 txIndex) =
            verifier.verifyAndBind(CHAIN_KEY, 0, encoded, _merkle(1), emptyContinuity);
        assertEq(events.length, 1);
        assertEq(txIndex, 1);
    }

    function test_proofRejectedWhenNativeReturnsFalse() public {
        native.setAccepted(false);
        bytes memory encoded = _encodeFact(alice, EventKinds.BLACKLISTED, 0, 1);
        vm.expectRevert(BlacklistVerifier.ProofRejected.selector);
        verifier.verifyAndBind(CHAIN_KEY, 1, encoded, emptyMerkle, emptyContinuity);
    }

    function test_malformedPayloadReverts() public {
        vm.expectRevert(BlacklistVerifier.MalformedTx.selector);
        verifier.verifyAndBind(CHAIN_KEY, 1, bytes("not-a-fact"), emptyMerkle, emptyContinuity);
    }

    function test_bindReturnsStructuredFacts() public {
        ReceiptEncoder.Log[] memory logs = new ReceiptEncoder.Log[](5);
        logs[0] = ReceiptEncoder.topicLog(emitter, keccak256("Transfer(address,address,uint256)"), alice);
        logs[1] = ReceiptEncoder.topicLog(emitter, keccak256("Paused(address)"), alice);
        logs[2] = ReceiptEncoder.kindLog(bob, alice, EventKinds.BLACKLISTED);
        logs[3] = ReceiptEncoder.topicLog(makeAddr("impostor"), EventSelectors.BLACKLISTED, alice);
        logs[4] = ReceiptEncoder.kindLog(emitter, alice, EventKinds.BLACKLISTED);
        bytes memory encoded = ReceiptEncoder.encodeType2(1, logs);
        (IBlacklistVerifier.BoundEvent[] memory events, uint64 txIndex) =
            verifier.verifyAndBind(CHAIN_KEY, 25705174, encoded, _merkle(18), emptyContinuity);
        assertEq(txIndex, 18);
        assertEq(events.length, 1);
        assertEq(events[0].account, alice);
        assertEq(events[0].kind, EventKinds.BLACKLISTED);
        assertEq(events[0].chainKey, CHAIN_KEY);
        assertEq(events[0].height, 25705174);
        assertEq(events[0].txIndex, 18);
        assertEq(events[0].logIndex, 4);
    }

    function test_ownerCanSetChainKeyAndWindow() public {
        vm.prank(owner);
        vm.expectEmit(false, false, false, true, address(verifier));
        emit BlacklistVerifier.ConfigUpdated(9, 0, 0);
        verifier.setExpectedChainKey(9);
        vm.prank(owner);
        vm.expectEmit(false, false, false, true, address(verifier));
        emit BlacklistVerifier.ConfigUpdated(9, 1, 2);
        verifier.setWindow(1, 2);
        assertEq(verifier.expectedChainKey(), 9);
        assertEq(verifier.minHeight(), 1);
        assertEq(verifier.maxHeight(), 2);
    }

    function test_nonOwnerCannotSetConfig() public {
        vm.prank(alice);
        vm.expectRevert(Ownable2Step.NotOwner.selector);
        verifier.setExpectedChainKey(1);
        vm.prank(alice);
        vm.expectRevert(Ownable2Step.NotOwner.selector);
        verifier.setWindow(1, 2);
    }

    function test_T_SEC_OWNER_noSetExpectedEmitter() public {
        (bool ok,) = address(verifier).call(abi.encodeWithSignature("setExpectedEmitter(address)", alice));
        assertFalse(ok);
        assertEq(verifier.expectedEmitter(), emitter);
    }

    function test_ownerCannotSetEligibilityOnVerifier() public {
        (bool ok,) = address(verifier).call(abi.encodeWithSignature("setStatus(address,uint8)", alice, 1));
        assertFalse(ok);
        (ok,) = address(verifier).call(abi.encodeWithSignature("setRestricted(address,bool)", alice, true));
        assertFalse(ok);
    }

    function test_verifierDoesNotStoreEligibility() public {
        bytes memory encoded = _encodeFact(alice, EventKinds.BLACKLISTED, 0, 1);
        verifier.verifyAndBind(CHAIN_KEY, 1, encoded, emptyMerkle, emptyContinuity);
        (bool ok, bytes memory data) = address(verifier).staticcall(abi.encodeWithSignature("statusOf(address)", alice));
        assertFalse(ok);
        assertEq(data.length, 0);
    }

    function test_maxHeightZeroMeansNoMax() public {
        vm.prank(owner);
        verifier.setWindow(5, 0);
        bytes memory encoded = _encodeFact(alice, EventKinds.BLACKLISTED, 0, 1);
        (IBlacklistVerifier.BoundEvent[] memory events,) =
            verifier.verifyAndBind(CHAIN_KEY, 1_000_000, encoded, emptyMerkle, emptyContinuity);
        assertEq(events.length, 1);
        vm.expectRevert(BlacklistVerifier.OutsideWindow.selector);
        verifier.verifyAndBind(CHAIN_KEY, 4, encoded, emptyMerkle, emptyContinuity);
    }
}
