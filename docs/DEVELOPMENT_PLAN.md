# Development plan

Phases 0–10. **Phase 0 is this documentation gate.** Do not start application code until the mentor opens implementation.

Deadline: 13 Sep 2026 23:59 ET. Today (Phase 0 complete): 10 Sep 2026. Calendar is tight: prefer vertical slice (contracts + one live proof + thin UI) over polish.

---

## Phase 0 — Documentation + architecture

**Objective:** Source of truth exists; abandoned implementation removed.  
**Tasks:** Clean reset; standalone repo at the FreezeWire repository root; docs listed in README.  
**Dependencies:** None.  
**Deliverables:** This repository tree.  
**Verification:** File list complete; no Solidity product code.  
**Exit:** Mentor review of Gate 5A report.

---

## Phase 1 — Repository + tooling

**Objective:** Foundry + worker + frontend toolchains compile empty/hello without product logic beyond interfaces if needed.  
**Tasks:** `foundry.toml`; `forge-std`; TS package.json; `.env` local; optional `ci.yml` once `forge test` has at least a placeholder that passes.  
**Dependencies:** Phase 0.  
**Deliverables:** Tooling; still no product algorithms if possible — **interfaces + MockUSD mint is acceptable**.  
**Verification:** `forge --version`; `forge build` of empty or interfaces.  
**Exit:** Config loads from `config/networks.example.json`.

CI: fmt, forge test, `tsc --noEmit` when TS exists. Lightweight only.

---

## Phase 2 — Smart-contract foundation

**Objective:** Ledger + credit line compile with **mocked** verifier.  
**Tasks:** Interfaces; MockUSD; GatedCreditLine; EligibilityLedger with injectable verifier; Foundry tests T-FIN-* , T-SC-DEFAULT.  
**Dependencies:** Phase 1.  
**Deliverables:** Passing finance tests without Attestcoin.  
**Verification:** `forge test` green for this subset.  
**Exit:** Selective enforcement works against a `MockLedger`.

---

## Phase 3 — Attestcoin verification

**Objective:** BlacklistVerifier + real decoder; consumer checks; optional live `eth_call`.  
**Tasks:** Vendor EvmV1Decoder; TxIndex; Verifier; wire Ledger.submitProof; T-SEC-*; fetch demo proof; T-INT-LIVE; **gas estimate**.  
**Dependencies:** Phase 2.  
**Deliverables:** Forgery tests pass; live verify documented.  
**Verification:** All T-SEC-* ; if live verify fails, **BLOCKER** logged (Proof Builder or gas).  
**Exit:** INV-1–6 tested.

---

## Phase 4 — Backend

**Objective:** Worker implements API spec.  
**Tasks:** config, clients, discover/prove/relay, health, tests T-API-*.  
**Dependencies:** Phase 3 addresses or ABI.  
**Deliverables:** `GET /v1/prove` on demo tx.  
**Verification:** API tests; no setRestricted.  
**Exit:** FR-022–024.

---

## Phase 5 — Frontend

**Objective:** 150s demo screens.  
**Tasks:** Status, explorer links, deposit/draw/repay, submit/relay button.  
**Dependencies:** Phase 4.  
**Deliverables:** Vite app.  
**Verification:** T-FE-*; walk DEMO spec on localhost.  
**Exit:** DEMO-001 path rehearsable locally with mocks.

---

## Phase 6 — Integration

**Objective:** Local Anvil e2e + testnet dry run without broadcast if no key.  
**Tasks:** Script smoke-cc3; wire addresses; fix ABI mismatches; update docs if reality differs (change control).  
**Dependencies:** 3–5.  
**Verification:** Anvil full path.  
**Exit:** Ready to deploy.

---

## Phase 7 — Security testing

**Objective:** Threat cases explicitly pass; grep for forbidden setters.  
**Tasks:** T-SEC remaining; ad hoc invariant notes; optional `slither` if it installs quickly — skip if time.  
**Dependencies:** Phase 3.  
**Exit:** TEST_STRATEGY security table green.

---

## Phase 8 — Deployment

**Objective:** CC3 testnet contracts + one `submitProof` if key funded.
**Tasks:** Follow `DEPLOYMENT_PLAN.md`. **Do not deploy in Gate 5A.**
**Dependencies (historical):** Mentor funded `DEPLOYER_PRIVATE_KEY` was required to exit.
**Status (2026-09):** **Complete on CC3 testnet** — live addresses + `submitProof` `0x07e3…` + `statusOf(demo)=RESTRICTED` in `deployments/demo-evidence-public.json` / README. Do not redeploy unless emitter/window policy changes require it.
**Verification:** Blockscout addresses; smoke tests.
**Exit:** Ledger Restricted for demo account — **met**.

---

## Phase 9 — Demo

**Objective:** Rehearse 150s; record backup video if possible.  
**Tasks:** Execute `DEMO_SPECIFICATION.md`; Q&A from COMPETITIVE_POSITIONING.  
**Exit:** Timer ≤ 150s; DEMO-005 spoken.

---

## Phase 10 — Submission

**Objective:** project packaging: repo, demo video, addresses, writeup.  
**Tasks:** Public GitHub if mentor wants a dedicated remote (OPEN QUESTION); do not leak keys.  
**Exit:** Submitted before 13 Sep 2026 23:59 ET.

---

## Parallelism

Phase 5 UI mock can start against ABI from Phase 2 while Phase 3 finishes, if staffing allows. Do not merge UI that calls `setRestricted`.

## Risk buffer

Highest risk: **continuity gas / Proof Builder** on the August 2026 tx. Phase 3 must resolve this before UI polish.
