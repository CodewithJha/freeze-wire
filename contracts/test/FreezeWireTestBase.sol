// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {EventKinds} from "../src/libraries/EventKinds.sol";
import {INativeQueryVerifier} from "../src/interfaces/INativeQueryVerifier.sol";
import {IEligibilityLedger} from "../src/interfaces/IEligibilityLedger.sol";
import {MockNativeQueryVerifier} from "./mocks/MockNativeQueryVerifier.sol";
import {BlacklistVerifier} from "../src/BlacklistVerifier.sol";
import {EligibilityLedger} from "../src/EligibilityLedger.sol";
import {MockUSD} from "../src/MockUSD.sol";
import {GatedCreditLine} from "../src/GatedCreditLine.sol";
import {ReceiptEncoder} from "./helpers/ReceiptEncoder.sol";

abstract contract FreezeWireTestBase is Test {
    using ReceiptEncoder for *;

    uint64 internal constant CHAIN_KEY = 3;
    uint256 internal constant LTV_BPS = 5000;
    uint256 internal constant USD = 1e6;

    address internal owner = makeAddr("owner");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal relayer = makeAddr("relayer");
    address internal backend = makeAddr("backend");
    address internal emitter = makeAddr("usdcEmitter");

    MockNativeQueryVerifier internal native;
    BlacklistVerifier internal verifier;
    EligibilityLedger internal ledger;
    MockUSD internal usd;
    GatedCreditLine internal credit;

    INativeQueryVerifier.MerkleProof internal emptyMerkle;
    INativeQueryVerifier.ContinuityProof internal emptyContinuity;

    function setUp() public virtual {
        native = new MockNativeQueryVerifier();
        verifier = new BlacklistVerifier(native, emitter, CHAIN_KEY, 0, 0, owner);
        ledger = new EligibilityLedger(verifier);
        usd = new MockUSD(address(this));
        credit = new GatedCreditLine(ledger, usd, LTV_BPS);

        usd.mint(alice, 1_000_000 * USD);
        usd.mint(bob, 1_000_000 * USD);
        vm.prank(alice);
        usd.approve(address(credit), type(uint256).max);
        vm.prank(bob);
        usd.approve(address(credit), type(uint256).max);
    }

    function _encodeFact(address account, uint8 kind, uint256, uint64) internal view returns (bytes memory) {
        return _encodeKind(account, kind, emitter, uint8(1));
    }

    function _encodeKind(address account, uint8 kind, address logEmitter, uint8 status)
        internal
        pure
        returns (bytes memory)
    {
        ReceiptEncoder.Log[] memory logs = new ReceiptEncoder.Log[](1);
        logs[0] = ReceiptEncoder.kindLog(logEmitter, account, kind);
        return ReceiptEncoder.encodeType2(status, logs);
    }

    function _encodeLogs(ReceiptEncoder.Log[] memory logs, uint8 status) internal pure returns (bytes memory) {
        return ReceiptEncoder.encodeType2(status, logs);
    }

    function _merkle(uint64 txIndex) internal pure returns (INativeQueryVerifier.MerkleProof memory) {
        return ReceiptEncoder.merkleForIndex(txIndex);
    }

    function _submit(address caller, uint64 height, address account, uint8 kind, uint256, uint64 txIndex) internal {
        bytes memory encoded = _encodeKind(account, kind, emitter, 1);
        vm.prank(caller);
        ledger.submitProof(CHAIN_KEY, height, encoded, _merkle(txIndex), emptyContinuity);
    }

    function _restrict(address account, uint64 height, uint64 txIndex) internal {
        _submit(relayer, height, account, EventKinds.BLACKLISTED, 0, txIndex);
    }

    function _restore(address account, uint64 height, uint64 txIndex) internal {
        _submit(relayer, height, account, EventKinds.UNBLACKLISTED, 0, txIndex);
    }

    function _status(address account) internal view returns (IEligibilityLedger.Status) {
        return ledger.statusOf(account);
    }

    function _replayKey(uint64 chainKey, uint64 height, uint64 txIndex) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(chainKey, height, txIndex));
    }
}
