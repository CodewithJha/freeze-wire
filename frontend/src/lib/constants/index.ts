/** Demo evidence FACT (docs/DEMO_SPECIFICATION.md). Display only when API returns matching fields. */
export const DEMO_SOURCE_TX =
  '0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787' as const;

export const CC3_CHAIN_ID = Number(import.meta.env.VITE_CC3_CHAIN_ID ?? 102031);
export const CC3_EXPLORER_URL =
  (import.meta.env.VITE_CC3_EXPLORER_URL as string | undefined) ??
  'https://creditcoin-testnet.blockscout.com';
export const ETH_EXPLORER_TX = 'https://etherscan.io/tx';

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ??
  'http://127.0.0.1:8000';

export const CC3_RPC_URL =
  (import.meta.env.VITE_CC3_RPC_URL as string | undefined) ??
  'https://rpc.cc3-testnet.creditcoin.network';

export type EligibilityStatus = 'ELIGIBLE' | 'RESTRICTED' | 'UNKNOWN';

export type WireStage = 'ethereum' | 'event' | 'proof' | 'creditcoin' | 'access';

// Credit-line addresses / deployment mode live in `@/lib/deployment` (not hardcoded here).
export {
  CREDIT_LINE_ADDRESS,
  LEDGER_ADDRESS,
  ALLOW_SIMULATION,
  addressesConfigured,
  resolveDeploymentMode,
  type DeploymentMode,
} from '../deployment';
