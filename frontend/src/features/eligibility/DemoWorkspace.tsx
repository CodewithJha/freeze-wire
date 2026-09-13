import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Address, Hex } from 'viem';
import type { CreditActionId } from '@/components/credit/CreditAccessMatrix';
import {
  EvidenceRecord,
  type EvidenceFields,
} from '@/components/evidence/EvidenceRecord';
import { EvidenceWire } from '@/components/evidence/EvidenceWire';
import { AccessConsequence } from '@/components/experience/AccessConsequence';
import { ConsoleStage } from '@/components/experience/ConsoleStage';
import { CreditcoinStage } from '@/components/experience/CreditcoinStage';
import { EventStage } from '@/components/experience/EventStage';
import { HeroStage } from '@/components/experience/HeroStage';
import { ProofMoment } from '@/components/experience/ProofMoment';
import { StorySpine } from '@/components/experience/StorySpine';
import { SystemStatus } from '@/components/status/SystemStatus';
import { CalldataDialog, type BroadcastPhase } from '@/components/transaction/CalldataDialog';
import { EvidenceControls } from '@/components/transaction/EvidenceControls';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  api,
  productErrorMessage,
  WorkerApiError,
  type ProveResponse,
} from '@/lib/api';
import {
  DEMO_SOURCE_TX,
  type EligibilityStatus,
  type WireStage,
} from '@/lib/constants';
import { isAddress, isTxHash } from '@/lib/formatting';
import { useHealth } from '@/hooks/useHealth';
import {
  attemptCreditAction,
  broadcastSubmitProofCalldata,
  connectWallet,
} from '@/features/credit-line/actions';
import { WalletBroadcastError } from '@/lib/walletErrors';
import { resolveDeploymentMode } from '@/lib/deployment';

type CalldataPayload = { to: string; data: string } | null;

const WIRE_SECTION_ORDER: WireStage[] = [
  'ethereum',
  'event',
  'proof',
  'creditcoin',
  'access',
];

function emptyEvidence(): EvidenceFields {
  return {
    txHash: null,
    account: null,
    block: null,
    txIndex: null,
    kind: null,
    usdc: null,
    etherscan: null,
    chainKey: null,
    headerNumber: null,
    attestedHeight: null,
    merkleRoot: null,
    merkleSiblingCount: null,
    continuityRootCount: null,
    ctcTx: null,
    proofReady: false,
  };
}

