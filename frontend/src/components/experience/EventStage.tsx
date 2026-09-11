import { motion, useReducedMotion } from 'motion/react';
import type { EvidenceFields } from '@/components/evidence/EvidenceRecord';
import { formatBlock, shortenHex } from '@/lib/formatting';
import { cn } from '@/lib/utils';

export function EventStage({
  evidence,
  loading,
}: {
  evidence: EvidenceFields;
  loading: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const loaded = Boolean(evidence.txHash);

  return (
    <section className="fw-stage py-20 sm:py-28" aria-label="Event discovery">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <p className="fw-label text-fw-mist">01 · Event</p>
          <h2 className="fw-display mt-4 text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-fw-paper">
            Reconstruct the
            <br />
            external fact.
          </h2>
          <p className="mt-5 max-w-sm text-[0.9375rem] leading-relaxed text-fw-mist">
            Not a dashboard tile — a forensic record from Ethereum Mainnet. Fields appear only when
            the worker returns them.
          </p>
        </div>

        <div
          className={cn(
            'relative min-h-[16rem] border border-fw-line bg-fw-ink',
            !loaded && 'border-dashed',
          )}
        >
          {!loaded ? (
            <div className="flex h-full min-h-[16rem] flex-col justify-between p-6">
              <p className="fw-mono text-[0.6875rem] tracking-[0.12em] text-fw-fog">
                {loading ? 'REQUESTING DEMO EVIDENCE…' : 'AWAITING SOURCE EVENT'}
              </p>
              <p className="max-w-xs text-sm text-fw-fog">
                Trace the demo Blacklisted transaction to materialize block, index, account, and
                emitter.
              </p>
            </div>
          ) : (
            <motion.article
              key={evidence.txHash}
              className="p-6 sm:p-8"
              initial={reduceMotion ? false : { opacity: 0.2, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-fw-line pb-4">
                <div>
                  <p className="fw-mono text-[0.6875rem] tracking-[0.14em] text-fw-signal">
                    ETHEREUM MAINNET
                  </p>
                  <p className="fw-display mt-2 text-2xl font-semibold tracking-[-0.03em] text-fw-paper sm:text-3xl">
                    {evidence.kind ?? 'COMPLIANCE EVENT'}
                  </p>
                </div>
                <p className="text-[0.75rem] text-fw-mist">
                  {evidence.usdc ? 'Circle USD Coin' : 'Emitter pending'}
                </p>
              </div>

              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                <Field label="BLOCK" value={formatBlock(evidence.block)} />
                <Field
                  label="TX INDEX"
                  value={evidence.txIndex == null ? '—' : String(evidence.txIndex)}
                />
                <Field
                  label="ACCOUNT"
                  value={evidence.account ? shortenHex(evidence.account, 8, 6) : '—'}
                  full
                />
                <Field
                  label="SOURCE TX"
                  value={evidence.txHash ? shortenHex(evidence.txHash, 10, 8) : '—'}
                  full
                />
              </dl>
            </motion.article>
          )}
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  full,
}: {
  label: string;
  value: string;
  full?: boolean;
}) {
  return (
    <div className={cn(full && 'sm:col-span-2')}>
      <dt className="fw-label">{label}</dt>
      <dd className="fw-mono mt-1.5 text-sm text-fw-paper sm:text-[0.9375rem]">{value}</dd>
    </div>
  );
}
