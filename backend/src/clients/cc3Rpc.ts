import { ApiError, ApiErrorCode } from '../domain/errors.js';
import { isRetriableHttpStatus, withBoundedRetries } from './retry.js';

export type JsonRpcId = number | string;

export type FeeEstimate =
  | { type: 'eip1559'; maxFeePerGas: bigint; maxPriorityFeePerGas: bigint }
  | { type: 'legacy'; gasPrice: bigint };

export type RpcLog = {
  address: string;
  topics: string[];
  data: string;
  blockNumber: string | null;
  transactionHash: string | null;
  transactionIndex: string | null;
  logIndex: string | null;
};

export type TxReceipt = {
  status: '0x0' | '0x1' | string;
  transactionHash: string;
  blockNumber: string;
  logs: RpcLog[];
  gasUsed?: string;
};

export type Cc3RpcClient = {
  chainId(): Promise<number>;
  call(to: string, data: string, from?: string): Promise<string>;
  estimateGas(to: string, data: string, from?: string): Promise<bigint>;
  getFeeEstimate(): Promise<FeeEstimate>;
  getTransactionCount(address: string): Promise<number>;
  sendRawTransaction(signedTx: string): Promise<string>;
  getTransactionReceipt(txHash: string): Promise<TxReceipt | null>;
};

export class RpcTransportError extends Error {
  override readonly name = 'RpcTransportError';
  constructor(
    message: string,
    readonly code: ApiErrorCode = ApiErrorCode.CC3_RPC_FAILED,
    readonly retriable = true,
  ) {
    super(message);
  }
}

export function createJsonRpcClient(options: {
  url: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  errorCode?: ApiErrorCode;
}): {
  rpc(method: string, params: unknown[]): Promise<unknown>;
} {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const errorCode = options.errorCode ?? ApiErrorCode.CC3_RPC_FAILED;

  async function rpcOnce(method: string, params: unknown[]): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetchImpl(options.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        signal: controller.signal,
      });
      if (!res.ok) {
        throw new RpcTransportError(
          `RPC HTTP ${res.status}`,
          errorCode,
          isRetriableHttpStatus(res.status),
        );
      }
      const body = (await res.json()) as { result?: unknown; error?: { message?: string; code?: number } };
      if (body.error) {
        // Application-level JSON-RPC errors are not transport retries.
        throw new RpcTransportError(body.error.message ?? 'RPC error', errorCode, false);
      }
      return body.result;
    } catch (err) {
      if (err instanceof RpcTransportError) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new RpcTransportError('RPC timeout', errorCode, true);
      }
      throw new RpcTransportError(err instanceof Error ? err.message : 'RPC unavailable', errorCode, true);
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    async rpc(method: string, params: unknown[]): Promise<unknown> {
      return withBoundedRetries(() => rpcOnce(method, params), {
        maxRetries: 2,
        delayMs: 40,
        isRetriable: (err) => err instanceof RpcTransportError && err.retriable,
      });
    },
  };
}

