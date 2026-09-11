import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decodeAbiParameters, encodeFunctionData } from 'viem';
import { createProofBuilderClient } from '../src/clients/proofBuilder.js';
import { createCc3RpcClient } from '../src/clients/cc3Rpc.js';
import { fetchProofByTx } from '../src/services/prove.js';
import { loadEnv } from '../src/config/env.js';
import { loadNetworks } from '../src/config/loadNetworks.js';
import { defaultNetworksPath } from '../src/config/paths.js';

const LIVE = process.env.LIVE_ATTESTCOIN === '1';
const DEMO_TX = '0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787';
const USDC = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const ACCOUNT = '0xe05F529f5284D75624eBa386CB716928c3b54A2A';
const BLACKLISTED = '0xffa4e6181777692565cf28528fc88fd1516ea86b56da075235fa575af6a4b855';
const BLOCK_PROVER = '0x0000000000000000000000000000000000000FD2';
const SOURCE_TX_LIMIT = 500 * 1024;

const merkleTuple = {
  type: 'tuple',
  components: [
    { name: 'root', type: 'bytes32' },
    {
      name: 'siblings',
      type: 'tuple[]',
      components: [
        { name: 'hash', type: 'bytes32' },
        { name: 'isLeft', type: 'bool' },
      ],
    },
  ],
} as const;

const continuityTuple = {
  type: 'tuple',
  components: [
    { name: 'lowerEndpointDigest', type: 'bytes32' },
    { name: 'roots', type: 'bytes32[]' },
  ],
} as const;

