/** Stable machine-readable API error codes (docs/API_SPECIFICATION.md). */
export const ApiErrorCode = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_TXHASH: 'INVALID_TXHASH',
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  TX_NOT_FOUND: 'TX_NOT_FOUND',
  BLOCK_NOT_READY: 'BLOCK_NOT_READY',
  PROOF_BUILDER_FAILED: 'PROOF_BUILDER_FAILED',
  TX_HASH_LOOKUP_UNIMPLEMENTED: 'TX_HASH_LOOKUP_UNIMPLEMENTED',
  CC3_RPC_FAILED: 'CC3_RPC_FAILED',
  ETH_RPC_FAILED: 'ETH_RPC_FAILED',
  RELAY_DISABLED: 'RELAY_DISABLED',
  CONTRACT_REVERT: 'CONTRACT_REVERT',
  RATE_LIMITED: 'RATE_LIMITED',
  UNAUTHORIZED: 'UNAUTHORIZED',
  WRONG_CHAIN: 'WRONG_CHAIN',
  GAS_ESTIMATION_FAILED: 'GAS_ESTIMATION_FAILED',
  TRANSACTION_REJECTED: 'TRANSACTION_REJECTED',
  TRANSACTION_BROADCAST_FAILED: 'TRANSACTION_BROADCAST_FAILED',
} as const;

export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

export type ApiErrorBody = {
  code: string;
  message: string;
  retriable: boolean;
  submitProof?: { to: string; data: string };
  error?: string;
};

export class ApiError extends Error {
  override readonly name = 'ApiError';

  constructor(
    readonly code: ApiErrorCode | string,
    message: string,
    readonly httpStatus: number,
    readonly retriable = false,
    readonly extras?: Omit<ApiErrorBody, 'code' | 'message' | 'retriable'>,
  ) {
    super(message);
  }

  toBody(): ApiErrorBody {
    return {
      code: this.code,
      message: this.message,
      retriable: this.retriable,
      ...this.extras,
    };
  }
}
