// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @title ToolchainProbe
/// @notice Phase 1 compile fixture only. Not protocol logic.
contract ToolchainProbe {
    function version() external pure returns (string memory) {
        return "0.8.23";
    }
}
