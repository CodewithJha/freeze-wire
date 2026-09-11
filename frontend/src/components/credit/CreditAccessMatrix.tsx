import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { EligibilityStatus } from '@/lib/constants';
import { cn } from '@/lib/utils';

export type CreditActionId =
  | 'draw'
  | 'protectedTransfer'
  | 'escrowLock'
  | 'escrowRelease'
  | 'repay'
  | 'withdrawUnused';

type ActionDef = {
  id: CreditActionId;
  label: string;
  gated: boolean;
  description: string;
};

const ACTIONS: ActionDef[] = [
  {
    id: 'draw',
    label: 'DRAW',
    gated: true,
    description: 'Requires ELIGIBLE. Contract reverts Restricted when blocked.',
  },
  {
    id: 'protectedTransfer',
    label: 'PROTECTED TRANSFER',
    gated: true,
    description: 'Requires ELIGIBLE. Moves unused deposit to another address.',
  },
  {
    id: 'escrowLock',
    label: 'ESCROW LOCK',
    gated: true,
    description: 'Requires ELIGIBLE. Opens a new escrow lock.',
  },
  {
    id: 'escrowRelease',
    label: 'ESCROW RELEASE',
    gated: true,
    description: 'Requires ELIGIBLE. Releases locked escrow to a recipient.',
  },
  {
    id: 'repay',
    label: 'REPAY',
    gated: false,
    description: 'Always available. Restricted counterparties may still exit debt.',
  },
  {
    id: 'withdrawUnused',
    label: 'WITHDRAW UNUSED',
    gated: false,
    description: 'Always available for unused (unlocked) deposit.',
  },
];

function requirementLabel(gated: boolean): string {
  return gated ? 'ELIGIBLE' : 'NONE';
}

function stateLabel(
  action: ActionDef,
  status: EligibilityStatus,
): { text: string; tone: 'blocked' | 'available' | 'unknown' } {
  if (!action.gated) {
    return { text: 'AVAILABLE', tone: 'available' };
  }
  if (status === 'RESTRICTED') {
    return { text: 'BLOCKED', tone: 'blocked' };
  }
  if (status === 'ELIGIBLE') {
    return { text: 'AVAILABLE', tone: 'available' };
  }
  return { text: 'NOT YET ATTESTED', tone: 'unknown' };
}

export function CreditAccessMatrix({
  status,
  busyAction,
  lastResult,
  onAction,
  creditConfigured,
}: {
  status: EligibilityStatus;
  busyAction: CreditActionId | null;
  lastResult: string | null;
  onAction: (id: CreditActionId) => void;
  creditConfigured: boolean;
}) {
  return (
    <section aria-label="Credit access policy">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="fw-label text-fw-mist">Credit access policy</h2>
          <p className="mt-1 text-sm text-fw-fog">
            Selective gating — contract is authoritative; UI is not.
          </p>
        </div>
        {!creditConfigured ? (
          <p className="text-[0.6875rem] text-fw-signal">
            CREDIT_LINE_ADDRESS unset — simulate path only
          </p>
        ) : null}
      </div>

      <div className="border-t border-fw-line">
        <div
          className="hidden grid-cols-[minmax(0,1fr)_5.5rem_minmax(7.5rem,9rem)_5.5rem] gap-3 border-b border-fw-line py-2 text-[0.625rem] font-medium uppercase tracking-[0.08em] text-fw-fog sm:grid"
          aria-hidden
        >
          <span>Operation</span>
          <span>Requirement</span>
          <span>State</span>
          <span className="text-right">Action</span>
        </div>

        <ul>
          {ACTIONS.map((action) => {
            const blocked = action.gated && status === 'RESTRICTED';
            const state = stateLabel(action, status);
            return (
              <li
                key={action.id}
                className="grid grid-cols-1 gap-2 border-b border-fw-line/80 py-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_minmax(7.5rem,9rem)_5.5rem] sm:items-center sm:gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium tracking-wide text-fw-paper">
                    {action.label}
                  </p>
                  <p className="mt-0.5 text-[0.6875rem] leading-snug text-fw-fog">
                    {action.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:block">
                  <span className="text-[0.625rem] uppercase tracking-[0.08em] text-fw-fog sm:hidden">
                    Req
                  </span>
                  <span className="fw-mono text-[0.75rem] text-fw-mist">
                    {requirementLabel(action.gated)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[0.625rem] uppercase tracking-[0.08em] text-fw-fog sm:hidden">
                    State
                  </span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 text-[0.75rem] font-medium tracking-[0.06em]',
                      state.tone === 'blocked' && 'text-fw-restricted',
                      state.tone === 'available' && 'text-fw-eligible',
                      state.tone === 'unknown' && 'text-fw-unknown',
                    )}
                  >
                    <span
                      className={cn(
                        'h-1 w-1 rounded-[1px]',
                        state.tone === 'blocked' && 'bg-fw-restricted',
                        state.tone === 'available' && 'bg-fw-eligible',
                        state.tone === 'unknown' && 'bg-fw-unknown',
                      )}
                      aria-hidden
                    />
                    {state.text}
                  </span>
                </div>
                <div className="sm:justify-self-end">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        size="sm"
                        variant={blocked ? 'danger' : 'secondary'}
                        disabled={status === 'UNKNOWN' || busyAction !== null}
                        aria-label={`Attempt ${action.label}`}
                        onClick={() => onAction(action.id)}
                      >
                        {busyAction === action.id ? 'PENDING…' : 'ATTEMPT'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {blocked
                        ? 'Expect contract Restricted revert when credit line is configured.'
                        : 'Submit against GatedCreditLine when configured.'}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {lastResult ? (
        <p className="mt-3 fw-mono text-xs text-fw-mist" role="status">
          {lastResult}
        </p>
      ) : null}
    </section>
  );
}
