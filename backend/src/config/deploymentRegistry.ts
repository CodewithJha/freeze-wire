import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { repoRoot } from './paths.js';

const hexAddress = z.string().regex(/^0x[0-9a-fA-F]{40}$/);

const deploymentRegistrySchema = z.object({
  network: z.string().min(1),
  chainId: z.number().int().positive(),
  deployBlock: z.number().int().nonnegative().optional(),
  timestamp: z.number().int().nonnegative().optional(),
  attestcoinChainKey: z.number().int().nonnegative().optional(),
  proofMinHeight: z.number().int().nonnegative().optional(),
  proofMaxHeight: z.number().int().nonnegative().optional(),
  ltvBps: z.number().int().positive().optional(),
  sourceUsdc: hexAddress.optional(),
  blockProver: hexAddress.optional(),
  addresses: z.object({
    mockUsd: hexAddress,
    blacklistVerifier: hexAddress,
    eligibilityLedger: hexAddress,
    gatedCreditLine: hexAddress,
  }),
});

export type DeploymentRegistry = z.infer<typeof deploymentRegistrySchema>;

export function defaultDeploymentRegistryPath(): string {
  return path.join(repoRoot(), 'deployments', 'cc3-testnet.json');
}

/**
 * Load deployments/cc3-testnet.json (or DEPLOYMENT_REGISTRY_PATH).
 * Returns undefined when the file is absent — undeployed is a valid state.
 *
 * Under NODE_ENV=test, skips the default live registry so unit tests stay
 * deterministic when a real deploy file is present. Opt in with
 * TEST_USE_REGISTRY=1, or pass an explicit path / DEPLOYMENT_REGISTRY_PATH.
 * Worker/runtime (non-test) behavior is unchanged.
 */
export function loadDeploymentRegistry(registryPath?: string): DeploymentRegistry | undefined {
  const explicit = registryPath ?? process.env.DEPLOYMENT_REGISTRY_PATH;
  if (
    process.env.NODE_ENV === 'test' &&
    process.env.TEST_USE_REGISTRY !== '1' &&
    explicit === undefined
  ) {
    return undefined;
  }
  const pathToLoad = explicit ?? defaultDeploymentRegistryPath();
  if (!existsSync(pathToLoad)) {
    return undefined;
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(pathToLoad, 'utf8')) as unknown;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read deployment registry at ${pathToLoad}: ${reason}`);
  }
  const parsed = deploymentRegistrySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid deployment registry at ${pathToLoad}: ${parsed.error.message}`);
  }
  const zero = '0x0000000000000000000000000000000000000000';
  const addrs = parsed.data.addresses;
  if (
    addrs.mockUsd.toLowerCase() === zero ||
    addrs.blacklistVerifier.toLowerCase() === zero ||
    addrs.eligibilityLedger.toLowerCase() === zero ||
    addrs.gatedCreditLine.toLowerCase() === zero
  ) {
    throw new Error(
      `Deployment registry at ${pathToLoad} still has placeholder zero addresses — replace after a real deploy`,
    );
  }
  return parsed.data;
}
