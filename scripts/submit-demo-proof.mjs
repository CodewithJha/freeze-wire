#!/usr/bin/env node
/**
 * Fetch Proof Builder proof for DEMO_SOURCE_TX and submitProof on CC3.
 * Requires deployments/cc3-testnet.json + funded RELAY_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY.
 * Never prints private keys. Resolves deps from backend/node_modules.
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(root, 'backend', 'package.json'));
const { config: loadDotenv } = require('dotenv');
const {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
} = require('viem');
const { privateKeyToAccount } = require('viem/accounts');

loadDotenv({ path: path.join(root, '.env'), quiet: true });

const registryPath =
  process.env.DEPLOYMENT_REGISTRY_PATH ?? path.join(root, 'deployments', 'cc3-testnet.json');
const demoTx =
  process.env.DEMO_SOURCE_TX ??
  '0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787';
const demoAccount =
  (process.env.DEMO_RESTRICTED_ACCOUNT ?? '0xe05F529f5284D75624eBa386CB716928c3b54A2A').toLowerCase();
const proofBuilderUrl =
  process.env.PROOF_BUILDER_URL ?? 'https://proof-gen-api.cc3-testnet.creditcoin.network';
const rpcUrl = process.env.CC3_RPC_URL ?? 'https://rpc.cc3-testnet.creditcoin.network';
const chainId = Number(process.env.CC3_CHAIN_ID ?? 102031);

function normalizeKey(raw) {
  if (!raw) return undefined;
  return (raw.startsWith('0x') ? raw : `0x${raw}`).toLowerCase();
}

const pk = normalizeKey(process.env.RELAY_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY);

if (!existsSync(registryPath)) {
  console.error(`BLOCKER: missing ${registryPath} — deploy contracts first.`);
  process.exit(2);
}
if (!pk) {
  console.error('BLOCKER: set RELAY_PRIVATE_KEY or DEPLOYER_PRIVATE_KEY (funded tCTC) to submitProof.');
  process.exit(2);
}

const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
const ledger = registry.addresses?.eligibilityLedger;
if (!ledger) {
  console.error('Registry missing addresses.eligibilityLedger');
  process.exit(1);
}

const eligibilityLedgerAbi = [
  {
    type: 'function',
    name: 'statusOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'submitProof',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'chainKey', type: 'uint64' },
      { name: 'height', type: 'uint64' },
      { name: 'encodedTransaction', type: 'bytes' },
      {
        name: 'merkleProof',
        type: 'tuple',
        components: [
          { name: 'root', type: 'bytes32' },
          {
            name: 'siblings',
            type: 'tuple[]',
            components: [
              { name: 'hash', type: 'bytes32' },
              { name: 'isLeft', type: 'bool' },
            ],
          },
        ],
      },
      {
        name: 'continuityProof',
        type: 'tuple',
        components: [
          { name: 'lowerEndpointDigest', type: 'bytes32' },
          { name: 'roots', type: 'bytes32[]' },
        ],
      },
    ],
    outputs: [],
  },
];

const chain = defineChain({
  id: chainId,
  name: 'Creditcoin CC3 Testnet',
  nativeCurrency: { name: 'CTC', symbol: 'CTC', decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});

const account = privateKeyToAccount(pk);
const publicClient = createPublicClient({ chain, transport: http(rpcUrl) });
const walletClient = createWalletClient({ account, chain, transport: http(rpcUrl) });

console.log('demoSourceTx', demoTx);
console.log('ledger', ledger);
console.log('submitter', account.address);

const proveUrl = `${proofBuilderUrl.replace(/\/$/, '')}/api/v1/proof/tx/${demoTx}`;
const headers = { Accept: 'application/json' };
if (process.env.PROOF_BUILDER_API_KEY) {
  headers.Authorization = `Bearer ${process.env.PROOF_BUILDER_API_KEY}`;
}
const proveRes = await fetch(proveUrl, { headers });
if (!proveRes.ok) {
  console.error(`Proof Builder failed: HTTP ${proveRes.status}`);
  console.error(await proveRes.text());
  process.exit(1);
}
const bundle = await proveRes.json();
if (!bundle.txBytes) {
  console.error('Proof Builder response missing txBytes');
  process.exit(1);
}

const outDir = path.join(root, 'deployments');
mkdirSync(outDir, { recursive: true });
const evidencePath = path.join(outDir, 'demo-proof-public.json');
writeFileSync(
  evidencePath,
  JSON.stringify(
    {
      demoSourceTx: demoTx,
      chainKey: bundle.chainKey,
      headerNumber: bundle.headerNumber,
      txIndex: bundle.txIndex,
      merkleRoot: bundle.merkleProof?.root,
      siblingCount: bundle.merkleProof?.siblings?.length ?? 0,
      continuityRootCount: bundle.continuityProof?.roots?.length ?? 0,
      cached: bundle.cached,
      generatedAt: bundle.generatedAt,
    },
    null,
    2,
  ),
);
console.log('wrote public proof summary', evidencePath);

const args = [
  BigInt(bundle.chainKey),
  BigInt(bundle.headerNumber),
  bundle.txBytes,
  {
    root: bundle.merkleProof.root,
    siblings: bundle.merkleProof.siblings.map((s) => ({ hash: s.hash, isLeft: Boolean(s.isLeft) })),
  },
  {
    lowerEndpointDigest: bundle.continuityProof.lowerEndpointDigest,
    roots: bundle.continuityProof.roots,
  },
];

const before = await publicClient.readContract({
  address: ledger,
  abi: eligibilityLedgerAbi,
  functionName: 'statusOf',
  args: [demoAccount],
});
console.log('statusOf before', Number(before) === 1 ? 'RESTRICTED' : 'ELIGIBLE');

const hash = await walletClient.writeContract({
  address: ledger,
  abi: eligibilityLedgerAbi,
  functionName: 'submitProof',
  args,
  chain,
  account,
});
console.log('submitProof tx', hash);
const receipt = await publicClient.waitForTransactionReceipt({ hash });
console.log('submitProof status', receipt.status, 'block', receipt.blockNumber.toString());

const after = await publicClient.readContract({
  address: ledger,
  abi: eligibilityLedgerAbi,
  functionName: 'statusOf',
  args: [demoAccount],
});
console.log('statusOf after', Number(after) === 1 ? 'RESTRICTED' : 'ELIGIBLE');

writeFileSync(
  path.join(outDir, 'demo-evidence-public.json'),
  JSON.stringify(
    {
      network: registry.network,
      chainId,
      demoSourceTx: demoTx,
      demoAccount,
      ledger,
      submitProofTx: hash,
      submitProofStatus: receipt.status,
      statusOf: Number(after) === 1 ? 'RESTRICTED' : 'ELIGIBLE',
    },
    null,
    2,
  ),
);
console.log('wrote deployments/demo-evidence-public.json');

if (Number(after) !== 1) {
  console.error('FAIL: expected RESTRICTED after submitProof');
  process.exit(1);
}
