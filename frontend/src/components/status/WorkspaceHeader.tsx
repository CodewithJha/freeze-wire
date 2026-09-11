import type { HealthResponse } from '@/lib/api';
import { CC3_CHAIN_ID } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function WorkspaceHeader({
  health,
  connectedLabel,
}: {
  health: HealthResponse | null;
  connectedLabel: string;
}) {
  const workerOk = health?.status === 'ok';
  const degraded = health?.status === 'degraded';

  return (
    <header className="flex flex-wrap items-end justify-between gap-4 border-b border-fw-line pb-4">
      <div>
        <p className="fw-label mb-1.5 text-fw-fog">Evidence console</p>
        <h1 className="text-[1.5rem] font-semibold tracking-[-0.04em] text-fw-paper sm:text-[1.75rem]">
          <span className="text-fw-paper">FREEZE</span>
          <span className="text-fw-fog">/</span>
          <span className="text-fw-signal">WIRE</span>
        </h1>
        <p className="mt-1 max-w-lg text-sm text-fw-mist">
          External Ethereum compliance evidence → Creditcoin financial access
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
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
        <span className="fw-mono text-fw-fog">
          CC3 {health?.chainId ?? CC3_CHAIN_ID}
        </span>
        <span className="fw-mono text-fw-fog">
          chainKey {health?.expectedChainKey ?? 3}
        </span>
        <span className="text-fw-mist">{connectedLabel}</span>
      </div>
    </header>
  );
}
