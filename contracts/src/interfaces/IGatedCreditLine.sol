// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/// @notice Minimal credit line. Eligibility is read from the ledger each call.
interface IGatedCreditLine {
    function deposit(uint256 amount) external;

    function draw(uint256 amount) external;

    function repay(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function protectedTransfer(address to, uint256 amount) external;

    function lockEscrow(bytes32 id, uint256 amount) external;

    function releaseEscrow(bytes32 id, address to) external;

    function refundEscrow(bytes32 id) external;
}
