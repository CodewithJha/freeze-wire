import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { loadEnv, resolveAppConfig } from '../src/config/index.js';
import { loadNetworks } from '../src/config/loadNetworks.js';
import { defaultNetworksPath } from '../src/config/paths.js';
import { boot } from '../src/index.js';
import { Status } from '../src/domain/status.js';

describe('Phase 1 config foundation', () => {
  it('loads config/networks.example.json', () => {
    const networks = loadNetworks(defaultNetworksPath());
    assert.ok(networks.local);
    assert.ok(networks['cc3-testnet']);
    assert.ok(networks['cc3-mainnet']);
    assert.equal(typeof networks.local.cc3ChainId, 'number');
    assert.equal(typeof networks['cc3-testnet'].cc3ChainId, 'number');
    assert.ok(networks['cc3-testnet'].sourceUsdc);
    assert.equal(networks.local.proofBuilderUrl, null);
  });

  it('boot() returns parsed networks without RPC I/O', () => {
    const { networks } = boot();
    assert.equal(networks.local.name, 'anvil-or-foundry');
  });

  it('loadEnv accepts empty process env', () => {
    const env = loadEnv({ environ: {} });
    assert.equal(env.RELAY_PRIVATE_KEY, undefined);
    assert.equal(env.DEPLOYER_PRIVATE_KEY, undefined);
  });

  it('exposes domain status codes as types only', () => {
    assert.equal(Status.ELIGIBLE, 0);
    assert.equal(Status.RESTRICTED, 1);
  });

  it('T-CFG resolveAppConfig fails fast without prove-path URLs on local profile', () => {
    const networks = loadNetworks(defaultNetworksPath());
    const env = loadEnv({ environ: { FW_ENV: 'local' } });
    assert.throws(() => resolveAppConfig(env, networks), /PROOF_BUILDER_URL/);
  });

  it('resolveAppConfig accepts address aliases and optional relay key', () => {
    const networks = loadNetworks(defaultNetworksPath());
    const env = loadEnv({
      environ: {
        FW_ENV: 'cc3-testnet',
        ELIGIBILITY_LEDGER_ADDRESS: '0x2222222222222222222222222222222222222222',
        BLACKLIST_VERIFIER_ADDRESS: '0x3333333333333333333333333333333333333333',
        GATED_CREDIT_LINE_ADDRESS: '0x4444444444444444444444444444444444444444',
      },
    });
    const cfg = resolveAppConfig(env, networks);
    assert.equal(cfg.ledgerAddress, '0x2222222222222222222222222222222222222222');
    assert.equal(cfg.verifierAddress, '0x3333333333333333333333333333333333333333');
    assert.equal(cfg.creditLineAddress, '0x4444444444444444444444444444444444444444');
    assert.equal(cfg.relayPrivateKey, undefined);
    assert.equal(cfg.deploymentRegistry, undefined);
  });

  it('loadDeploymentRegistry returns undefined when file absent', async () => {
    const { loadDeploymentRegistry } = await import('../src/config/deploymentRegistry.js');
    const missing = loadDeploymentRegistry('/tmp/freeze-wire-missing-registry.json');
    assert.equal(missing, undefined);
  });
});
