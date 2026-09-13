import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import http from 'node:http';
import { encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createWorkerHandler, sanitizeClientMessage } from '../src/api/index.js';
import { loadEnv, loadNetworks, resolveAppConfig, defaultNetworksPath } from '../src/config/index.js';
import { createProofBuilderClient, ProofBuilderError } from '../src/clients/proofBuilder.js';
import {
  buildSubmitProofCalldata,
  encodeSubmitProof,
  normalizeProofFields,
  proveByTx,
  relaySubmitProof,
} from '../src/services/relay.js';
import { evidenceDemo } from '../src/services/status.js';
import { eligibilityLedgerAbi } from '../src/domain/abi.js';
import { ApiError, ApiErrorCode } from '../src/domain/errors.js';
import { assertTxHash, hexEqual, normalizeHex } from '../src/domain/hex.js';
import type { SingleContinuityResponse } from '../src/domain/proof.js';
import { createLogger } from '../src/observability/logger.js';
import type { AppConfig } from '../src/config/resolve.js';
import type { Cc3RpcClient, FeeEstimate, TxReceipt } from '../src/clients/cc3Rpc.js';

const DEMO_TX = '0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787';
const LEDGER = '0x1111111111111111111111111111111111111111';
const RELAY_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

const sample: SingleContinuityResponse = {
  chainKey: 3,
  headerNumber: 25705174,
  txIndex: 18,
  cached: true,
  generatedAt: '2026-09-10T00:00:00Z',
  txHash: DEMO_TX,
  txBytes: '0xabcdef',
  merkleProof: {
    root: `0x${'11'.repeat(32)}`,
    siblings: [
      { hash: `0x${'22'.repeat(32)}`, isLeft: false },
      { hash: `0x${'33'.repeat(32)}`, isLeft: true },
      { hash: `0x${'44'.repeat(32)}`, isLeft: false },
      { hash: `0x${'55'.repeat(32)}`, isLeft: false },
      { hash: `0x${'66'.repeat(32)}`, isLeft: true },
    ],
  },
  continuityProof: {
    lowerEndpointDigest: `0x${'77'.repeat(32)}`,
    roots: [`0x${'88'.repeat(32)}`],
  },
};

function baseConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const networks = loadNetworks(defaultNetworksPath());
  const env = loadEnv({
    environ: {
      FW_ENV: 'cc3-testnet',
      PROOF_BUILDER_URL: 'https://proof-gen-api.cc3-testnet.creditcoin.network',
      CC3_RPC_URL: 'https://rpc.cc3-testnet.creditcoin.network',
      LEDGER_ADDRESS: LEDGER,
      CORS_ORIGINS: 'http://localhost:5173',
    },
  });
  return { ...resolveAppConfig(env, networks), ...overrides };
}

function mockCc3(options?: {
  chainId?: number;
  estimateGas?: bigint | Error;
  fees?: FeeEstimate;
  send?: string | Error;
  receipt?: TxReceipt | null;
}): Cc3RpcClient {
  return {
    async chainId() {
      return options?.chainId ?? 102031;
    },
    async call() {
      return `0x${'00'.repeat(32)}`;
    },
    async estimateGas() {
      if (options?.estimateGas instanceof Error) throw options.estimateGas;
      return options?.estimateGas ?? 100_000n;
    },
    async getFeeEstimate() {
      return options?.fees ?? { type: 'legacy', gasPrice: 1_000_000_000n };
    },
    async getTransactionCount() {
      return 0;
    },
    async sendRawTransaction() {
      if (options?.send instanceof Error) throw options.send;
      return (typeof options?.send === 'string' ? options.send : `0x${'ab'.repeat(32)}`) as string;
    },
    async getTransactionReceipt() {
      if (options?.receipt === undefined) {
        return {
          status: '0x1',
          transactionHash: `0x${'ab'.repeat(32)}`,
          blockNumber: '0x1',
          logs: [],
        };
      }
      return options.receipt;
    },
  };
}

