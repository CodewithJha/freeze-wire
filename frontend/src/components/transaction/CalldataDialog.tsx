import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function CalldataDialog({
  open,
  onOpenChange,
  to,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  to: string;
  data: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>RELAY DISABLED — client wallet path</DialogTitle>
        <DialogDescription>
          Worker has no RELAY_PRIVATE_KEY. Broadcast this submitProof calldata from a funded
          CC3 wallet. Do not treat UI preview as a confirmed transaction.
        </DialogDescription>
        <div className="mt-4 space-y-3 border-t border-fw-line pt-4">
          <div>
            <p className="mb-1 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-fw-fog">
              to
            </p>
            <p className="fw-mono break-all text-xs text-fw-paper">{to}</p>
          </div>
          <div>
            <p className="mb-1 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-fw-fog">
              data
            </p>
            <p className="fw-mono max-h-44 overflow-auto break-all text-xs leading-relaxed text-fw-mist">
              {data}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              void navigator.clipboard.writeText(JSON.stringify({ to, data }, null, 2));
            }}
          >
            COPY JSON
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
