import { randomUUID } from 'node:crypto';
import http from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AppConfig } from '../config/resolve.js';
import { createCc3RpcClient, createEthRpcClient } from '../clients/cc3Rpc.js';
import { createProofBuilderClient } from '../clients/proofBuilder.js';
import { ApiError, ApiErrorCode } from '../domain/errors.js';
import type { Logger } from '../observability/logger.js';
import { discoverCandidates } from '../services/discover.js';
import { proveByTx, relaySubmitProof, type RelayRequestBody } from '../services/relay.js';
import { checkHealth, evidenceDemo, readStatus } from '../services/status.js';

/** Max JSON body for POST /v1/relay (proof bundles + margin). */
export const MAX_JSON_BODY_BYTES = 1_048_576;
/** Max eth_getLogs span for discover (provider-friendly). */
export const MAX_DISCOVER_BLOCK_RANGE = 10_000;

export type WorkerDeps = {
  config: AppConfig;
  log: Logger;
  fetchImpl?: typeof fetch;
};

type RateBucket = { count: number; resetAt: number };

function clientIp(req: IncomingMessage): string {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length > 0) return xf.split(',')[0]!.trim();
  return req.socket.remoteAddress ?? 'unknown';
}

function isLocalhost(req: IncomingMessage): boolean {
  const ip = clientIp(req);
  return ip === '127.0.0.1' || ip === '::1' || ip === ':ffff:127.0.0.1' || ip === 'localhost';
}

async function readJson(req: IncomingMessage, maxBytes = MAX_JSON_BODY_BYTES): Promise<unknown> {
  const declared = req.headers['content-length'];
  if (declared) {
    const n = Number.parseInt(declared, 10);
    if (Number.isFinite(n) && n > maxBytes) {
      throw new ApiError(ApiErrorCode.INVALID_REQUEST, 'Request body too large', 413);
    }
  }
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > maxBytes) {
      throw new ApiError(ApiErrorCode.INVALID_REQUEST, 'Request body too large', 413);
    }
    chunks.push(buf);
  }
  if (chunks.length === 0) return {};
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(ApiErrorCode.INVALID_REQUEST, 'Malformed JSON body', 400);
  }
}

function sendJson(res: ServerResponse, status: number, body: unknown, requestId: string): void {
  const enriched =
    body && typeof body === 'object' && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>), requestId }
      : body;
  const payload = JSON.stringify(enriched);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Request-Id': requestId,
  });
  res.end(payload);
}

/** Strip secrets / internal dumps from client-facing ApiError messages. */
export function sanitizeClientMessage(code: string, message: string): string {
  if (
    /PRIVATE_KEY|RELAY_GATE|API[_-]?KEY|Authorization|Bearer\s|0x[a-fA-F0-9]{64}\b|\/Users\/|\/home\/|ECONNREFUSED|stack|traceback/i.test(
      message,
    )
  ) {
    switch (code) {
      case ApiErrorCode.RELAY_DISABLED:
        return 'Worker relay unavailable; use client wallet submitProof';
      case ApiErrorCode.UNAUTHORIZED:
        return 'Relay authorization required';
      case ApiErrorCode.CC3_RPC_FAILED:
        return 'Creditcoin RPC unavailable';
      case ApiErrorCode.ETH_RPC_FAILED:
        return 'Ethereum RPC unavailable';
      case ApiErrorCode.GAS_ESTIMATION_FAILED:
        return 'Gas estimation failed';
      case ApiErrorCode.TRANSACTION_BROADCAST_FAILED:
        return 'Transaction broadcast failed';
      case ApiErrorCode.TRANSACTION_REJECTED:
        return 'Transaction rejected';
      default:
        return 'Request failed';
    }
  }
  // Avoid leaking RPC URLs / absolute filesystem paths even when not caught above.
  if (/https?:\/\/[^\s]+|\/var\/|\\\\/.test(message)) {
    return 'Request failed';
  }
  return message;
}

function applyCors(req: IncomingMessage, res: ServerResponse, origins: string[]): void {
  const origin = req.headers.origin;
  if (!origin) return;
  if (origins.includes('*') || origins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origins.includes('*') ? '*' : origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Relay-Gate, X-Request-Id');
    res.setHeader('Vary', 'Origin');
  }
}