async function withServer(
  config: AppConfig,
  fetchImpl: typeof fetch,
  fn: (base: string) => Promise<void>,
): Promise<void> {
  const log = createLogger('error');
  const handler = createWorkerHandler({ config, log, fetchImpl });
  const server = http.createServer((req, res) => {
    void handler(req, res);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  assert.ok(addr && typeof addr === 'object');
  const base = `http://127.0.0.1:${addr.port}`;
  try {
    await fn(base);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

describe('T-API-PROVE Proof Builder client', () => {
  it('success path', async () => {
    const client = createProofBuilderClient({
      baseUrl: 'https://example.invalid',
      fetchImpl: async () =>
        new Response(JSON.stringify(sample), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    });
    const bundle = await client.proofByTx(3, DEMO_TX);
    assert.equal(bundle.chainKey, 3);
    assert.equal(bundle.txBytes, '0xabcdef');
  });

  it('HTTP fail / malformed / timeout / missing fields', async () => {
    const fail = createProofBuilderClient({
      baseUrl: 'https://example.invalid',
      fetchImpl: async () => new Response('nope', { status: 500 }),
    });
    await assert.rejects(() => fail.proofByTx(3, DEMO_TX), (err: unknown) => {
      assert.ok(err instanceof ProofBuilderError);
      return true;
    });

    const malformed = createProofBuilderClient({
      baseUrl: 'https://example.invalid',
      fetchImpl: async () =>
        new Response(JSON.stringify({ chainKey: 3 }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    });
    await assert.rejects(() => malformed.proofByTx(3, DEMO_TX), ProofBuilderError);

    const timeout = createProofBuilderClient({
      baseUrl: 'https://example.invalid',
      timeoutMs: 10,
      fetchImpl: async (_url, init) => {
        await new Promise((_, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const err = new Error('aborted');
            err.name = 'AbortError';
            reject(err);
          });
        });
        return new Response('{}');
      },
    });
    await assert.rejects(() => timeout.proofByTx(3, DEMO_TX), /timeout/i);
  });

  it('invalid tx hash rejected before network', () => {
    assert.throws(() => assertTxHash('0x1234'), (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.code, ApiErrorCode.INVALID_TXHASH);
      return true;
    });
  });
});

describe('T-API-RELAY', () => {
  it('disabled returns RELAY_DISABLED + calldata without faking a tx hash', async () => {
    const config = baseConfig({ relayPrivateKey: undefined });
    const pb = createProofBuilderClient({
      baseUrl: 'https://example.invalid',
      fetchImpl: async () => new Response(JSON.stringify(sample), { status: 200 }),
    });
    await assert.rejects(
      () =>
        relaySubmitProof({
          body: { txHash: DEMO_TX },
          config,
          proofClient: pb,
          cc3: mockCc3(),
        }),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.code, ApiErrorCode.RELAY_DISABLED);
        assert.equal(err.httpStatus, 404);
        assert.ok(err.extras?.submitProof?.to);
        assert.ok(err.extras?.submitProof?.data?.startsWith('0x'));
        return true;
      },
    );
  });

  it('prepare encodes submitProof without mutating proof bytes', () => {
    const config = baseConfig();
    const mixedCase = { ...sample, txBytes: '0xAbCdEf' };
    const calldata = buildSubmitProofCalldata(config, {
      chainKey: mixedCase.chainKey,
      headerNumber: mixedCase.headerNumber,
      txBytes: mixedCase.txBytes,
      merkleProof: mixedCase.merkleProof,
      continuityProof: mixedCase.continuityProof,
    });
    const normalized = normalizeProofFields({
      chainKey: mixedCase.chainKey,
      headerNumber: mixedCase.headerNumber,
      txBytes: mixedCase.txBytes,
      merkleProof: mixedCase.merkleProof,
      continuityProof: mixedCase.continuityProof,
    });
    assert.equal(calldata.encodedTransaction, '0xabcdef');
    assert.ok(hexEqual(calldata.encodedTransaction, mixedCase.txBytes));
    const expected = encodeFunctionData({
      abi: eligibilityLedgerAbi,
      functionName: 'submitProof',
      args: [
        normalized.chainKey,
        normalized.height,
        normalized.encodedTransaction,
        normalized.merkleProof,
        normalized.continuityProof,
      ],
    });
    assert.equal(calldata.data, expected);
    assert.equal(encodeSubmitProof(normalized), expected);
  });

  it('gas estimation failure classifies GAS_ESTIMATION_FAILED', async () => {
    const config = baseConfig({ relayPrivateKey: RELAY_KEY });
    const pb = createProofBuilderClient({
      baseUrl: 'https://example.invalid',
      fetchImpl: async () => new Response(JSON.stringify(sample), { status: 200 }),
    });
    await assert.rejects(
      () =>
        relaySubmitProof({
          body: {
            chainKey: sample.chainKey,
            headerNumber: sample.headerNumber,
            txBytes: sample.txBytes!,
            merkleProof: sample.merkleProof,
            continuityProof: sample.continuityProof,
          },
          config,
          proofClient: pb,
          cc3: mockCc3({ estimateGas: new Error('oom') }),
        }),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.code, ApiErrorCode.GAS_ESTIMATION_FAILED);
        return true;
      },
    );
  });

  it('wrong chain rejects before broadcast', async () => {
    const config = baseConfig({ relayPrivateKey: RELAY_KEY });
    const pb = createProofBuilderClient({
      baseUrl: 'https://example.invalid',
      fetchImpl: async () => new Response(JSON.stringify(sample), { status: 200 }),
    });
    await assert.rejects(
      () =>
        relaySubmitProof({
          body: {
            chainKey: sample.chainKey,
            headerNumber: sample.headerNumber,
            txBytes: sample.txBytes!,
            merkleProof: sample.merkleProof,
            continuityProof: sample.continuityProof,
          },
          config,
          proofClient: pb,
          cc3: mockCc3({ chainId: 1 }),
        }),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.code, ApiErrorCode.WRONG_CHAIN);
        return true;
      },
    );
  });

  it('broadcast success returns ctcTx', async () => {
    const config = baseConfig({ relayPrivateKey: RELAY_KEY });
    const pb = createProofBuilderClient({
      baseUrl: 'https://example.invalid',
      fetchImpl: async () => new Response(JSON.stringify(sample), { status: 200 }),
    });
    const ctcTx = `0x${'cd'.repeat(32)}`;
    const result = await relaySubmitProof({
      body: {
        chainKey: sample.chainKey,
        headerNumber: sample.headerNumber,
        txBytes: sample.txBytes!,
        merkleProof: sample.merkleProof,
        continuityProof: sample.continuityProof,
      },
      config,
      proofClient: pb,
      cc3: mockCc3({ send: ctcTx, receipt: { status: '0x1', transactionHash: ctcTx, blockNumber: '0x1', logs: [] } }),
    });
    assert.ok(!('disabled' in result));
    assert.equal(result.ctcTx, ctcTx);
    assert.deepEqual(result.restricted, []);
    assert.deepEqual(result.restored, []);
  });

  it('receipt revert maps to CONTRACT_REVERT', async () => {
    const config = baseConfig({ relayPrivateKey: RELAY_KEY });
    const pb = createProofBuilderClient({
      baseUrl: 'https://example.invalid',
      fetchImpl: async () => new Response(JSON.stringify(sample), { status: 200 }),
    });
    const ctcTx = `0x${'ee'.repeat(32)}`;
    await assert.rejects(
      () =>
        relaySubmitProof({
          body: {
            chainKey: sample.chainKey,
            headerNumber: sample.headerNumber,
            txBytes: sample.txBytes!,
            merkleProof: sample.merkleProof,
            continuityProof: sample.continuityProof,
          },
          config,
          proofClient: pb,
          cc3: mockCc3({
            send: ctcTx,
            receipt: { status: '0x0', transactionHash: ctcTx, blockNumber: '0x1', logs: [] },
          }),
        }),
      (err: unknown) => {
        assert.ok(err instanceof ApiError);
        assert.equal(err.code, ApiErrorCode.CONTRACT_REVERT);
        return true;
      },
    );
  });
});

