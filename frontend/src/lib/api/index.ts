import { API_BASE_URL } from '@/lib/constants';
import { WalletBroadcastError } from '@/lib/walletErrors';

export type ApiErrorBody = {
  code: string;
  message: string;
  retriable?: boolean;
  error?: string;
  submitProof?: { to: string; data: string };
  requestId?: string;
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
    const requestId = res.headers.get('x-request-id') ?? errBody.requestId;
    throw new WorkerApiError(res.status, {
      code: errBody.code ?? 'INVALID_REQUEST',
      message: errBody.message ?? `Request failed (${res.status})`,
      retriable: errBody.retriable,
      error: errBody.error,
      submitProof: errBody.submitProof,
      requestId: requestId ?? undefined,
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

/** True when a message looks like an internal dump unsafe for public UI. */
function looksSensitive(text: string): boolean {
  return (
    /PRIVATE_KEY|RELAY_GATE|API[_-]?KEY|Authorization|Bearer\s|0x[a-fA-F0-9]{64}\b|\/Users\/|\/home\/|\\|node_modules|at\s+\S+\s+\(|https?:\/\/[^\s]+|VITE_|process\.env|ECONNREFUSED|stack|traceback/i.test(
      text,
    )
  );
}

function withRequestId(message: string, requestId?: string): string {
  if (!requestId) return message;
  return `${message} (ref ${requestId.slice(0, 8)})`;
}

/** Map machine codes / wallet failures to product-facing copy. Never invent success. */
export function productErrorMessage(err: unknown): string {
  if (err instanceof WalletBroadcastError) {
    return err.message;
  }
  if (err instanceof WorkerApiError) {
    const id = err.body.requestId;
    switch (err.code) {
      case 'BLOCK_NOT_READY':
        return withRequestId('PROOF NOT READY — source block not yet attested.', id);
      case 'TX_NOT_FOUND':
        return withRequestId('NO CANONICAL EVIDENCE — transaction not found upstream.', id);
      case 'PROOF_BUILDER_FAILED':
        return withRequestId('PROOF REJECTED — Proof Builder failed to serve this height.', id);
      case 'CONTRACT_REVERT':
        return withRequestId('PROOF REJECTED — contract reverted on Creditcoin.', id);
      case 'RELAY_DISABLED':
        if (err.body.submitProof) {
          return 'NOT BROADCAST — calldata prepared; connect a CC3 wallet to sign submitProof.';
        }
        return withRequestId(
          'RELAY DISABLED — worker cannot broadcast; use a client wallet when calldata is available.',
          id,
        );
      case 'UNAUTHORIZED':
        return withRequestId('RELAY UNAUTHORIZED — relay gate required for this host.', id);
      case 'CC3_RPC_FAILED':
        return withRequestId('CREDITCOIN RPC UNAVAILABLE — status cannot be read.', id);
      case 'ETH_RPC_FAILED':
        return withRequestId('ETHEREUM RPC UNAVAILABLE — discovery failed.', id);
      case 'WRONG_CHAIN':
        return withRequestId('WRONG NETWORK — worker RPC is not on the expected Creditcoin chain.', id);
      case 'GAS_ESTIMATION_FAILED':
        return withRequestId('GAS ESTIMATION FAILED — submitProof could not be priced.', id);
      case 'TRANSACTION_REJECTED':
        return withRequestId('TRANSACTION REJECTED — relay could not sign or submit.', id);
      case 'TRANSACTION_BROADCAST_FAILED':
        return withRequestId('BROADCAST FAILED — Creditcoin rejected the relayed transaction.', id);
      case 'RATE_LIMITED':
        return withRequestId('RATE LIMITED — wait and retry.', id);
      case 'INVALID_TXHASH':
        return 'INVALID TX HASH — expect 32-byte hex.';
      case 'INVALID_ADDRESS':
        return 'INVALID ADDRESS — expect 20-byte hex.';
      case 'INVALID_REQUEST':
        return withRequestId('REQUEST FAILED — check inputs and try again.', id);
      default: {
        const raw = err.message || err.code;
        if (looksSensitive(raw)) {
          return withRequestId(`REQUEST FAILED — ${err.code}.`, id);
        }
        return withRequestId(raw, id);
      }
    }
  }
  if (err instanceof Error) {
    if (looksSensitive(err.message)) {
      return 'REQUEST FAILED — see console operator logs if available.';
    }
    // Wallet/provider dumps often arrive as plain Error before WalletBroadcastError mapping.
    const lower = err.message.toLowerCase();
    if (/user rejected|user denied|4001|action_rejected/.test(lower)) {
      return 'WALLET REJECTED — signature or connection was declined.';
    }
    if (/no ethereum|window\.ethereum|provider/.test(lower)) {
      return 'NO WALLET — install or unlock a browser wallet compatible with Creditcoin Testnet.';
    }
    if (err.message.length > 180) {
      return 'REQUEST FAILED — unexpected client error.';
    }
    return err.message;
  }
  return 'REQUEST FAILED';
}
