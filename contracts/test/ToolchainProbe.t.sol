// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Test} from "forge-std/Test.sol";
import {ToolchainProbe} from "../src/ToolchainProbe.sol";

contract ToolchainProbeTest is Test {
    function test_versionMatchesPinnedSolc() public {
        ToolchainProbe probe = new ToolchainProbe();
        assertEq(probe.version(), "0.8.23");
    }
}
