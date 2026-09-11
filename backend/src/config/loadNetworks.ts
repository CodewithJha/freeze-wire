import { readFileSync } from 'node:fs';
import { defaultNetworksPath } from './paths.js';
import { networksFileSchema, type NetworksFile } from './networks.js';

export function loadNetworks(configPath = defaultNetworksPath()): NetworksFile {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(configPath, 'utf8')) as unknown;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to read network config at ${configPath}: ${reason}`);
  }

  const parsed = networksFileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`Invalid network config at ${configPath}: ${parsed.error.message}`);
  }
  return parsed.data;
}
