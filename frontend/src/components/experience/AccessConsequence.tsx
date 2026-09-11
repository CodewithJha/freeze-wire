import { motion, useReducedMotion } from 'motion/react';
import {
  CreditAccessMatrix,
  type CreditActionId,
} from '@/components/credit/CreditAccessMatrix';
import type { EligibilityStatus } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function AccessConsequence({
  status,
  statusSource,
  busyAction,
  lastResult,
  onAction,
  creditConfigured,
}: {
  status: EligibilityStatus;
  statusSource: 'chain' | 'unknown' | null;
  busyAction: CreditActionId | null;
  lastResult: string | null;
  onAction: (id: CreditActionId) => void;
  creditConfigured: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const restricted = status === 'RESTRICTED' && statusSource === 'chain';
  const eligible = status === 'ELIGIBLE' && statusSource === 'chain';
  const unsettled = !restricted && !eligible;

  return (
    <section
      className={cn(
        'relative pt-20 sm:pt-28',
        // Tighter bottom so console reads as story becoming operational
        'pb-10 sm:pb-12',
        restricted ? 'border-t border-fw-restricted' : 'border-t border-fw-line',
      )}
      aria-label="Access consequence"
    >
      <div className="fw-stage relative">
        <p className="fw-label text-fw-mist">04 · Access</p>

        <motion.div
          key={restricted ? 'restricted' : eligible ? 'eligible' : 'unknown'}
          initial={reduceMotion ? false : { opacity: 0.25, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6"
        >
          <h2
            className={cn(
              'fw-display text-[clamp(3rem,12vw,7.5rem)] font-semibold leading-[0.9] tracking-[-0.045em]',
              restricted && 'text-fw-restricted',
              eligible && 'text-fw-eligible',
              unsettled && 'text-fw-unknown',
            )}
          >
            {restricted ? 'RESTRICTED' : eligible ? 'ELIGIBLE' : 'NOT YET ATTESTED'}
          </h2>
          <p
            className={cn(
              'mt-6 max-w-lg border-l border-fw-line pl-4 text-[0.9375rem] leading-relaxed text-fw-mist',
              restricted && 'border-fw-restricted/50',
              eligible && 'border-fw-eligible/50',
            )}
          >
            {restricted
              ? 'Ledger-established boundary. Draw, transfer, and escrow paths that require ELIGIBLE are blocked. Exit paths remain available.'
              : eligible
                ? 'Ledger-established clearance for gated credit operations.'
                : 'Creditcoin has not established a ledger state for this address.'}
          </p>
        </motion.div>

        <div className="mt-14 border-t border-fw-line pt-10">
          <CreditAccessMatrix
            status={status}
            busyAction={busyAction}
            lastResult={lastResult}
            onAction={onAction}
            creditConfigured={creditConfigured}
          />
        </div>
      </div>
    </section>
  );
}
