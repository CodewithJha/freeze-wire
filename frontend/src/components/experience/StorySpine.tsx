import type { RefObject } from 'react';
import { EvidenceWire } from '@/components/evidence/EvidenceWire';
import type { WireStage } from '@/lib/constants';
import { cn } from '@/lib/utils';

/**
 * Fixed vertical spine — labels follow the section in view; track fill follows scroll.
 * Geometry from --fw-rail-* tokens (see index.css); pairs with .fw-main margin.
 */
export function StorySpine({
  activeStage,
  stagesRootRef,
  className,
}: {
  activeStage: WireStage;
  /** Root that owns `[data-wire-stage]` section anchors for continuous fill. */
  stagesRootRef: RefObject<HTMLElement | null>;
  className?: string;
}) {
  return (
    <aside
      className={cn(
        // top/bottom insets → height = 100vh − 3rem.
        // overflow-hidden + void fill + hairline right edge: hard WIRE boundary.
        'pointer-events-none fixed bottom-6 top-6 z-30 hidden flex-col overflow-hidden border-r border-fw-line bg-fw-void lg:flex',
        className,
      )}
      style={{
        left: 'var(--fw-rail-inset)',
        width: 'var(--fw-rail-width)',
      }}
      aria-hidden
      data-wire-spine
    >
      <p className="mb-4 h-3 shrink-0 fw-mono text-[0.5625rem] leading-none tracking-[0.16em] text-fw-fog">
        WIRE
      </p>
      <EvidenceWire
        activeStage={activeStage}
        stagesRootRef={stagesRootRef}
        orientation="vertical"
        className="min-h-0 flex-1"
      />
    </aside>
  );
}
