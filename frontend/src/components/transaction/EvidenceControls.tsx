import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DEMO_SOURCE_TX } from '@/lib/constants';
import { isTxHash } from '@/lib/formatting';
import { cn } from '@/lib/utils';

export type EvidenceSequence = {
  evidenceLoaded: boolean;
  proofReady: boolean;
  /** Calldata prepared for client wallet — does NOT mean committed. */
  calldataPrepared: boolean;
  /** True only after a confirmed Creditcoin submitProof receipt. */
  committed: boolean;
  accessResolved: boolean;
};

export function EvidenceControls({
  txHash,
  onTxHashChange,
  onLoadDemo,
  onProve,
  onRelay,
  loadingDemo,
  proving,
  relaying,
  canProve,
  canRelay,
  sequence,
  onOpenCalldata,
}: {
  txHash: string;
  onTxHashChange: (v: string) => void;
  onLoadDemo: () => void;
  onProve: () => void;
  onRelay: () => void;
  loadingDemo: boolean;
  proving: boolean;
  relaying: boolean;
  canProve: boolean;
  canRelay: boolean;
  sequence: EvidenceSequence;
  onOpenCalldata?: () => void;
}) {
  const valid = isTxHash(txHash);

  const steps: {
    n: string;
    label: string;
    done: boolean;
    active: boolean;
  }[] = [
    {
      n: '01',
      label: 'Trace event',
      done: sequence.evidenceLoaded,
      active: !sequence.evidenceLoaded,
    },
    {
      n: '02',
      label: 'Fetch proof bundle',
      done: sequence.proofReady,
      active: sequence.evidenceLoaded && !sequence.proofReady,
    },
    {
      n: '03',
      label: sequence.calldataPrepared && !sequence.committed
        ? 'Commit to Creditcoin (awaiting wallet)'
        : 'Commit to Creditcoin',
      done: sequence.committed,
      active: sequence.proofReady && !sequence.committed,
    },
    {
      n: '04',
      label: 'Test access',
      done: sequence.accessResolved,
      active: sequence.committed && !sequence.accessResolved,
    },
  ];

  return (
    <div className="space-y-5">
      <div>
        <p className="fw-label mb-2 text-fw-mist">Interaction sequence</p>
        <ol className="flex flex-wrap gap-x-5 gap-y-1.5">
          {steps.map((step) => (
            <li key={step.n} className="flex items-baseline gap-1.5 text-[0.6875rem]">
              <span
                className={cn(
                  'fw-mono',
                  step.done && 'text-fw-signal',
                  step.active && !step.done && 'text-fw-paper',
                  !step.done && !step.active && 'text-fw-fog',
                )}
              >
                {step.n}
              </span>
              <span
                className={cn(
                  step.done && 'text-fw-mist',
                  step.active && !step.done && 'text-fw-paper',
                  !step.done && !step.active && 'text-fw-fog',
                )}
              >
                {step.label}
                {step.done
                  ? ' · done'
                  : step.n === '03' && sequence.calldataPrepared && !sequence.committed
                    ? ' · not broadcast'
                    : null}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <label className="block min-w-0">
        <span className="mb-1.5 block text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-fw-fog">
          Source tx hash
        </span>
        <Input
          value={txHash}
          onChange={(e) => onTxHashChange(e.target.value.trim())}
          placeholder={DEMO_SOURCE_TX}
          spellCheck={false}
          aria-invalid={txHash.length > 0 && !valid}
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="signal" onClick={onLoadDemo} disabled={loadingDemo}>
          {loadingDemo ? 'TRACING…' : 'TRACE EVENT'}
        </Button>
        <Button type="button" variant="secondary" onClick={onProve} disabled={!canProve || proving}>
          {proving ? 'FETCHING…' : 'FETCH PROOF BUNDLE'}
        </Button>
        <Button type="button" onClick={onRelay} disabled={!canRelay || relaying}>
          {relaying ? 'COMMITTING…' : 'COMMIT TO CREDITCOIN'}
        </Button>
        {onOpenCalldata ? (
          <Button type="button" variant="ghost" onClick={onOpenCalldata}>
            OPEN WALLET PATH
          </Button>
        ) : null}
      </div>
    </div>
  );
}
