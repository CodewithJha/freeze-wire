import { encodeFunctionData } from 'viem';
import type { AppConfig } from '../config/resolve.js';
import type { Cc3RpcClient } from '../clients/cc3Rpc.js';
import type { ProofBuilderClient } from '../clients/proofBuilder.js';
import { eligibilityLedgerAbi } from '../domain/abi.js';
import { ApiError, ApiErrorCode } from '../domain/errors.js';
import { assertAddress } from '../domain/hex.js';
import { Status } from '../domain/status.js';
import { RpcTransportError } from '../clients/cc3Rpc.js';

export type HealthResponse = {
  status: 'ok' | 'degraded';
  cc3Rpc: boolean;
  ethRpc: boolean;
  proofBuilder: { ok: boolean; raw: object | null };
  chainId: number;
  expectedChainKey: number;
  deployment: {
    configured: boolean;
    network: string | null;
    verifier: string | null;
    ledger: string | null;
    creditLine: string | null;
    mockUsd: string | null;
  };
};

export async function checkHealth(options: {
  config: AppConfig;
  cc3: Cc3RpcClient;
  proofClient: ProofBuilderClient;
  ethRpcUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<HealthResponse> {
  const { config, cc3, proofClient } = options;
  let cc3Rpc = false;
  let chainId = config.cc3ChainId;
  try {
    chainId = await cc3.chainId();
    cc3Rpc = chainId === config.cc3ChainId;
  } catch {
    cc3Rpc = false;
  }

  let proofBuilder: { ok: boolean; raw: object | null } = { ok: false, raw: null };
  try {
    const raw = await proofClient.health();
    proofBuilder = { ok: true, raw };
  } catch {
    proofBuilder = { ok: false, raw: null };
  }

  let ethRpc = false;
  if (options.ethRpcUrl) {
    try {
      const fetchImpl = options.fetchImpl ?? fetch;
      const res = await fetchImpl(options.ethRpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] }),
      });
      ethRpc = res.ok;
    } catch {
      ethRpc = false;
    }
  }

  const status: 'ok' | 'degraded' = cc3Rpc && proofBuilder.ok ? 'ok' : 'degraded';
  return {
    status,
    cc3Rpc,
    ethRpc,
    proofBuilder,
    chainId,
    expectedChainKey: config.attestcoinChainKey,
    deployment: {
      configured: Boolean(config.ledgerAddress && config.creditLineAddress && config.verifierAddress),
      network: config.deploymentRegistry?.network ?? null,
      verifier: config.verifierAddress ?? null,
      ledger: config.ledgerAddress ?? null,
      creditLine: config.creditLineAddress ?? null,
      mockUsd: config.mockUsdAddress ?? null,
    },
  };
}

export type StatusResponse = {
  address: string;
  status: 'ELIGIBLE' | 'RESTRICTED';
  source: 'chain';
  ledger: string;
};

export async function readStatus(options: {
  config: AppConfig;
  cc3: Cc3RpcClient;
  addressRaw: string;
}): Promise<StatusResponse> {
  const address = assertAddress(options.addressRaw);
  if (!options.config.ledgerAddress) {
    throw new ApiError(ApiErrorCode.CC3_RPC_FAILED, 'LEDGER_ADDRESS not configured', 502, false);
  }
  try {
    const data = encodeFunctionData({
      abi: eligibilityLedgerAbi,
      functionName: 'statusOf',
      args: [address],
    });
    const word = await options.cc3.call(options.config.ledgerAddress, data);
    const code = Number(BigInt(word));
    const status = code === Status.RESTRICTED ? 'RESTRICTED' : 'ELIGIBLE';
    return {
      address,
      status,
      source: 'chain',
      ledger: options.config.ledgerAddress,
    };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const message =
      err instanceof RpcTransportError || err instanceof Error ? err.message : 'CC3 RPC failed';
    throw new ApiError(ApiErrorCode.CC3_RPC_FAILED, message, 502, true);
  }
}

export type EvidenceDemoResponse = {
  sourceTx: string;
  account: string;
  usdc: string;
  etherscan: string;
  block: number;
};

export function evidenceDemo(config: AppConfig): EvidenceDemoResponse {
  return {
    sourceTx: config.demoSourceTx,
    account: config.demoRestrictedAccount,
    usdc: config.sourceUsdc,
    etherscan: `https://etherscan.io/tx/${config.demoSourceTx}`,
    block: config.demoSourceBlock,
  };
}
