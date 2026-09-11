// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Ownable2Step} from "./auth/Ownable2Step.sol";
import {EventKinds} from "./libraries/EventKinds.sol";
import {EventSelectors} from "./libraries/EventSelectors.sol";
import {EvmV1Decoder} from "./libraries/EvmV1Decoder.sol";
import {TxIndex} from "./libraries/TxIndex.sol";
import {IBlacklistVerifier} from "./interfaces/IBlacklistVerifier.sol";
import {INativeQueryVerifier} from "./interfaces/INativeQueryVerifier.sol";

/// @title BlacklistVerifier
/// @notice Verification boundary only. Does not store or mutate eligibility.
/// @dev Calls injected `INativeQueryVerifier.verifyAndEmit`, recovers `txIndex` from the Merkle path,
///      then walks every receipt log. Production injects `0x0FD2`; tests inject a mock.
contract BlacklistVerifier is IBlacklistVerifier, Ownable2Step {
    uint256 internal constant MAX_LOGS = 64;

    INativeQueryVerifier public immutable nativeVerifier;
    address public immutable expectedEmitter;
    uint64 public expectedChainKey;
    uint64 public minHeight;
    uint64 public maxHeight;

    event ConfigUpdated(uint64 chainKey, uint64 minHeight, uint64 maxHeight);

    error WrongChainKey();
    error OutsideWindow();
    error ProofRejected();
    error MalformedTx();
    error SourceTxFailed();
    error ZeroEmitter();
    error ZeroVerifier();

    constructor(
        INativeQueryVerifier nativeVerifier_,
        address expectedEmitter_,
        uint64 expectedChainKey_,
        uint64 minHeight_,
        uint64 maxHeight_,
        address owner_
    ) Ownable2Step(owner_) {
        if (address(nativeVerifier_) == address(0)) revert ZeroVerifier();
        if (expectedEmitter_ == address(0)) revert ZeroEmitter();
        nativeVerifier = nativeVerifier_;
        expectedEmitter = expectedEmitter_;
        expectedChainKey = expectedChainKey_;
        minHeight = minHeight_;
        maxHeight = maxHeight_;
        emit ConfigUpdated(expectedChainKey_, minHeight_, maxHeight_);
    }

    /// @notice Rotate expected Attestcoin chainKey. Does not change canonical USDC emitter.
    function setExpectedChainKey(uint64 expectedChainKey_) external onlyOwner {
        expectedChainKey = expectedChainKey_;
        emit ConfigUpdated(expectedChainKey, minHeight, maxHeight);
    }

    /// @notice Set inclusive height window. `maxHeight == 0` means no maximum.
    /// @dev `minHeight == 0 && maxHeight == 0` is unbounded.
    function setWindow(uint64 minHeight_, uint64 maxHeight_) external onlyOwner {
        minHeight = minHeight_;
        maxHeight = maxHeight_;
        emit ConfigUpdated(expectedChainKey, minHeight, maxHeight);
    }

    /// @inheritdoc IBlacklistVerifier
    function verifyAndBind(
        uint64 chainKey,
        uint64 height,
        bytes calldata encodedTransaction,
        INativeQueryVerifier.MerkleProof calldata merkleProof,
        INativeQueryVerifier.ContinuityProof calldata continuityProof
    ) external override returns (BoundEvent[] memory events, uint64 txIndex) {
        if (chainKey != expectedChainKey) revert WrongChainKey();
        if (_outsideWindow(height)) revert OutsideWindow();
        txIndex = TxIndex.fromMerkle(merkleProof);
        bool verified = nativeVerifier.verifyAndEmit(chainKey, height, encodedTransaction, merkleProof, continuityProof);
        if (!verified) revert ProofRejected();
        EvmV1Decoder.ReceiptFields memory receipt = _decodeReceipt(encodedTransaction);
        if (receipt.receiptStatus != 1) revert SourceTxFailed();
        events = _bindLogs(receipt.receiptLogs, chainKey, height, txIndex);
    }

    /// @dev External wrapper so decoder `require` / abi.decode failures surface as MalformedTx.
    function decodeReceiptFields(bytes calldata data) external pure returns (EvmV1Decoder.ReceiptFields memory) {
        if (data.length == 0) revert MalformedTx();
        uint8 txType = EvmV1Decoder.getTransactionType(data);
        if (!EvmV1Decoder.isValidTransactionType(txType)) revert MalformedTx();
        return EvmV1Decoder.decodeReceiptFields(data);
    }

    function _decodeReceipt(bytes calldata data) internal view returns (EvmV1Decoder.ReceiptFields memory receipt) {
        try this.decodeReceiptFields(data) returns (EvmV1Decoder.ReceiptFields memory decoded) {
            if (decoded.receiptLogs.length > MAX_LOGS) revert MalformedTx();
            return decoded;
        } catch {
            revert MalformedTx();
        }
    }

    function _outsideWindow(uint64 height) internal view returns (bool) {
        if (minHeight != 0 && height < minHeight) return true;
        if (maxHeight != 0 && height > maxHeight) return true;
        return false;
    }

    function _bindLogs(EvmV1Decoder.LogEntry[] memory logs, uint64 chainKey, uint64 height, uint64 txIndex)
        internal
        view
        returns (BoundEvent[] memory events)
    {
        uint256 count;
        BoundEvent[] memory buffer = new BoundEvent[](logs.length);
        for (uint256 i; i < logs.length; ++i) {
            uint8 kind = _matchKind(logs[i]);
            if (kind == 0) continue;
            buffer[count] = BoundEvent({
                account: address(uint160(uint256(logs[i].topics[1]))),
                kind: kind,
                chainKey: chainKey,
                height: height,
                txIndex: txIndex,
                logIndex: i
            });
            unchecked {
                ++count;
            }
        }
        events = new BoundEvent[](count);
        for (uint256 j; j < count; ++j) {
            events[j] = buffer[j];
        }
    }

    /// @dev 0 = skip (wrong emitter, decoy, malformed topics). Never bind from event-name strings.
    function _matchKind(EvmV1Decoder.LogEntry memory log) internal view returns (uint8) {
        if (log.address_ != expectedEmitter) return 0;
        if (log.topics.length < 2) return 0;
        bytes32 topic0 = log.topics[0];
        if (topic0 == EventSelectors.BLACKLISTED) return EventKinds.BLACKLISTED;
        if (topic0 == EventSelectors.UNBLACKLISTED) return EventKinds.UNBLACKLISTED;
        return 0;
    }
}
