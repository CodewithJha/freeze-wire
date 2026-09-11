import type { MerkleProofEntry } from './proof.js';

/** Official BlockProver calculateTxIndex: leaf→root; isLeft means current node was right (bit=1). */
export function recoverTxIndex(siblings: readonly MerkleProofEntry[]): bigint {
  if (siblings.length === 0) {
    return 0n;
  }
  if (siblings.length > 64) {
    throw new Error('Merkle proof has too many siblings (max 64)');
  }
  let txIndex = 0n;
  for (let bit = 0; bit < siblings.length; bit += 1) {
    const sibling = siblings[bit];
    if (sibling?.isLeft) {
      txIndex |= 1n << BigInt(bit);
    }
  }
  return txIndex;
}
