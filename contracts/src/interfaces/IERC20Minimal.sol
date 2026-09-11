// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @notice Minimal ERC-20 surface used by the credit line.
interface IERC20Minimal {
    function transfer(address to, uint256 amount) external returns (bool);

    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}
