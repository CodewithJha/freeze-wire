import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { recoverTxIndex } from '../src/domain/txIndex.js';

describe('recoverTxIndex', () => {
  it('empty siblings is 0', () => {
    assert.equal(recoverTxIndex([]), 0n);
  });

  it('matches official vectors and demo tx 18', () => {
    assert.equal(recoverTxIndex([{ hash: '0x', isLeft: true }]), 1n);
    assert.equal(recoverTxIndex([{ hash: '0x', isLeft: false }]), 0n);
    assert.equal(
      recoverTxIndex([
        { hash: '0x', isLeft: false },
        { hash: '0x', isLeft: true },
      ]),
      2n,
    );
    // 18 = 0b10010
    assert.equal(
      recoverTxIndex([
        { hash: '0x', isLeft: false },
        { hash: '0x', isLeft: true },
        { hash: '0x', isLeft: false },
        { hash: '0x', isLeft: false },
        { hash: '0x', isLeft: true },
      ]),
      18n,
    );
  });

  it('rejects more than 64 siblings', () => {
    assert.throws(() => recoverTxIndex(Array.from({ length: 65 }, () => ({ hash: '0x', isLeft: true }))));
  });
});
