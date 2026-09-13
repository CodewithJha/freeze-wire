import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { withBoundedRetries, isRetriableHttpStatus } from '../src/clients/retry.js';
import { pruneRateBuckets } from '../src/api/index.js';
import { loadEnv, loadNetworks, resolveAppConfig, defaultNetworksPath } from '../src/config/index.js';
import { discoverCandidates } from '../src/services/discover.js';
import { ApiError, ApiErrorCode } from '../src/domain/errors.js';
import type { EthRpcClient } from '../src/clients/cc3Rpc.js';

describe('bounded retries', () => {
  it('retries retriable failures then succeeds', async () => {
    let n = 0;
    const result = await withBoundedRetries(
      async () => {
        n += 1;
        if (n < 3) throw Object.assign(new Error('RPC HTTP 503'), { retriable: true });
        return 'ok';
      },
      {
        maxRetries: 2,
        delayMs: 1,
        isRetriable: (err) => err instanceof Error && /RPC HTTP 5/.test(err.message),
      },
    );
    assert.equal(result, 'ok');
    assert.equal(n, 3);
  });

  it('does not retry non-retriable errors', async () => {
    let n = 0;
    await assert.rejects(
      () =>
        withBoundedRetries(
          async () => {
            n += 1;
            throw new Error('permanent');
          },
          { maxRetries: 2, delayMs: 1, isRetriable: () => false },
        ),
      /permanent/,
    );
    assert.equal(n, 1);
  });

  it('isRetriableHttpStatus covers 5xx/429/408', () => {
    assert.equal(isRetriableHttpStatus(500), true);
    assert.equal(isRetriableHttpStatus(429), true);
    assert.equal(isRetriableHttpStatus(408), true);
    assert.equal(isRetriableHttpStatus(400), false);
  });
});

describe('rate-limit prune', () => {
  it('removes expired buckets only', () => {
    const buckets = new Map([
      ['a', { count: 1, resetAt: 100 }],
      ['b', { count: 2, resetAt: 9_999 }],
    ]);
    const removed = pruneRateBuckets(buckets, 500);
    assert.equal(removed, 1);
    assert.equal(buckets.has('a'), false);
    assert.equal(buckets.has('b'), true);
  });
});

describe('discover one-sided range', () => {
  function cfg() {
    const networks = loadNetworks(defaultNetworksPath());
    const env = loadEnv({
      environ: {
        FW_ENV: 'cc3-testnet',
        PROOF_BUILDER_URL: 'https://proof-gen-api.cc3-testnet.creditcoin.network',
        CC3_RPC_URL: 'https://rpc.cc3-testnet.creditcoin.network',
        ETH_RPC_URL: 'https://ethereum.publicnode.com',
      },
    });
    return resolveAppConfig(env, networks);
  }

  it('rejects fromBlock without toBlock', async () => {
    const eth: EthRpcClient = {
      async getLogs() {
        assert.fail('getLogs must not run');
        return [];
      },
      async getTransactionReceipt() {
        return null;
      },
    };
    await assert.rejects(
      () => discoverCandidates({ eth, config: cfg(), fromBlock: 100 }),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.code, ApiErrorCode.INVALID_REQUEST);
        assert.match(err.message, /both fromBlock and toBlock/i);
        return true;
      },
    );
  });

  it('rejects toBlock without fromBlock', async () => {
    const eth: EthRpcClient = {
      async getLogs() {
        assert.fail('getLogs must not run');
        return [];
      },
      async getTransactionReceipt() {
        return null;
      },
    };
    await assert.rejects(
      () => discoverCandidates({ eth, config: cfg(), toBlock: 100 }),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.code, ApiErrorCode.INVALID_REQUEST);
        return true;
      },
    );
  });
});
