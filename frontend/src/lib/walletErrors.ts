export type WalletBroadcastErrorCode =
  | 'NO_WALLET'
  | 'WALLET_REJECTED'
  | 'WRONG_NETWORK'
  | 'INSUFFICIENT_FUNDS'
  | 'TX_REVERTED'
  | 'RPC_FAILED'
  | 'BROADCAST_FAILED';

export class WalletBroadcastError extends Error {
  readonly code: WalletBroadcastErrorCode;

  constructor(code: WalletBroadcastErrorCode, message: string) {
    super(message);
    this.name = 'WalletBroadcastError';
    this.code = code;
  }
}
