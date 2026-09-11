import { existsSync } from 'node:fs';
import path from 'node:path';
import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import { repoRoot } from './paths.js';

const emptyToUndef = (v: unknown) => (v === '' || v === undefined ? undefined : v);

const optionalUrl = z.preprocess(emptyToUndef, z.string().min(1).optional());
const optionalString = z.preprocess(emptyToUndef, z.string().min(1).optional());
const optionalHexAddress = z.preprocess(
  emptyToUndef,
  z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional(),
);
const optionalHexKey = z.preprocess(
  emptyToUndef,
  z
    .string()
    .regex(/^(0x)?[0-9a-fA-F]{64}$/)
    .optional(),
);

const envSchema = z.object({
  FW_ENV: z.enum(['local', 'test', 'cc3-testnet', 'cc3-mainnet']).optional(),
  NETWORKS_CONFIG_PATH: optionalString,
  WORKER_HOST: optionalString,
  WORKER_PORT: z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional()),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).optional(),
  CORS_ORIGINS: optionalString,
  CC3_RPC_URL: optionalUrl,
  CC3_CHAIN_ID: z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional()),
  ETH_RPC_URL: optionalUrl,
  PROOF_BUILDER_URL: optionalUrl,
  PROOF_BUILDER_API_KEY: optionalString,
  ATTESTCOIN_CHAIN_KEY: z.preprocess(emptyToUndef, z.coerce.number().int().nonnegative().optional()),
  RELAY_PRIVATE_KEY: optionalHexKey,
  DEPLOYER_PRIVATE_KEY: optionalHexKey,
  RELAY_GATE: optionalString,
  VERIFIER_ADDRESS: optionalHexAddress,
  BLACKLIST_VERIFIER_ADDRESS: optionalHexAddress,
  LEDGER_ADDRESS: optionalHexAddress,
  ELIGIBILITY_LEDGER_ADDRESS: optionalHexAddress,
  CREDIT_LINE_ADDRESS: optionalHexAddress,
  GATED_CREDIT_LINE_ADDRESS: optionalHexAddress,
  MOCK_USD_ADDRESS: optionalHexAddress,
  SOURCE_USDC_ADDRESS: optionalHexAddress,
  DEMO_SOURCE_TX: optionalString,
  DEMO_RESTRICTED_ACCOUNT: optionalHexAddress,
  DEMO_SOURCE_BLOCK: z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional()),
  GAS_LIMIT_MULTIPLIER: z.preprocess(emptyToUndef, z.coerce.number().positive().optional()),
  RATE_LIMIT_PER_MIN: z.preprocess(emptyToUndef, z.coerce.number().int().positive().optional()),
  LIVE_ATTESTCOIN: optionalString,
});

export type WorkerEnv = z.infer<typeof envSchema>;

export function loadEnv(options?: { envFile?: string; environ?: NodeJS.ProcessEnv }): WorkerEnv {
  const envFile = options?.envFile ?? path.join(repoRoot(), '.env');
  if (existsSync(envFile)) {
    loadDotenv({ path: envFile, override: false, quiet: true });
  }

  const parsed = envSchema.safeParse(options?.environ ?? process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.message}`);
  }
  return parsed.data;
}
