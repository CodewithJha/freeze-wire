# Source of truth

After the documentation baseline, these documents — not chat history, not prior `freezewire/` code — are the implementation contract.

| Layer | Document | Question it answers |
|---|---|---|
| Product | `PRD.md` | What and why |
| Requirements | `REQUIREMENTS.md` | What must be true |
| Architecture | `SYSTEM_ARCHITECTURE.md` | How systems interact |
| Design | `TECHNICAL_SPECIFICATION.md`, `SMART_CONTRACT_SPECIFICATION.md`, `ATTESTCOIN_INTEGRATION.md`, `API_SPECIFICATION.md`, `DATA_MODEL.md` | How components work |
| Security | `SECURITY_MODEL.md`, `THREAT_MODEL.md` | What must never go wrong |
| Proof | `TEST_STRATEGY.md`, `DEMO_SPECIFICATION.md` | How we prove it |
| Execution | `DEVELOPMENT_PLAN.md`, `DEPLOYMENT_PLAN.md` | How we ship |
| Epistemology | `ASSUMPTIONS_AND_CONSTRAINTS.md`, `RESEARCH_BASELINE.md` | What is fact vs guess |
| Decisions | `DECISION_LOG.md`, `adr/` | Why we chose this |

## Change control

If implementation reality forces a change:

```text
Code change
    ↓
Update the relevant specification
    ↓
Record the decision (DECISION_LOG + ADR if architectural)
    ↓
Update tests / demo script
```

Do not silently diverge from documentation.

## Requirement traceability

Every major implementation unit maps:

```text
Requirement → Design section → Implementation module → Test ID → Demo evidence
```

IDs live in `REQUIREMENTS.md` (`FR-###`, `NFR-###`, `SEC-###`, `INT-###`, `DEMO-###`).

## Priority when documents conflict

1. `SECURITY_MODEL.md` / `THREAT_MODEL.md` (never weaken an invariant to make a demo easier)
2. `REQUIREMENTS.md`
3. `PRD.md` (intent)
4. Architecture / technical specs
5. Development plan (schedule yields to correctness)

If you find a conflict, fix the docs before writing code. The documentation baseline already ran a consistency audit; later phases must re-run it.
