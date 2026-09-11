import { motion, useReducedMotion } from 'motion/react';
import { useEffect, useRef, type RefObject } from 'react';
import type { WireStage } from '@/lib/constants';
import { cn } from '@/lib/utils';

const STAGES: { id: WireStage; label: string; hint: string }[] = [
  { id: 'ethereum', label: 'ETHEREUM', hint: 'source chain' },
  { id: 'event', label: 'EVENT', hint: 'compliance fact' },
  { id: 'proof', label: 'PROOF', hint: 'cryptographic' },
  { id: 'creditcoin', label: 'CREDITCOIN', hint: 'ledger state' },
  { id: 'access', label: 'ACCESS', hint: 'financial gate' },
];

const ORDER: WireStage[] = ['ethereum', 'event', 'proof', 'creditcoin', 'access'];

function stageIndex(stage: WireStage): number {
  return ORDER.indexOf(stage);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Continuous fill 0→1 from ordered `[data-wire-stage]` tops vs viewport ref line. */
function measureWireProgress(root: HTMLElement): number {
  const anchors = ORDER.map((stage) =>
    root.querySelector<HTMLElement>(`[data-wire-stage="${stage}"]`),
  ).filter((el): el is HTMLElement => el != null);

  if (anchors.length < 2) return 0;

  // Align with IO band center (~18%…58% → mid ≈ 38%) so fill hits markers as stages activate.
  const refY = window.innerHeight * 0.38;
  const y = window.scrollY + refY;
  const tops = anchors.map((el) => el.getBoundingClientRect().top + window.scrollY);
  const firstTop = tops[0];
  const lastTop = tops[tops.length - 1];
  if (firstTop === undefined || lastTop === undefined) return 0;

  if (y <= firstTop) return 0;
  if (y >= lastTop) return 1;

  let i = 0;
  while (i < tops.length - 1 && (tops[i + 1] ?? Infinity) < y) i += 1;
  const a = tops[i] ?? firstTop;
  const b = tops[i + 1] ?? lastTop;
  const span = b - a;
  const t = span <= 0 ? 0 : clamp01((y - a) / span);
  return (i + t) / (tops.length - 1);
}

export type EvidenceWireProps = {
  activeStage: WireStage;
  /**
   * Story root containing `[data-wire-stage]` anchors. When set (vertical), fill height
   * tracks scroll continuously via rAF + direct DOM writes (no React state / CSS lag).
   */
  stagesRootRef?: RefObject<HTMLElement | null>;
  /** Optional continuous 0→1 override; prefer stagesRootRef for scroll-driven fill. */
  scrollProgress?: number;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
};

/**
 * Evidence Wire — provenance spine.
 * ETHEREUM → EVENT → PROOF → CREDITCOIN → ACCESS
 */
export function EvidenceWire({
  activeStage,
  stagesRootRef,
  scrollProgress,
  orientation = 'horizontal',
  className,
}: EvidenceWireProps) {
  const reduceMotion = useReducedMotion();
  const fillRef = useRef<HTMLDivElement | null>(null);
  const active = Math.max(0, stageIndex(activeStage));
  const discreteProgress = active <= 0 ? 0 : active / (ORDER.length - 1);
  const scrollDriven = orientation === 'vertical' && stagesRootRef != null;

  useEffect(() => {
    if (!scrollDriven || !stagesRootRef) return;

    let raf = 0;
    const apply = (progress: number) => {
      const el = fillRef.current;
      if (!el) return;
      // Single gradient stroke: --wire-fill is the signal/gray stop (0–100%).
      el.style.setProperty('--wire-fill', `${clamp01(progress) * 100}%`);
    };

    const measure = () => {
      raf = 0;
      const root = stagesRootRef.current;
      if (!root) {
        apply(0);
        return;
      }
      apply(measureWireProgress(root));
    };

    const onScrollOrResize = () => {
      if (reduceMotion) {
        measure();
        return;
      }
      if (raf) return;
      raf = window.requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [scrollDriven, stagesRootRef, reduceMotion]);

  // Prop-driven progress (tests / non-scroll callers) — no transition when continuous.
  useEffect(() => {
    if (scrollDriven || scrollProgress === undefined) return;
    const el = fillRef.current;
    if (!el) return;
    el.style.setProperty('--wire-fill', `${clamp01(scrollProgress) * 100}%`);
  }, [scrollDriven, scrollProgress]);

  if (orientation === 'vertical') {
    const initialHeight =
      scrollProgress !== undefined
        ? clamp01(scrollProgress) * 100
        : scrollDriven
          ? 0
          : discreteProgress * 100;

    // Equal row slots: nodes at row starts. Track ends at ACCESS node bottom —
    // (n-1)/n of rail + node size. No stroke into empty space past ACCESS.
    const stageCount = STAGES.length;

    return (
      <div
        className={cn('relative flex h-full min-h-0 flex-col overflow-hidden', className)}
        aria-label="Evidence provenance wire"
        data-wire-rail="vertical"
      >
        <ol
          className="relative z-[1] grid min-h-0 flex-1 grid-cols-1"
          style={{ gridTemplateRows: `repeat(${stageCount}, minmax(0, 1fr))` }}
        >
          {STAGES.map((stage, i) => {
            const current = i === active;
            return (
              <li
                key={stage.id}
                className="grid min-w-0 grid-cols-[5px_minmax(0,1fr)] items-start gap-3"
                data-wire-stage-slot={stage.id}
              >
                <span
                  className={cn(
                    // No border — border AA at the stroke junction reads as a 1px jog.
                    // Hollow nodes use inset shadow so the box center stays the rail center.
                    'box-border block h-[5px] w-[5px] rounded-[1px] transition-colors duration-200',
                    current
                      ? 'bg-fw-signal shadow-none'
                      : 'bg-fw-void shadow-[inset_0_0_0_1px_var(--color-fw-line-strong)]',
                  )}
                  aria-current={current ? 'step' : undefined}
                  aria-hidden
                  data-wire-marker={stage.id}
                />
                <div className="min-w-0 pt-0">
                  <span
                    className={cn(
                      'block text-[0.6875rem] font-medium tracking-[0.12em] transition-colors duration-200',
                      current ? 'text-fw-signal' : 'text-fw-fog',
                    )}
                  >
                    {stage.label}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 block text-[0.625rem] leading-tight transition-colors duration-200',
                      current ? 'text-fw-mist' : 'text-fw-fog/60',
                    )}
                  >
                    {stage.hint}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
        <div
          className="pointer-events-none absolute left-0 top-0 z-[2] w-[5px] overflow-hidden"
          style={{
            height: `calc((100% * ${stageCount - 1} / ${stageCount}) + 5px)`,
          }}
          aria-hidden
          data-wire-track
        >
          {/* Single paint: gray track + signal fill share one 1px column */}
          <div
            ref={fillRef}
            className="absolute left-[2px] top-0 h-full w-px"
            data-wire-track-bg
            data-wire-track-fill
            style={{
              backgroundImage: `linear-gradient(to bottom, var(--color-fw-signal) 0%, var(--color-fw-signal) var(--wire-fill, ${initialHeight}%), var(--color-fw-line) var(--wire-fill, ${initialHeight}%), var(--color-fw-line) 100%)`,
              // Scroll-linked fill must not ease — CSS transitions make sparse React updates feel stepped.
              transition:
                reduceMotion || scrollDriven || scrollProgress !== undefined
                  ? undefined
                  : '--wire-fill 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
              ['--wire-fill' as string]: `${initialHeight}%`,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn('w-full overflow-hidden', className)}
      aria-label="Evidence provenance wire"
    >
      <div className="relative overflow-hidden px-0.5 pt-0.5 pb-1">
        {/* Track constrained to first→last node centers via inset of half node + pad */}
        <div
          className="pointer-events-none absolute inset-x-[0.2rem] top-[0.42rem] h-px overflow-hidden"
          aria-hidden
          data-wire-track
        >
          <div className="absolute inset-0 bg-fw-line" />
          <motion.div
            className="absolute inset-y-0 left-0 origin-left bg-fw-signal"
            initial={false}
            animate={{ scaleX: discreteProgress }}
            transition={
              reduceMotion ? { duration: 0 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
            }
            style={{ width: '100%', transformOrigin: 'left' }}
          />
        </div>
        <ol className="relative z-[1] grid grid-cols-5 gap-1 overflow-hidden">
          {STAGES.map((stage, i) => {
            const current = i === active;
            return (
              <li key={stage.id} className="flex min-w-0 flex-col items-start gap-1.5">
                <span
                  className={cn(
                    'mt-px inline-block h-1.5 w-1.5 rounded-[1px] border transition-colors duration-200',
                    current
                      ? 'border-fw-signal bg-fw-signal'
                      : 'border-fw-line-strong bg-fw-void',
                  )}
                  aria-current={current ? 'step' : undefined}
                  aria-hidden
                />
                <div className="min-w-0 overflow-hidden">
                  <span
                    className={cn(
                      'block truncate text-[0.625rem] font-medium tracking-[0.1em] transition-colors duration-200 sm:text-[0.6875rem]',
                      current ? 'text-fw-signal' : 'text-fw-fog',
                    )}
                  >
                    {stage.label}
                  </span>
                  <span
                    className={cn(
                      'mt-0.5 hidden truncate text-[0.625rem] leading-tight transition-colors duration-200 sm:block',
                      current ? 'text-fw-mist' : 'text-fw-fog/60',
                    )}
                  >
                    {stage.hint}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
