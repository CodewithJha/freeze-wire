import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CalldataDialog } from '@/components/transaction/CalldataDialog';
import { EvidenceControls } from '@/components/transaction/EvidenceControls';
import { ProofMoment } from '@/components/experience/ProofMoment';
import { AccessConsequence } from '@/components/experience/AccessConsequence';
import { CreditcoinStage } from '@/components/experience/CreditcoinStage';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { EvidenceFields } from '@/components/evidence/EvidenceRecord';

vi.mock('motion/react', () => ({
  useReducedMotion: () => true,
  motion: {
    p: ({ children, ...rest }: { children?: ReactNode }) => <p {...rest}>{children}</p>,
    div: ({ children, ...rest }: { children?: ReactNode }) => <div {...rest}>{children}</div>,
  },
}));

afterEach(() => {
  cleanup();
});

function wrap(ui: ReactNode) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

const demoEvidence: EvidenceFields = {
  txHash: '0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787',
  account: '0xe05F529f5284D75624eBa386CB716928c3b54A2A',
  block: 25705174,
  txIndex: 18,
  kind: 'Blacklisted',
  usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  etherscan: null,
  chainKey: 3,
  headerNumber: 25705174,
  attestedHeight: null,
  merkleRoot: null,
  merkleSiblingCount: 9,
  continuityRootCount: 27,
  ctcTx: null,
  proofReady: true,
};

describe('CalldataDialog', () => {
  it('does not render raw to/data hex in the DOM', () => {
    const to = '0xde64d5037cA820D4aDFa703C4FaF5451be840C9d';
    const data =
      '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789deadbeef';
    render(
      <CalldataDialog open onOpenChange={() => {}} to={to} data={data} phase="PREPARED" />,
    );
    expect(screen.queryByText(to)).toBeNull();
    expect(screen.queryByText(data)).toBeNull();
    expect(document.body.textContent).not.toContain(data.slice(2, 18));
    expect(screen.getByText(/NOT BROADCAST/i)).toBeTruthy();
  });

  it('C7: PREPARED phase shows PREPARED NOT COMMITTED + NOT BROADCAST', () => {
    render(
      <CalldataDialog
        open
        onOpenChange={() => {}}
        to="0xde64d5037cA820D4aDFa703C4FaF5451be840C9d"
        data="0xabcdef"
        phase="PREPARED"
      />,
    );
    expect(screen.getByText(/PREPARED NOT COMMITTED/i)).toBeTruthy();
    expect(screen.getByText(/NOT BROADCAST/i)).toBeTruthy();
  });
});

describe('ProofMoment', () => {
  it('shows PROOF BUNDLE READY when bundleReady', () => {
    render(<ProofMoment evidence={demoEvidence} proving={false} bundleReady />);
    expect(screen.getByText('PROOF BUNDLE READY')).toBeTruthy();
    expect(screen.queryByText('PROOF VERIFIED')).toBeNull();
  });

  it('C6: awaiting proof never claims PROOF VERIFIED', () => {
    render(
      <ProofMoment
        evidence={{ ...demoEvidence, proofReady: false }}
        proving={false}
        bundleReady={false}
      />,
    );
    expect(screen.getByText(/AWAITING PROOF/i)).toBeTruthy();
    expect(screen.queryByText('PROOF VERIFIED')).toBeNull();
  });
});

describe('AccessConsequence', () => {
  it('C1: LIVE + RESTRICTED without chain source → NOT YET ATTESTED', () => {
    wrap(
      <AccessConsequence
        status="RESTRICTED"
        statusSource={null}
        busyAction={null}
        lastResult={null}
        onAction={() => {}}
        deploymentMode="LIVE"
      />,
    );
    expect(screen.getByText('NOT YET ATTESTED')).toBeTruthy();
    expect(screen.queryByText('RESTRICTED')).toBeNull();
  });

  it('C2: LIVE + RESTRICTED + chain → RESTRICTED', () => {
    wrap(
      <AccessConsequence
        status="RESTRICTED"
        statusSource="chain"
        busyAction={null}
        lastResult={null}
        onAction={() => {}}
        deploymentMode="LIVE"
      />,
    );
    expect(screen.getByText('RESTRICTED')).toBeTruthy();
  });

  it('C3: SIMULATION + RESTRICTED + chain → NOT YET ATTESTED', () => {
    wrap(
      <AccessConsequence
        status="RESTRICTED"
        statusSource="chain"
        busyAction={null}
        lastResult={null}
        onAction={() => {}}
        deploymentMode="SIMULATION"
      />,
    );
    expect(screen.getByText('NOT YET ATTESTED')).toBeTruthy();
    expect(screen.queryByText(/^RESTRICTED$/)).toBeNull();
  });
});

describe('CreditcoinStage', () => {
  it('C4: proofReady + relayAttempted + !relayed → calldata-only copy', () => {
    render(
      <CreditcoinStage
        proofReady
        relayAttempted
        relayed={false}
        ctcTx={null}
        status="RESTRICTED"
        statusSource={null}
        address="0xe05F529f5284D75624eBa386CB716928c3b54A2A"
      />,
    );
    expect(screen.getByText(/Calldata prepared only/i)).toBeTruthy();
    expect(screen.getByText('NOT YET ATTESTED')).toBeTruthy();
    expect(screen.queryByText(/^RESTRICTED$/)).toBeNull();
  });
});

describe('EvidenceControls', () => {
  it('C5: calldata prepared without commit marks step 03 not broadcast', () => {
    render(
      <EvidenceControls
        txHash="0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787"
        onTxHashChange={() => {}}
        onLoadDemo={() => {}}
        onProve={() => {}}
        onRelay={() => {}}
        loadingDemo={false}
        proving={false}
        relaying={false}
        canProve
        canRelay
        sequence={{
          evidenceLoaded: true,
          proofReady: true,
          calldataPrepared: true,
          committed: false,
          accessResolved: false,
        }}
      />,
    );
    expect(screen.getByText(/· not broadcast/i)).toBeTruthy();
  });
});
