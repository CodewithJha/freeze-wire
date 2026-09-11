import type { ReactNode } from 'react';
import type { HealthResponse } from '@/lib/api';
import { CC3_CHAIN_ID } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function ConsoleStage({
  health,
  connectedLabel,
  banner,
  children,
}: {
  health: HealthResponse | null;
  connectedLabel: string;
  banner: string | null;
  children: ReactNode;
}) {
  const workerOk = health?.status === 'ok';
  const degraded = health?.status === 'degraded';

  return (
    <section
      id="console"
      className="scroll-mt-4 border-t border-fw-line bg-fw-ink"
      aria-label="Live application console"
    >
      <div className="fw-stage pb-16 pt-12 sm:pb-20 sm:pt-14">
        <div className="max-w-2xl">
          <p className="fw-label text-fw-mist">Live application</p>
          <h2 className="fw-display mt-4 text-[clamp(1.75rem,4vw,2.75rem)] font-semibold leading-[1.1] tracking-[-0.03em] text-fw-paper">
            You&apos;ve seen what it does.
            <br />
            <span className="text-fw-signal">Now operate it.</span>
          </h2>
          <p className="mt-4 text-[0.9375rem] leading-relaxed text-fw-mist">
            Same capabilities — load evidence, discover, prove, relay or calldata, read eligibility,
            test gated ops. Buttons never invent success.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-fw-line py-4 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-[1px]',
                workerOk && 'bg-fw-eligible',
                degraded && 'bg-fw-signal',
                !health && 'bg-fw-fog',
              )}
              aria-hidden
            />
            <span className="text-fw-mist">
              worker {health ? health.status : 'unreachable'}
            </span>
          </div>
          <span className="fw-mono text-fw-fog">CC3 {health?.chainId ?? CC3_CHAIN_ID}</span>
          <span className="fw-mono text-fw-fog">
            chainKey {health?.expectedChainKey ?? 3}
          </span>
          <span className="text-fw-mist">{connectedLabel}</span>
        </div>

        {banner ? (
          <p
            className="mt-4 border border-fw-line bg-fw-void px-3 py-2 text-sm text-fw-mist"
            role="status"
          >
            {banner}
          </p>
        ) : null}

        <div className="mt-10">{children}</div>
      </div>
    </section>
  );
}
