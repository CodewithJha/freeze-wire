export function shortenHex(value: string, left = 6, right = 4): string {
  if (!value || value.length < left + right + 2) return value;
  return `${value.slice(0, left + 2)}…${value.slice(-right)}`;
}

export function formatBlock(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US');
}

export function isTxHash(value: string): boolean {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

export function isAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}
