import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createProofBuilderClient, ProofBuilderError } from '../src/clients/proofBuilder.js';
import { fetchProofByTx } from '../src/services/prove.js';
import type { SingleContinuityResponse } from '../src/domain/proof.js';

const sample: SingleContinuityResponse = {
  chainKey: 3,
  headerNumber: 25705174,
  txIndex: 18,
  cached: true,
  generatedAt: '2026-09-10T00:00:00Z',
  txHash: '0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787',
  txBytes: '0x1234',
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

describe('Proof Builder client', () => {
  it('parses SingleContinuityResponse from OpenAPI shape', async () => {
    const client = createProofBuilderClient({
      baseUrl: 'https://proof-gen-api.cc3-testnet.creditcoin.network',
      fetchImpl: async () =>
        new Response(JSON.stringify(sample), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    });
    const bundle = await client.proofByTx(3, sample.txHash!);
    assert.equal(bundle.chainKey, 3);
    assert.equal(bundle.headerNumber, 25705174);
    assert.equal(bundle.txIndex, 18);
  });

  it('maps 422 BlockNotReady without inventing a proof', async () => {
    const client = createProofBuilderClient({
      baseUrl: 'https://proof-gen-api.cc3-testnet.creditcoin.network',
      fetchImpl: async () =>
        new Response(
          JSON.stringify({ code: 'BlockNotReady', message: 'not attested', retriable: true }),
          { status: 422, headers: { 'Content-Type': 'application/json' } },
        ),
    });
    await assert.rejects(() => client.proofByTx(3, sample.txHash!), (err: unknown) => {
      assert.ok(err instanceof ProofBuilderError);
      assert.equal(err.code, 'BlockNotReady');
      assert.equal(err.httpStatus, 422);
      assert.equal(err.retriable, true);
      return true;
    });
  });

  it('fetchProofByTx recovers txIndex from merkle and rejects empty txBytes', async () => {
    const client = createProofBuilderClient({
      baseUrl: 'https://example.invalid',
      fetchImpl: async () =>
        new Response(JSON.stringify(sample), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    });
    const normalized = await fetchProofByTx(client, 3, sample.txHash!);
    assert.equal(normalized.recoveredTxIndex, 18n);
    assert.equal(normalized.reportedTxIndex, 18n);

    const empty = { ...sample, txBytes: '0x' };
    const emptyClient = createProofBuilderClient({
      baseUrl: 'https://example.invalid',
      fetchImpl: async () =>
        new Response(JSON.stringify(empty), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    });
    await assert.rejects(() => fetchProofByTx(emptyClient, 3, sample.txHash!), /Empty txBytes/);
  });
});
