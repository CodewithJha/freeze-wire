// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {EventKinds} from "./libraries/EventKinds.sol";
import {TxIndex} from "./libraries/TxIndex.sol";
import {IBlacklistVerifier} from "./interfaces/IBlacklistVerifier.sol";
import {IEligibilityLedger} from "./interfaces/IEligibilityLedger.sol";
import {INativeQueryVerifier} from "./interfaces/INativeQueryVerifier.sol";

/// @title EligibilityLedger
/// @notice Sole persistent eligibility store. Missing keys read as ELIGIBLE (not a cleanliness proof).
contract EligibilityLedger is IEligibilityLedger {
    IBlacklistVerifier public immutable blacklistVerifier;

    mapping(address => Status) internal _status;
    mapping(address => Position) internal _lastPos;
    mapping(bytes32 => bool) public processed;

    struct Position {
        uint64 height;
        uint64 txIndex;
        uint256 logIndex;
        bool set;
    }

    event Restricted(address indexed account, bytes32 indexed replayKey);
    event Restored(address indexed account, bytes32 indexed replayKey);
    /// @notice Successful verify + successful receipt, no canonical USDC Blacklisted/UnBlacklisted.
    /// @dev ADR-0017 Model A: the position is burned without reverting (a revert would undo `processed`).
    event ProcessedWithoutFact(bytes32 indexed replayKey);

    error QueryAlreadyProcessed();
    error ZeroVerifier();

    constructor(IBlacklistVerifier blacklistVerifier_) {
        if (address(blacklistVerifier_) == address(0)) revert ZeroVerifier();
        blacklistVerifier = blacklistVerifier_;
    }

    /// @inheritdoc IEligibilityLedger
    function statusOf(address account) external view override returns (Status) {
        return _status[account];
    }

    /// @inheritdoc IEligibilityLedger
    /// @dev Permissionless. Relayer identity confers no extra rights (ADR-0007).
    function submitProof(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external override {
        uint64 txIndex = TxIndex.fromMerkle(merkleProof);
        bytes32 key = keccak256(abi.encodePacked(chainKey, height, txIndex));
        if (processed[key]) revert QueryAlreadyProcessed();

        (IBlacklistVerifier.BoundEvent[] memory events,) =
            blacklistVerifier.verifyAndBind(chainKey, height, encodedTransaction, merkleProof, continuityProof);

        processed[key] = true;
        if (events.length == 0) {
            emit ProcessedWithoutFact(key);
            return;
        }

        for (uint256 i; i < events.length; ++i) {
            _applyIfNewer(events[i], key);
        }
    }

    function _applyIfNewer(IBlacklistVerifier.BoundEvent memory ev, bytes32 key) internal {
        if (ev.kind != EventKinds.BLACKLISTED && ev.kind != EventKinds.UNBLACKLISTED) return;
        if (!_strictlyNewer(ev)) return;

        _lastPos[ev.account] = Position({height: ev.height, txIndex: ev.txIndex, logIndex: ev.logIndex, set: true});
        if (ev.kind == EventKinds.BLACKLISTED) {
            _status[ev.account] = Status.RESTRICTED;
            emit Restricted(ev.account, key);
        } else {
            _status[ev.account] = Status.ELIGIBLE;
            emit Restored(ev.account, key);
        }
    }

    function _strictlyNewer(IBlacklistVerifier.BoundEvent memory ev) internal view returns (bool) {
        Position memory last = _lastPos[ev.account];
        if (!last.set) return true;
        if (ev.height != last.height) return ev.height > last.height;
        if (ev.txIndex != last.txIndex) return ev.txIndex > last.txIndex;
        return ev.logIndex > last.logIndex;
    }
}
