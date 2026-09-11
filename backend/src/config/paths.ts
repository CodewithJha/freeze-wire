import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function isRepoRoot(dir: string): boolean {
  return (
    existsSync(path.join(dir, 'config', 'networks.example.json')) &&
    existsSync(path.join(dir, 'foundry.toml'))
  );
}

function walkToRepoRoot(start: string): string | undefined {
  let dir = start;
  for (;;) {
    if (isRepoRoot(dir)) {
      return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return undefined;
    }
    dir = parent;
  }
}

export function repoRoot(): string {
  const fromEnv = process.env.FW_ROOT;
  if (fromEnv && fromEnv.length > 0) {
    return path.resolve(fromEnv);
  }

  const fromModule = walkToRepoRoot(path.dirname(fileURLToPath(import.meta.url)));
  if (fromModule) {
    return fromModule;
  }

  const fromCwd = walkToRepoRoot(process.cwd());
  if (fromCwd) {
    return fromCwd;
  }

  throw new Error('Could not locate FreezeWire repository root (expected config/networks.example.json)');
}

export function backendRoot(): string {
  return path.join(repoRoot(), 'backend');
}

export function defaultNetworksPath(): string {
  return path.join(repoRoot(), 'config', 'networks.example.json');
}
