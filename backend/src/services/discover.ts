import type { AppConfig } from '../config/resolve.js';
import type { EthRpcClient, RpcLog } from '../clients/cc3Rpc.js';
import { TOPIC_BLACKLISTED, TOPIC_UNBLACKLISTED } from '../domain/abi.js';
import { ApiError, ApiErrorCode } from '../domain/errors.js';
import { assertAddress } from '../domain/hex.js';
import { RpcTransportError } from '../clients/cc3Rpc.js';

export type DiscoverCandidate = {
  txHash: string;
  blockNumber: number;
  txIndex: number;
  account: string;
  kind: 'Blacklisted' | 'UnBlacklisted';
};

function topicToAddress(topic: string | undefined): string | null {
  if (!topic || topic.length < 66) return null;
  return `0x${topic.slice(-40).toLowerCase()}`;
}

function parseLog(log: RpcLog): DiscoverCandidate | null {
  if (!log.transactionHash || log.blockNumber == null || log.transactionIndex == null) return null;
  const topic0 = log.topics[0]?.toLowerCase();
  const kind =
    topic0 === TOPIC_BLACKLISTED.toLowerCase()
      ? 'Blacklisted'
      : topic0 === TOPIC_UNBLACKLISTED.toLowerCase()
        ? 'UnBlacklisted'
        : null;
  if (!kind) return null;
  const account = topicToAddress(log.topics[1]);
  if (!account) return null;
  return {
    txHash: log.transactionHash.toLowerCase(),
    blockNumber: Number.parseInt(log.blockNumber, 16),
    txIndex: Number.parseInt(log.transactionIndex, 16),
    account,
    kind,
  };
}

async function pinDemoCandidate(
  eth: EthRpcClient,
  config: AppConfig,
): Promise<DiscoverCandidate | null> {
  const receipt = await eth.getTransactionReceipt(config.demoSourceTx);
  if (!receipt) return null;
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== config.sourceUsdc.toLowerCase()) continue;
    const parsed = parseLog(log);
    if (parsed) {
      return {
        ...parsed,
        txHash: config.demoSourceTx,
        blockNumber: Number.parseInt(receipt.blockNumber, 16),
      };
    }
  }
  return null;
}

export async function discoverCandidates(options: {
  eth: EthRpcClient | undefined;
  config: AppConfig;
  fromBlock?: number;
  toBlock?: number;
  address?: string;
  /** Max inclusive span when both from/to provided (default 10_000). */
  maxBlockRange?: number;
}): Promise<{ candidates: DiscoverCandidate[] }> {
  const { eth, config } = options;
  if (!eth) {
    throw new ApiError(ApiErrorCode.ETH_RPC_FAILED, 'ETH_RPC_URL not configured', 502, true);
  }

  const maxRange = options.maxBlockRange ?? 10_000;
  if (
    options.fromBlock !== undefined &&
    options.toBlock !== undefined &&
    Number.isFinite(options.fromBlock) &&
    Number.isFinite(options.toBlock)
  ) {
    if (options.toBlock < options.fromBlock) {
      throw new ApiError(ApiErrorCode.INVALID_REQUEST, 'toBlock must be >= fromBlock', 400);
    }
    if (options.toBlock - options.fromBlock > maxRange) {
      throw new ApiError(
        ApiErrorCode.INVALID_REQUEST,
        `Discover block range exceeds max ${maxRange}`,
        400,
      );
    }
  }

  const filterAddress = options.address ? assertAddress(options.address) : undefined;
  const candidates: DiscoverCandidate[] = [];
  const seen = new Set<string>();

  try {
    const fromBlock =
      options.fromBlock !== undefined ? `0x${options.fromBlock.toString(16)}` : 'latest';
    const toBlock = options.toBlock !== undefined ? `0x${options.toBlock.toString(16)}` : 'latest';

    // Narrow default: when no range given, do not scan entire chain — only pin demo.
    if (options.fromBlock !== undefined || options.toBlock !== undefined) {
      const logs = await eth.getLogs({
        address: config.sourceUsdc,
        topics: [[TOPIC_BLACKLISTED, TOPIC_UNBLACKLISTED]],
        fromBlock: options.fromBlock !== undefined ? fromBlock : '0x0',
        toBlock,
      });
      for (const log of logs) {
        const parsed = parseLog(log);
        if (!parsed) continue;
        if (filterAddress && parsed.account !== filterAddress) continue;
        const key = `${parsed.txHash}:${parsed.kind}:${parsed.account}`;
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(parsed);
      }
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    const message = err instanceof RpcTransportError || err instanceof Error ? err.message : 'ETH RPC failed';
    throw new ApiError(ApiErrorCode.ETH_RPC_FAILED, message, 502, true);
  }

  try {
    const pinned = await pinDemoCandidate(eth, config);
    if (pinned && (!filterAddress || pinned.account === filterAddress)) {
      const key = `${pinned.txHash}:${pinned.kind}:${pinned.account}`;
      if (!seen.has(key)) {
        candidates.unshift(pinned);
        seen.add(key);
      }
    }
  } catch (err) {
    // Demo pin failure is observable; never invent a candidate. Surface ETH failure if nothing else.
    if (candidates.length === 0) {
      const message = err instanceof Error ? err.message : 'ETH RPC failed';
      throw new ApiError(ApiErrorCode.ETH_RPC_FAILED, message, 502, true);
    }
  }

  return { candidates };
}
