import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { formatBlock, shortenHex } from '@/lib/formatting';
import { CC3_EXPLORER_URL, ETH_EXPLORER_TX } from '@/lib/constants';
import { cn } from '@/lib/utils';

export type EvidenceFields = {
  txHash: string | null;
  account: string | null;
  block: number | null;
  txIndex: number | null;
  kind: string | null;
  usdc: string | null;
  etherscan: string | null;
  chainKey: number | null;
  headerNumber: number | null;
  attestedHeight: number | null;
  merkleRoot: string | null;
  merkleSiblingCount: number | null;
  continuityRootCount: number | null;
  ctcTx: string | null;
  proofReady: boolean;
};

function MetaRow({
  label,
  value,
  mono = true,
  href,
}: {
  label: string;
  value: string;
  mono?: boolean;
  href?: string | null;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      /* clipboard may be denied */
    }
  }

  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-0.5 border-b border-fw-line/70 py-2 last:border-b-0">
      <dt className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-fw-fog">
        {label}
      </dt>
      <dd
        className={cn(
          'min-w-0 truncate text-sm text-fw-paper',
          mono && 'fw-mono text-[0.8125rem]',
        )}
      >
        {href && value !== '—' ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="underline decoration-fw-line-strong underline-offset-4 hover:decoration-fw-signal"
          >
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
      {value !== '—' ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-[0.625rem]" onClick={copy}>
              {copied ? 'COPIED' : 'COPY'}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Copy to clipboard</TooltipContent>
        </Tooltip>
      ) : (
        <span className="w-10" />
      )}
    </div>
  );
}

type CheckItem = { label: string; ok: boolean; detail?: string };

function verificationItems(evidence: EvidenceFields): CheckItem[] {
  if (!evidence.proofReady) return [];

  return [
    {
      label: 'Canonical emitter',
      ok: Boolean(evidence.usdc),
      detail: evidence.usdc ? shortenHex(evidence.usdc, 4, 4) : undefined,
    },
    {
      label: 'Event',
      ok: Boolean(evidence.kind),
      detail: evidence.kind ?? undefined,
    },
    {
      label: 'Receipt / tx bytes',
      ok: true,
      detail: 'in proof bundle',
    },
    {
      label: 'Merkle proof',
      ok: Boolean(evidence.merkleRoot),
      detail:
        evidence.merkleSiblingCount != null
          ? `${evidence.merkleSiblingCount} siblings`
          : evidence.merkleRoot
            ? shortenHex(evidence.merkleRoot, 4, 4)
            : undefined,
    },
    {
      label: 'Continuity',
      ok: (evidence.continuityRootCount ?? 0) > 0,
      detail:
        evidence.continuityRootCount != null
          ? `${evidence.continuityRootCount} roots`
          : undefined,
    },
    {
      label: 'Attested height',
      ok: evidence.attestedHeight != null,
      detail:
        evidence.attestedHeight != null
          ? formatBlock(evidence.attestedHeight)
          : undefined,
    },
  ];
}

function eventHeadline(evidence: EvidenceFields): string {
  const parts: string[] = [];
  if (evidence.kind) parts.push(evidence.kind);
  if (evidence.usdc) parts.push('Circle USD Coin');
  parts.push('Ethereum Mainnet');
  return parts.join(' · ');
}

export function EvidenceRecord({
  evidence,
  emptyMessage = 'No evidence loaded — load the demo Ethereum Blacklisted transaction.',
  className,
}: {
  evidence: EvidenceFields;
  emptyMessage?: string;
  className?: string;
}) {
  if (!evidence.txHash) {
    return (
      <div className={cn('border-t border-dashed border-fw-line pt-6', className)} role="status">
        <p className="fw-label mb-2 text-fw-mist">Evidence record</p>
        <p className="text-sm text-fw-fog">{emptyMessage}</p>
      </div>
    );
  }

  const ethHref = evidence.etherscan ?? `${ETH_EXPLORER_TX}/${evidence.txHash}`;
  const ctcHref = evidence.ctcTx ? `${CC3_EXPLORER_URL}/tx/${evidence.ctcTx}` : null;
  const checks = verificationItems(evidence);

  return (
    <article className={cn('min-w-0', className)} aria-label="Evidence record">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-fw-line pb-3">
        <div>
          <p className="fw-label text-fw-mist">Evidence record</p>
          <h2 className="fw-display mt-1.5 text-lg font-semibold tracking-[-0.02em] text-fw-paper sm:text-xl">
            {eventHeadline(evidence)}
          </h2>
        </div>
        <span
          className={cn(
            'text-[0.6875rem] font-medium tracking-[0.08em]',
            evidence.proofReady ? 'text-fw-signal' : 'text-fw-fog',
          )}
        >
          {evidence.proofReady ? 'PROOF BUNDLE READY' : 'SOURCE RECORD'}
        </span>
      </div>

      <dl className="mt-1">
        <MetaRow label="Block" value={formatBlock(evidence.block)} />
        <MetaRow
          label="Tx index"
          value={evidence.txIndex == null ? '—' : String(evidence.txIndex)}
        />
        <MetaRow label="Account" value={evidence.account ?? '—'} />
        <MetaRow
          label="Source tx"
          value={evidence.txHash}
          href={ethHref}
        />
      </dl>

      {checks.length > 0 ? (
        <div className="mt-5 border-t border-fw-line pt-4">
          <p className="fw-label mb-3 text-fw-mist">Verification</p>
          <ul className="space-y-2">
            {checks.map((item) => (
              <li
                key={item.label}
                className="grid grid-cols-[1rem_minmax(0,1fr)_auto] items-baseline gap-2 text-sm"
              >
                <span
                  className={cn(
                    'fw-mono text-[0.75rem]',
                    item.ok ? 'text-fw-eligible' : 'text-fw-fog',
                  )}
                  aria-hidden
                >
                  {item.ok ? '✓' : '—'}
                </span>
                <span className="text-fw-paper">{item.label}</span>
                {item.detail ? (
                  <span className="fw-mono truncate text-[0.75rem] text-fw-fog">{item.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {evidence.proofReady ? (
        <div className="mt-5 border-t border-fw-line pt-4">
          <p className="fw-label mb-2 text-fw-mist">Proof metadata</p>
          <dl>
            <MetaRow
              label="chainKey"
              value={evidence.chainKey == null ? '—' : String(evidence.chainKey)}
            />
            <MetaRow label="header" value={formatBlock(evidence.headerNumber)} />
            <MetaRow label="attested" value={formatBlock(evidence.attestedHeight)} />
            <MetaRow
              label="merkle"
              value={
                evidence.merkleRoot
                  ? `${shortenHex(evidence.merkleRoot, 6, 6)}${
                      evidence.merkleSiblingCount != null
                        ? ` · ${evidence.merkleSiblingCount} sib`
                        : ''
                    }`
                  : '—'
              }
            />
            <MetaRow
              label="continuity"
              value={
                evidence.continuityRootCount != null
                  ? `${evidence.continuityRootCount} roots`
                  : '—'
              }
            />
            <MetaRow label="CTC tx" value={evidence.ctcTx ?? '—'} href={ctcHref} />
          </dl>
        </div>
      ) : null}
    </article>
  );
}
