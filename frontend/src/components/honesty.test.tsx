import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { CalldataDialog } from '@/components/transaction/CalldataDialog';
import { ProofMoment } from '@/components/experience/ProofMoment';
import type { EvidenceFields } from '@/components/evidence/EvidenceRecord';

vi.mock('motion/react', () => ({
  useReducedMotion: () => true,
  motion: {
    p: ({ children, ...rest }: { children?: ReactNode }) => <p {...rest}>{children}</p>,
    div: ({ children, ...rest }: { children?: ReactNode }) => <div {...rest}>{children}</div>,
  },
}));

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
});

describe('ProofMoment', () => {
  it('shows PROOF BUNDLE READY when bundleReady', () => {
    const evidence: EvidenceFields = {
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
    render(<ProofMoment evidence={evidence} proving={false} bundleReady />);
    expect(screen.getByText('PROOF BUNDLE READY')).toBeTruthy();
    expect(screen.queryByText('PROOF VERIFIED')).toBeNull();
  });
});
