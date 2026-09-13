import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadEnv, loadNetworks, resolveAppConfig, defaultNetworksPath } from '../src/config/index.js';
import { discoverCandidates } from '../src/services/discover.js';
import { TOPIC_BLACKLISTED } from '../src/domain/abi.js';
import { ApiError, ApiErrorCode } from '../src/domain/errors.js';
import type { EthRpcClient } from '../src/clients/cc3Rpc.js';

const DEMO_TX = '0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787';
const ACCOUNT = '0xe05f529f5284d75624eba386cb716928c3b54a2a';
const USDC = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48';

describe('T-API-DISC discover', () => {
  it('pins demo from receipt without inventing when scan empty', async () => {
    const networks = loadNetworks(defaultNetworksPath());
    const env = loadEnv({
      environ: {
        FW_ENV: 'cc3-testnet',
        PROOF_BUILDER_URL: 'https://proof-gen-api.cc3-testnet.creditcoin.network',
        CC3_RPC_URL: 'https://rpc.cc3-testnet.creditcoin.network',
        ETH_RPC_URL: 'https://ethereum.publicnode.com',
      },
    });
    const config = resolveAppConfig(env, networks);

    const eth: EthRpcClient = {
      async getLogs() {
        return [];
      },
      async getTransactionReceipt(txHash) {
        assert.equal(txHash, DEMO_TX);
        return {
          status: '0x1',
          transactionHash: DEMO_TX,
          blockNumber: '0x1883e66',
          logs: [
            {
              address: USDC,
              topics: [TOPIC_BLACKLISTED, `0x${'00'.repeat(12)}${ACCOUNT.slice(2)}`],
              data: '0x',
              blockNumber: '0x1883e66',
              transactionHash: DEMO_TX,
              transactionIndex: '0x12',
              logIndex: '0x0',
            },
          ],
        };
      },
    };

    const { candidates } = await discoverCandidates({ eth, config });
    assert.equal(candidates.length, 1);
    assert.equal(candidates[0]!.txHash, DEMO_TX);
    assert.equal(candidates[0]!.kind, 'Blacklisted');
    assert.equal(candidates[0]!.account, ACCOUNT);
    assert.equal(candidates[0]!.txIndex, 18);
  });

  it('ETH_RPC_FAILED when eth client missing', async () => {
    const networks = loadNetworks(defaultNetworksPath());
    const env = loadEnv({
      environ: {
        FW_ENV: 'cc3-testnet',
        PROOF_BUILDER_URL: 'https://proof-gen-api.cc3-testnet.creditcoin.network',
        CC3_RPC_URL: 'https://rpc.cc3-testnet.creditcoin.network',
      },
    });
    const config = resolveAppConfig(env, networks);
    await assert.rejects(() => discoverCandidates({ eth: undefined, config }), (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.code, ApiErrorCode.ETH_RPC_FAILED);
      return true;
    });
  });

  it('rejects oversized discover block range', async () => {
    const networks = loadNetworks(defaultNetworksPath());
    const env = loadEnv({
      environ: {
        FW_ENV: 'cc3-testnet',
        PROOF_BUILDER_URL: 'https://proof-gen-api.cc3-testnet.creditcoin.network',
        CC3_RPC_URL: 'https://rpc.cc3-testnet.creditcoin.network',
        ETH_RPC_URL: 'https://ethereum.publicnode.com',
      },
    });
    const config = resolveAppConfig(env, networks);
    const eth: EthRpcClient = {
      async getLogs() {
        assert.fail('getLogs must not run for oversized range');
        return [];
      },
      async getTransactionReceipt() {
        return null;
      },
    };
    await assert.rejects(
      () => discoverCandidates({ eth, config, fromBlock: 1, toBlock: 20_000, maxBlockRange: 10_000 }),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.code, ApiErrorCode.INVALID_REQUEST);
        assert.match(err.message, /block range exceeds max/i);
        return true;
      },
    );
  });
});
