/**
 * Centralized Phase-3 EligibilityLedger ABI fragments used by the worker.
 * Argument order matches contracts/src/interfaces/IEligibilityLedger.sol — do not invent.
 */
export const eligibilityLedgerAbi = [
  {
    type: 'function',
    name: 'statusOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'submitProof',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'chainKey', type: 'uint64' },
      { name: 'height', type: 'uint64' },
      { name: 'encodedTransaction', type: 'bytes' },
      {
        name: 'merkleProof',
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
      },
      {
        name: 'continuityProof',
        type: 'tuple',
        components: [
          { name: 'lowerEndpointDigest', type: 'bytes32' },
          { name: 'roots', type: 'bytes32[]' },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'Restricted',
    inputs: [
      { name: 'account', type: 'address', indexed: true },
      { name: 'replayKey', type: 'bytes32', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'Restored',
    inputs: [
      { name: 'account', type: 'address', indexed: true },
      { name: 'replayKey', type: 'bytes32', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'ProcessedWithoutFact',
    inputs: [{ name: 'replayKey', type: 'bytes32', indexed: true }],
  },
] as const;

/** Circle USDC Blacklisted / UnBlacklisted topic0 (contracts/src/libraries/EventSelectors.sol). */
export const TOPIC_BLACKLISTED =
  '0xffa4e6181777692565cf28528fc88fd1516ea86b56da075235fa575af6a4b855' as const;
export const TOPIC_UNBLACKLISTED =
  '0x117e3210bb9aa7d9baff172026820255c6f6c30ba8999d1c2fd88e2848137c4e' as const;
