// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {EventKinds} from "../src/libraries/EventKinds.sol";
import {EventSelectors} from "../src/libraries/EventSelectors.sol";
import {IEligibilityLedger} from "../src/interfaces/IEligibilityLedger.sol";
import {IBlacklistVerifier} from "../src/interfaces/IBlacklistVerifier.sol";
import {INativeQueryVerifier} from "../src/interfaces/INativeQueryVerifier.sol";
import {BlacklistVerifier} from "../src/BlacklistVerifier.sol";
import {EligibilityLedger} from "../src/EligibilityLedger.sol";
import {FreezeWireTestBase} from "./FreezeWireTestBase.sol";
import {ReceiptEncoder} from "./helpers/ReceiptEncoder.sol";

/// @notice T-SEC-EMITTER, T-SEC-EVENT, T-SEC-STATUS, T-SEC-TXINDEX, T-SEC-DECOY, adversarial fixtures 1–15.
contract AdversarialReceiptsTest is FreezeWireTestBase {
    bytes32 internal constant PAUSED = keccak256("Paused(address)");
    bytes32 internal constant TRANSFER = keccak256("Transfer(address,address,uint256)");

    function test_T_SEC_FAKE_unverifiedBytesCannotBind() public {
        native.setAccepted(false);
        bytes memory encoded = _encodeKind(alice, EventKinds.BLACKLISTED, emitter, 1);
        vm.expectRevert(BlacklistVerifier.ProofRejected.selector);
        verifier.verifyAndBind(CHAIN_KEY, 1, encoded, _merkle(1), emptyContinuity);
    }

    function test_T_SEC_EMITTER_wrongEmitterCorrectTopicDoesNotBind() public {
        bytes memory encoded = _encodeKind(alice, EventKinds.BLACKLISTED, makeAddr("fakeUsdc"), 1);
        (IBlacklistVerifier.BoundEvent[] memory events,) =
            verifier.verifyAndBind(CHAIN_KEY, 10, encoded, _merkle(3), emptyContinuity);
        assertEq(events.length, 0);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 10, encoded, _merkle(3), emptyContinuity);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
        assertTrue(ledger.processed(_replayKey(CHAIN_KEY, 10, 3)));
    }

    function test_T_SEC_EVENT_correctEmitterWrongTopicDoesNotBind() public {
        ReceiptEncoder.Log[] memory logs = new ReceiptEncoder.Log[](1);
        logs[0] = ReceiptEncoder.topicLog(emitter, TRANSFER, alice);
        bytes memory encoded = _encodeLogs(logs, 1);
        (IBlacklistVerifier.BoundEvent[] memory events,) =
            verifier.verifyAndBind(CHAIN_KEY, 11, encoded, _merkle(4), emptyContinuity);
        assertEq(events.length, 0);
    }

    function test_T_SEC_STATUS_failedReceiptWithCorrectEventReverts() public {
        bytes memory encoded = _encodeKind(alice, EventKinds.BLACKLISTED, emitter, 0);
        vm.expectRevert(BlacklistVerifier.SourceTxFailed.selector);
        verifier.verifyAndBind(CHAIN_KEY, 12, encoded, _merkle(5), emptyContinuity);
        vm.expectRevert(BlacklistVerifier.SourceTxFailed.selector);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 12, encoded, _merkle(5), emptyContinuity);
        assertFalse(ledger.processed(_replayKey(CHAIN_KEY, 12, 5)));
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
    }

    function test_T_SEC_TXINDEX_maliciousCallerIndexIsIgnored() public {
        bytes memory encoded = _encodeKind(alice, EventKinds.BLACKLISTED, emitter, 1);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 13, encoded, _merkle(18), emptyContinuity);
        assertTrue(ledger.processed(_replayKey(CHAIN_KEY, 13, 18)));
        assertFalse(ledger.processed(_replayKey(CHAIN_KEY, 13, 99)));
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
        vm.expectRevert(EligibilityLedger.QueryAlreadyProcessed.selector);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 13, encoded, _merkle(18), emptyContinuity);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 13, encoded, _merkle(99), emptyContinuity);
        assertTrue(ledger.processed(_replayKey(CHAIN_KEY, 13, 99)));
    }

    function test_T_SEC_DECOY_pausedAndTransferAreIgnored() public {
        ReceiptEncoder.Log[] memory logs = new ReceiptEncoder.Log[](3);
        logs[0] = ReceiptEncoder.topicLog(emitter, PAUSED, alice);
        logs[1] = ReceiptEncoder.topicLog(emitter, TRANSFER, alice);
        logs[2] = ReceiptEncoder.kindLog(emitter, bob, EventKinds.BLACKLISTED);
        bytes memory encoded = _encodeLogs(logs, 1);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 14, encoded, _merkle(6), emptyContinuity);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
        assertEq(uint256(_status(bob)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_fixture8_fakeTokenSameEventSignature() public {
        ReceiptEncoder.Log[] memory logs = new ReceiptEncoder.Log[](1);
        logs[0] = ReceiptEncoder.kindLog(makeAddr("eurc"), alice, EventKinds.BLACKLISTED);
        bytes memory encoded = _encodeLogs(logs, 1);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 15, encoded, _merkle(7), emptyContinuity);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
        assertTrue(ledger.processed(_replayKey(CHAIN_KEY, 15, 7)));
    }

    function test_fixture9_wrongChainKey() public {
        bytes memory encoded = _encodeKind(alice, EventKinds.BLACKLISTED, emitter, 1);
        vm.expectRevert(BlacklistVerifier.WrongChainKey.selector);
        vm.prank(relayer);
        ledger.submitProof(1, 16, encoded, _merkle(8), emptyContinuity);
        assertFalse(ledger.processed(_replayKey(1, 16, 8)));
    }

    function test_fixture10_staleObservationSkippedNotWholeTxRevert() public {
        _restrict(alice, 200, 5);
        ReceiptEncoder.Log[] memory logs = new ReceiptEncoder.Log[](2);
        logs[0] = ReceiptEncoder.kindLog(emitter, alice, EventKinds.UNBLACKLISTED);
        logs[1] = ReceiptEncoder.kindLog(emitter, bob, EventKinds.BLACKLISTED);
        bytes memory encoded = _encodeLogs(logs, 1);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 199, encoded, _merkle(9), emptyContinuity);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
        assertEq(uint256(_status(bob)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_fixture11_replayedProof() public {
        _restrict(alice, 17, 10);
        vm.expectRevert(EligibilityLedger.QueryAlreadyProcessed.selector);
        _restrict(alice, 17, 10);
    }

    function test_fixture12_malformedReceipt() public {
        vm.expectRevert(BlacklistVerifier.MalformedTx.selector);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 18, bytes("not-v1"), _merkle(11), emptyContinuity);
        assertFalse(ledger.processed(_replayKey(CHAIN_KEY, 18, 11)));
    }

    function test_fixture13_multipleMatchingEventsLatestWins() public {
        ReceiptEncoder.Log[] memory logs = new ReceiptEncoder.Log[](3);
        logs[0] = ReceiptEncoder.kindLog(emitter, alice, EventKinds.BLACKLISTED);
        logs[1] = ReceiptEncoder.kindLog(emitter, alice, EventKinds.UNBLACKLISTED);
        logs[2] = ReceiptEncoder.kindLog(emitter, alice, EventKinds.BLACKLISTED);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 19, _encodeLogs(logs, 1), _merkle(12), emptyContinuity);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_fixture14_multipleAccountsInOneReceipt() public {
        ReceiptEncoder.Log[] memory logs = new ReceiptEncoder.Log[](2);
        logs[0] = ReceiptEncoder.kindLog(emitter, alice, EventKinds.BLACKLISTED);
        logs[1] = ReceiptEncoder.kindLog(emitter, bob, EventKinds.UNBLACKLISTED);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 20, _encodeLogs(logs, 1), _merkle(13), emptyContinuity);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
        assertEq(uint256(_status(bob)), uint256(IEligibilityLedger.Status.ELIGIBLE));
        _restrict(bob, 21, 1);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_fixture15_proofWithNoRelevantEvent() public {
        ReceiptEncoder.Log[] memory logs = new ReceiptEncoder.Log[](1);
        logs[0] = ReceiptEncoder.topicLog(emitter, PAUSED, alice);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 22, _encodeLogs(logs, 1), _merkle(14), emptyContinuity);
        assertTrue(ledger.processed(_replayKey(CHAIN_KEY, 22, 14)));
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
    }

    function test_incorrectAccountClaimCannotRedirect() public {
        bytes memory encoded = _encodeKind(bob, EventKinds.BLACKLISTED, emitter, 1);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 23, encoded, _merkle(15), emptyContinuity);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
        assertEq(uint256(_status(bob)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_logWithMissingIndexedTopicIsSkipped() public {
        bytes32[] memory topics = new bytes32[](1);
        topics[0] = EventSelectors.BLACKLISTED;
        ReceiptEncoder.Log[] memory logs = new ReceiptEncoder.Log[](1);
        logs[0] = ReceiptEncoder.Log({emitter: emitter, topics: topics, data: ""});
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 24, _encodeLogs(logs, 1), _merkle(16), emptyContinuity);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
        assertTrue(ledger.processed(_replayKey(CHAIN_KEY, 24, 16)));
    }

    /// @notice Named Model-A case: invalid Merkle sibling path → precompile rejects → ProofRejected.
    /// @dev Mock does not evaluate sibling hashes; `accepted=false` stands in for 0x0FD2 reject.
    function test_invalidMerkleSibling_revertsProofRejected() public {
        native.setAccepted(false);
        bytes memory encoded = _encodeKind(alice, EventKinds.BLACKLISTED, emitter, 1);
        INativeQueryVerifier.MerkleProof memory bad = _merkle(42);
        // Corrupt sibling hash (would fail real Merkle; mock gates on accepted).
        if (bad.siblings.length > 0) {
            bad.siblings[0].hash = bytes32(uint256(0xdead));
        }
        vm.expectRevert(BlacklistVerifier.ProofRejected.selector);
        verifier.verifyAndBind(CHAIN_KEY, 50, encoded, bad, emptyContinuity);
        vm.expectRevert(BlacklistVerifier.ProofRejected.selector);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 50, encoded, bad, emptyContinuity);
        assertFalse(ledger.processed(_replayKey(CHAIN_KEY, 50, 42)));
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
    }

    /// @notice Named Model-A case: corrupted continuity roots → precompile rejects → ProofRejected.
    function test_corruptedContinuity_revertsProofRejected() public {
        native.setAccepted(false);
        bytes memory encoded = _encodeKind(alice, EventKinds.BLACKLISTED, emitter, 1);
        INativeQueryVerifier.ContinuityProof memory bad;
        bad.lowerEndpointDigest = bytes32(uint256(0xbad));
        bad.roots = new bytes32[](1);
        bad.roots[0] = bytes32(uint256(0xcafe));
        vm.expectRevert(BlacklistVerifier.ProofRejected.selector);
        verifier.verifyAndBind(CHAIN_KEY, 51, encoded, _merkle(7), bad);
        vm.expectRevert(BlacklistVerifier.ProofRejected.selector);
        vm.prank(relayer);
        ledger.submitProof(CHAIN_KEY, 51, encoded, _merkle(7), bad);
        assertFalse(ledger.processed(_replayKey(CHAIN_KEY, 51, 7)));
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
    }
}
