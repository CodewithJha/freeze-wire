#!/usr/bin/env node
/**
 * Sync public addresses from deployments/cc3-testnet.json into local env files.
 * Never writes private keys. Idempotent for address lines only.
 */
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const registryPath =
  process.env.DEPLOYMENT_REGISTRY_PATH ?? path.join(root, 'deployments', 'cc3-testnet.json');

if (!existsSync(registryPath)) {
  console.error(`No registry at ${registryPath}. Deploy first or pass DEPLOYMENT_REGISTRY_PATH.`);
  process.exit(2);
}

const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const a = registry.addresses;
if (!a?.mockUsd || !a?.blacklistVerifier || !a?.eligibilityLedger || !a?.gatedCreditLine) {
  console.error('Registry missing addresses.* fields');
  process.exit(1);
}

const zero = '0x0000000000000000000000000000000000000000';
for (const [k, v] of Object.entries(a)) {
  if (String(v).toLowerCase() === zero) {
    console.error(`Refusing to sync placeholder zero address for ${k}`);
    process.exit(1);
  }
}

const backendPairs = {
  VERIFIER_ADDRESS: a.blacklistVerifier,
  LEDGER_ADDRESS: a.eligibilityLedger,
  CREDIT_LINE_ADDRESS: a.gatedCreditLine,
  MOCK_USD_ADDRESS: a.mockUsd,
};

const frontendPairs = {
  VITE_CREDIT_LINE_ADDRESS: a.gatedCreditLine,
  VITE_LEDGER_ADDRESS: a.eligibilityLedger,
};

function upsertEnvFile(filePath, pairs) {
  let text = existsSync(filePath) ? readFileSync(filePath, 'utf8') : '';
  for (const [key, value] of Object.entries(pairs)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^${key}=.*$`, 'm');
    if (re.test(text)) {
      text = text.replace(re, line);
    } else {
      text = text.endsWith('\n') || text.length === 0 ? `${text}${line}\n` : `${text}\n${line}\n`;
    }
  }
  writeFileSync(filePath, text);
  console.log(`updated ${path.relative(root, filePath)}`);
}

upsertEnvFile(path.join(root, '.env'), backendPairs);
upsertEnvFile(path.join(root, 'frontend', '.env.local'), {
  ...frontendPairs,
  VITE_CC3_CHAIN_ID: String(registry.chainId ?? 102031),
});

console.log('Synced public deployment addresses (secrets untouched).');
