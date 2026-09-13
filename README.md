# ❄️ FreezeWire

<div align="center">

### *Prove the event. Enforce the outcome.*

**Cryptographic Cross-Chain Compliance & Gated Credit for Creditcoin CC3**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.23%2B-363636.svg?style=flat-square&logo=solidity)](foundry.toml)
[![Creditcoin CC3](https://img.shields.io/badge/Creditcoin%20CC3-Testnet%20102031-10B981.svg?style=flat-square)](https://creditcoin.network)
[![Attestcoin](https://img.shields.io/badge/Attestcoin-0x0FD2%20Precompile-6366F1.svg?style=flat-square)](https://docs.attestcoin.org)
[![Foundry Tests](https://img.shields.io/badge/Foundry-93%20Passed%20%7C%201%20Skipped-success.svg?style=flat-square)](contracts/test)
[![Backend Tests](https://img.shields.io/badge/Worker-33%20Passed-success.svg?style=flat-square)](backend/test)
[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%7C%20Vite%20%7C%20Tailwind%204-61DAFB.svg?style=flat-square&logo=react)](frontend/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Typecheck-3178C6.svg?style=flat-square&logo=typescript)](backend/)

<p align="center">
  <a href="#executive-summary">Overview</a> •
  <a href="#the-core-innovation-why-proofs--oracles">Why Proofs > Oracles</a> •
  <a href="#architecture--pipeline">Architecture</a> •
  <a href="#the-5-stage-verification-spine">5-Stage Verification</a> •
  <a href="#verified-security-properties">Security Properties</a> •
  <a href="#smart-contracts-specification">Smart Contracts</a> •
  <a href="#interactive-demo-walkthrough">Interactive Demo</a> •
  <a href="#quickstart--local-verification">Quickstart</a> •
  <a href="#roadmap--deployment-status">Deployment Status</a>
</p>

</div>

---

## 📑 Table of Contents

- [Executive Summary](#executive-summary)
- [The Problem & The Oracle Trap](#the-problem--the-oracle-trap)
- [The Core Innovation: Why Proofs > Oracles](#the-core-innovation-why-proofs--oracles)
- [Architecture & Pipeline](#architecture--pipeline)
- [The 5-Stage Verification Spine](#the-5-stage-verification-spine)
- [Verified Security Properties](#verified-security-properties)
- [Smart Contracts Specification](#smart-contracts-specification)
- [Attestcoin & Creditcoin Integration](#attestcoin--creditcoin-integration)
- [Interactive Demo Walkthrough](#interactive-demo-walkthrough)
- [Repository Structure](#repository-structure)
- [Quickstart & Local Verification](#quickstart--local-verification)
- [Roadmap & Deployment Status](#roadmap--deployment-status)
- [Third-Party Attribution](#third-party-attribution)
- [License](#license)

---

<a id="executive-summary"></a>
## 📖 Executive Summary

**FreezeWire** turns authoritative Circle USDC compliance events (`Blacklisted` and `UnBlacklisted`) on Ethereum mainnet into deterministic, cryptographically proven eligibility states on Creditcoin CC3.

Instead of relying on a centralized off-chain backend, oracle multisig, or trusted indexer to declare who is restricted, FreezeWire verifies native **Attestcoin Merkle inclusion and block header continuity proofs** directly on-chain via the Creditcoin BlockProver precompile (`0x0FD2`).

A 5-stage verification spine in smart contracts validates receipt status, enforces an immutable USDC token emitter, derives transaction indices from the Merkle tree, and applies strict monotonic ordering before restricting a borrower's access to credit lines and escrow facilities.

```
       Ethereum Mainnet                 Attestcoin Network             Creditcoin CC3 (EVM)
┌──────────────────────────────┐    ┌────────────────────────┐    ┌─────────────────────────────┐
│  Circle USDC FiatToken       │    │ Attestcoin Prover      │    │  FreezeWire Smart Gate      │
│  Blacklisted(0xe05F...4A2A)  ├───►│ Merkle + Continuity    ├───►│  0x0FD2 Verification        │
│  Receipt: Status = 0x1       │    │ Proof Bundle           │    │  RESTRICTED Credit Line     │
└──────────────────────────────┘    └────────────────────────┘    └─────────────────────────────┘
```

> **Key Distinction:** FreezeWire is **not** CEL (**Collateral Eligibility Ledger**). CEL freezes an *instrument* (e.g. issuer `Paused`). FreezeWire freezes a *counterparty* after an Attestcoin-proven Circle USDC blacklist, while preserving essential non-extractive rights (repaying debt and withdrawing unencumbered collateral remain unlocked).

---

<a id="the-problem--the-oracle-trap"></a>
## 🎯 Overview & The Problem

Creditcoin smart contracts cannot query foreign Ethereum logs natively. When Circle's FiatToken marks a fraudulent or sanctioned wallet as `Blacklisted` on Ethereum L1, Creditcoin's lending protocols and credit markets remain unaware unless that compliance signal is bridged.

### The Naive Solution (The Oracle Trap)
The typical industry approach deploys a centralized server or keeper bot that monitors Ethereum events and calls an administrative function on Creditcoin:

```solidity
// ❌ THE DANGEROUS ORACLE PATTERN
function setRestricted(address borrower, bool isRestricted) external onlyOwner;
```

This makes the operator a **single point of failure**:
- **Compromise:** If the server or admin private key is compromised, an attacker can arbitrarily blacklist honest competitors or unfreeze malicious borrowers.
- **Censorship / Downtime:** If the oracle server crashes or lags, Creditcoin credit markets continue lending to compromised addresses.
- **Trust Burden:** Liquidity providers must blindly trust the server's off-chain narrative rather than cryptographic truth.

### The FreezeWire Solution
FreezeWire eliminates oracle privilege entirely. There is **no `setStatus` function** anywhere in the protocol. The off-chain worker is strictly an untrusted transport and gas relayer. Anyone can submit a proof, but Creditcoin smart contracts will only alter an address's eligibility if the mathematical proof passes validation against Creditcoin's native precompile `0x0FD2`.

---

<a id="the-core-innovation-why-proofs--oracles"></a>
## ⚡ The Core Innovation: Why Proofs > Oracles

| Dimension | Traditional Oracle / Keeper Pattern | FreezeWire Attestcoin Gate |
|:---|:---|:---|
| **Trust Anchor** | Centralized server, multisig, or webhook | Ethereum state roots + Creditcoin Attestor consensus |
| **Verification Location** | Off-chain server code (private, opaquely executed) | On-chain EVM precompile (`0x0FD2`) + `BlacklistVerifier` |
| **State Mutation Privileges** | Privileged `onlyAdmin` / `onlyRelayer` setter | **100% Permissionless** `submitProof(calldata)` |
| **Adversarial Backend Impact** | Can forge, censor, or maliciously redirect freezes | **Zero impact** — invalid proofs revert on-chain |
| **Replay & Ordering Defense** | Prone to race conditions and outdated replay packets | Strictly enforced `(chainKey, height, txIndex)` unique replay keys |
| **Solvency & Collateral Rights** | Indiscriminate total account lock (funds trapped) | Selective gating: draw/escrow locked; **repay/withdraw open** |
| **Issuer Immutability** | Token address configurable via mutable admin storage | `expectedEmitter` is hardcoded as **constructor-immutable** |

---

<a id="architecture--pipeline"></a>
## 🏗️ Architecture & Pipeline

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                 ETHEREUM MAINNET (L1)                                  │
│  Circle FiatToken (0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48)                         │
│  Emits Blacklisted(address indexed _account) or UnBlacklisted(...)                     │
│  Receipt: status = 0x1 (Success) · Block = 25,705,174 · txIndex = 18                   │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Pinned Canonical Event
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                               ATTESTCOIN PROOF BUILDER                                 │
│  Hosted service on Creditcoin CC3 Testnet (chainKey = 3 for Ethereum Mainnet)          │
│  Produces: Merkle inclusion proof + historical block header continuity digest          │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Cryptographic Proof Payload
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        UNTRUSTED WORKER & DISCOVERY LAYER                              │
│  TypeScript / Viem service (Stateless, no database, no private compliance oracle)       │
│  Endpoints: /v1/health · /v1/evidence/demo · /v1/prove/{tx} · /v1/relay                 │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ Permissionless submitProof(...)
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                             CREDITCOIN CC3 (CHAIN 102031)                              │
│                                                                                        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 1. BlockProver Precompile (0x0000000000000000000000000000000000000FD2)           │  │
│  │    Natively verifies Merkle Patricia inclusion against attestor block commitments│  │
│  └──────────────────────────────────────────┬───────────────────────────────────────┘  │
│                                             │ verifyAndEmit(chainKey, height, ...) == true
│                                             ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 2. FreezeWire BlacklistVerifier                                                  │  │
│  │    • Status Check: Receipt status must equal 1 (reverts SourceTxFailed)          │  │
│  │    • ChainKey Gate: Must match configured chainKey (rejects Sepolia chainKey 1)  │  │
│  │    • Emitter Gate: Log emitter must match immutable Circle USDC address          │  │
│  │    • Event Gate: Topic[0] must match Blacklisted or UnBlacklisted                │  │
│  │    • Account Binding: Topic[1] extracts true targeted counterparty               │  │
│  │    • TxIndex Derivation: Computed deterministically from Merkle path bits        │  │
│  └──────────────────────────────────────────┬───────────────────────────────────────┘  │
│                                             │ Decoded & Bound Event Structs            │
│                                             ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 3. EligibilityLedger                                                             │  │
│  │    • Replay Defense: (chainKey, height, txIndex) consumed atomically             │  │
│  │    • Chronological Ordering: Reject older observations for an account            │  │
│  │    • State Mutation: statusOf[account] = RESTRICTED / ELIGIBLE                   │  │
│  └──────────────────────────────────────────┬───────────────────────────────────────┘  │
│                                             │ statusOf(account) query                  │
│                                             ▼                                          │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 4. GatedCreditLine (Financial Enforcement)                                       │  │
│  │    • RESTRICTED Borrowers:                                                       │  │
│  │        ❌ draw(...)                     ──► REVERTS with Restricted()            │  │
│  │        ❌ protectedTransfer(...)        ──► REVERTS with Restricted()            │  │
│  │        ❌ lockEscrow() / releaseEscrow()──► REVERTS with Restricted()            │  │
│  │    • Solvency & Exit Preservation:                                               │  │
│  │        ✅ repay(...)                    ──► ALLOWED (deleveraging permitted)     │  │
│  │        ✅ withdraw(...)                 ──► ALLOWED (unencumbered / unused only) │  │
│  │        ✅ deposit(...)                  ──► ALLOWED                              │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

<a id="the-5-stage-verification-spine"></a>
## 🛡️ The 5-Stage Verification Spine

Every proof submitted to FreezeWire must pass five distinct, independent layers of validation before modifying ledger state:

```text
  [1. INCLUSION] ──► [2. STATUS] ──► [3. EMITTER] ──► [4. EVENT] ──► [5. ACCOUNT]
     (0x0FD2)          (Status=1)      (USDC Immut)     (Topic0)         (Topic1)
```

1. **Stage 1: Inclusion (`0x0FD2`)**  
   The proof bundle (encoded transaction, Merkle proof siblings, and continuity certificate) is passed to Creditcoin's native BlockProver precompile at `0x0000000000000000000000000000000000000FD2`. Verification fails if the Ethereum header was not attested or if the Merkle inclusion path does not evaluate to the attested root.

2. **Stage 2: Receipt Status Verification (`EvmV1Decoder`)**  
   Precompiles only verify that a transaction occurred; they do not verify transaction outcome. FreezeWire decodes the typed receipt status and mandates `status == 1`. If a transaction attempted to call `blacklist(...)` but reverted on Ethereum (e.g., unauthorized caller), FreezeWire reverts with `SourceTxFailed`.

3. **Stage 3: Immutable Emitter Binding**  
   An attacker could create a spoof token on Ethereum that emits a counterfeit `Blacklisted(address)` log. FreezeWire validates that the log emitter strictly equals the immutable `expectedEmitter` set at contract deployment (`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`). Even the contract owner cannot modify this address.

4. **Stage 4: Canonical Event Matching**  
   The log must match either `keccak256("Blacklisted(address)")` (`0xffa4e6181777692565cf28528fc88fd1516ea86b56da075235fa575af6a4b855`) or `keccak256("UnBlacklisted(address)")` (`0x117e3210bb9aa7d9baff172026820255c6f6c30ba8999d1c2fd88e2848137c4e`) — same constants as `EventSelectors.sol` / `cast keccak`. Other logs within the same receipt (such as `Transfer`, `Approval`, or `Pause`) are safely discarded without failing the transaction.

5. **Stage 5: Indexed Account Extraction**  
   The target address is parsed directly from `topic[1]` of the verified log. An off-chain submitter cannot redirect a blacklist event targeting Address A to penalize Address B.

---

<a id="verified-security-properties"></a>
## 🔒 Verified Security Properties

FreezeWire implements rigorous defense-in-depth validated by comprehensive adversarial test suites:

- **Constructor-Immutable Token Identity:** The official Circle USDC address on Ethereum cannot be rotated by an owner or compromised deployer key, ruling out rogue token injection (`T-SEC-OWNER`).
- **Cryptographic Merkle `txIndex` Recovery:** The transaction index is derived mathematically from the `isLeft` boolean sequence of the Merkle proof siblings using `TxIndex.sol`, preventing malicious callers from supplying forged transaction indices (`T-SEC-TXINDEX`).
- **Replay Protection via Unique Observation Keys:** Each verified receipt burns an on-chain key derived from `keccak256(chainKey, height, txIndex)`. The same proof cannot be submitted twice to reset or re-trigger states (`T-SEC-REPLAY`).
- **Strict Chronological Ordering:** An account's state is guarded by its latest recorded position `(height, txIndex, logIndex)`. An attacker relaying an older `Blacklisted` proof cannot overwrite a newer verified `UnBlacklisted` proof (`T-SC-RESTORE`).
- **Selective Financial Gating:** Borrowers placed in `RESTRICTED` status cannot draw fresh capital, transfer credit, or lock new escrow. However, to prevent trapping funds and risking protocol bad debt, restricted borrowers can always **repay outstanding balances** and **withdraw unencumbered collateral** (`T-FIN-REPAY`, `T-FIN-WITHDRAW`).
- **Permissionless Execution:** Anyone can broadcast calldata to `submitProof`. Relayers earn no privileged status and cannot manipulate eligibility logic (`T-SEC-PERM`).

---

<a id="smart-contracts-specification"></a>
## 📜 Smart Contracts Specification

All contracts are written in Solidity `0.8.23`, compiled via Foundry with optimizer enabled (200 runs), and adhere strictly to custom errors and minimal interface segregation.

| Contract / Library | Purpose & Responsibility | Key External Functions |
|:---|:---|:---|
| **`BlacklistVerifier.sol`** | Core verification engine. Invokes BlockProver `0x0FD2`, decodes EVM receipts, verifies status, and filters logs against the immutable USDC emitter. | `verifyAndBind(...)`, `setWindow(...)`, `setExpectedChainKey(...)` |
| **`EligibilityLedger.sol`** | Authoritative compliance ledger. Records consumed replay keys (`processed` mapping), validates monotonic event ordering, and maintains address eligibility mapping. | `submitProof(...)`, `statusOf(address)`, `processed(bytes32)` |
| **`GatedCreditLine.sol`** | Gated DeFi credit line & escrow. Reads `EligibilityLedger.statusOf` on each call to enforce credit constraints. | `deposit(...)`, `draw(...)`, `repay(...)`, `withdraw(...)`, `protectedTransfer(...)`, `lockEscrow(...)`, `releaseEscrow(...)`, `refundEscrow(...)` |
| **`MockUSD.sol`** | Demo ERC-20 token representing credit line liquidity on Creditcoin CC3. | `mint(...)`, `burn(...)`, `transfer(...)` |
| **`EvmV1Decoder.sol`** | High-performance memory decoder for Gluwa Attestcoin EVM V1 receipts and log entries. | `decodeReceipt(...)`, `parseTopicAddress(...)` |
| **`TxIndex.sol`** | Reconstructs transaction index from Merkle path bits (`isLeft`). | `recoverTxIndex(...)` |

### Key System Addresses & Target Network

```text
Creditcoin CC3 Testnet
├── Chain ID:              102031
├── RPC URL:               https://rpc.cc3-testnet.creditcoin.network
├── Blockscout Explorer:   https://creditcoin-testnet.blockscout.com
├── BlockProver (Native):  0x0000000000000000000000000000000000000FD2
└── ChainInfo (Native):    0x0000000000000000000000000000000000000FD3

Ethereum Mainnet (Source Chain)
├── Chain Key on CC3:      3
├── Canonical Circle USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
└── Canonical Demo Tx:     0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787
```

---

<a id="attestcoin--creditcoin-integration"></a>
## 🔗 Attestcoin & Creditcoin Integration

Attestcoin is Creditcoin’s native cross-chain verification layer. It allows Creditcoin EVM contracts to inspect Ethereum transactions with cryptographic certainty.

### 1. Chain Keys
Creditcoin differentiates source networks by an internal `uint64 chainKey`:
- **CC3 Testnet:** Ethereum Sepolia = `1`, **Ethereum Mainnet = `3`**
- **CC3 Mainnet:** Ethereum Mainnet = `1`

FreezeWire is configured for CC3 Testnet and mandates `chainKey == 3`. Passing a Sepolia proof (chainKey 1) to `BlacklistVerifier` triggers an immediate revert with `WrongChainKey`.

### 2. Proof Generation API
The untrusted backend interfaces with Creditcoin's hosted Proof Generator API:
```http
GET https://proof-gen-api.cc3-testnet.creditcoin.network/api/v1/proof-by-tx/3/0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787
```

The returned payload conforms to the OpenAPI specification:
- `merkle_proof`: Merkle root + array of sibling hashes with directional boolean flags (`is_left`).
- `continuity_proof`: Lower endpoint digest + intermediate block commitment roots attesting chronological chain state.
- `encoded_transaction`: Raw RLP-encoded Ethereum transaction bytes containing the receipt and event logs.

### 3. Precompile Execution (`0x0FD2`)
The verification engine calls the native BlockProver precompile:
```solidity
INativeQueryVerifier(0x0000000000000000000000000000000000000FD2).verifyAndEmit(
    chainKey,
    height,
    encodedTransaction,
    merkleProof,
    continuityProof
);
```

---

<a id="interactive-demo-walkthrough"></a>
## 🎬 Interactive Demo Walkthrough

A complete end-to-end judge demonstration executing the 5-stage verification sequence:

### Pinned Real-World Proof Evidence
- **Transaction Hash:** [`0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787`](https://etherscan.io/tx/0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787)
- **Ethereum Block Height:** `25,705,174` (Mined August 7, 2026)
- **Targeted Account:** `0xe05F529f5284D75624eBa386CB716928c3b54A2A`
- **Method Called:** `blacklist(address)` → Emitted `Blacklisted(0xe05F...4A2A)`

### Two-Account Demo Reality

The featured Circle-blacklisted account (`0xe05F…`) is **already `RESTRICTED`** on the live ledger after a prior permissionless `submitProof`. Do **not** claim a live ELIGIBLE→RESTRICTED transition on that address during presentation.

| Role | Address | What you show |
|:---|:---|:---|
| **A — Eligible actor** | `0x6b07454d70896cad371982A57037933e24F4cD52` | Deposit / draw / repay / withdraw succeed (default ELIGIBLE ≠ proven clean) |
| **B — Restricted counterparty** | `0xe05F529f5284D75624eBa386CB716928c3b54A2A` | Explorer + draw revert / repay still allowed |

```text
[Step 1: Baseline]       Eligible actor 0x6b0745… deposits & draws MockUSD (succeeds).
                               │
[Step 2: Source Inspect] Etherscan: real USDC blacklist tx targeting 0xe05F….
                               │
[Step 3: Fetch Proof]    Worker / UI fetches Attestcoin Merkle + Continuity bundle.
                               │
[Step 4: Verify & Relay] Prior or live submitProof on CC3 → ledger Restricted for 0xe05F….
                               │
[Step 5: Gated Credit]   As 0xe05F…: draw reverts Restricted(); repay / unused withdraw OK.
```

**Closer:** *The backend never told Creditcoin the address was blacklisted. The Attestcoin proof did.*

Full timing script: [`docs/DEMO_SPECIFICATION.md`](docs/DEMO_SPECIFICATION.md).

---

<a id="repository-structure"></a>
## 📂 Repository Structure

```text
freeze-wire/
├── contracts/                     # Foundry smart contract workspace
│   ├── src/                       # Solidity production sources
│   │   ├── BlacklistVerifier.sol  # 0x0FD2 precompile wrapper & consumer checks
│   │   ├── EligibilityLedger.sol  # Canonical eligibility ledger & replay store
│   │   ├── GatedCreditLine.sol    # Compliance-gated lending & escrow facility
│   │   ├── MockUSD.sol            # Demo ERC-20 collateral/liquidity asset
│   │   ├── interfaces/            # Minimal clean interfaces
│   │   └── libraries/             # EvmV1Decoder, TxIndex, EventSelectors
│   ├── test/                      # 10 test suites (93 passed unit & fuzz tests)
│   │   ├── AdversarialReceipts.t.sol
│   │   ├── SecurityBoundaries.t.sol
│   │   ├── EligibilityLedger.t.sol
│   │   └── GatedCreditLine.t.sol
│   └── script/                    # Deployment scripts (DeployCC3Testnet.s.sol)
│
├── backend/                       # Stateless proof discovery & relay worker
│   ├── src/
│   │   ├── server.ts              # HTTP API server (/v1/health, /v1/prove, /v1/relay)
│   │   ├── attestcoin/            # Proof Builder HTTP client & index recovery
│   │   ├── relay/                 # CC3 broadcast helper & calldata preparation
│   │   └── discover/              # Ethereum event poller & scanner
│   └── test/                      # 33 automated backend tests
│
├── frontend/                      # Interactive React 19 + Three.js demo application
│   ├── src/
│   │   ├── components/            # Verification spine, evidence cards, 3D viewport
│   │   ├── hooks/                 # Contract queries & worker RPC hooks
│   │   └── App.tsx                # Main demo dashboard
│   └── public/models/             # 3D assets (Bitcoin visual model)
│
├── config/                        # Network definitions & environment templates
├── deployments/                   # Deployment registries (cc3-testnet.example.json)
├── docs/                          # Comprehensive architectural specifications
│   ├── SYSTEM_ARCHITECTURE.md     # Full component boundary map
│   ├── SMART_CONTRACT_SPECIFICATION.md
│   ├── SECURITY_MODEL.md          # Formal invariants & threat models
│   ├── ATTESTCOIN_INTEGRATION.md  # Low-level protocol details
│   └── DEMO_SPECIFICATION.md      # 150-second presentation script
└── foundry.toml                   # Foundry profile configuration
```

---

<a id="quickstart--local-verification"></a>
## 🚀 Quickstart & Local Verification

### Prerequisites
- **Node.js** ≥ 20.x
- **Foundry** (`forge`, `cast`, `anvil`)
- **Git**

```bash
# 1. Clone the repository
git clone https://github.com/CodewithJha/freeze-wire.git
cd freeze-wire

# 2. Configure environment
cp .env.example .env
cp frontend/.env.example frontend/.env.local
# Vite also loads frontend/.env; sync-deployment-env.mjs writes .env.local
```

### 1. Smart Contracts Verification (Foundry)
Execute the complete test suite across all 10 contract modules:

```bash
# Format check, build, and test
forge fmt --check
forge build
forge test
```

> **Result:** `93 passed, 0 failed, 1 skipped (94 total tests)`. (The single skip is the optional live test requiring a live Attestcoin API connection).

### 2. Backend Worker Verification
Run the backend test suite and start the local proof relay server:

```bash
cd backend
npm ci
npm test       # Runs 38 unit & integration tests
npm run build
npm start      # Starts HTTP server at http://127.0.0.1:8000
```

*Optional:* To run tests directly against the live Creditcoin Proof Builder:
```bash
LIVE_ATTESTCOIN=1 npm test
```

### 3. Frontend Interactive Workspace
Launch the React 19 demo application:

```bash
cd frontend
npm ci
npm run dev    # Starts Vite dev server at http://localhost:5173
```

To verify the production build:
```bash
npm run build
```

---

<a id="roadmap--deployment-status"></a>
## 🗺️ Roadmap & Deployment Status

### Live Creditcoin CC3 Testnet (demo deploy)

Public addresses and txs below are verified against local registries `deployments/cc3-testnet.json` and `deployments/demo-evidence-public.json` (public fields only; live JSON is typically gitignored).

| Field | Value |
|:---|:---|
| **Network** | Creditcoin CC3 Testnet |
| **chainId** | `102031` |
| **Attestcoin chainKey** (Ethereum mainnet) | `3` |
| **Deploy block** | `5479278` |
| **Proof window** | `minHeight=0`, `maxHeight=0` (unbounded — demo default; disclose, not production hardening) |
| **BlockProver** | `0x0000000000000000000000000000000000000FD2` |
| **Circle USDC (source fact, Ethereum)** | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` |
| **MockUSD** (test collateral / liquidity on CC3 — **not** Circle USDC) | `0x6943EB32EAb562791f095E91ee288627ADDdC5B3` |
| **BlacklistVerifier** | `0x6bf238291Bb8262918A1989831856DC6BC47D869` |
| **EligibilityLedger** | `0xde64d5037cA820D4aDFa703C4FaF5451be840C9d` |
| **GatedCreditLine** | `0xB04fFca20e0a992474E6AD501A061973dC9Ed340` |
| **Demo ETH source tx** | [`0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787`](https://etherscan.io/tx/0xc9edfdbb67b48f26822d8769f63cb890599d98dec539f7f76b92edcc8a2ff787) |
| **Restricted demo account** | `0xe05F529f5284D75624eBa386CB716928c3b54A2A` |
| **Eligible demo actor** | `0x6b07454d70896cad371982A57037933e24F4cD52` |
| **submitProof tx** | [`0x07e30451fb38776aa972603e94aeb8f779f182a5047a371195df2d598a4dfc45`](https://creditcoin-testnet.blockscout.com/tx/0x07e30451fb38776aa972603e94aeb8f779f182a5047a371195df2d598a4dfc45) |
| **statusOf(restricted)** | `RESTRICTED` (evidence artifact) |

**Disclosures (honesty):**

- This is a **CC3 testnet demo** deployment — **no production-security or mainnet credit-bureau claims**.
- **MockUSD** is demo ERC-20 collateral/liquidity on CC3. Circle USDC on Ethereum is the **source compliance fact** only; FreezeWire does not claim Circle reserves or issued USDC on Creditcoin.
- Proof height window is **`(0, 0)` = unbounded** in this deploy; fine for the pinned demo tx, not a production freshness policy.
- Featured blacklist account may already be `RESTRICTED` from a prior permissionless submit — use the **two-account** demo script.

| Subsystem | Scope / Capability | Current Status |
|:---|:---|:---:|
| **Foundry Smart Contracts** | `BlacklistVerifier`, `EligibilityLedger`, `GatedCreditLine`, `MockUSD` | **Verified** (93 passed, 1 skipped) |
| **Receipt Decoder Library** | `EvmV1Decoder` & `TxIndex` Merkle path recovery | **Verified** |
| **Backend Proof Client** | Attestcoin Proof Builder integration | **Verified** (38 passed) |
| **Interactive Demo Workspace** | React 19, Tailwind CSS 4, Three.js | **Built** |
| **CC3 Testnet Deployment** | Live addresses + `submitProof` evidence above | **Live on chain 102031** |
| **CC3 Mainnet Deployment** | Production mainnet | *Out of scope for this demo* |

---

<a id="third-party-attribution"></a>
## 🎨 Third-Party Attribution

- **3D Asset:** Bitcoin 3D Model (`frontend/public/models/bitcoin.glb`) created by **Taohid Animation**, licensed under [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/). See [`frontend/public/models/README.md`](frontend/public/models/README.md) for full attribution. Remapped materials and dynamic lighting are authored in FreezeWire.
- **Protocol Dependencies:** Creditcoin CC3 & Attestcoin BlockProver precompile specifications provided by [Gluwa](https://gluwa.com).
- **Compliance Source:** Circle Internet Financial, LLC (USDC FiatToken compliance event signatures).

---

<a id="license"></a>
## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for full terms and conditions.

<div align="center">
  <sub>Built for the Creditcoin ecosystem. Designed and maintained with precision.</sub>
</div>
