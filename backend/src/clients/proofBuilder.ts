import { z } from 'zod';
import type {
  AttestedHeightResponse,
  HealthCheckResponse,
  SingleContinuityResponse,
} from '../domain/proof.js';

const hexString = z.string().regex(/^0x[0-9a-fA-F]*$/);
const hex32 = z.string().regex(/^0x[0-9a-fA-F]{64}$/);

const merkleEntrySchema = z.object({
  hash: hex32,
  isLeft: z.boolean(),
});

const singleContinuitySchema = z.object({
  chainKey: z.number().int().nonnegative(),
  headerNumber: z.number().int().nonnegative(),
  txIndex: z.number().int().nonnegative(),
  continuityProof: z.object({
    lowerEndpointDigest: hex32,
    roots: z.array(hex32),
  }),
  merkleProof: z.object({
    root: hex32,
    siblings: z.array(merkleEntrySchema),
  }),
  cached: z.boolean(),
  generatedAt: z.string().min(1),
  txBytes: z.union([hexString, z.null()]).optional(),
  txHash: z.union([hexString, z.null()]).optional(),
});

const healthSchema = z.object({
  status: z.string(),
  cc3_rpc_connected: z.boolean(),
  eth_rpc_connected: z.boolean(),
  uptime_seconds: z.number(),
});

const attestedSchema = z.object({
  attestedHeight: z.number().int().nonnegative().nullable(),
});

const errorSchema = z.object({
  code: z.string(),
  message: z.string(),
  retriable: z.boolean(),
  block_number: z.number().optional().nullable(),
  last_attested_block: z.number().optional().nullable(),
});

export class ProofBuilderError extends Error {
  override readonly name = 'ProofBuilderError';

  constructor(
    readonly httpStatus: number,
    readonly code: string,
    message: string,
    readonly retriable: boolean,
    readonly details?: { blockNumber?: number | null; lastAttestedBlock?: number | null },
  ) {
    super(message);
  }
}

export type ProofBuilderClient = {
  health(): Promise<HealthCheckResponse>;
  attestedHeight(chainKey: number): Promise<AttestedHeightResponse>;
  proofByTx(chainKey: number, txHash: string): Promise<SingleContinuityResponse>;
  proofByPosition(chainKey: number, headerNumber: number, txIndex: number): Promise<SingleContinuityResponse>;
};

function parseOrThrow<T>(schema: z.ZodType<T>, body: unknown, label: string): T {
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ProofBuilderError(502, 'PROOF_BUILDER_FAILED', `Invalid Proof Builder ${label}`, false);
  }
  return parsed.data;
}

export function createProofBuilderClient(options: {
  baseUrl: string;
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): ProofBuilderClient {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 30_000;

  async function request(path: string): Promise<unknown> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.apiKey) {
      headers.Authorization = `Bearer ${options.apiKey}`;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetchImpl(`${baseUrl}${path}`, { headers, signal: controller.signal });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new ProofBuilderError(504, 'PROOF_BUILDER_FAILED', 'Proof Builder timeout', true);
      }
      throw new ProofBuilderError(
        502,
        'PROOF_BUILDER_FAILED',
        err instanceof Error ? err.message : 'Proof Builder unavailable',
        true,
      );
    } finally {
      clearTimeout(timer);
    }
    const text = await res.text();
    let body: unknown = null;
    if (text.length > 0) {
      try {
        body = JSON.parse(text) as unknown;
      } catch {
        throw new ProofBuilderError(res.status, 'PROOF_BUILDER_FAILED', 'Proof Builder returned non-JSON', false);
      }
    }
    if (!res.ok) {
      const parsed = errorSchema.safeParse(body);
      if (parsed.success) {
        throw new ProofBuilderError(res.status, parsed.data.code, parsed.data.message, parsed.data.retriable, {
          blockNumber: parsed.data.block_number,
          lastAttestedBlock: parsed.data.last_attested_block,
        });
      }
      throw new ProofBuilderError(res.status, 'PROOF_BUILDER_FAILED', `Proof Builder HTTP ${res.status}`, res.status >= 500);
    }
    return body;
  }

  return {
    async health() {
      return parseOrThrow(healthSchema, await request('/api/v1/health'), 'health');
    },
    async attestedHeight(chainKey: number) {
      return parseOrThrow(attestedSchema, await request(`/api/v1/attested-height/${chainKey}`), 'attested-height');
    },
    async proofByTx(chainKey: number, txHash: string) {
      return parseOrThrow(
        singleContinuitySchema,
        await request(`/api/v1/proof-by-tx/${chainKey}/${txHash}`),
        'proof-by-tx',
      );
    },
    async proofByPosition(chainKey: number, headerNumber: number, txIndex: number) {
      return parseOrThrow(
        singleContinuitySchema,
        await request(`/api/v1/proof/${chainKey}/${headerNumber}/${txIndex}`),
        'proof',
      );
    },
  };
}
