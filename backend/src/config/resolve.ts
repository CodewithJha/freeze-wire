import type { WorkerEnv } from './env.js';
import type { NetworkProfile, NetworksFile } from './networks.js';

export type AppConfig = {
  fwEnv: string;
  host: string;
  port: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  corsOrigins: string[];
  cc3RpcUrl: string;
  cc3ChainId: number;
  ethRpcUrl: string | undefined;
  proofBuilderUrl: string;
  proofBuilderApiKey: string | undefined;
  attestcoinChainKey: number;
  sourceUsdc: `0x${string}`;
  verifierAddress: `0x${string}` | undefined;
  ledgerAddress: `0x${string}` | undefined;
  creditLineAddress: `0x${string}` | undefined;
  relayPrivateKey: `0x${string}` | undefined;
  relayGate: string | undefined;
  demoSourceTx: `0x${string}`;
  demoRestrictedAccount: `0x${string}`;
  demoSourceBlock: number;
  gasLimitMultiplier: number;
  rateLimitPerMin: number;
  profile: NetworkProfile;
};

function pickAddress(
  primary: string | undefined,
  alias: string | undefined,
): `0x${string}` | undefined {
  const value = primary || alias;
  return value ? (value.toLowerCase() as `0x${string}`) : undefined;
}

function normalizeKey(key: string | undefined): `0x${string}` | undefined {
  if (!key) return undefined;
  return (key.startsWith('0x') ? key : `0x${key}`).toLowerCase() as `0x${string}`;
}

/**
 * Resolve worker runtime config from env + networks file.
 * Relayer private key is optional. Prove-path settings fail fast.
 */
export function resolveAppConfig(env: WorkerEnv, networks: NetworksFile): AppConfig {
  const profileKey = env.FW_ENV === 'local' || env.FW_ENV === 'test' ? 'local' : (env.FW_ENV ?? 'cc3-testnet');
  const profile =
    profileKey === 'local'
      ? networks.local
      : profileKey === 'cc3-mainnet'
        ? networks['cc3-mainnet']
        : networks['cc3-testnet'];

  const proofBuilderUrl = env.PROOF_BUILDER_URL ?? profile.proofBuilderUrl ?? undefined;
  const cc3RpcUrl = env.CC3_RPC_URL ?? profile.cc3RpcUrl ?? undefined;
  const cc3ChainId = env.CC3_CHAIN_ID ?? profile.cc3ChainId;
  const attestcoinChainKey = env.ATTESTCOIN_CHAIN_KEY ?? profile.sourceChainKey;

  if (!proofBuilderUrl) {
    throw new Error('PROOF_BUILDER_URL (or networks proofBuilderUrl) is required for prove path');
  }
  if (!cc3RpcUrl) {
    throw new Error('CC3_RPC_URL (or networks cc3RpcUrl) is required for prove path');
  }
  if (attestcoinChainKey === undefined) {
    throw new Error('ATTESTCOIN_CHAIN_KEY (or networks sourceChainKey) is required');
  }

  const sourceUsdc = (env.SOURCE_USDC_ADDRESS ?? profile.sourceUsdc)?.toLowerCase() as
    | `0x${string}`
    | undefined;
  if (!sourceUsdc) {
    throw new Error('SOURCE_USDC_ADDRESS (or networks sourceUsdc) is required');
  }

  const demoSourceTx = (env.DEMO_SOURCE_TX ??
    profile.demoSourceTx ??
    '0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787').toLowerCase() as `0x${string}`;

  const corsRaw =
    env.CORS_ORIGINS ?? 'http://localhost:5173,http://127.0.0.1:5173';
  const corsOrigins = corsRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    fwEnv: env.FW_ENV ?? 'local',
    host: env.WORKER_HOST ?? '127.0.0.1',
    port: env.WORKER_PORT ?? 8000,
    logLevel: env.LOG_LEVEL ?? 'info',
    corsOrigins,
    cc3RpcUrl,
    cc3ChainId,
    ethRpcUrl: env.ETH_RPC_URL,
    proofBuilderUrl,
    proofBuilderApiKey: env.PROOF_BUILDER_API_KEY,
    attestcoinChainKey,
    sourceUsdc,
    verifierAddress: pickAddress(env.VERIFIER_ADDRESS, env.BLACKLIST_VERIFIER_ADDRESS),
    ledgerAddress: pickAddress(env.LEDGER_ADDRESS, env.ELIGIBILITY_LEDGER_ADDRESS),
    creditLineAddress: pickAddress(env.CREDIT_LINE_ADDRESS, env.GATED_CREDIT_LINE_ADDRESS),
    relayPrivateKey: normalizeKey(env.RELAY_PRIVATE_KEY),
    relayGate: env.RELAY_GATE,
    demoSourceTx,
    demoRestrictedAccount: (env.DEMO_RESTRICTED_ACCOUNT ??
      '0xe05F529f5284D75624eBa386CB716928c3b54A2A').toLowerCase() as `0x${string}`,
    demoSourceBlock: env.DEMO_SOURCE_BLOCK ?? 25705174,
    gasLimitMultiplier: env.GAS_LIMIT_MULTIPLIER ?? 1.2,
    rateLimitPerMin: env.RATE_LIMIT_PER_MIN ?? 30,
    profile,
  };
}
