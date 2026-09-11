import { ApiError, ApiErrorCode } from './errors.js';

const TX_HASH_RE = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const HEX_RE = /^0x[0-9a-fA-F]*$/;

/** Ensure 0x prefix; lowercase hex. Does not truncate or reorder bytes. */
export function normalizeHex(value: string, label = 'hex'): `0x${string}` {
  const trimmed = value.trim();
  const withPrefix = trimmed.startsWith('0x') || trimmed.startsWith('0X') ? trimmed : `0x${trimmed}`;
  if (!HEX_RE.test(withPrefix)) {
    throw new ApiError(ApiErrorCode.INVALID_REQUEST, `Invalid ${label}`, 400);
  }
  if ((withPrefix.length - 2) % 2 !== 0) {
    throw new ApiError(ApiErrorCode.INVALID_REQUEST, `Odd-length ${label}`, 400);
  }
  return withPrefix.toLowerCase() as `0x${string}`;
}

export function assertTxHash(value: string): `0x${string}` {
  const normalized = normalizeHex(value, 'txHash');
  if (!TX_HASH_RE.test(normalized)) {
    throw new ApiError(ApiErrorCode.INVALID_TXHASH, 'txHash must be 32-byte hex', 400);
  }
  return normalized;
}

export function assertAddress(value: string): `0x${string}` {
  const normalized = normalizeHex(value, 'address');
  if (!ADDRESS_RE.test(normalized)) {
    throw new ApiError(ApiErrorCode.INVALID_ADDRESS, 'address must be 20-byte hex', 400);
  }
  return normalized;
}

export function assertBytes32(value: string, label = 'bytes32'): `0x${string}` {
  const normalized = normalizeHex(value, label);
  if (normalized.length !== 66) {
    throw new ApiError(ApiErrorCode.INVALID_REQUEST, `${label} must be 32 bytes`, 400);
  }
  return normalized;
}

/** Compare two hex strings as equal bytes (case-insensitive). */
export function hexEqual(a: string, b: string): boolean {
  return normalizeHex(a) === normalizeHex(b);
}