export function createCc3RpcClient(options: {
  url: string;
  expectedChainId?: number;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Cc3RpcClient {
  const { rpc } = createJsonRpcClient({
    url: options.url,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
    errorCode: ApiErrorCode.CC3_RPC_FAILED,
  });

  async function assertChain(): Promise<void> {
    if (options.expectedChainId === undefined) return;
    const result = await rpc('eth_chainId', []);
    if (typeof result !== 'string') {
      throw new RpcTransportError('eth_chainId did not return hex', ApiErrorCode.CC3_RPC_FAILED, false);
    }
    const id = Number.parseInt(result, 16);
    if (id !== options.expectedChainId) {
      throw new ApiError(
        ApiErrorCode.WRONG_CHAIN,
        `RPC chainId ${id} != expected ${options.expectedChainId}`,
        502,
        false,
      );
    }
  }

  return {
    async chainId() {
      const result = await rpc('eth_chainId', []);
      if (typeof result !== 'string') {
        throw new RpcTransportError('eth_chainId did not return hex');
      }
      return Number.parseInt(result, 16);
    },
    async call(to, data, from) {
      await assertChain();
      const tx: Record<string, string> = { to, data };
      if (from) tx.from = from;
      const result = await rpc('eth_call', [tx, 'latest']);
      if (typeof result !== 'string') {
        throw new RpcTransportError('eth_call did not return hex');
      }
      return result;
    },
    async estimateGas(to, data, from) {
      await assertChain();
      const tx: Record<string, string> = { to, data };
      if (from) tx.from = from;
      try {
        const result = await rpc('eth_estimateGas', [tx]);
        if (typeof result !== 'string') {
          throw new RpcTransportError('eth_estimateGas did not return hex', ApiErrorCode.GAS_ESTIMATION_FAILED, false);
        }
        return BigInt(result);
      } catch (err) {
        if (err instanceof ApiError) throw err;
        const message = err instanceof Error ? err.message : 'gas estimation failed';
        throw new ApiError(ApiErrorCode.GAS_ESTIMATION_FAILED, message, 502, true);
      }
    },
    async getFeeEstimate() {
      await assertChain();
      // Prefer provider fee suggestion; fall back to legacy gasPrice (CC3 may be EIP-1559 or legacy).
      try {
        const pending = await rpc('eth_getBlockByNumber', ['pending', false]);
        const baseFee =
          pending && typeof pending === 'object' && 'baseFeePerGas' in pending
            ? (pending as { baseFeePerGas?: string | null }).baseFeePerGas
            : null;
        if (typeof baseFee === 'string' && baseFee !== '0x0') {
          let priority = 1_000_000_000n; // 1 gwei default tip
          try {
            const tip = await rpc('eth_maxPriorityFeePerGas', []);
            if (typeof tip === 'string') priority = BigInt(tip);
          } catch {
            /* keep default tip */
          }
          const base = BigInt(baseFee);
          return {
            type: 'eip1559' as const,
            maxFeePerGas: base * 2n + priority,
            maxPriorityFeePerGas: priority,
          };
        }
      } catch {
        /* fall through to legacy */
      }
      const gasPrice = await rpc('eth_gasPrice', []);
      if (typeof gasPrice !== 'string') {
        throw new ApiError(ApiErrorCode.GAS_ESTIMATION_FAILED, 'eth_gasPrice failed', 502, true);
      }
      return { type: 'legacy' as const, gasPrice: BigInt(gasPrice) };
    },
    async getTransactionCount(address) {
      await assertChain();
      const result = await rpc('eth_getTransactionCount', [address, 'pending']);
      if (typeof result !== 'string') {
        throw new RpcTransportError('eth_getTransactionCount did not return hex');
      }
      return Number.parseInt(result, 16);
    },
    async sendRawTransaction(signedTx) {
      await assertChain();
      try {
        const result = await rpc('eth_sendRawTransaction', [signedTx]);
        if (typeof result !== 'string') {
          throw new ApiError(
            ApiErrorCode.TRANSACTION_BROADCAST_FAILED,
            'eth_sendRawTransaction did not return hash',
            502,
            true,
          );
        }
        return result;
      } catch (err) {
        if (err instanceof ApiError) throw err;
        const message = err instanceof Error ? err.message : 'broadcast failed';
        const rejected = /nonce|insufficient funds|replacement|underpriced|rejected/i.test(message);
        throw new ApiError(
          rejected ? ApiErrorCode.TRANSACTION_REJECTED : ApiErrorCode.TRANSACTION_BROADCAST_FAILED,
          message,
          502,
          true,
        );
      }
    },
    async getTransactionReceipt(txHash) {
      await assertChain();
      const result = await rpc('eth_getTransactionReceipt', [txHash]);
      if (result === null) return null;
      if (!result || typeof result !== 'object') {
        throw new RpcTransportError('malformed receipt');
      }
      return result as TxReceipt;
    },
  };
}

export type EthRpcClient = {
  getLogs(filter: {
    address: string;
    topics: (string | string[] | null)[];
    fromBlock: string;
    toBlock: string;
  }): Promise<RpcLog[]>;
  getTransactionReceipt(txHash: string): Promise<TxReceipt | null>;
};

export function createEthRpcClient(options: {
  url: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): EthRpcClient {
  const { rpc } = createJsonRpcClient({
    url: options.url,
    fetchImpl: options.fetchImpl,
    timeoutMs: options.timeoutMs,
    errorCode: ApiErrorCode.ETH_RPC_FAILED,
  });

  return {
    async getLogs(filter) {
      const result = await rpc('eth_getLogs', [filter]);
      if (!Array.isArray(result)) {
        throw new RpcTransportError('eth_getLogs did not return array', ApiErrorCode.ETH_RPC_FAILED, true);
      }
      return result as RpcLog[];
    },
    async getTransactionReceipt(txHash) {
      const result = await rpc('eth_getTransactionReceipt', [txHash]);
      if (result === null) return null;
      if (!result || typeof result !== 'object') {
        throw new RpcTransportError('malformed receipt', ApiErrorCode.ETH_RPC_FAILED, false);
      }
      return result as TxReceipt;
    },
  };
}