const blockProverAbi = [
  {
    type: 'function',
    name: 'verify',
    stateMutability: 'view',
    inputs: [
      { name: 'chainKey', type: 'uint64' },
      { name: 'height', type: 'uint64' },
      { name: 'encodedTransaction', type: 'bytes' },
      { name: 'merkleProof', ...merkleTuple },
      { name: 'continuityProof', ...continuityTuple },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'verifyAndEmit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'chainKey', type: 'uint64' },
      { name: 'height', type: 'uint64' },
      { name: 'encodedTransaction', type: 'bytes' },
      { name: 'merkleProof', ...merkleTuple },
      { name: 'continuityProof', ...continuityTuple },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    type: 'function',
    name: 'calculateTxIndex',
    stateMutability: 'view',
    inputs: [{ name: 'merkleProof', ...merkleTuple }],
    outputs: [{ type: 'uint64' }],
  },
] as const;

describe('T-INT-LIVE Attestcoin', { skip: !LIVE }, () => {
  it('fetches demo proof, recovers txIndex, checks receipt, and eth_calls 0x0FD2', async () => {
    const env = loadEnv();
    const networks = loadNetworks(defaultNetworksPath());
    const testnet = networks['cc3-testnet'];
    const baseUrl = env.PROOF_BUILDER_URL ?? testnet.proofBuilderUrl;
    const cc3Url = env.CC3_RPC_URL ?? testnet.cc3RpcUrl;
    assert.ok(baseUrl, 'PROOF_BUILDER_URL missing');
    assert.ok(cc3Url, 'CC3_RPC_URL missing');

    const pb = createProofBuilderClient({ baseUrl, apiKey: env.PROOF_BUILDER_API_KEY });
    const health = await pb.health();
    assert.equal(typeof health.status, 'string');
    assert.equal(typeof health.cc3_rpc_connected, 'boolean');

    const normalized = await fetchProofByTx(pb, 3, DEMO_TX);
    const { bundle, recoveredTxIndex } = normalized;
    assert.equal(bundle.chainKey, 3);
    assert.equal(bundle.headerNumber, 25705174);
    assert.equal(recoveredTxIndex, 18n);
    assert.ok(bundle.txBytes && bundle.txBytes !== '0x');
    const txBytesLen = (bundle.txBytes.length - 2) / 2;
    assert.ok(txBytesLen <= SOURCE_TX_LIMIT, `txBytes ${txBytesLen} exceeds 500KB protocol limit`);

    const [txType, chunks] = decodeAbiParameters(
      [{ type: 'uint8' }, { type: 'bytes[]' }],
      bundle.txBytes as `0x${string}`,
    );
    assert.equal(txType, 2);
    const receiptIdx = txType <= 2 ? 2 : 3;
    const receiptChunk = chunks[receiptIdx];
    assert.ok(receiptChunk);
    const [receiptStatus, , logs] = decodeAbiParameters(
      [
        { type: 'uint8' },
        { type: 'uint64' },
        {
          type: 'tuple[]',
          components: [
            { name: 'address_', type: 'address' },
            { name: 'topics', type: 'bytes32[]' },
            { name: 'data', type: 'bytes' },
          ],
        },
        { type: 'bytes' },
      ],
      receiptChunk,
    );
    assert.equal(receiptStatus, 1);
    assert.equal(logs.length, 1);
    const log0 = logs[0];
    assert.ok(log0);
    assert.equal(log0.address_.toLowerCase(), USDC.toLowerCase());
    assert.equal(log0.topics[0]?.toLowerCase(), BLACKLISTED.toLowerCase());
    const account = `0x${(log0.topics[1] ?? '').slice(-40)}`;
    assert.equal(account.toLowerCase(), ACCOUNT.toLowerCase());

    const merkleProof = {
      root: bundle.merkleProof.root as `0x${string}`,
      siblings: bundle.merkleProof.siblings.map((s) => ({
        hash: s.hash as `0x${string}`,
        isLeft: s.isLeft,
      })),
    };
    const continuityProof = {
      lowerEndpointDigest: bundle.continuityProof.lowerEndpointDigest as `0x${string}`,
      roots: bundle.continuityProof.roots as `0x${string}`[],
    };
    const args = [BigInt(bundle.chainKey), BigInt(bundle.headerNumber), bundle.txBytes as `0x${string}`, merkleProof, continuityProof] as const;

    const cc3 = createCc3RpcClient({ url: cc3Url });
    const chainId = await cc3.chainId();
    assert.equal(chainId, 102031);

    const idxWord = await cc3.call(
      BLOCK_PROVER,
      encodeFunctionData({ abi: blockProverAbi, functionName: 'calculateTxIndex', args: [merkleProof] }),
    );
    assert.equal(BigInt(idxWord), 18n);

    const verifyWord = await cc3.call(
      BLOCK_PROVER,
      encodeFunctionData({ abi: blockProverAbi, functionName: 'verify', args: [...args] }),
    );
    assert.equal(BigInt(verifyWord), 1n);

    const gas = await cc3.estimateGas(
      BLOCK_PROVER,
      encodeFunctionData({ abi: blockProverAbi, functionName: 'verifyAndEmit', args: [...args] }),
    );
    // eslint-style: record observed gas; do not claim efficiency without this measurement
    assert.ok(gas > 0n);
    assert.ok(gas < 8_000_000n, `verifyAndEmit gas ${gas} exceeds conservative 8M limit`);
    process.stdout.write(
      `${JSON.stringify({
        live: true,
        demoTx: DEMO_TX,
        recoveredBlock: bundle.headerNumber,
        recoveredTxIndex: recoveredTxIndex.toString(),
        receiptStatus: Number(receiptStatus),
        emitter: log0.address_,
        event: 'Blacklisted',
        account,
        proofBuilder: { chainKey: bundle.chainKey, txBytesBytes: txBytesLen, siblings: bundle.merkleProof.siblings.length, continuityRoots: bundle.continuityProof.roots.length },
        blockProver: { verify: true, calculateTxIndex: 18, estimateGasVerifyAndEmit: gas.toString() },
        eligibility: 'not written — no ledger submit in this live check',
      })}\n`,
    );
  });

  it('Phase 4: prove path + optional submitProof estimate (broadcast gated)', async () => {
    const env = loadEnv();
    const networks = loadNetworks(defaultNetworksPath());
    const testnet = networks['cc3-testnet'];
    const baseUrl = env.PROOF_BUILDER_URL ?? testnet.proofBuilderUrl;
    const cc3Url = env.CC3_RPC_URL ?? testnet.cc3RpcUrl;
    assert.ok(baseUrl && cc3Url);

    const pb = createProofBuilderClient({ baseUrl, apiKey: env.PROOF_BUILDER_API_KEY });
    const health = await pb.health();
    assert.equal(typeof health.status, 'string');

    const { bundle } = await fetchProofByTx(pb, 3, DEMO_TX);
    assert.equal(bundle.chainKey, 3);

    const cc3 = createCc3RpcClient({ url: cc3Url, expectedChainId: 102031 });
    const chainId = await cc3.chainId();
    assert.equal(chainId, 102031);

    const ledger = env.LEDGER_ADDRESS || env.ELIGIBILITY_LEDGER_ADDRESS;
    const relayKey = env.RELAY_PRIVATE_KEY;
    let submitProofGas: string | null = null;
    let broadcast: 'BLOCKED_NO_LEDGER' | 'BLOCKED_NO_KEY' | 'BLOCKED_UNFUNDED_OR_SKIPPED' | 'EXECUTED' =
      'BLOCKED_NO_LEDGER';

    if (ledger && bundle.txBytes) {
      const { buildSubmitProofCalldata } = await import('../src/services/relay.js');
      const { resolveAppConfig } = await import('../src/config/resolve.js');
      const config = resolveAppConfig(
        {
          ...env,
          LEDGER_ADDRESS: ledger,
          PROOF_BUILDER_URL: baseUrl,
          CC3_RPC_URL: cc3Url,
          FW_ENV: 'cc3-testnet',
        },
        networks,
      );
      const calldata = buildSubmitProofCalldata(config, {
        chainKey: bundle.chainKey,
        headerNumber: bundle.headerNumber,
        txBytes: bundle.txBytes,
        merkleProof: bundle.merkleProof,
        continuityProof: bundle.continuityProof,
      });
      try {
        const gas = await cc3.estimateGas(calldata.to, calldata.data);
        submitProofGas = gas.toString();
        assert.ok(gas > 0n);
      } catch (err) {
        // Deployed ledger may reject estimate if proof already processed — still prove path passed.
        submitProofGas = `estimate_failed:${err instanceof Error ? err.message : 'unknown'}`;
      }
      if (!relayKey) {
        broadcast = 'BLOCKED_NO_KEY';
      } else {
        broadcast = 'BLOCKED_UNFUNDED_OR_SKIPPED';
        // Do not broadcast in live suite unless explicitly enabled — avoids burning gas accidentally.
        if (process.env.LIVE_RELAY_BROADCAST === '1') {
          const { relaySubmitProof } = await import('../src/services/relay.js');
          const result = await relaySubmitProof({
            body: {
              chainKey: bundle.chainKey,
              headerNumber: bundle.headerNumber,
              txBytes: bundle.txBytes,
              merkleProof: bundle.merkleProof,
              continuityProof: bundle.continuityProof,
            },
            config: { ...config, relayPrivateKey: relayKey.startsWith('0x') ? (relayKey as `0x${string}`) : (`0x${relayKey}` as `0x${string}`) },
            proofClient: pb,
            cc3,
          });
          assert.ok(!('disabled' in result));
          assert.match(result.ctcTx, /^0x[0-9a-fA-F]{64}$/);
          broadcast = 'EXECUTED';
        }
      }
    }

    process.stdout.write(
      `${JSON.stringify({
        livePhase4: true,
        proofBuilder: true,
        cc3Rpc: true,
        chainId,
        submitProofGas,
        broadcast,
      })}\n`,
    );
  });
});