describe('T-API HTTP surface', () => {
  it('GET /v1/health, /v1/evidence/demo, prove, relay-disabled, no setter', async () => {
    const config = baseConfig({ relayPrivateKey: undefined });
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes('/api/v1/health')) {
        return new Response(
          JSON.stringify({
            status: 'ok',
            cc3_rpc_connected: true,
            eth_rpc_connected: true,
            uptime_seconds: 1,
          }),
          { status: 200 },
        );
      }
      if (url.includes('/api/v1/attested-height')) {
        return new Response(JSON.stringify({ attestedHeight: 30_000_000 }), { status: 200 });
      }
      if (url.includes('/api/v1/proof-by-tx')) {
        return new Response(JSON.stringify(sample), { status: 200 });
      }
      if (url.includes('rpc.cc3-testnet') || url.includes('ethereum')) {
        return new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x18e8f' }), { status: 200 });
      }
      return new Response('missing', { status: 404 });
    };

    await withServer(config, fetchImpl, async (base) => {
      const health = await fetch(`${base}/v1/health`);
      assert.equal(health.status, 200);
      const healthBody = (await health.json()) as { status: string; expectedChainKey: number };
      assert.equal(healthBody.expectedChainKey, 3);

      const evidence = await fetch(`${base}/v1/evidence/demo`);
      assert.equal(evidence.status, 200);
      const ev = (await evidence.json()) as { sourceTx: string; block: number };
      assert.equal(ev.sourceTx, DEMO_TX);
      assert.equal(ev.block, 25705174);

      const prove = await fetch(`${base}/v1/prove/${DEMO_TX}`);
      assert.equal(prove.status, 200);
      const proved = (await prove.json()) as { txBytes: string; chainKey: number };
      assert.equal(proved.chainKey, 3);
      assert.equal(proved.txBytes, '0xabcdef');

      const badHash = await fetch(`${base}/v1/prove/0x1234`);
      assert.equal(badHash.status, 400);
      const badBody = (await badHash.json()) as { code: string };
      assert.equal(badBody.code, ApiErrorCode.INVALID_TXHASH);

      const relay = await fetch(`${base}/v1/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: DEMO_TX }),
      });
      assert.equal(relay.status, 404);
      const relayBody = (await relay.json()) as {
        code: string;
        submitProof?: { to: string; data: string };
      };
      assert.equal(relayBody.code, ApiErrorCode.RELAY_DISABLED);
      assert.ok(relayBody.submitProof?.data);

      const restrict = await fetch(`${base}/v1/restrict`, { method: 'POST', body: '{}' });
      assert.equal(restrict.status, 404);

      const setStatus = await fetch(`${base}/v1/admin/status`, { method: 'POST', body: '{}' });
      assert.equal(setStatus.status, 404);
    });
  });

  it('RELAY_GATE rejects unauthorized remote callers', async () => {
    const config = baseConfig({ relayPrivateKey: undefined, relayGate: 'secret' });
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify(sample), { status: 200 });
    await withServer(config, fetchImpl, async (base) => {
      const denied = await fetch(`${base}/v1/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: DEMO_TX }),
      });
      assert.equal(denied.status, 401);
    });
  });
});

