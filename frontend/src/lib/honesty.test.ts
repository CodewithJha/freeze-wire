import { describe, expect, it } from 'vitest';
import { computeEvidenceSequence } from '@/lib/evidenceSequence';
import { productErrorMessage, WorkerApiError } from '@/lib/api';

describe('computeEvidenceSequence', () => {
  it('accessResolved requires relayed commit — not calldata alone', () => {
    const prepared = computeEvidenceSequence({
      txHash: '0xabc',
      proofReady: true,
      hasCalldata: true,
      relayed: false,
      status: 'RESTRICTED',
      statusSource: 'chain',
    });
    expect(prepared.calldataPrepared).toBe(true);
    expect(prepared.committed).toBe(false);
    expect(prepared.accessResolved).toBe(false);

    const committed = computeEvidenceSequence({
      txHash: '0xabc',
      proofReady: true,
      hasCalldata: true,
      relayed: true,
      status: 'RESTRICTED',
      statusSource: 'chain',
    });
    expect(committed.calldataPrepared).toBe(false);
    expect(committed.committed).toBe(true);
    expect(committed.accessResolved).toBe(true);
  });

  it('accessResolved false when statusSource is not chain', () => {
    const seq = computeEvidenceSequence({
      txHash: '0xabc',
      proofReady: true,
      hasCalldata: false,
      relayed: true,
      status: 'RESTRICTED',
      statusSource: 'cache',
    });
    expect(seq.accessResolved).toBe(false);
  });

  it('L1: accessResolved false when status is UNKNOWN even if relayed+chain', () => {
    const seq = computeEvidenceSequence({
      txHash: '0xabc',
      proofReady: true,
      hasCalldata: false,
      relayed: true,
      status: 'UNKNOWN',
      statusSource: 'chain',
    });
    expect(seq.accessResolved).toBe(false);
  });

  it('L2: accessResolved false when proofReady is false', () => {
    const seq = computeEvidenceSequence({
      txHash: '0xabc',
      proofReady: false,
      hasCalldata: false,
      relayed: true,
      status: 'RESTRICTED',
      statusSource: 'chain',
    });
    expect(seq.accessResolved).toBe(false);
  });

  it('L3: hasCalldata without relay marks prepared not committed', () => {
    const seq = computeEvidenceSequence({
      txHash: '0xabc',
      proofReady: true,
      hasCalldata: true,
      relayed: false,
      status: 'RESTRICTED',
      statusSource: 'chain',
    });
    expect(seq.calldataPrepared).toBe(true);
    expect(seq.committed).toBe(false);
  });
});

describe('productErrorMessage', () => {
  it('scrubs sensitive WorkerApiError payloads', () => {
    const err = new WorkerApiError(500, {
      code: 'CUSTOM_LEAK',
      message: 'RELAY_PRIVATE_KEY=0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      retriable: false,
      requestId: 'abcd1234-ffff',
    });
    const msg = productErrorMessage(err);
    expect(msg).not.toMatch(/PRIVATE_KEY/i);
    expect(msg).not.toMatch(/0xdeadbeef/i);
    expect(msg).toMatch(/REQUEST FAILED|CUSTOM_LEAK/i);
  });

  it('L4: RELAY_DISABLED with submitProof → NOT BROADCAST, not committed', () => {
    const err = new WorkerApiError(503, {
      code: 'RELAY_DISABLED',
      message: 'relay offline',
      retriable: false,
      submitProof: {
        to: '0xde64d5037cA820D4aDFa703C4FaF5451be840C9d',
        data: '0xabcdef',
      },
    });
    const msg = productErrorMessage(err);
    expect(msg).toMatch(/NOT BROADCAST/);
    expect(msg).not.toMatch(/submitted|committed/i);
  });

  it('L5: BLOCK_NOT_READY → PROOF NOT READY, never PROOF VERIFIED', () => {
    const err = new WorkerApiError(422, {
      code: 'BLOCK_NOT_READY',
      message: 'height pending',
      retriable: true,
    });
    const msg = productErrorMessage(err);
    expect(msg).toMatch(/PROOF NOT READY/);
    expect(msg).not.toMatch(/PROOF VERIFIED/);
  });
});
