// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IEligibilityLedger} from "../src/interfaces/IEligibilityLedger.sol";
import {GatedCreditLine} from "../src/GatedCreditLine.sol";
import {FreezeWireTestBase} from "./FreezeWireTestBase.sol";

/// @notice T-FIN-* selective enforcement against the ledger.
contract GatedCreditLineTest is FreezeWireTestBase {
    uint256 internal constant COLLATERAL = 1000 * USD;

    function test_T_FIN_DEPOSIT_eligibleAndRestrictedCanDeposit() public {
        vm.prank(alice);
        credit.deposit(COLLATERAL);
        assertEq(credit.deposited(alice), COLLATERAL);

        _restrict(alice, 10, 1);
        vm.prank(alice);
        credit.deposit(100 * USD);
        assertEq(credit.deposited(alice), COLLATERAL + 100 * USD);
    }

    function test_eligibleCanDrawRepayWithdraw() public {
        vm.prank(alice);
        credit.deposit(COLLATERAL);
        vm.prank(alice);
        credit.draw(400 * USD);
        assertEq(credit.debt(alice), 400 * USD);
        assertEq(usd.balanceOf(alice), 1_000_000 * USD - COLLATERAL + 400 * USD);

        vm.prank(alice);
        credit.repay(100 * USD);
        assertEq(credit.debt(alice), 300 * USD);

        uint256 unused = credit.unusedOf(alice);
        vm.prank(alice);
        credit.withdraw(unused);
        assertEq(credit.unusedOf(alice), 0);
    }

    function test_T_FIN_DRAW_restrictedCannotDraw() public {
        vm.prank(alice);
        credit.deposit(COLLATERAL);
        _restrict(alice, 10, 1);
        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.Restricted.selector);
        credit.draw(1 * USD);
        assertEq(credit.debt(alice), 0);
    }

    function test_T_FIN_XFER_restrictedCannotProtectedTransfer() public {
        vm.prank(alice);
        credit.deposit(COLLATERAL);
        _restrict(alice, 10, 1);
        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.Restricted.selector);
        credit.protectedTransfer(bob, 1 * USD);
    }

    function test_eligibleProtectedTransferMovesUnused() public {
        vm.prank(alice);
        credit.deposit(COLLATERAL);
        vm.prank(alice);
        credit.protectedTransfer(bob, 250 * USD);
        assertEq(credit.deposited(alice), COLLATERAL - 250 * USD);
        assertEq(usd.balanceOf(bob), 1_000_000 * USD + 250 * USD);
    }

    function test_T_FIN_ESCROW_restrictedCannotLockOrRelease() public {
        bytes32 id = keccak256("escrow-1");
        vm.prank(alice);
        credit.deposit(COLLATERAL);
        vm.prank(alice);
        credit.lockEscrow(id, 50 * USD);

        _restrict(alice, 11, 2);
        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.Restricted.selector);
        credit.lockEscrow(keccak256("escrow-2"), 10 * USD);

        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.Restricted.selector);
        credit.releaseEscrow(id, bob);

        assertTrue(credit.escrowOpen(id));
    }

    function test_T_FIN_REFUND_restrictedCanRefundEscrow() public {
        bytes32 id = keccak256("escrow-refund");
        uint256 beforeBal = usd.balanceOf(alice);
        vm.prank(alice);
        credit.lockEscrow(id, 50 * USD);
        _restrict(alice, 11, 2);
        vm.prank(alice);
        credit.refundEscrow(id);
        assertEq(usd.balanceOf(alice), beforeBal);
        assertFalse(credit.escrowOpen(id));
    }

    function test_eligibleCanLockAndReleaseEscrow() public {
        bytes32 id = keccak256("escrow-ok");
        vm.prank(alice);
        credit.lockEscrow(id, 50 * USD);
        uint256 bobBefore = usd.balanceOf(bob);
        vm.prank(alice);
        credit.releaseEscrow(id, bob);
        assertEq(usd.balanceOf(bob), bobBefore + 50 * USD);
        assertFalse(credit.escrowOpen(id));
    }

    function test_T_FIN_REPAY_restrictedCanRepay() public {
        vm.prank(alice);
        credit.deposit(COLLATERAL);
        vm.prank(alice);
        credit.draw(400 * USD);
        _restrict(alice, 12, 3);
        vm.prank(alice);
        credit.repay(150 * USD);
        assertEq(credit.debt(alice), 250 * USD);
    }

    function test_T_FIN_WITHDRAW_restrictedCanWithdrawUnusedNotLocked() public {
        vm.prank(alice);
        credit.deposit(COLLATERAL);
        vm.prank(alice);
        credit.draw(400 * USD);
        _restrict(alice, 12, 3);

        uint256 unused = credit.unusedOf(alice);
        assertGt(unused, 0);
        vm.prank(alice);
        credit.withdraw(unused);
        assertEq(credit.unusedOf(alice), 0);

        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.InsufficientAvailable.selector);
        credit.withdraw(1);
    }

    function test_withdrawCannotStripCollateralForDebt() public {
        vm.prank(alice);
        credit.deposit(COLLATERAL);
        vm.prank(alice);
        credit.draw(500 * USD);
        assertEq(credit.unusedOf(alice), 0);
        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.InsufficientAvailable.selector);
        credit.withdraw(1);
    }

    function test_refundUnknownEscrowReverts() public {
        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.UnknownEscrow.selector);
        credit.refundEscrow(keccak256("missing"));
    }

    function test_releaseNotOwnerReverts() public {
        bytes32 id = keccak256("owned-by-alice");
        vm.prank(alice);
        credit.lockEscrow(id, 10 * USD);
        vm.prank(bob);
        vm.expectRevert(GatedCreditLine.NotEscrowOwner.selector);
        credit.releaseEscrow(id, bob);
    }

    function test_protectedTransferZeroAddressReverts() public {
        vm.prank(alice);
        credit.deposit(COLLATERAL);
        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.ZeroAddress.selector);
        credit.protectedTransfer(address(0), 1 * USD);
    }

    function test_statusIsReadEachCallNotSticky() public {
        vm.prank(alice);
        credit.deposit(COLLATERAL);
        vm.prank(alice);
        credit.draw(10 * USD);
        _restrict(alice, 99, 1);
        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.Restricted.selector);
        credit.draw(10 * USD);
    }

    function testFuzz_restrictedCannotProtectedOps(uint256 amount) public {
        amount = bound(amount, 1, COLLATERAL);
        vm.prank(alice);
        credit.deposit(COLLATERAL);
        _restrict(alice, 3, 3);
        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.Restricted.selector);
        credit.draw(amount);
        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.Restricted.selector);
        credit.protectedTransfer(bob, amount);
        vm.prank(alice);
        vm.expectRevert(GatedCreditLine.Restricted.selector);
        credit.lockEscrow(keccak256(abi.encode(amount)), amount);
    }
}
