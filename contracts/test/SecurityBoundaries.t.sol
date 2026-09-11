// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {EventKinds} from "../src/libraries/EventKinds.sol";
import {IEligibilityLedger} from "../src/interfaces/IEligibilityLedger.sol";
import {IBlacklistVerifier} from "../src/interfaces/IBlacklistVerifier.sol";
import {EligibilityLedger} from "../src/EligibilityLedger.sol";
import {GatedCreditLine} from "../src/GatedCreditLine.sol";
import {FreezeWireTestBase} from "./FreezeWireTestBase.sol";

/// @notice T-SEC-PERM, T-SEC-AUTH, T-SEC-OWNER. No backend/frontend/owner eligibility authority.
contract SecurityBoundariesTest is FreezeWireTestBase {
    function test_T_SEC_PERM_noSetStatusOnLedger() public {
        (bool ok,) = address(ledger).call(abi.encodeWithSignature("setStatus(address,uint8)", alice, 1));
        assertFalse(ok);
        (ok,) = address(ledger).call(abi.encodeWithSignature("setRestricted(address)", alice));
        assertFalse(ok);
        (ok,) = address(ledger).call(abi.encodeWithSignature("setEligible(address)", alice));
        assertFalse(ok);
        (ok,) = address(ledger).call(abi.encodeWithSignature("setStatus(address,uint256)", alice, 1));
        assertFalse(ok);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
    }

    function test_owner_cannot_set_status() public {
        vm.prank(owner);
        (bool ok,) = address(ledger).call(abi.encodeWithSignature("setStatus(address,uint8)", alice, 1));
        assertFalse(ok);
        vm.prank(owner);
        (ok,) = address(verifier).call(abi.encodeWithSignature("setStatus(address,uint8)", alice, 1));
        assertFalse(ok);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));
    }

    function test_backendIdentityHasNoSpecialAuthority() public {
        vm.prank(backend);
        (bool ok,) = address(ledger).call(abi.encodeWithSignature("setRestricted(address,bool)", alice, true));
        assertFalse(ok);

        _submit(backend, 1, alice, EventKinds.BLACKLISTED, 0, 1);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));

        vm.prank(alice);
        credit.deposit(10 * USD);
        vm.expectRevert(GatedCreditLine.Restricted.selector);
        vm.prank(alice);
        credit.draw(1);
    }

    function test_unauthorizedCannotMutateLedgerStorage() public {
        _restrict(alice, 1, 1);
        vm.prank(alice);
        (bool ok,) = address(ledger).call(abi.encodeWithSignature("status(address)", alice));
        assertFalse(ok);
        vm.prank(relayer);
        (ok,) = address(ledger).call(abi.encodeWithSignature("processed(bytes32)", bytes32(0)));
        // processed is a public getter — allowed read, not a write
        assertTrue(ok);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_creditLineHasNoIndependentEligibilityOracle() public view {
        (bool ok, bytes memory data) = address(credit).staticcall(abi.encodeWithSignature("statusOf(address)", alice));
        assertFalse(ok);
        assertEq(data.length, 0);
        assertEq(address(credit.ledger()), address(ledger));
    }

    function test_T_SEC_AUTH_directDrawCannotBypassLedger() public {
        vm.prank(alice);
        credit.deposit(100 * USD);
        _restrict(alice, 2, 2);
        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.Restricted.selector);
        credit.draw(1 * USD);
        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.Restricted.selector);
        credit.protectedTransfer(bob, 1 * USD);
        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.Restricted.selector);
        credit.lockEscrow(bytes32(uint256(1)), 1 * USD);
        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.Restricted.selector);
        credit.releaseEscrow(bytes32(uint256(1)), bob);
    }

    function test_onlyLedgerPathMutatesEligibility() public {
        bytes memory encoded = _encodeFact(alice, EventKinds.BLACKLISTED, 0, 9);
        verifier.verifyAndBind(CHAIN_KEY, 3, encoded, emptyMerkle, emptyContinuity);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));

        vm.prank(alice);
        credit.deposit(10 * USD);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.ELIGIBLE));

        _submit(relayer, 3, alice, EventKinds.BLACKLISTED, 0, 9);
        assertEq(uint256(_status(alice)), uint256(IEligibilityLedger.Status.RESTRICTED));
    }

    function test_zeroVerifierConstructorReverts() public {
        vm.expectRevert(EligibilityLedger.ZeroVerifier.selector);
        new EligibilityLedger(IBlacklistVerifier(address(0)));
    }

    function test_creditLineDoesNotExposeNativeVerifier() public view {
        (bool ok,) = address(credit).staticcall(abi.encodeWithSignature("nativeVerifier()"));
        assertFalse(ok);
        (ok,) = address(credit).staticcall(abi.encodeWithSignature("blacklistVerifier()"));
        assertFalse(ok);
    }
}
