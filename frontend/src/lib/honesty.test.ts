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
});
