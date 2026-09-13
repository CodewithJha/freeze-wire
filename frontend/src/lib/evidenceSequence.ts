/** Pure evidence → access sequence flags (demo workspace honesty). */

export type EvidenceSequenceInput = {
  txHash?: string | null;
  proofReady: boolean;
  hasCalldata: boolean;
  relayed: boolean;
  status: string;
  statusSource: string | null;
};

export type EvidenceSequence = {
  evidenceLoaded: boolean;
  proofReady: boolean;
  calldataPrepared: boolean;
  committed: boolean;
  accessResolved: boolean;
};

/**
 * Step 04 (`accessResolved`) requires a confirmed Creditcoin commit (`relayed`)
 * plus on-chain status — never calldata preparation alone.
 */
export function computeEvidenceSequence(input: EvidenceSequenceInput): EvidenceSequence {
  return {
    evidenceLoaded: Boolean(input.txHash),
    proofReady: input.proofReady,
    calldataPrepared: input.hasCalldata && !input.relayed,
    committed: input.relayed,
    accessResolved:
      input.proofReady &&
      input.status !== 'UNKNOWN' &&
      input.statusSource === 'chain' &&
      input.relayed,
  };
}
