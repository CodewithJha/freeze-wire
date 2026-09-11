import { pathToFileURL } from 'node:url';
import { createWorkerServer } from './api/index.js';
import { loadEnv, loadNetworks, resolveAppConfig, defaultNetworksPath } from './config/index.js';
import { createLogger } from './observability/logger.js';

export { loadEnv, loadNetworks, resolveAppConfig } from './config/index.js';
export { Status, recoverTxIndex } from './domain/index.js';
export type { ContinuityResponse, ProofResult } from './clients/index.js';
export { createProofBuilderClient, ProofBuilderError, createCc3RpcClient, createEthRpcClient } from './clients/index.js';
export { fetchProofByTx, proveByTx, relaySubmitProof, discoverCandidates } from './services/index.js';
export { createWorkerServer, createWorkerHandler } from './api/index.js';
export { ApiError, ApiErrorCode } from './domain/errors.js';

export function boot(options?: { environ?: NodeJS.ProcessEnv; startServer?: boolean }) {
  const env = loadEnv({ environ: options?.environ });
  const networksPath = env.NETWORKS_CONFIG_PATH ?? defaultNetworksPath();
  const networks = loadNetworks(networksPath);
  const log = createLogger(env.LOG_LEVEL ?? 'info');

  // Phase 1 compat: config load without requiring prove-path URLs when not starting HTTP.
  if (!options?.startServer) {
    log.info('toolchain.ready', {
      fwEnv: env.FW_ENV ?? 'local',
      profiles: Object.keys(networks).filter((key) => key !== '$comment'),
    });
    return { env, networks, log };
  }

  const config = resolveAppConfig(env, networks);
  log.info('worker.starting', {
    host: config.host,
    port: config.port,
    chainId: config.cc3ChainId,
    chainKey: config.attestcoinChainKey,
    relayEnabled: Boolean(config.relayPrivateKey),
    ledgerConfigured: Boolean(config.ledgerAddress),
    deploymentRegistry: Boolean(config.deploymentRegistry),
  });

  const server = createWorkerServer({ config, log });
  server.listen(config.port, config.host, () => {
    log.info('worker.listening', { url: `http://${config.host}:${config.port}` });
  });
  return { env, networks, config, log, server };
}

const entry = process.argv[1];
if (entry && import.meta.url === pathToFileURL(entry).href) {
  boot({ startServer: true });
}
