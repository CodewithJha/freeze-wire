// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import {Script, console2} from "forge-std/Script.sol";
import {INativeQueryVerifier} from "../src/interfaces/INativeQueryVerifier.sol";
import {BlacklistVerifier} from "../src/BlacklistVerifier.sol";
import {EligibilityLedger} from "../src/EligibilityLedger.sol";
import {GatedCreditLine} from "../src/GatedCreditLine.sol";
import {MockUSD} from "../src/MockUSD.sol";

/// @title DeployCC3Testnet
/// @notice Broadcast deploy order: MockUSD → BlacklistVerifier → EligibilityLedger → GatedCreditLine.
/// @dev No owner eligibility setter. Canonical USDC emitter is constructor-immutable.
///      Writes public addresses only to DEPLOYMENT_OUT_PATH (default deployments/cc3-testnet.json).
contract DeployCC3Testnet is Script {
    uint256 internal constant DEFAULT_LTV_BPS = 5000;
    uint256 internal constant DEFAULT_CHAIN_ID = 102031;
    uint64 internal constant DEFAULT_CHAIN_KEY = 3;
    address internal constant DEFAULT_BLOCK_PROVER = address(0x0FD2);
    address internal constant DEFAULT_USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    struct DeployConfig {
        address blockProver;
        address sourceUsdc;
        uint64 chainKey;
        uint64 minHeight;
        uint64 maxHeight;
        uint256 ltvBps;
        uint256 deployBlock;
    }

    struct Deployed {
        address mockUsd;
        address verifier;
        address ledger;
        address creditLine;
    }

    error MissingDeployerPrivateKey();
    error WrongChainId(uint256 actual, uint256 expected);
    error ZeroConfigAddress(string name);

    function run() external {
        uint256 deployerKey = _requireDeployerKey();
        address deployer = vm.addr(deployerKey);

        uint256 expectedChainId = vm.envOr("CC3_CHAIN_ID", DEFAULT_CHAIN_ID);
        if (block.chainid != expectedChainId) {
            revert WrongChainId(block.chainid, expectedChainId);
        }

        DeployConfig memory cfg = _loadConfig();
        Deployed memory deployed = _broadcast(deployerKey, deployer, cfg);
        _log(deployer, cfg, deployed);
        _writeRegistry(cfg, deployed);
    }

    function _loadConfig() internal view returns (DeployConfig memory cfg) {
        cfg.blockProver = vm.envOr("BLOCK_PROVER_ADDRESS", DEFAULT_BLOCK_PROVER);
        cfg.sourceUsdc = vm.envOr("SOURCE_USDC_ADDRESS", DEFAULT_USDC);
        cfg.chainKey = uint64(vm.envOr("ATTESTCOIN_CHAIN_KEY", uint256(DEFAULT_CHAIN_KEY)));
        cfg.minHeight = uint64(vm.envOr("PROOF_MIN_HEIGHT", uint256(0)));
        cfg.maxHeight = uint64(vm.envOr("PROOF_MAX_HEIGHT", uint256(0)));
        cfg.ltvBps = vm.envOr("LTV_BPS", DEFAULT_LTV_BPS);
        cfg.deployBlock = block.number;

        if (cfg.blockProver == address(0)) revert ZeroConfigAddress("BLOCK_PROVER_ADDRESS");
        if (cfg.sourceUsdc == address(0)) revert ZeroConfigAddress("SOURCE_USDC_ADDRESS");
        if (cfg.ltvBps == 0 || cfg.ltvBps > 10_000) revert ZeroConfigAddress("LTV_BPS");
    }

    function _broadcast(uint256 deployerKey, address deployer, DeployConfig memory cfg)
        internal
        returns (Deployed memory deployed)
    {
        vm.startBroadcast(deployerKey);
        MockUSD mockUsd = new MockUSD(deployer);
        BlacklistVerifier verifier = new BlacklistVerifier(
            INativeQueryVerifier(cfg.blockProver), cfg.sourceUsdc, cfg.chainKey, cfg.minHeight, cfg.maxHeight, deployer
        );
        EligibilityLedger ledger = new EligibilityLedger(verifier);
        GatedCreditLine creditLine = new GatedCreditLine(ledger, mockUsd, cfg.ltvBps);
        vm.stopBroadcast();

        deployed.mockUsd = address(mockUsd);
        deployed.verifier = address(verifier);
        deployed.ledger = address(ledger);
        deployed.creditLine = address(creditLine);
    }

    function _log(address deployer, DeployConfig memory cfg, Deployed memory deployed) internal view {
        console2.log("network", "cc3-testnet-or-configured");
        console2.log("chainId", block.chainid);
        console2.log("deployer", deployer);
        console2.log("MockUSD", deployed.mockUsd);
        console2.log("BlacklistVerifier", deployed.verifier);
        console2.log("EligibilityLedger", deployed.ledger);
        console2.log("GatedCreditLine", deployed.creditLine);
        console2.log("expectedEmitter", cfg.sourceUsdc);
        console2.log("nativeVerifier", cfg.blockProver);
        console2.log("expectedChainKey", uint256(cfg.chainKey));
        console2.log("minHeight", uint256(cfg.minHeight));
        console2.log("maxHeight", uint256(cfg.maxHeight));
        console2.log("ltvBps", cfg.ltvBps);
        console2.log("deployBlock", cfg.deployBlock);
    }

    function _requireDeployerKey() internal view returns (uint256 pk) {
        try vm.envUint("DEPLOYER_PRIVATE_KEY") returns (uint256 key) {
            if (key == 0) revert MissingDeployerPrivateKey();
            return key;
        } catch {
            revert MissingDeployerPrivateKey();
        }
    }

    function _writeRegistry(DeployConfig memory cfg, Deployed memory deployed) internal {
        string memory outPath = vm.envOr("DEPLOYMENT_OUT_PATH", string("deployments/cc3-testnet.json"));
        string memory network = vm.envOr("DEPLOYMENT_NETWORK", string("cc3-testnet"));
        string memory json = string.concat(_registryHead(network, cfg), _registryAddresses(deployed));
        vm.writeFile(outPath, json);
        console2.log("chainId", block.chainid);
        console2.log("wrote", outPath);
    }

    function _registryHead(string memory network, DeployConfig memory cfg) internal view returns (string memory) {
        return string.concat(
            "{\n",
            '  "network": "',
            network,
            '",\n',
            '  "chainId": ',
            vm.toString(block.chainid),
            ",\n",
            '  "deployBlock": ',
            vm.toString(cfg.deployBlock),
            ",\n",
            '  "timestamp": ',
            vm.toString(block.timestamp),
            ",\n",
            '  "attestcoinChainKey": ',
            vm.toString(uint256(cfg.chainKey)),
            ",\n",
            '  "proofMinHeight": ',
            vm.toString(uint256(cfg.minHeight)),
            ",\n",
            '  "proofMaxHeight": ',
            vm.toString(uint256(cfg.maxHeight)),
            ",\n",
            '  "ltvBps": ',
            vm.toString(cfg.ltvBps),
            ",\n",
            '  "sourceUsdc": "',
            vm.toString(cfg.sourceUsdc),
            '",\n',
            '  "blockProver": "',
            vm.toString(cfg.blockProver),
            '",\n'
        );
    }

    function _registryAddresses(Deployed memory deployed) internal pure returns (string memory) {
        return string.concat(
            '  "addresses": {\n',
            '    "mockUsd": "',
            vm.toString(deployed.mockUsd),
            '",\n',
            '    "blacklistVerifier": "',
            vm.toString(deployed.verifier),
            '",\n',
            '    "eligibilityLedger": "',
            vm.toString(deployed.ledger),
            '",\n',
            '    "gatedCreditLine": "',
            vm.toString(deployed.creditLine),
            '"\n',
            "  }\n",
            "}\n"
        );
    }
}
