import { recoverTxIndex } from '../domain/txIndex.js';
import type { SingleContinuityResponse } from '../domain/proof.js';
import type { ProofBuilderClient } from '../clients/proofBuilder.js';
import type { Logger } from '../observability/logger.js';

export type NormalizedProof = {
  bundle: SingleContinuityResponse;
  recoveredTxIndex: bigint;
  reportedTxIndex: bigint;
};

/** Fetch a Proof Builder bundle. Not an authorization oracle — chain still decides eligibility. */
export async function fetchProofByTx(
  client: ProofBuilderClient,
  chainKey: number,
  txHash: string,
  log?: Logger,
): Promise<NormalizedProof> {
  const bundle = await client.proofByTx(chainKey, txHash);
  if (!bundle.txBytes || bundle.txBytes === '0x') {
    throw new Error('Empty txBytes must not be submitted');
  }
  const recoveredTxIndex = recoverTxIndex(bundle.merkleProof.siblings);
  const reportedTxIndex = BigInt(bundle.txIndex);
  log?.info('proof.fetched', {
    sourceTx: txHash,
    chainKey: bundle.chainKey,
    height: bundle.headerNumber,
    txIndex: recoveredTxIndex.toString(),
    reportedTxIndex: reportedTxIndex.toString(),
    proofCached: bundle.cached,
  });
  return { bundle, recoveredTxIndex, reportedTxIndex };
}
