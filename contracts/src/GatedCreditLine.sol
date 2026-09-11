// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {IEligibilityLedger} from "./interfaces/IEligibilityLedger.sol";
import {IERC20Minimal} from "./interfaces/IERC20Minimal.sol";
import {IGatedCreditLine} from "./interfaces/IGatedCreditLine.sol";

/// @title GatedCreditLine
/// @notice Minimal credit line. Reads eligibility from the ledger on every protected call.
/// @dev Does not call Attestcoin, store eligibility, or accept owner overrides.
contract GatedCreditLine is IGatedCreditLine {
    uint256 internal constant BPS = 10_000;

    IEligibilityLedger public immutable ledger;
    IERC20Minimal public immutable asset;
    uint256 public immutable ltvBps;

    mapping(address => uint256) public deposited;
    mapping(address => uint256) public debt;

    struct Escrow {
        address locker;
        uint256 amount;
        bool open;
    }

    mapping(bytes32 => Escrow) internal _escrows;

    event Deposited(address indexed account, uint256 amount);
    event Drawn(address indexed account, uint256 amount);
    event Repaid(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event TransferProtected(address indexed from, address indexed to, uint256 amount);
    event EscrowLocked(bytes32 indexed id, address indexed locker, uint256 amount);
    event EscrowReleased(bytes32 indexed id, address indexed to, uint256 amount);
    event EscrowRefunded(bytes32 indexed id, address indexed locker, uint256 amount);

    error Restricted();
    error InsufficientAvailable();
    error UnknownEscrow();
    error NotEscrowOwner();
    error ZeroAddress();
    error InvalidLtv();
    error TransferFailed();
    error EscrowAlreadyOpen();

    constructor(IEligibilityLedger ledger_, IERC20Minimal asset_, uint256 ltvBps_) {
        if (address(ledger_) == address(0) || address(asset_) == address(0)) revert ZeroAddress();
        if (ltvBps_ == 0 || ltvBps_ > BPS) revert InvalidLtv();
        ledger = ledger_;
        asset = asset_;
        ltvBps = ltvBps_;
    }

    function unusedOf(address account) public view returns (uint256) {
        uint256 locked = _lockedCollateral(debt[account]);
        uint256 dep = deposited[account];
        if (locked >= dep) return 0;
        return dep - locked;
    }

    function escrowOpen(bytes32 id) external view returns (bool) {
        return _escrows[id].open;
    }

    /// @inheritdoc IGatedCreditLine
    function deposit(uint256 amount) external override {
        if (amount == 0) revert InsufficientAvailable();
        deposited[msg.sender] += amount;
        emit Deposited(msg.sender, amount);
        _pull(msg.sender, amount);
    }

    /// @inheritdoc IGatedCreditLine
    function draw(uint256 amount) external override {
        _requireEligible(msg.sender);
        if (amount == 0) revert InsufficientAvailable();
        uint256 newDebt = debt[msg.sender] + amount;
        if (_lockedCollateral(newDebt) > deposited[msg.sender]) revert InsufficientAvailable();
        debt[msg.sender] = newDebt;
        emit Drawn(msg.sender, amount);
        _push(msg.sender, amount);
    }

    /// @inheritdoc IGatedCreditLine
    function repay(uint256 amount) external override {
        if (amount == 0 || amount > debt[msg.sender]) revert InsufficientAvailable();
        debt[msg.sender] -= amount;
        emit Repaid(msg.sender, amount);
        _pull(msg.sender, amount);
    }

    /// @inheritdoc IGatedCreditLine
    function withdraw(uint256 amount) external override {
        if (amount == 0 || amount > unusedOf(msg.sender)) revert InsufficientAvailable();
        deposited[msg.sender] -= amount;
        emit Withdrawn(msg.sender, amount);
        _push(msg.sender, amount);
    }

    /// @inheritdoc IGatedCreditLine
    function protectedTransfer(address to, uint256 amount) external override {
        _requireEligible(msg.sender);
        if (to == address(0)) revert ZeroAddress();
        if (amount == 0 || amount > unusedOf(msg.sender)) revert InsufficientAvailable();
        deposited[msg.sender] -= amount;
        emit TransferProtected(msg.sender, to, amount);
        _push(to, amount);
    }

    /// @inheritdoc IGatedCreditLine
    function lockEscrow(bytes32 id, uint256 amount) external override {
        _requireEligible(msg.sender);
        if (amount == 0) revert InsufficientAvailable();
        if (_escrows[id].open) revert EscrowAlreadyOpen();
        _escrows[id] = Escrow({locker: msg.sender, amount: amount, open: true});
        emit EscrowLocked(id, msg.sender, amount);
        _pull(msg.sender, amount);
    }

    /// @inheritdoc IGatedCreditLine
    function releaseEscrow(bytes32 id, address to) external override {
        _requireEligible(msg.sender);
        if (to == address(0)) revert ZeroAddress();
        Escrow memory item = _escrows[id];
        if (!item.open) revert UnknownEscrow();
        if (item.locker != msg.sender) revert NotEscrowOwner();
        delete _escrows[id];
        emit EscrowReleased(id, to, item.amount);
        _push(to, item.amount);
    }

    /// @inheritdoc IGatedCreditLine
    function refundEscrow(bytes32 id) external override {
        Escrow memory item = _escrows[id];
        if (!item.open) revert UnknownEscrow();
        if (item.locker != msg.sender) revert NotEscrowOwner();
        delete _escrows[id];
        emit EscrowRefunded(id, msg.sender, item.amount);
        _push(msg.sender, item.amount);
    }

    function _requireEligible(address account) internal view {
        if (ledger.statusOf(account) != IEligibilityLedger.Status.ELIGIBLE) revert Restricted();
    }

    function _lockedCollateral(uint256 debt_) internal view returns (uint256) {
        if (debt_ == 0) return 0;
        return (debt_ * BPS + ltvBps - 1) / ltvBps;
    }

    function _pull(address from, uint256 amount) internal {
        bool ok = asset.transferFrom(from, address(this), amount);
        if (!ok) revert TransferFailed();
    }

    function _push(address to, uint256 amount) internal {
        bool ok = asset.transfer(to, amount);
        if (!ok) revert TransferFailed();
    }
}
