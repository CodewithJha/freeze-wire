import { motion, useReducedMotion } from 'motion/react';
import type { EvidenceFields } from '@/components/evidence/EvidenceRecord';
import { formatBlock, shortenHex } from '@/lib/formatting';
import { cn } from '@/lib/utils';

type Fragment = {
  id: string;
  label: string;
  value: string;
  ready: boolean;
};

export function ProofMoment({
  evidence,
  proving,
  bundleReady,
}: {
  evidence: EvidenceFields;
  proving: boolean;
  /** True after HTTP prove returns a bundle — not on-chain verify. */
  bundleReady: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const showBundle = bundleReady || proving;

  const fragments: Fragment[] = [
    {
      id: 'chainKey',
      label: 'chainKey',
      value: evidence.chainKey == null ? '—' : String(evidence.chainKey),
      ready: evidence.chainKey != null,
    },
    {
      id: 'header',
      label: 'header',
      value: formatBlock(evidence.headerNumber),
      ready: evidence.headerNumber != null,
    },
    {
      id: 'txIndex',
      label: 'txIndex',
      value: evidence.txIndex == null ? '—' : String(evidence.txIndex),
      ready: evidence.txIndex != null,
    },
    {
      id: 'merkle',
      label: 'merkle',
      value:
        evidence.merkleSiblingCount != null
          ? `${evidence.merkleSiblingCount} siblings`
          : evidence.merkleRoot
            ? shortenHex(evidence.merkleRoot, 4, 4)
            : '—',
      ready: Boolean(evidence.merkleRoot),
    },
    {
      id: 'continuity',
      label: 'continuity',
      value:
        evidence.continuityRootCount != null
          ? `${evidence.continuityRootCount} roots`
          : '—',
      ready: (evidence.continuityRootCount ?? 0) > 0,
    },
    {
      id: 'receipt',
      label: 'receipt',
      value: bundleReady ? 'in bundle' : '—',
      ready: bundleReady,
    },
  ];

  return (
    <section
      className="border-y border-fw-line bg-fw-ink py-20 sm:py-28"
      aria-label="Proof moment"
    >
      <div className="fw-stage">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="fw-label text-fw-mist">02 · Proof</p>
            <h2 className="fw-display mt-4 max-w-[14ch] text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-fw-paper">
              Fragments become evidence.
            </h2>
          </div>
          <p className="max-w-xs text-[0.9375rem] leading-relaxed text-fw-mist">
            Fetch proof only claims success when the worker returns an Attestcoin proof bundle
            (Merkle + continuity for BlockProver <span className="fw-mono text-fw-paper">0x0FD2</span>
            ). Nothing here is simulated — and a ready bundle is not yet a Creditcoin attestation.
          </p>
        </div>

        <div className="mt-14">
          {/*
            Crosshair is sized to the fragment grid only. State typography sits outside
            so the vertical connector terminates before the status label — no cut-through.
          */}
          {showBundle ? (
            <div className="relative overflow-hidden" data-proof-fragment-region>
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                aria-hidden
                data-proof-connectors
              >
                <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-fw-line" />
                <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-fw-line" />
              </div>

              <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 lg:gap-4">
                {fragments.map((frag, i) => (
                  <motion.div
                    key={frag.id}
                    className="border border-fw-line bg-fw-void/80 px-3 py-3 sm:px-4 sm:py-4"
                    initial={false}
                    animate={
                      reduceMotion
                        ? { opacity: 1, scale: 1 }
                        : bundleReady
                          ? { opacity: 1, scale: 1 }
                          : { opacity: 0.85, scale: 0.98 }
                    }
                    transition={{
                      duration: 0.5,
                      delay: bundleReady && !reduceMotion ? i * 0.04 : 0,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <p className="fw-mono text-[0.625rem] tracking-[0.12em] text-fw-fog">
                      {frag.label}
                    </p>
                    <p
                      className={cn(
                        'fw-mono mt-2 truncate text-[0.75rem]',
                        frag.ready ? 'text-fw-mist' : 'text-fw-fog',
                      )}
                    >
                      {frag.value}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          ) : (
            /* Quiet empty metadata — not bordered placeholder cards */
            <dl className="grid min-h-[14rem] grid-cols-2 gap-x-8 gap-y-5 sm:grid-cols-3">
              {fragments.map((frag) => (
                <div key={frag.id} className="min-w-0">
                  <dt className="fw-mono text-[0.625rem] tracking-[0.12em] text-fw-fog">
                    {frag.label}
                  </dt>
                  <dd className="fw-mono mt-1.5 text-[0.75rem] text-fw-fog/60">—</dd>
                </div>
              ))}
            </dl>
          )}

          <div
            className={cn(
              'mt-10 flex justify-center border-t pt-8',
              bundleReady ? 'border-fw-signal/35' : 'border-fw-line',
            )}
          >
            <motion.p
              key={bundleReady ? 'bundle-ready' : proving ? 'proving' : 'awaiting'}
              className={cn(
                'fw-display text-center font-semibold tracking-[-0.04em]',
                bundleReady
                  ? 'text-[clamp(1.75rem,5.5vw,3.75rem)] text-fw-signal'
                  : proving
                    ? 'text-[clamp(2rem,6vw,3.5rem)] text-fw-mist'
                    : 'text-[clamp(1.25rem,3.5vw,1.75rem)] font-medium tracking-[0.08em] text-fw-fog',
              )}
              initial={reduceMotion ? false : { opacity: 0.3, letterSpacing: '0.12em' }}
              animate={{
                opacity: 1,
                letterSpacing: bundleReady ? '-0.04em' : proving ? '-0.03em' : '0.08em',
              }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              {bundleReady
                ? 'PROOF BUNDLE READY'
                : proving
                  ? 'PROVING'
                  : 'AWAITING PROOF'}
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}