export function DemoWorkspace() {
  const { health, error: healthError } = useHealth();
  const consoleRef = useRef<HTMLElement | null>(null);
  const eventRef = useRef<HTMLElement | null>(null);
  const storyRootRef = useRef<HTMLDivElement | null>(null);

  const [txHash, setTxHash] = useState<string>(DEMO_SOURCE_TX);
  const [evidence, setEvidence] = useState<EvidenceFields>(emptyEvidence);
  const [proof, setProof] = useState<ProveResponse | null>(null);
  const [status, setStatus] = useState<EligibilityStatus>('UNKNOWN');
  const [statusSource, setStatusSource] = useState<'chain' | 'unknown' | null>(null);
  const [counterparty, setCounterparty] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [loadingDemo, setLoadingDemo] = useState(false);
  const [proving, setProving] = useState(false);
  const [relaying, setRelaying] = useState(false);
  const [relayed, setRelayed] = useState(false);
  const [relayAttempted, setRelayAttempted] = useState(false);
  const [busyAction, setBusyAction] = useState<CreditActionId | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [wallet, setWallet] = useState<Address | null>(null);
  const [calldata, setCalldata] = useState<CalldataPayload>(null);
  const [calldataOpen, setCalldataOpen] = useState(false);
  const [broadcastPhase, setBroadcastPhase] = useState<BroadcastPhase>('PREPARED');
  const [broadcastError, setBroadcastError] = useState<string | null>(null);
  /** Spine labels follow the experience section in view — not a parallel product SM. */
  const [wireStage, setWireStage] = useState<WireStage>('ethereum');

  useEffect(() => {
    const root = storyRootRef.current;
    if (!root) return;

    const elementRatio = new Map<Element, { stage: WireStage; ratio: number }>();
    const nodes = root.querySelectorAll<HTMLElement>('[data-wire-stage]');

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const stage = entry.target.getAttribute('data-wire-stage') as WireStage | null;
          if (!stage || !WIRE_SECTION_ORDER.includes(stage)) continue;
          elementRatio.set(entry.target, {
            stage,
            ratio: entry.isIntersecting ? entry.intersectionRatio : 0,
          });
        }

        const stageMax = new Map<WireStage, number>();
        for (const { stage, ratio } of elementRatio.values()) {
          stageMax.set(stage, Math.max(stageMax.get(stage) ?? 0, ratio));
        }

        let best: WireStage | null = null;
        let bestRatio = 0;
        for (const stage of WIRE_SECTION_ORDER) {
          const ratio = stageMax.get(stage) ?? 0;
          if (ratio > bestRatio) {
            bestRatio = ratio;
            best = stage;
          }
        }
        if (best && bestRatio > 0) setWireStage(best);
      },
      {
        // Bias toward the section occupying the upper-mid viewport (story read position).
        root: null,
        rootMargin: '-18% 0px -42% 0px',
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
      },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  const sequence = useMemo(
    () => ({
      evidenceLoaded: Boolean(evidence.txHash),
      proofReady: evidence.proofReady,
      calldataPrepared: Boolean(calldata) && !relayed,
      committed: relayed,
      // Only after verify — ambient ledger RESTRICTED from TRACE alone must not skip the story.
      accessResolved:
        evidence.proofReady &&
        status !== 'UNKNOWN' &&
        statusSource === 'chain' &&
        (relayed || Boolean(calldata)),
    }),
    [evidence.txHash, evidence.proofReady, calldata, relayed, status, statusSource],
  );

  const refreshStatus = useCallback(async (address: string) => {
    if (!isAddress(address)) return;
    try {
      const body = await api.status(address);
      setStatus(body.status);
      setStatusSource(body.source);
      setCounterparty(body.address);
      setBanner(null);
    } catch (err) {
      setStatus('UNKNOWN');
      setStatusSource(null);
      setBanner(productErrorMessage(err));
    }
  }, []);

  const scrollTo = useCallback((el: HTMLElement | null) => {
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const loadDemo = useCallback(async () => {
    setLoadingDemo(true);
    setBanner(null);
    setProof(null);
    setRelayed(false);
    setRelayAttempted(false);
    setCalldata(null);
    setCalldataOpen(false);
    setBroadcastPhase('PREPARED');
    setBroadcastError(null);
    setActionResult(null);
    try {
      const demo = await api.evidenceDemo();
      let txIndex: number | null = null;
      let kind: string | null = null;
      try {
        const discovered = await api.discover(demo.account);
        const match = discovered.candidates.find(
          (c) => c.txHash.toLowerCase() === demo.sourceTx.toLowerCase(),
        );
        if (match) {
          txIndex = match.txIndex;
          kind = match.kind;
        }
      } catch {
        /* discover optional enrichment */
      }

      setTxHash(demo.sourceTx);
      setEvidence({
        ...emptyEvidence(),
        txHash: demo.sourceTx,
        account: demo.account,
        block: demo.block,
        txIndex,
        kind,
        usdc: demo.usdc,
        etherscan: demo.etherscan,
        proofReady: false,
      });
      setCounterparty(demo.account);
      await refreshStatus(demo.account);
      window.setTimeout(() => scrollTo(eventRef.current), 80);
    } catch (err) {
      setEvidence(emptyEvidence());
      setBanner(productErrorMessage(err));
    } finally {
      setLoadingDemo(false);
    }
  }, [refreshStatus, scrollTo]);

  const fetchProof = useCallback(async () => {
    if (!isTxHash(txHash)) {
      setBanner('INVALID TX HASH — expect 32-byte hex.');
      return;
    }
    setProving(true);
    setBanner(null);
    try {
      const body = await api.prove(txHash);
      setProof(body);
      setEvidence((prev) => ({
        ...prev,
        txHash,
        chainKey: body.chainKey,
        headerNumber: body.headerNumber,
        txIndex: body.txIndex,
        attestedHeight: body.attestedHeight,
        merkleRoot: body.merkleProof.root,
        merkleSiblingCount: body.merkleProof.siblings.length,
        continuityRootCount: body.continuityProof.roots.length,
        proofReady: true,
        block: prev.block ?? body.headerNumber,
      }));
      setBanner('PROOF BUNDLE READY — HTTP prove succeeded; not yet on Creditcoin.');
    } catch (err) {
      setProof(null);
      setEvidence((prev) => ({
        ...prev,
        proofReady: false,
        merkleSiblingCount: null,
        continuityRootCount: null,
      }));
      setBanner(productErrorMessage(err));
    } finally {
      setProving(false);
    }
  }, [txHash]);

  const relay = useCallback(async () => {
    if (!isTxHash(txHash)) {
      setBanner('INVALID TX HASH — expect 32-byte hex.');
      return;
    }
    setRelaying(true);
    setBanner(null);
    setCalldata(null);
    setCalldataOpen(false);
    setBroadcastPhase('PREPARED');
    setBroadcastError(null);
    try {
      const body = await api.relay(txHash);
      setRelayed(true);
      setRelayAttempted(true);
      setBroadcastPhase('COMMITTED');
      setEvidence((prev) => ({
        ...prev,
        ctcTx: body.ctcTx,
        proofReady: true,
      }));
      if (body.restricted[0]) {
        setCounterparty(body.restricted[0]);
        setStatus('RESTRICTED');
        setStatusSource('chain');
      } else if (counterparty) {
        await refreshStatus(counterparty);
      }
      setBanner('SUBMITTED TO CREDITCOIN — ledger state updated from proof.');
    } catch (err) {
      setRelayAttempted(true);
      if (err instanceof WorkerApiError && err.httpStatus === 404 && err.body.submitProof) {
        setCalldata(err.body.submitProof);
        setCalldataOpen(true);
        setBroadcastPhase('PREPARED');
        setBroadcastError(null);
        setBanner(productErrorMessage(err));
      } else if (
        err instanceof WorkerApiError &&
        err.code === 'RELAY_DISABLED' &&
        err.body.submitProof
      ) {
        setCalldata(err.body.submitProof);
        setCalldataOpen(true);
        setBroadcastPhase('PREPARED');
        setBroadcastError(null);
        setBanner(productErrorMessage(err));
      } else {
        setBanner(productErrorMessage(err));
      }
    } finally {
      setRelaying(false);
    }
  }, [txHash, counterparty, refreshStatus]);

  const broadcastPreparedCalldata = useCallback(async () => {
    if (!calldata?.to || !calldata.data) return;
    setBroadcastError(null);
    setBanner(null);
    setBroadcastPhase('AWAITING_WALLET');
    try {
      const { hash } = await broadcastSubmitProofCalldata({
        to: calldata.to as Address,
        data: calldata.data as Hex,
        onProgress: (step) => {
          if (step === 'AWAITING_WALLET') setBroadcastPhase('AWAITING_WALLET');
          else if (step === 'BROADCASTING') setBroadcastPhase('BROADCASTING');
          else if (step === 'CONFIRMING') setBroadcastPhase('CONFIRMING');
        },
      });
      // Only receipt success reaches here — hash alone is never COMMITTED.
      setBroadcastPhase('COMMITTED');
      setRelayed(true);
      setRelayAttempted(true);
      setCalldata(null);
      setCalldataOpen(false);
      setEvidence((prev) => ({
        ...prev,
        ctcTx: hash,
        proofReady: true,
      }));
      if (counterparty) {
        await refreshStatus(counterparty);
      }
      setBanner('SUBMITTED TO CREDITCOIN — wallet broadcast confirmed.');
    } catch (err) {
      const message = productErrorMessage(err);
      if (err instanceof WalletBroadcastError && err.code === 'WALLET_REJECTED') {
        setBroadcastPhase('WALLET_REJECTED');
      } else {
        setBroadcastPhase('FAILED');
      }
      setBroadcastError(message);
      setBanner(message);
      // Keep dialog open with calldata — prepared ≠ committed.
    }
  }, [calldata, counterparty, refreshStatus]);

  const onCreditAction = useCallback(
    async (id: CreditActionId) => {
      setBusyAction(id);
      setActionResult(null);
      try {
        let account = wallet;
        if (!account) {
          account = await connectWallet();
          if (account) setWallet(account);
        }
        const subject = (account ?? counterparty ?? '0x0000000000000000000000000000000000000001') as Address;
        const result = await attemptCreditAction(id, subject);
        setActionResult(result);
      } catch (err) {
        setActionResult(productErrorMessage(err));
      } finally {
        setBusyAction(null);
      }
    },
    [wallet, counterparty],
  );

  const onConnect = useCallback(async () => {
    const addr = await connectWallet();
    if (!addr) {
      setBanner('NO WALLET — browser wallet not detected.');
      return;
    }
    setWallet(addr);
    setBanner(null);
  }, []);

  const statusBanner = banner ?? healthError;

  return (
    <TooltipProvider>
      <div ref={storyRootRef} className="fw-surface min-h-screen">
        <StorySpine activeStage={wireStage} stagesRootRef={storyRootRef} />

        {/* Single master column: Hero → story → console share L/R via .fw-stage */}
        <div className="fw-main">
          <div data-wire-stage="ethereum">
            <HeroStage
              loadingDemo={loadingDemo}
              onTraceEvent={() => void loadDemo()}
              onEnterConsole={() => scrollTo(consoleRef.current)}
            />
          </div>

          {/* Sticky horizontal wire for scroll story (mobile / mid) */}
          <div className="sticky top-0 z-20 border-b border-fw-line bg-fw-void lg:hidden">
            <div className="fw-stage py-3">
              <EvidenceWire activeStage={wireStage} />
            </div>
          </div>

          <section
            ref={eventRef}
            data-wire-stage="event"
            className="scroll-mt-16"
          >
            <EventStage evidence={evidence} loading={loadingDemo} />
          </section>

          <div data-wire-stage="proof">
            <ProofMoment
              evidence={evidence}
              proving={proving}
              bundleReady={evidence.proofReady}
            />
          </div>

          <div data-wire-stage="creditcoin">
            <CreditcoinStage
              proofReady={evidence.proofReady}
              relayAttempted={relayAttempted}
              relayed={relayed}
              ctcTx={evidence.ctcTx}
              status={status}
              statusSource={statusSource}
              address={counterparty}
            />
          </div>

          <div data-wire-stage="access">
            <AccessConsequence
              status={status}
              statusSource={statusSource}
              busyAction={busyAction}
              lastResult={actionResult}
              onAction={(id) => void onCreditAction(id)}
              deploymentMode={resolveDeploymentMode()}
            />
          </div>

          <div
            data-wire-stage="access"
            ref={(node) => {
              consoleRef.current = node;
            }}
          >
            <ConsoleStage
              health={health}
              connectedLabel={wallet ? `wallet ${wallet.slice(0, 8)}…` : 'wallet disconnected'}
              banner={statusBanner}
            >
              <div className="grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-12">
                <div className="min-w-0 space-y-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <SystemStatus
                      status={status}
                      address={counterparty}
                      source={statusSource}
                    />
                    <div className="flex flex-col items-end gap-1">
                      <Button type="button" variant="ghost" size="sm" onClick={onConnect}>
                        {wallet ? 'WALLET CONNECTED' : 'CONNECT WALLET'}
                      </Button>
                      {counterparty ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void refreshStatus(counterparty)}
                        >
                          REFRESH STATUS
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <EvidenceControls
                    txHash={txHash}
                    onTxHashChange={setTxHash}
                    onLoadDemo={() => void loadDemo()}
                    onProve={() => void fetchProof()}
                    onRelay={() => void relay()}
                    loadingDemo={loadingDemo}
                    proving={proving}
                    relaying={relaying}
                    canProve={isTxHash(txHash)}
                    canRelay={Boolean(proof) || evidence.proofReady}
                    sequence={sequence}
                    onOpenCalldata={
                      calldata && !relayed
                        ? () => setCalldataOpen(true)
                        : undefined
                    }
                  />

                  <EvidenceRecord evidence={evidence} />
                </div>

                <div className="min-w-0 space-y-6 border-t border-fw-line pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
                  <aside className="text-xs leading-relaxed text-fw-fog">
                    <p className="mb-1.5 fw-label text-fw-mist">Operational note</p>
                    <p>
                      This console does not authorize credit. An Ethereum Blacklisted event, proven
                      via Attestcoin and accepted by the Creditcoin ledger, changes access. The
                      worker is a convenience — contracts remain authoritative. NOT YET ATTESTED
                      never means clean.
                    </p>
                  </aside>
                </div>
              </div>
            </ConsoleStage>
          </div>
        </div>
      </div>

      <CalldataDialog
        open={calldataOpen && Boolean(calldata)}
        onOpenChange={(open) => {
          setCalldataOpen(open);
          if (!open && broadcastPhase !== 'COMMITTED') {
            // Closing does not clear prepared calldata; reset only ephemeral UI phase noise.
            if (
              broadcastPhase === 'WALLET_REJECTED' ||
              broadcastPhase === 'FAILED' ||
              broadcastPhase === 'AWAITING_WALLET'
            ) {
              setBroadcastPhase('PREPARED');
            }
          }
        }}
        to={calldata?.to ?? ''}
        data={calldata?.data ?? ''}
        phase={broadcastPhase}
        phaseError={broadcastError}
        onBroadcast={() => void broadcastPreparedCalldata()}
      />
    </TooltipProvider>
  );
}
