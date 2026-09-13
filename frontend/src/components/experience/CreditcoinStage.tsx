import { motion, useReducedMotion } from 'motion/react';
import type { EligibilityStatus } from '@/lib/constants';
import { shortenHex } from '@/lib/formatting';
import { cn } from '@/lib/utils';

export function CreditcoinStage({
  proofReady,
  relayAttempted,
  relayed,
  ctcTx,
  status,
  statusSource,
  address,
}: {
  proofReady: boolean;
  relayAttempted: boolean;
  relayed: boolean;
  ctcTx: string | null;
  status: EligibilityStatus;
  statusSource: 'chain' | 'unknown' | null;
  address: string | null;
}) {
  const reduceMotion = useReducedMotion();
  const attested = statusSource === 'chain' && status !== 'UNKNOWN';
  const crossing = proofReady;

  return (
    <section className="fw-stage py-20 sm:py-28" aria-label="Creditcoin transition">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-20">
        <div>
          <p className="fw-label text-fw-mist">03 · Creditcoin</p>
          <h2 className="fw-display mt-4 text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-fw-paper">
            Cross the trust
            <br />
            boundary.
          </h2>
          <p className="mt-5 max-w-sm text-[0.9375rem] leading-relaxed text-fw-mist">
            A ready proof bundle does not imply Creditcoin state. Until the ledger attests,
            access remains unsettled.
          </p>
        </div>

        <motion.div
          className="relative border border-fw-line bg-fw-ink p-6 sm:p-8"
          initial={false}
          animate={
            reduceMotion
              ? undefined
              : crossing
                ? { borderColor: 'rgba(214,255,63,0.35)' }
                : { borderColor: '#242928' }
          }
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'h-px flex-1 transition-colors duration-300',
                crossing ? 'bg-fw-signal' : 'bg-fw-line',
              )}
              aria-hidden
            />
            <span className="fw-mono text-[0.625rem] tracking-[0.14em] text-fw-fog">BOUNDARY</span>
            <span
              className={cn(
                'h-px flex-1 transition-colors duration-300',
                attested || relayed ? 'bg-fw-signal' : 'bg-fw-line',
              )}
              aria-hidden
            />
          </div>

          <p
            className={cn(
              'fw-display mt-8 text-[clamp(1.75rem,4vw,2.75rem)] font-semibold tracking-[-0.03em]',
              attested
                ? status === 'RESTRICTED'
                  ? 'text-fw-restricted'
                  : 'text-fw-eligible'
                : 'text-fw-unknown',
            )}
          >
            {attested
              ? status
              : proofReady
                ? 'NOT YET ATTESTED'
                : 'AWAITING PROOF'}
          </p>

          <p className="mt-3 text-sm text-fw-mist">
            {attested
              ? 'Ledger decision read from Creditcoin.'
              : relayAttempted && !relayed
                ? 'Calldata prepared only — no Creditcoin transaction has been broadcast yet.'
                : proofReady
                  ? 'Proof ready. Creditcoin has not yet established eligibility for this account.'
                  : 'No proof bundle — nothing to commit.'}
          </p>

          <dl className="mt-8 space-y-3 border-t border-fw-line pt-5">
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-fw-fog">Account</dt>
              <dd className="fw-mono text-fw-paper">
                {address ? shortenHex(address, 6, 4) : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-fw-fog">CTC tx</dt>
              <dd className="fw-mono text-fw-paper">
                {ctcTx ? shortenHex(ctcTx, 6, 4) : '—'}
              </dd>
            </div>
            <div className="flex justify-between gap-4 text-sm">
              <dt className="text-fw-fog">Source</dt>
              <dd className="fw-mono text-fw-paper">
                {statusSource === 'chain' ? 'chain' : 'unset'}
              </dd>
            </div>
          </dl>
        </motion.div>
      </div>
    </section>
  );
}
