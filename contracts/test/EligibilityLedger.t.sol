// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {EventKinds} from "../src/libraries/EventKinds.sol";
import {IEligibilityLedger} from "../src/interfaces/IEligibilityLedger.sol";
import {BlacklistVerifier} from "../src/BlacklistVerifier.sol";
import {EligibilityLedger} from "../src/EligibilityLedger.sol";
import {FreezeWireTestBase} from "./FreezeWireTestBase.sol";
import {ReceiptEncoder} from "./helpers/ReceiptEncoder.sol";

/// @notice T-SC-DEFAULT, T-SC-RESTRICT, T-SC-RESTORE, T-SC-VERIFY, T-SEC-REPLAY, FR-009.
contract EligibilityLedgerTest is FreezeWireTestBase {
    function test_T_SC_DEFAULT_missingAddressIsEligible() public view {
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
        assertEq(uint256(_status(address(0))), uint256(IEligibilityLedger.Status.ELIGIBLE));
    }

    function test_T_SC_RESTRICT_verifiedBlacklistedBecomesRestricted() public {
        _restrict(alice, 100, 18);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
        assertEq(uint256(_status(bob)), uint256(IEligibilityLedger.Status.ELIGIBLE));
    }

    function test_T_SC_RESTORE_newerUnblacklistedRestoresEligible() public {
        _restrict(alice, 100, 18);
        _restore(alice, 101, 1);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
    }

    function test_olderUnblacklistedCannotOverwriteNewerBlacklisted() public {
        _restrict(alice, 200, 5);
        _restore(alice, 199, 9);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_olderBlacklistedCannotOverwriteNewerUnblacklisted() public {
        _restrict(alice, 50, 1);
        _restore(alice, 200, 1);
        _restrict(alice, 199, 99);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
    }

    function test_sameHeightOlderTxIndexIsStale() public {
        _restrict(alice, 100, 10);
        _restore(alice, 100, 9);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_sameQueryOlderLogIndexIsStaleWithinLaterTx() public {
        _restrict(alice, 100, 10);
        ReceiptEncoder.Log[] memory facts = new ReceiptEncoder.Log[](1);
        facts[0] = ReceiptEncoder.kindLog(emitter, alice, EventKinds.UNBLACKLISTED);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 101, _encodeLogs(facts, 1), _merkle(1), emptyContinuity);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));

        facts[0] = ReceiptEncoder.kindLog(emitter, alice, EventKinds.BLACKLISTED);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 101, _encodeLogs(facts, 1), _merkle(2), emptyContinuity);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_T_SC_VERIFY_unverifiedFactsCannotMutate() public {
        native.setAccepted(false);
        vm.expectRevert(BlacklistVerifier.ProofRejected.selector);
        _restrict(alice, 100, 18);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
        assertFalse(ledger.processed(_replayKey(CHAIN_KEY, 100, 18)));
    }

    function test_submitProofIsPermissionless() public {
        _submit(backend, 80, alice, EventKinds.BLACKLISTED, 0, 3);
        _submit(makeAddr("stranger"), 81, bob, EventKinds.BLACKLISTED, 1, 4);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
        assertEq(uint256(_status(bob)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_T_SEC_REPLAY_sameObservationRejected() public {
        _restrict(alice, 25705174, 18);
        vm.expectRevert(EligibilityLedger.QueryAlreadyProcessed.selector);
        _restrict(alice, 25705174, 18);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_replayBurnsEvenWhenEventContentDiffers() public {
        _restrict(alice, 10, 7);
        bytes memory encoded = _encodeFact(bob, EventKinds.BLACKLISTED, 1, 7);
        vm.expectRevert(EligibilityLedger.QueryAlreadyProcessed.selector);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 10, encoded, _merkle(7), emptyContinuity);
        assertEq(uint256(_status(bob)), uint256(IEligibilityLedger.Status.ELIGIBLE));
    }

    function test_emptyMatchBurnsReplayWithoutRevert_ModelA() public {
        ReceiptEncoder.Log[] memory facts = new ReceiptEncoder.Log[](0);
        bytes memory encoded = _encodeLogs(facts, 1);
        bytes32 key = _replayKey(CHAIN_KEY, 12, 22);
        vm.expectEmit(true, false, false, true, address(ledger));
        emit EligibilityLedger.ProcessedWithoutFact(key);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 12, encoded, _merkle(22), emptyContinuity);
        assertTrue(ledger.processed(key));
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
        vm.expectRevert(EligibilityLedger.QueryAlreadyProcessed.selector);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 12, encoded, _merkle(22), emptyContinuity);
    }

    function test_failedVerifyDoesNotMarkReplay() public {
        native.setAccepted(false);
        vm.expectRevert(BlacklistVerifier.ProofRejected.selector);
        _restrict(alice, 12, 22);
        native.setAccepted(true);
        _restrict(alice, 12, 22);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_T_SEC_ACCOUNT_blacklistedBobDoesNotChangeAlice() public {
        _restrict(bob, 5, 1);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
        assertEq(uint256(_status(bob)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_multipleFactsInOneQueryApplyInOrder() public {
        ReceiptEncoder.Log[] memory facts = new ReceiptEncoder.Log[](2);
        facts[0] = ReceiptEncoder.kindLog(emitter, alice, EventKinds.BLACKLISTED);
        facts[1] = ReceiptEncoder.kindLog(emitter, alice, EventKinds.UNBLACKLISTED);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 40, _encodeLogs(facts, 1), _merkle(2), emptyContinuity);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
    }

    function test_restrictedThenBlacklistedInSameQueryEndsRestricted() public {
        ReceiptEncoder.Log[] memory facts = new ReceiptEncoder.Log[](2);
        facts[0] = ReceiptEncoder.kindLog(emitter, alice, EventKinds.UNBLACKLISTED);
        facts[1] = ReceiptEncoder.kindLog(emitter, alice, EventKinds.BLACKLISTED);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 40, _encodeLogs(facts, 1), _merkle(2), emptyContinuity);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_emitsRestrictedAndRestored() public {
        bytes32 key = _replayKey(CHAIN_KEY, 100, 18);
        vm.expectEmit(true, true, false, true, address(ledger));
        emit EligibilityLedger.Restricted(alice, key);
        _restrict(alice, 100, 18);

        key = _replayKey(CHAIN_KEY, 101, 1);
        vm.expectEmit(true, true, false, true, address(ledger));
        emit EligibilityLedger.Restored(alice, key);
        _restore(alice, 101, 1);
    }

    function testFuzz_unseenAddressIsEligible(address account) public view {
        assertEq(uint256(_status(account)), uint256(IEligibilityLedger.Status.ELIGIBLE));
    }

    function testFuzz_olderPositionCannotOverwrite(address account, uint64 newerHeight, uint64 olderHeight) public {
        vm.assume(account != address(0));
        vm.assume(newerHeight > olderHeight);
        vm.assume(newerHeight > 0);
        _restrict(account, newerHeight, 1);
        _restore(account, olderHeight, type(uint64).max);
        assertEq(uint256(_status(account)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function testFuzz_submitProofAnyCaller(address caller, address account, uint64 height, uint64 txIndex) public {
        vm.assume(account != address(0));
        vm.assume(caller != address(0));
        _submit(caller, height, account, EventKinds.BLACKLISTED, 0, txIndex);
        assertEq(uint256(_status(account)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }
}