export function createWorkerHandler(deps: WorkerDeps): (req: IncomingMessage, res: ServerResponse) => Promise<void> {
  const { config, log } = deps;
  const fetchImpl = deps.fetchImpl ?? fetch;
  const proofClient = createProofBuilderClient({
    baseUrl: config.proofBuilderUrl,
    apiKey: config.proofBuilderApiKey,
    fetchImpl,
  });
  const cc3 = createCc3RpcClient({
    url: config.cc3RpcUrl,
    expectedChainId: config.cc3ChainId,
    fetchImpl,
  });
  const eth = config.ethRpcUrl
    ? createEthRpcClient({ url: config.ethRpcUrl, fetchImpl })
    : undefined;

  const buckets = new Map<string, RateBucket>();

  function rateLimit(req: IncomingMessage, limit: number): void {
    const key = `${clientIp(req)}:${req.url?.split('?')[0] ?? ''}`;
    const now = Date.now();
    const bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + 60_000 });
      return;
    }
    bucket.count += 1;
    if (bucket.count > limit) {
      throw new ApiError(ApiErrorCode.RATE_LIMITED, 'Rate limit exceeded', 429, true);
    }
  }

  function assertRelayAuth(req: IncomingMessage): void {
    if (config.relayGate) {
      const header = req.headers['x-relay-gate'];
      const provided = typeof header === 'string' ? header : undefined;
      if (provided !== config.relayGate) {
        throw new ApiError(ApiErrorCode.UNAUTHORIZED, 'Relay authorization required', 401, false);
      }
      return;
    }
    if (!isLocalhost(req)) {
      throw new ApiError(ApiErrorCode.UNAUTHORIZED, 'Relay authorization required', 401, false);
    }
  }

  return async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const requestId = (typeof req.headers['x-request-id'] === 'string' && req.headers['x-request-id']) || randomUUID();
    applyCors(req, res, config.corsOrigins);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      const url = new URL(req.url ?? '/', `http://${req.headers.host ?? '127.0.0.1'}`);
      const path = url.pathname.replace(/\/+$/, '') || '/';

      // Reject path traversal / junk beyond simple segments.
      if (path.includes('..') || path.includes('//')) {
        throw new ApiError(ApiErrorCode.INVALID_REQUEST, 'Invalid path', 400);
      }

      const healthLimit = 60;
      const defaultLimit = config.rateLimitPerMin;
      rateLimit(req, path === '/v1/health' || path === '/health' ? healthLimit : defaultLimit);

      if ((path === '/v1/health' || path === '/health') && req.method === 'GET') {
        const body = await checkHealth({
          config,
          cc3,
          proofClient,
          ethRpcUrl: config.ethRpcUrl,
          fetchImpl,
        });
        sendJson(res, 200, body, requestId);
        return;
      }

      if (path === '/v1/evidence/demo' && req.method === 'GET') {
        sendJson(res, 200, evidenceDemo(config), requestId);
        return;
      }

      if (path === '/v1/discover' && req.method === 'GET') {
        const fromBlock = url.searchParams.get('fromBlock');
        const toBlock = url.searchParams.get('toBlock');
        const address = url.searchParams.get('address') ?? undefined;
        const fromParsed = fromBlock ? Number.parseInt(fromBlock, 10) : undefined;
        const toParsed = toBlock ? Number.parseInt(toBlock, 10) : undefined;
        if (
          fromParsed !== undefined &&
          toParsed !== undefined &&
          Number.isFinite(fromParsed) &&
          Number.isFinite(toParsed) &&
          toParsed - fromParsed > MAX_DISCOVER_BLOCK_RANGE
        ) {
          throw new ApiError(
            ApiErrorCode.INVALID_REQUEST,
            `Discover block range exceeds max ${MAX_DISCOVER_BLOCK_RANGE}`,
            400,
          );
        }
        const body = await discoverCandidates({
          eth,
          config,
          fromBlock: fromParsed,
          toBlock: toParsed,
          address,
          maxBlockRange: MAX_DISCOVER_BLOCK_RANGE,
        });
        sendJson(res, 200, body, requestId);
        return;
      }

      const statusMatch = /^\/v1\/status\/(0x[0-9a-fA-F]{40})$/.exec(path);
      if (statusMatch && req.method === 'GET') {
        const body = await readStatus({ config, cc3, addressRaw: statusMatch[1]! });
        sendJson(res, 200, body, requestId);
        return;
      }

      const proveMatch = /^\/v1\/prove\/(0x[0-9a-fA-F]{64})$/.exec(path);
      if (proveMatch && req.method === 'GET') {
        const body = await proveByTx(proofClient, config, proveMatch[1]!, log);
        sendJson(res, 200, body, requestId);
        return;
      }
      if (path.startsWith('/v1/prove/') && req.method === 'GET') {
        throw new ApiError(ApiErrorCode.INVALID_TXHASH, 'txHash must be 32-byte hex', 400);
      }

      if (path === '/v1/relay' && req.method === 'POST') {
        assertRelayAuth(req);
        const body = (await readJson(req)) as RelayRequestBody;
        const result = await relaySubmitProof({ body, config, proofClient, cc3, log });
        sendJson(res, 200, result, requestId);
        return;
      }

      // Explicitly not provided — security boundary (T-API-NOSETTER).
      if (
        /^\/v1\/(restrict|unrestrict|set-status|admin\/status|setRestricted)$/i.test(path) ||
        /set-?status|set-?restricted/i.test(path)
      ) {
        throw new ApiError(ApiErrorCode.INVALID_REQUEST, 'Eligibility mutation endpoints are not provided', 404);
      }

      throw new ApiError(ApiErrorCode.INVALID_REQUEST, `Not found: ${path}`, 404);
    } catch (err) {
      if (err instanceof ApiError) {
        log.warn('api.error', {
          requestId,
          code: err.code,
          httpStatus: err.httpStatus,
          message: err.message,
        });
        // Client body: stable code + safe message + extras. Keep raw detail in logs only.
        const clientMessage = sanitizeClientMessage(err.code, err.message);
        sendJson(
          res,
          err.httpStatus,
          {
            ...err.toBody(),
            message: clientMessage,
          },
          requestId,
        );
        return;
      }
      log.error('api.unhandled', {
        requestId,
        message: err instanceof Error ? err.message : 'unknown',
        stack: err instanceof Error ? err.stack : undefined,
      });
      sendJson(
        res,
        500,
        { code: ApiErrorCode.INVALID_REQUEST, message: 'Internal error', retriable: false },
        requestId,
      );
    }
  };
}

export function createWorkerServer(deps: WorkerDeps): http.Server {
  const handler = createWorkerHandler(deps);
  return http.createServer((req, res) => {
    void handler(req, res);
  });
}
