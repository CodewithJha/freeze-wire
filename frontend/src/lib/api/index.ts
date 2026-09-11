import { API_BASE_URL } from '@/lib/constants';

export type ApiErrorBody = {
  code: string;
  message: string;
  retriable?: boolean;
  error?: string;
  submitProof?: { to: string; data: string };
};

export class WorkerApiError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly retriable: boolean;
  readonly body: ApiErrorBody;

  constructor(httpStatus: number, body: ApiErrorBody) {
    super(body.message || body.code);
    this.name = 'WorkerApiError';
    this.code = body.code;
    this.httpStatus = httpStatus;
    this.retriable = Boolean(body.retriable);
    this.body = body;
  }
}

async function parseJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { code: 'INVALID_REQUEST', message: text || 'Non-JSON response' };
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const body = await parseJson(res);
  if (!res.ok) {
    const errBody = body as ApiErrorBody;
    throw new WorkerApiError(res.status, {
      code: errBody.code ?? 'INVALID_REQUEST',
      message: errBody.message ?? `Request failed (${res.status})`,
      retriable: errBody.retriable,
      error: errBody.error,
      submitProof: errBody.submitProof,
    });
  }
  return body as T;
}

export type HealthResponse = {
  status: 'ok' | 'degraded';
  cc3Rpc: boolean;
  ethRpc: boolean;
  proofBuilder: { ok: boolean; raw: object | null };
  chainId: number;
  expectedChainKey: number;
};

export type StatusResponse = {
  address: string;
  status: 'ELIGIBLE' | 'RESTRICTED';
  source: 'chain';
  ledger: string;
};

export type EvidenceDemoResponse = {
  sourceTx: string;
  account: string;
  usdc: string;
  etherscan: string;
  block: number;
};

export type DiscoverCandidate = {
  txHash: string;
  blockNumber: number;
  txIndex: number;
  account: string;
  kind: string;
};

export type DiscoverResponse = {
  candidates: DiscoverCandidate[];
};

export type ProveResponse = {
  chainKey: number;
  headerNumber: number;
  txIndex: number;
  txBytes: string;
  merkleProof: {
    root: string;
    siblings: { hash: string; isLeft: boolean }[];
  };
  continuityProof: {
    lowerEndpointDigest: string;
    roots: string[];
  };
  attestedHeight: number | null;
  txHash?: string | null;
  cached?: boolean;
  generatedAt?: string;
};

export type RelaySuccess = {
  ctcTx: string;
  restricted: string[];
  restored: string[];
};

export type RelayDisabled = {
  submitProof: { to: string; data: string };
};

export const api = {
  health: () => request<HealthResponse>('/v1/health'),
  evidenceDemo: () => request<EvidenceDemoResponse>('/v1/evidence/demo'),
  discover: (address?: string) => {
    const q = address ? `?address=${encodeURIComponent(address)}` : '';
    return request<DiscoverResponse>(`/v1/discover${q}`);
  },
  status: (address: string) => request<StatusResponse>(`/v1/status/${address}`),
  prove: (txHash: string) => request<ProveResponse>(`/v1/prove/${txHash}`),
  relay: (txHash: string) =>
    request<RelaySuccess>('/v1/relay', {
      method: 'POST',
      body: JSON.stringify({ txHash }),
    }),
};

/** Map machine codes to product-facing copy. Never invent success. */
export function productErrorMessage(err: unknown): string {
  if (err instanceof WorkerApiError) {
    switch (err.code) {
      case 'BLOCK_NOT_READY':
        return 'PROOF NOT READY — source block not yet attested.';
      case 'TX_NOT_FOUND':
        return 'NO CANONICAL EVIDENCE — transaction not found upstream.';
      case 'PROOF_BUILDER_FAILED':
        return 'PROOF REJECTED — Proof Builder failed to serve this height.';
      case 'CONTRACT_REVERT':
        return `PROOF REJECTED — contract reverted${err.body.error ? `: ${err.body.error}` : ''}.`;
      case 'RELAY_DISABLED':
        if (err.body.submitProof) {
          return 'RELAY DISABLED — use returned calldata with a client wallet.';
        }
        if (/LEDGER_ADDRESS/i.test(err.message)) {
          return 'RELAY DISABLED — LEDGER_ADDRESS not configured; cannot encode submitProof.';
        }
        return 'RELAY DISABLED — worker cannot broadcast (no RELAY_PRIVATE_KEY).';
      case 'UNAUTHORIZED':
        return 'RELAY UNAUTHORIZED — localhost or RELAY_GATE required.';
      case 'CC3_RPC_FAILED':
        if (/LEDGER_ADDRESS/i.test(err.message)) {
          return 'LEDGER UNAVAILABLE — LEDGER_ADDRESS not configured; chain status unread.';
        }
        return 'CREDITCOIN RPC UNAVAILABLE — status cannot be read.';
      case 'ETH_RPC_FAILED':
        return 'ETHEREUM RPC UNAVAILABLE — discovery failed.';
      case 'RATE_LIMITED':
        return 'RATE LIMITED — wait and retry.';
      case 'INVALID_TXHASH':
        return 'INVALID TX HASH — expect 32-byte hex.';
      case 'INVALID_ADDRESS':
        return 'INVALID ADDRESS — expect 20-byte hex.';
      default:
        return err.message || err.code;
    }
  }
  if (err instanceof Error) return err.message;
  return 'REQUEST FAILED';
}
