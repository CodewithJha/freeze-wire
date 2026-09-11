import { motion, useReducedMotion } from 'motion/react';
import { BitcoinHero } from '@/features/hero-3d';

type HeroStageProps = {
  onEnterConsole: () => void;
  onTraceEvent: () => void;
  loadingDemo: boolean;
};

export function HeroStage({ onEnterConsole, onTraceEvent, loadingDemo }: HeroStageProps) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      className="relative flex min-h-[100svh] flex-col justify-between overflow-hidden border-b border-fw-line"
      aria-label="FREEZE/WIRE introduction"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(to right, transparent 0, transparent calc(50% - 0.5px), #242928 calc(50% - 0.5px), #242928 calc(50% + 0.5px), transparent calc(50% + 0.5px)), linear-gradient(#242928 1px, transparent 1px)',
          backgroundSize: '100% 100%, 100% 4.5rem',
          backgroundPosition: 'center top',
          maskImage: 'linear-gradient(to bottom, black 0%, transparent 88%)',
        }}
      />

      {/* Right-side product stage — does not alter copy, CTAs, or layout structure */}
      <div
        className="pointer-events-none absolute inset-y-[8%] right-[-4%] z-[1] w-[min(58vw,40rem)] opacity-80 [mask-image:linear-gradient(to_right,transparent_0%,black_22%)] sm:inset-y-[6%] sm:right-[-2%] sm:w-[min(52vw,38rem)] sm:opacity-95 md:opacity-100 lg:right-[2%] lg:w-[min(48vw,36rem)] lg:[mask-image:linear-gradient(to_right,transparent_0%,black_12%)]"
        aria-hidden
      >
        <div className="pointer-events-auto h-full w-full">
          <BitcoinHero />
        </div>
      </div>

      <div className="fw-stage pointer-events-none relative z-[2] flex flex-1 flex-col justify-center py-16 sm:py-20">
        <motion.p
          className="fw-label text-fw-mist"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          Financial infrastructure · evidence → access
        </motion.p>

        <motion.h1
          className="fw-display mt-6 text-[clamp(3.25rem,12vw,8.5rem)] font-semibold leading-[0.88] tracking-[-0.045em] text-fw-paper"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="block">FREEZE</span>
          <span className="block">
            <span className="text-fw-fog">/</span>
            <span className="text-fw-signal">WIRE</span>
          </span>
        </motion.h1>

        <motion.p
          className="fw-display mt-10 max-w-[18ch] text-[clamp(1.5rem,3.4vw,2.75rem)] font-medium leading-[1.1] tracking-[-0.03em] text-fw-paper"
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          Prove the event.
          <br />
          Enforce the outcome.
        </motion.p>

        <motion.p
          className="mt-6 max-w-md text-[0.9375rem] leading-relaxed text-fw-mist"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45, delay: 0.2 }}
        >
          An Ethereum compliance fact becomes a Creditcoin financial boundary — only after it is
          cryptographically proven. Trust is not a substitute for proof.
        </motion.p>

        <motion.div
          className="pointer-events-auto mt-10 flex flex-wrap items-center gap-x-6 gap-y-3"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.28 }}
        >
          <button
            type="button"
            onClick={onTraceEvent}
            disabled={loadingDemo}
            className="border border-fw-signal bg-fw-signal px-5 py-2.5 text-sm font-medium tracking-[0.04em] text-fw-void transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loadingDemo ? 'TRACING…' : 'TRACE EVENT'}
          </button>
          <button
            type="button"
            onClick={onEnterConsole}
            className="border border-fw-line-strong px-5 py-2.5 text-sm font-medium tracking-[0.04em] text-fw-paper transition-colors hover:border-fw-mist"
          >
            OPERATE CONSOLE
          </button>
        </motion.div>

        <motion.p
          className="mt-14 fw-mono text-[0.6875rem] tracking-[0.14em] text-fw-fog"
          initial={reduceMotion ? false : { clipPath: 'inset(0 100% 0 0)' }}
          animate={{ clipPath: 'inset(0 0% 0 0)' }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
        >
          ETHEREUM → PROOF → CREDITCOIN → ACCESS
        </motion.p>
      </div>

      <div className="fw-stage relative border-t border-fw-line py-4">
        <p className="text-[0.75rem] text-fw-fog">
          Scroll the spine — stages complete only when real evidence, proof, and ledger state arrive.
        </p>
      </div>
    </section>
  );
}