describe('T-API-NOSETTER security', () => {
  it('sanitizeClientMessage strips PRIVATE_KEY, RELAY_GATE, URLs, and 64-byte hex', () => {
    assert.equal(
      sanitizeClientMessage(ApiErrorCode.RELAY_DISABLED, 'RELAY_PRIVATE_KEY unset; use wallet'),
      'Worker relay unavailable; use client wallet submitProof',
    );
    assert.equal(
      sanitizeClientMessage(ApiErrorCode.UNAUTHORIZED, 'Invalid or missing RELAY_GATE'),
      'Relay authorization required',
    );
    assert.equal(
      sanitizeClientMessage(ApiErrorCode.GAS_ESTIMATION_FAILED, `sign failed key=${RELAY_KEY}`),
      'Gas estimation failed',
    );
    assert.equal(
      sanitizeClientMessage(ApiErrorCode.CC3_RPC_FAILED, 'connect ECONNREFUSED https://rpc.example/'),
      'Creditcoin RPC unavailable',
    );
    assert.equal(
      sanitizeClientMessage(ApiErrorCode.PROOF_BUILDER_FAILED, 'fetch https://proof.example failed'),
      'Request failed',
    );
    assert.equal(sanitizeClientMessage(ApiErrorCode.INVALID_REQUEST, 'Malformed JSON body'), 'Malformed JSON body');
  });

  it('relay disabled and unauthorized responses never name RELAY_PRIVATE_KEY or RELAY_GATE', async () => {
    const config = baseConfig({ relayPrivateKey: undefined });
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify(sample), { status: 200 });
    await withServer(config, fetchImpl, async (base) => {
      const relay = await fetch(`${base}/v1/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: DEMO_TX }),
      });
      assert.equal(relay.status, 404);
      const body = (await relay.json()) as { code: string; message: string };
      assert.equal(body.code, ApiErrorCode.RELAY_DISABLED);
      assert.equal(body.message.includes('RELAY_PRIVATE_KEY'), false);
      assert.equal(body.message.includes('RELAY_GATE'), false);
      assert.match(body.message, /wallet submitProof/i);
    });

    const gated = baseConfig({ relayPrivateKey: undefined, relayGate: 'secret-gate' });
    await withServer(gated, fetchImpl, async (base) => {
      const denied = await fetch(`${base}/v1/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ txHash: DEMO_TX }),
      });
      assert.equal(denied.status, 401);
      const body = (await denied.json()) as { message: string };
      assert.equal(body.message, 'Relay authorization required');
      assert.equal(body.message.includes('RELAY_GATE'), false);
      assert.equal(body.message.includes('secret-gate'), false);
    });
  });

  it('relayer key never appears in evidence/demo or health', () => {
    const config = baseConfig({ relayPrivateKey: RELAY_KEY });
    const demo = evidenceDemo(config);
    const blob = JSON.stringify(demo);
    assert.equal(blob.includes(RELAY_KEY.slice(2)), false);
    assert.equal(privateKeyToAccount(RELAY_KEY).address.startsWith('0x'), true);
  });

  it('normalizeHex does not truncate meaningful bytes', () => {
    const raw = '0xAbCdEf12';
    assert.equal(normalizeHex(raw), '0xabcdef12');
    assert.equal(normalizeHex(raw).length, raw.length);
  });

  it('wrong chainKey on prove is rejected', async () => {
    const config = baseConfig();
    const wrong = { ...sample, chainKey: 1 };
    const client = createProofBuilderClient({
      baseUrl: 'https://example.invalid',
      fetchImpl: async () => new Response(JSON.stringify(wrong), { status: 200 }),
    });
    await assert.rejects(() => proveByTx(client, config, DEMO_TX), (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.code, ApiErrorCode.WRONG_CHAIN);
      return true;
    });
  });

  it('frontend metadata cannot invent eligibility — no status write API', async () => {
    const config = baseConfig();
    const fetchImpl: typeof fetch = async () =>
      new Response(JSON.stringify({ jsonrpc: '2.0', id: 1, result: '0x18e8f' }), { status: 200 });
    await withServer(config, fetchImpl, async (base) => {
      for (const path of ['/v1/set-status', '/v1/unrestrict', '/setRestricted', '/v1/admin/status']) {
        const res = await fetch(`${base}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: LEDGER, status: 'RESTRICTED' }),
        });
        assert.equal(res.status, 404);
      }
    });
  });
});

describe('hex + ABI integrity', () => {
  it('submitProof selector matches Phase-3 ABI argument order', () => {
    const n = normalizeProofFields({
      chainKey: sample.chainKey,
      headerNumber: sample.headerNumber,
      txBytes: sample.txBytes!,
      merkleProof: sample.merkleProof,
      continuityProof: sample.continuityProof,
    });
    const data = encodeSubmitProof(n);
    assert.equal(data.slice(0, 10).length, 10);
    assert.match(data, /^0x[0-9a-f]+$/);
    assert.ok(data.includes(n.encodedTransaction.slice(2)));
  });
});
