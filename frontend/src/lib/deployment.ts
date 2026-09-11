/** Explicit credit-line deployment modes. Never imply on-chain enforcement when undeployed. */
export type DeploymentMode = 'LIVE' | 'NOT_DEPLOYED' | 'UNAVAILABLE' | 'SIMULATION';

export const CREDIT_LINE_ADDRESS =
  (import.meta.env.VITE_CREDIT_LINE_ADDRESS as string | undefined) ?? '';
export const LEDGER_ADDRESS = (import.meta.env.VITE_LEDGER_ADDRESS as string | undefined) ?? '';
export const CC3_RPC_URL =
  (import.meta.env.VITE_CC3_RPC_URL as string | undefined) ??
  'https://rpc.cc3-testnet.creditcoin.network';

/** Opt-in only. Without this, missing addresses are NOT_DEPLOYED — not simulated enforcement. */
export const ALLOW_SIMULATION =
  (import.meta.env.VITE_ALLOW_SIMULATION as string | undefined) === '1';

export function addressesConfigured(): boolean {
  return (
    /^0x[0-9a-fA-F]{40}$/.test(CREDIT_LINE_ADDRESS) &&
    /^0x[0-9a-fA-F]{40}$/.test(LEDGER_ADDRESS)
  );
}

export function resolveDeploymentMode(options?: { rpcFailed?: boolean }): DeploymentMode {
  if (ALLOW_SIMULATION && !addressesConfigured()) {
    return 'SIMULATION';
  }
  if (!addressesConfigured()) {
    return 'NOT_DEPLOYED';
  }
  if (options?.rpcFailed) {
    return 'UNAVAILABLE';
  }
  return 'LIVE';
}
