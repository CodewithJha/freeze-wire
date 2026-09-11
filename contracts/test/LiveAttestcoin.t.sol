// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";

/// @notice T-INT-LIVE is gated. Deterministic CI must not call Proof Builder or CC3.
///         Run with LIVE_ATTESTCOIN=1 after fetching a bundle off-chain (see backend live test).
contract LiveAttestcoinTest is Test {
    function test_T_INT_LIVE_gated() public {
        // Live Proof Builder + 0x0FD2 evidence is the backend T-INT-LIVE test (env LIVE_ATTESTCOIN=1).
        // This Foundry test must never assert a fabricated precompile result.
        vm.skip(true);
    }
}
