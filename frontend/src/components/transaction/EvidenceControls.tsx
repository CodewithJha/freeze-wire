import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DEMO_SOURCE_TX } from '@/lib/constants';
import { isTxHash } from '@/lib/formatting';
import { cn } from '@/lib/utils';

export type EvidenceSequence = {
  evidenceLoaded: boolean;
  proofReady: boolean;
  relayAttempted: boolean;
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
      label: 'Verify proof',
      done: sequence.proofReady,
      active: sequence.evidenceLoaded && !sequence.proofReady,
    },
    {
      n: '03',
      label: 'Commit to Creditcoin',
      done: sequence.relayAttempted,
      active: sequence.proofReady && !sequence.relayAttempted,
    },
    {
      n: '04',
      label: 'Test access',
      done: sequence.accessResolved,
      active: sequence.relayAttempted && !sequence.accessResolved,
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
                {step.done ? ' · done' : null}
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
          {proving ? 'VERIFYING…' : 'VERIFY PROOF'}
        </Button>
        <Button type="button" onClick={onRelay} disabled={!canRelay || relaying}>
          {relaying ? 'COMMITTING…' : 'COMMIT TO CREDITCOIN'}
        </Button>
      </div>
    </div>
  );
}
