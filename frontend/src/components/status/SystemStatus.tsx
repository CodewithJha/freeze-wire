import { motion, useReducedMotion } from 'motion/react';
import type { EligibilityStatus } from '@/lib/constants';
import { shortenHex } from '@/lib/formatting';
import { cn } from '@/lib/utils';

function unknownCopy(address: string | null): { title: string; detail: string } {
  return {
    title: 'NOT YET ATTESTED',
    detail: address
      ? 'Creditcoin has not established a ledger state for this address.'
      : 'No counterparty selected — load evidence to begin.',
  };
}

export function SystemStatus({
  status,
  address,
  source,
  compact = false,
}: {
  status: EligibilityStatus;
  address: string | null;
  source: 'chain' | 'unknown' | null;
  compact?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const isRestricted = status === 'RESTRICTED';
  const isEligible = status === 'ELIGIBLE';
  const isUnknown = status === 'UNKNOWN';
  const unknown = unknownCopy(address);

  return (
    <section aria-live="polite" className="min-w-0">
      <p className="fw-label mb-2">Eligibility</p>
      <div className={cn('flex flex-wrap items-end gap-x-8 gap-y-3', compact && 'gap-x-5')}>
        <motion.div
          key={status}
          initial={reduceMotion ? false : { opacity: 0.45, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="min-w-0"
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'inline-block h-2 w-2 shrink-0 rounded-[1px]',
                isEligible && 'bg-fw-eligible',
                isRestricted && 'bg-fw-restricted',
                isUnknown && 'bg-fw-unknown',
              )}
              aria-hidden
            />
            <span
              className={cn(
                'fw-display font-semibold leading-none tracking-[-0.035em]',
                compact ? 'text-[1.75rem] sm:text-[2rem]' : 'text-[2.25rem] sm:text-[2.75rem]',
                isEligible && 'text-fw-eligible',
                isRestricted && 'text-fw-restricted',
                isUnknown && 'text-fw-unknown',
              )}
            >
              {isUnknown ? unknown.title : status}
            </span>
          </div>
          {isUnknown ? (
            <p className="mt-2 max-w-md text-sm leading-snug text-fw-mist">{unknown.detail}</p>
          ) : (
            <p className="mt-2 text-sm text-fw-mist">
              {isRestricted
                ? 'Ledger decision — access gated for this counterparty.'
                : 'Ledger decision — gated operations permitted for this counterparty.'}
            </p>
          )}
        </motion.div>
        <div className="pb-0.5">
          <p className="fw-label mb-1">Account</p>
          <p className="fw-mono text-sm text-fw-paper">
            {address ? shortenHex(address, 6, 4) : '—'}
          </p>
          {source === 'chain' ? (
            <p className="mt-1 text-[0.6875rem] text-fw-fog">source · chain</p>
          ) : isUnknown ? (
            <p className="mt-1 text-[0.6875rem] text-fw-fog">source · unset</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
