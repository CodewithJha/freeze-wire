/** Bounded retries for retriable PB/RPC transport failures (timeouts / 5xx). */

export type RetryOptions = {
  /** Extra attempts after the first (1–2). Default 2. */
  maxRetries?: number;
  /** Delay between attempts in ms. Default 50 (tests) / callers may raise. */
  delayMs?: number;
  isRetriable: (err: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
};

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function withBoundedRetries<T>(fn: () => Promise<T>, options: RetryOptions): Promise<T> {
  const maxRetries = Math.min(2, Math.max(0, options.maxRetries ?? 2));
  const delayMs = options.delayMs ?? 50;
  const sleep = options.sleep ?? defaultSleep;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt >= maxRetries || !options.isRetriable(err)) {
        throw err;
      }
      await sleep(delayMs * (attempt + 1));
    }
  }
  throw lastErr;
}

export function isRetriableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}
