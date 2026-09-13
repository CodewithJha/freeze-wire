import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

/** Explicit client-wallet broadcast phases. PREPARED ≠ COMMITTED. */
export type BroadcastPhase =
  | 'PREPARED'
  | 'AWAITING_WALLET'
  | 'WALLET_REJECTED'
  | 'BROADCASTING'
  | 'CONFIRMING'
  | 'COMMITTED'
  | 'FAILED';

const PHASE_LABEL: Record<BroadcastPhase, string> = {
  PREPARED: 'PREPARED NOT COMMITTED',
  AWAITING_WALLET: 'AWAITING WALLET',
  WALLET_REJECTED: 'WALLET REJECTED',
  BROADCASTING: 'BROADCASTING',
  CONFIRMING: 'CONFIRMING ON CREDITCOIN',
  COMMITTED: 'COMMITTED',
  FAILED: 'FAILED',
};

function phaseBusy(phase: BroadcastPhase): boolean {
  return (
    phase === 'AWAITING_WALLET' ||
    phase === 'BROADCASTING' ||
    phase === 'CONFIRMING'
  );
}

type CalldataDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  to: string;
  data: string;
  /** Client-wallet broadcast. Must only report COMMITTED after a confirmed receipt. */
  onBroadcast?: () => void | Promise<void>;
  phase?: BroadcastPhase;
  phaseError?: string | null;
};

/**
 * Public dialog: never renders `to` or raw `data` hex in the DOM.
 * COPY CALLDATA writes JSON to the clipboard only — no SHOW RAW expand.
 */
export function CalldataDialog({
  open,
  onOpenChange,
  to,
  data,
  onBroadcast,
  phase = 'PREPARED',
  phaseError = null,
}: CalldataDialogProps) {
  const busy = phaseBusy(phase);
  const canAct = Boolean(to && data) && !busy && phase !== 'COMMITTED';
  const byteCount = data ? Math.max(0, Math.floor((data.length - 2) / 2)) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>NOT BROADCAST — WALLET REQUIRED</DialogTitle>
        <DialogDescription>
          Worker relay is offline. submitProof calldata is prepared only — no Creditcoin
          transaction has been sent. Connect a funded CC3 wallet and sign to broadcast, or copy
          the calldata for an external wallet.
        </DialogDescription>

        <div className="mt-4 space-y-3 border-t border-fw-line pt-4">
          <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-fw-signal">
            Status · {PHASE_LABEL[phase]}
          </p>
          {phaseError ? (
            <p className="text-xs leading-relaxed text-fw-restricted" role="alert">
              {phaseError}
            </p>
          ) : null}
          <div>
            <p className="mb-1 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-fw-fog">
              Calldata size
            </p>
            <p className="fw-mono text-xs text-fw-paper">
              {byteCount !== null ? `${byteCount} bytes` : '—'}
            </p>
          </div>

          <div className="relative z-[1] flex flex-wrap gap-2 pt-1">
            {onBroadcast ? (
              <Button
                type="button"
                variant="signal"
                size="sm"
                disabled={!canAct}
                onClick={() => {
                  void onBroadcast();
                }}
              >
                {phase === 'AWAITING_WALLET'
                  ? 'WAITING FOR WALLET…'
                  : phase === 'BROADCASTING'
                    ? 'BROADCASTING…'
                    : phase === 'CONFIRMING'
                      ? 'CONFIRMING…'
                      : phase === 'COMMITTED'
                        ? 'COMMITTED'
                        : 'SIGN & BROADCAST'}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!to || !data}
              onClick={() => {
                void navigator.clipboard.writeText(JSON.stringify({ to, data }, null, 2));
              }}
            >
              COPY CALLDATA
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
