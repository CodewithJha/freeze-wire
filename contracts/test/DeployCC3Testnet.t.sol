// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {INativeQueryVerifier} from "../src/interfaces/INativeQueryVerifier.sol";
import {BlacklistVerifier} from "../src/BlacklistVerifier.sol";
import {EligibilityLedger} from "../src/EligibilityLedger.sol";
import {GatedCreditLine} from "../src/GatedCreditLine.sol";
import {MockUSD} from "../src/MockUSD.sol";
import {IEligibilityLedger} from "../src/interfaces/IEligibilityLedger.sol";

/// @notice Local smoke for deploy wiring (not live CC3 / not real 0x0FD2).
contract DeployCC3TestnetSmokeTest is Test {
    address internal constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    function test_deployOrder_wiresImmutableEmitterAndLedger() public {
        address owner = makeAddr("owner");
        address native = makeAddr("nativeVerifier");

        MockUSD usd = new MockUSD(address(this));
        BlacklistVerifier verifier = new BlacklistVerifier(INativeQueryVerifier(native), USDC, 3, 0, 0, owner);
        EligibilityLedger ledger = new EligibilityLedger(verifier);
        GatedCreditLine credit = new GatedCreditLine(ledger, usd, 5000);

        assertEq(address(verifier.nativeVerifier()), native);
        assertEq(verifier.expectedEmitter(), USDC);
        assertEq(uint256(verifier.expectedChainKey()), 3);
        assertEq(address(ledger.blacklistVerifier()), address(verifier));
        assertEq(address(credit.ledger()), address(ledger));
        assertEq(address(credit.asset()), address(usd));
        assertEq(credit.ltvBps(), 5000);
        assertEq(uint8(ledger.statusOf(owner)), uint8(IEligibilityLedger.Status.ELIGIBLE));
    }
}
