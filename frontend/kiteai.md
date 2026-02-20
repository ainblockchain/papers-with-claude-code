# Kite AI Bounty — Development Requirements Specification

> **Project:** Papers LMS x Kite AI Integration
> **Bounty:** "Build an agent-native application on Kite AI using x402 payments and verifiable agent identity"
> **Prize:** $10,000 (1st place $5,000 / 2nd place $1,500x2 / 3rd place $1,000x2)
> **Date Written:** 2026-02-19
> **Document Version:** 1.0

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Bounty Requirements Analysis](#2-bounty-requirements-analysis)
3. [Existing Codebase Status](#3-existing-codebase-status)
4. [Kite AI Chain Technical Specifications](#4-kite-ai-chain-technical-specifications)
5. [x402 Payment Protocol Specification](#5-x402-payment-protocol-specification)
6. [Agent Identity System](#6-agent-identity-system)
7. [Account Abstraction (ERC-4337)](#7-account-abstraction-erc-4337)
8. [System Architecture](#8-system-architecture)
9. [Phase 1: Smart Contract Development](#9-phase-1-smart-contract-development)
10. [Phase 2: Agent Wallet & Identity](#10-phase-2-agent-wallet--identity)
11. [Phase 3: x402 API Routes](#11-phase-3-x402-api-routes)
12. [Phase 4: Adapter Replacement (Mock to Real)](#12-phase-4-adapter-replacement-mock-to-real)
13. [Phase 5: Agent Dashboard](#13-phase-5-agent-dashboard)
14. [Phase 6: Claude Terminal Autonomous Payment](#14-phase-6-claude-terminal-autonomous-payment)
15. [Phase 7: Deployment & Demo](#15-phase-7-deployment--demo)
16. [Environment Variables & Configuration](#16-environment-variables--configuration)
17. [Evaluation Criteria Response Strategy](#17-evaluation-criteria-response-strategy)
18. [Schedule & Milestones](#18-schedule--milestones)
19. [References](#19-references)

---

## 1. Project Overview

### 1.1 Concept: "AI Tutor Agent with Economic Autonomy"

Papers LMS is a gamified learning platform based on academic papers. Learners explore a village, enter courses for each paper, and progress through learning by clearing stages. Unlocking each stage requires a micropayment.

**Key Differentiator:** The Claude AI tutor agent **autonomously** pays the stage unlock fees on behalf of the learner and **records learning progress on-chain**. No manual wallet interaction is required from the user; it operates via delegated authority based on Session Keys.

### 1.2 Core Flow

```
Learner passes quiz -> Claude agent triggers payment ->
HTTP 402 Payment Required -> Agent x402 signature ->
Kite Chain on-chain payment -> Stage unlocked ->
Progress recorded in LearningLedger contract -> Verifiable on KiteScan
```

### 1.3 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16.1.6, TypeScript, Tailwind CSS v4, Zustand 5 |
| Rendering | HTML5 Canvas 2D (tile-based) |
| UI Components | shadcn/ui, Radix UI, Lucide Icons |
| Code Editor | Monaco Editor |
| Blockchain | Kite AI Testnet (Chain ID: 2368), Solidity, Hardhat |
| Payment | x402 Protocol (Coinbase SDK) |
| Identity | BIP-32 DID, KitePass, ERC-4337 AA Wallet |
| AI | Claude API (existing claude-terminal adapter) |

---

## 2. Bounty Requirements Analysis

### 2.1 Must-Have Requirements

| # | Requirement | Implementation |
|---|-------------|----------------|
| R1 | Build on Kite AI Testnet/Mainnet | Deploy LearningLedger.sol to Chain ID 2368 |
| R2 | Use x402 payment flow | API route gating with `@x402/express` middleware |
| R3 | Verifiable agent identity | BIP-32 DID + KitePass + Standing Intent |
| R4 | Autonomous execution (no manual wallet clicks) | Automatic payment with Session Key + AA Wallet |
| R5 | Open-source core components (MIT/Apache) | Publish on GitHub with MIT license |

### 2.2 Success Criteria

| # | Criterion | Implementation |
|---|-----------|----------------|
| S1 | AI agent self-authenticates | DID-based agent identity + KitePass |
| S2 | Execute paid actions | Stage unlock = on-chain micropayment |
| S3 | On-chain settlement/proof | Enrollment + stage completion recorded in LearningLedger |
| S4 | Production live demo | Vercel deployment, public URL |

### 2.3 Bonus Points

| # | Item | Implementation |
|---|------|----------------|
| B1 | Multi-agent cooperation | Separate Claude tutor + quiz verification agent |
| B2 | Gasless transactions | Gas fee sponsoring via AA SDK Paymaster |
| B3 | Scope-based access control | Standing Intent (daily limits, whitelisted contracts) |

### 2.4 Evaluation Criteria (Weights)

1. **Agent Autonomy** — Minimize human involvement
2. **Correct x402 Usage** — Clear mapping between payments and actions, graceful failure handling on insufficient balance
3. **Security & Safety** — Key management, scopes, limits
4. **Developer Experience** — Documentation, usability, adapter pattern
5. **Real-world Applicability** — An educational platform as a real-world use case

---

## 3. Existing Codebase Status

### 3.1 Directory Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Home / Explore
│   │   ├── village/page.tsx    # Village map
│   │   ├── learn/[paperId]/page.tsx  # Course learning
│   │   └── api/                # API Routes (to be added)
│   ├── components/
│   │   ├── village/
│   │   │   ├── VillageCanvas.tsx    # Village tilemap rendering
│   │   │   └── VillageSidebar.tsx   # Friends list, leaderboard
│   │   ├── learn/
│   │   │   ├── CourseCanvas.tsx      # Course tilemap rendering
│   │   │   ├── PaymentModal.tsx      # x402 payment modal
│   │   │   ├── QuizPanel.tsx         # Quiz panel
│   │   │   └── ClaudeTerminal.tsx    # AI terminal
│   │   └── ui/                 # shadcn/ui components
│   ├── lib/
│   │   └── adapters/           # Adapter pattern (Mock implementation)
│   │       ├── x402.ts         # Payment adapter (replacement target)
│   │       ├── papers.ts       # Paper data
│   │       ├── progress.ts     # Learning progress
│   │       ├── claude-terminal.ts  # Claude AI chat
│   │       ├── friends.ts      # Friend presence
│   │       └── gemini-map.ts   # Map generation
│   ├── stores/                 # Zustand state management
│   │   ├── useLearningStore.ts # Includes payment/lock state
│   │   ├── useVillageStore.ts
│   │   ├── useExploreStore.ts
│   │   ├── useAuthStore.ts
│   │   ├── useSocialStore.ts
│   │   └── useUIStore.ts
│   ├── types/
│   │   ├── paper.ts
│   │   ├── learning.ts
│   │   └── social.ts
│   └── constants/
│       └── game.ts
├── next.config.mjs
├── postcss.config.mjs
├── package.json
└── tsconfig.json
```

### 3.2 Current Adapter Pattern

All external dependencies are abstracted through the adapter pattern. Mock and real implementations can be switched via environment variables.

**Current x402 Adapter (`src/lib/adapters/x402.ts`):**

```typescript
export interface PaymentResult {
  success: boolean;
  receiptId?: string;
  error?: string;
}

export interface X402PaymentAdapter {
  requestPayment(params: {
    stageId: string;
    paperId: string;
    amount: number;
    currency: string;
  }): Promise<PaymentResult>;
  verifyPayment(receiptId: string): Promise<boolean>;
}

// Current: Mock that auto-approves after a 1-second delay
class MockX402Adapter implements X402PaymentAdapter { ... }
export const x402Adapter: X402PaymentAdapter = new MockX402Adapter();
```

**Replacement Goal:** `MockX402Adapter` -> `KiteX402Adapter` (real Kite Chain on-chain payment)

### 3.3 Current Payment Modal (`src/components/learn/PaymentModal.tsx`)

- 0.001 ETH hardcoded -> needs to be changed to **0.001 KITE**
- Calls `x402Adapter.requestPayment()` -> sets `setDoorUnlocked(true)` on payment success
- Needs to add wallet address, transaction hash, and KiteScan link display

### 3.4 Current Learning Store (`src/stores/useLearningStore.ts`)

Payment-related state:
- `isPaymentModalOpen: boolean` — Whether the payment modal is shown
- `isDoorUnlocked: boolean` — Whether the stage is unlocked
- `setPaymentModalOpen(open: boolean)` — Modal toggle
- `setDoorUnlocked(unlocked: boolean)` — Unlock toggle

**Additional state needed:** `txHash`, `walletAddress`, `agentDID`, payment history

---

## 4. Kite AI Chain Technical Specifications

### 4.1 Chain Information

| Parameter | Testnet | Mainnet |
|-----------|---------|---------|
| Chain Name | KiteAI Testnet | KiteAI Mainnet |
| Chain ID | **2368** | **2366** |
| Native Token | KITE | KITE |
| RPC Endpoint | `https://rpc-testnet.gokite.ai/` | `https://rpc.gokite.ai/` |
| Block Explorer | `https://testnet.kitescan.ai/` | `https://kitescan.ai/` |
| ChainList | `https://chainlist.org/chain/2368` | `https://chainlist.org/chain/2366` |
| Faucet | `https://faucet.gokite.ai` | N/A |

### 4.2 Characteristics

- **Based on:** Avalanche Subnet (AvalancheGo)
- **Consensus:** Proof of Attributed Intelligence (PoAI)
- **Block Gas Limit:** 400,000,000
- **Transaction fees:** Sub-cent (under $0.01)
- **Finality:** Instant (sub-second confirmation)
- **Micropayment channels:** Sub-100ms latency
- **State Channel:** ~$0.01/channel pair, ~$0.000001/transaction (at scale)
- **Native Stablecoin support:** USDC, pyUSD

### 4.3 Development Tools

| Tool | Purpose |
|------|---------|
| Hardhat | Smart contract development, testing, deployment |
| MetaMask | Testnet wallet connection (for manual testing) |
| KiteScan | Block explorer, transaction verification |
| Kite Faucet | Receive testnet KITE tokens |

### 4.4 MetaMask Network Configuration (for testing)

```
Network Name: KiteAI Testnet
RPC URL: https://rpc-testnet.gokite.ai/
Chain ID: 2368
Currency Symbol: KITE
Block Explorer: https://testnet.kitescan.ai/
```

---

## 5. x402 Payment Protocol Specification

### 5.1 Overview

x402 is an internet-native payment open standard created by Coinbase. It uses the HTTP 402 (Payment Required) status code to attach micropayments to API calls.

### 5.2 HTTP 402 Flow (12 Steps)

```
┌──────────┐                    ┌──────────────┐                 ┌─────────────┐
│  Client   │                    │  API Server   │                 │  Facilitator │
│ (Agent)   │                    │ (Next.js API) │                 │  (x402 SDK)  │
└─────┬────┘                    └──────┬───────┘                 └──────┬──────┘
      │                                │                                │
      │ 1. HTTP GET /api/x402/unlock   │                                │
      │ ─────────────────────────────► │                                │
      │                                │                                │
      │ 2. 402 Payment Required        │                                │
      │    + PAYMENT-REQUIRED header   │                                │
      │ ◄───────────────────────────── │                                │
      │                                │                                │
      │ 3. Parse payment requirements  │                                │
      │    Construct PaymentPayload    │                                │
      │    Sign with Session Key       │                                │
      │                                │                                │
      │ 4. Retry with                  │                                │
      │    PAYMENT-SIGNATURE header    │                                │
      │ ─────────────────────────────► │                                │
      │                                │                                │
      │                                │ 5. Verify payload              │
      │                                │ ──────────────────────────────►│
      │                                │                                │
      │                                │ 6. Validation result           │
      │                                │ ◄──────────────────────────────│
      │                                │                                │
      │                                │ 7. If valid, settle payment    │
      │                                │ ──────────────────────────────►│
      │                                │                                │
      │                                │                         8-10. Submit tx
      │                                │                              to chain
      │                                │                              + confirm
      │                                │                                │
      │                                │ 11. Settlement response        │
      │                                │ ◄──────────────────────────────│
      │                                │                                │
      │ 12. 200 OK                     │                                │
      │     + PAYMENT-RESPONSE header  │                                │
      │ ◄───────────────────────────── │                                │
```

### 5.3 Key HTTP Headers

| Header | Direction | Content |
|--------|-----------|---------|
| `PAYMENT-REQUIRED` | Server -> Client | Base64-encoded payment requirements (amount, accepted chains, wallet address) |
| `PAYMENT-SIGNATURE` | Client -> Server | Base64-encoded signed payment payload |
| `PAYMENT-RESPONSE` | Server -> Client | Settlement confirmation response |

### 5.4 SDK Packages

```bash
# TypeScript (used in this project)
npm install @x402/core @x402/evm @x402/fetch @x402/express

# @x402/core    — Protocol types, utilities
# @x402/evm     — EVM chain payment support (including Kite AI)
# @x402/fetch   — x402-aware fetch client (agent side)
# @x402/express — Express middleware (server-side payment gating)
```

### 5.5 Server-Side Middleware Setup Example

```typescript
import { paymentMiddleware } from '@x402/express';

// Used in Next.js API Route
app.use(
  paymentMiddleware({
    "POST /api/x402/unlock-stage": {
      price: "0.001",           // KITE units
      network: "kite-testnet",  // CAIP-2 network ID
      description: "Unlock learning stage",
      resource: "/api/x402/unlock-stage",
      accepts: [
        {
          scheme: "exact",
          network: "eip155:2368",  // Kite Testnet CAIP-2
          maxAmountRequired: "1000000000000000",  // wei
          asset: "0x0000000000000000000000000000000000000000",  // native KITE
          payTo: process.env.MERCHANT_WALLET_ADDRESS,
          extra: {}
        }
      ]
    }
  })
);
```

### 5.6 Client-Side x402 Fetch Example

```typescript
import { x402Fetch } from '@x402/fetch';

const response = await x402Fetch(
  '/api/x402/unlock-stage',
  {
    method: 'POST',
    body: JSON.stringify({ paperId, stageId }),
  },
  {
    walletClient,  // Signs with Session Key from AA Wallet
    network: 'eip155:2368',
  }
);

// Internally:
// 1. First request -> receives 402
// 2. Parses PAYMENT-REQUIRED
// 3. Constructs PaymentPayload + signs with Session Key
// 4. Retries with PAYMENT-SIGNATURE header
// 5. Receives 200 OK
```

---

## 6. Agent Identity System

### 6.1 3-Tier Hierarchical Identity Model

```
Tier 1: User Identity (Root Authority)
  └── Private key: stored in HSM / Secure Enclave
  └── EOA wallet: root of all permissions
  └── Never exposed to agents

Tier 2: Agent Identity (Delegated Authority)
  └── Deterministic address generation via BIP-32 hierarchical key derivation
  └── DID: did:kite:alice.eth/chatgpt/portfolio-manager-v1
  └── KitePass: User -> Agent -> Action trust chain
  └── Verifiable Credentials: capability/qualification proofs

Tier 3: Session Identity (Ephemeral Authority)
  └── Fully random, single-use key
  └── Auto-expiring
  └── Guarantees Perfect Forward Secrecy
```

### 6.2 DID Format

```
did:kite:{user-identifier}/{agent-type}/{agent-instance}
```

**Example for this project:**
```
did:kite:learner.eth/claude-tutor/session-20260219
```

### 6.3 Cryptographic Authorization Chain

#### Standing Intent (SI) — Immutable declaration signed by user

```typescript
interface StandingIntent {
  agentDID: string;           // "did:kite:learner.eth/claude-tutor/v1"
  maxTransactionAmount: string;  // "10000000000000000" (0.01 KITE in wei)
  dailyCap: string;           // "100000000000000000" (0.1 KITE in wei)
  allowedContracts: string[]; // [LEARNING_LEDGER_ADDRESS]
  allowedFunctions: string[]; // ["enrollCourse", "completeStage"]
  expiresAt: number;          // Unix timestamp
  userSignature: string;      // EOA signature
}
```

#### Delegation Token (DT) — Signed by the agent for session use

```typescript
interface DelegationToken {
  standingIntentHash: string;   // keccak256 hash of SI
  sessionKeyAddress: string;    // Temporary session key address
  validFrom: number;            // Unix timestamp
  validUntil: number;           // Valid for approximately 60 seconds
  agentSignature: string;       // Agent key signature
}
```

#### Session Signature (SS) — Transaction execution proof

```typescript
interface SessionSignature {
  delegationTokenHash: string;
  transactionData: string;      // Transaction data to execute
  nonce: number;                // Replay prevention
  challenge: string;            // Server challenge
  sessionSignature: string;     // Session key signature
}
```

### 6.4 KitePass

A cryptographic identity credential for agents. Creates a complete trust chain from User -> Agent -> Action.

- Issued when the agent is created
- Bound to Standing Intent
- On-chain verifiable
- Revocable

### 6.5 Security Guarantee ("Bounded Loss Theorem")

> Even if an agent is fully compromised, the maximum extractable value equals the Standing Intent limit.

---

## 7. Account Abstraction (ERC-4337)

### 7.1 Overview

Kite AI's AA SDK implements ERC-4337 Account Abstraction with agent-specific extensions. The key concept is that smart contract wallets have programmable spending rules.

### 7.2 Architecture

```
┌─────────────────────────────────────────────┐
│            AA Wallet (Smart Contract)        │
│                                             │
│  ┌─────────────┐  ┌──────────────────────┐ │
│  │ Shared Funds │  │ Session Key Registry │ │
│  │ (KITE/USDC)  │  │                      │ │
│  └─────────────┘  │  Agent A: key_a       │ │
│                    │    - max: 0.01 KITE   │ │
│                    │    - daily: 0.1 KITE  │ │
│                    │    - contracts: [...]  │ │
│                    │    - expires: 1708300 │ │
│                    │                      │ │
│                    │  Agent B: key_b       │ │
│                    │    - (different rules) │ │
│                    └──────────────────────┘ │
└─────────────────────────────────────────────┘
```

### 7.3 Session Key Rules (On-chain Enforcement)

```solidity
// Adding Session Key rules via Kite AA SDK
addSessionKeyRule(
  address sessionKeyAddress,    // Session key address
  bytes32 agentId,              // Agent DID hash
  bytes4 functionSelector,      // Allowed function selector
  uint256 valueLimit            // Per-transaction limit (wei)
)
```

### 7.4 Spending Rules

**On-chain enforcement (smart contract):**
- Per-transaction limit
- Daily aggregate limit
- Rolling time window
- Whitelisted/blacklisted contracts
- Conditional logic based on external signals

**Off-chain policy (TEE or local):**
- Session TTL
- Category restrictions
- Recipient allow/deny list

### 7.5 Hierarchical Limit Cascade

Child agent limits are always bounded within parent limits. The user's Standing Intent is the ceiling.

### 7.6 Gasless Transactions

Using the AA SDK's Paymaster, a third party (e.g., the platform) can pay gas fees on behalf of the user. Learners only pay stage costs in KITE tokens and don't need to worry about gas fees separately.

**Reference:** `https://docs.gokite.ai/kite-chain/5-advanced/account-abstraction-sdk`

---

## 8. System Architecture

### 8.1 Overall Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Next.js 16)                   │
│                                                           │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐ │
│  │ CourseCanvas│  │ ClaudeTerminal│  │ AgentDashboard  │ │
│  │ (learn)    │  │ (AI chat)    │  │ (wallet+pay+ID) │ │
│  └─────┬──────┘  └──────┬───────┘  └────────┬────────┘ │
│        │                │                    │           │
│        ▼                ▼                    ▼           │
│  ┌────────────────────────────────────────────────────┐ │
│  │        KiteX402Adapter (Real Implementation)        │ │
│  │                                                     │ │
│  │  Standing Intent → Delegation Token → Session Pay   │ │
│  │  x402Fetch → 402 → Sign → Retry → 200 OK          │ │
│  └────────────────────────┬───────────────────────────┘ │
│                           │                              │
└───────────────────────────┼──────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
       ┌──────┴──────┐ ┌───┴────┐ ┌──────┴──────┐
       │ API Routes   │ │ Smart  │ │  KiteScan   │
       │ /api/x402/*  │ │Contract│ │  Explorer   │
       │              │ │Learning│ │  (verify)   │
       │ POST enroll  │ │ Ledger │ └─────────────┘
       │ POST unlock  │ │        │
       │ GET  receipt  │ │enrollCourse()     │
       │ GET  status   │ │completeStage()    │
       └──────────────┘ │getProgress()      │
                        └───────────────────┘
                          Kite AI Testnet
                          Chain ID: 2368
```

### 8.2 New Files to Create

| # | File Path | Purpose |
|---|-----------|---------|
| 1 | `contracts/LearningLedger.sol` | Smart contract: enrollment, stage completion, progress queries |
| 2 | `contracts/scripts/deploy.ts` | Kite Testnet deployment script |
| 3 | `contracts/hardhat.config.ts` | Hardhat configuration (Chain ID: 2368) |
| 4 | `src/lib/kite/wallet.ts` | AA Wallet creation/management |
| 5 | `src/lib/kite/identity.ts` | DID-based agent identity |
| 6 | `src/lib/kite/session-key.ts` | Standing Intent + Session Key management |
| 7 | `src/lib/kite/contracts.ts` | ABI + contract address constants |
| 8 | `src/app/api/x402/status/route.ts` | Wallet balance + agent ID query |
| 9 | `src/app/api/x402/enroll/route.ts` | Course enrollment payment (402 gating) |
| 10 | `src/app/api/x402/unlock-stage/route.ts` | Stage unlock payment (402 gating) |
| 11 | `src/app/api/x402/receipt/[txHash]/route.ts` | Transaction receipt verification |
| 12 | `src/app/agent-dashboard/page.tsx` | Agent dashboard page |
| 13 | `src/components/agent/AgentWalletCard.tsx` | Wallet info component |
| 14 | `src/components/agent/PaymentHistory.tsx` | Payment history table |
| 15 | `src/components/agent/StandingIntentConfig.tsx` | SI configuration UI |
| 16 | `src/stores/useAgentStore.ts` | Agent state management (Zustand) |

### 8.3 Existing Files to Modify

| # | File Path | Changes |
|---|-----------|---------|
| 1 | `src/lib/adapters/x402.ts` | Add `KiteX402Adapter`, environment variable-based switching |
| 2 | `src/components/learn/PaymentModal.tsx` | KITE units, wallet address, txHash, KiteScan link |
| 3 | `src/stores/useLearningStore.ts` | Add txHash, walletAddress, agentDID state |
| 4 | `src/components/learn/ClaudeTerminal.tsx` | Autonomous payment trigger logic |
| 5 | `package.json` | Add x402 SDK, ethers, hardhat dependencies |
| 6 | `.env.example` | Kite AI environment variable template |

---

## 9. Phase 1: Smart Contract Development

**Estimated Duration:** 1-2 days
**Deliverables:** Deployed LearningLedger contract + verified ABI

### 9.1 Directory Structure

```
contracts/
├── LearningLedger.sol
├── scripts/
│   └── deploy.ts
├── test/
│   └── LearningLedger.test.ts
├── hardhat.config.ts
└── package.json
```

### 9.2 LearningLedger.sol Specification

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract LearningLedger {
    struct Enrollment {
        uint256 enrolledAt;       // Enrollment timestamp
        uint256 currentStage;     // Current progress stage
        uint256 totalPaid;        // Total paid amount (wei)
        bool isActive;            // Active status
    }

    struct StageCompletion {
        uint256 completedAt;      // Completion timestamp
        uint256 score;            // Quiz score (0-100)
        uint256 amountPaid;       // Stage unlock cost
        bytes32 attestationHash;  // Completion proof hash
    }

    // paperId => agent address => Enrollment
    mapping(string => mapping(address => Enrollment)) public enrollments;

    // paperId => agent address => stageNum => StageCompletion
    mapping(string => mapping(address => mapping(uint256 => StageCompletion))) public completions;

    // Events
    event CourseEnrolled(address indexed agent, string paperId, uint256 timestamp);
    event StageCompleted(address indexed agent, string paperId, uint256 stageNum, uint256 score);
    event PaymentReceived(address indexed from, string paperId, uint256 amount);

    /// @notice Enroll in a course (with payment)
    /// @param paperId Paper/course ID
    function enrollCourse(string calldata paperId) external payable {
        require(msg.value > 0, "Payment required");
        require(!enrollments[paperId][msg.sender].isActive, "Already enrolled");

        enrollments[paperId][msg.sender] = Enrollment({
            enrolledAt: block.timestamp,
            currentStage: 0,
            totalPaid: msg.value,
            isActive: true
        });

        emit CourseEnrolled(msg.sender, paperId, block.timestamp);
        emit PaymentReceived(msg.sender, paperId, msg.value);
    }

    /// @notice Record stage completion (with payment)
    /// @param paperId Paper/course ID
    /// @param stageNum Completed stage number
    /// @param score Quiz score (0-100)
    function completeStage(
        string calldata paperId,
        uint256 stageNum,
        uint256 score
    ) external payable {
        require(enrollments[paperId][msg.sender].isActive, "Not enrolled");
        require(score <= 100, "Invalid score");
        require(
            completions[paperId][msg.sender][stageNum].completedAt == 0,
            "Stage already completed"
        );

        completions[paperId][msg.sender][stageNum] = StageCompletion({
            completedAt: block.timestamp,
            score: score,
            amountPaid: msg.value,
            attestationHash: keccak256(
                abi.encodePacked(msg.sender, paperId, stageNum, score, block.timestamp)
            )
        });

        enrollments[paperId][msg.sender].currentStage = stageNum;
        enrollments[paperId][msg.sender].totalPaid += msg.value;

        emit StageCompleted(msg.sender, paperId, stageNum, score);
        if (msg.value > 0) {
            emit PaymentReceived(msg.sender, paperId, msg.value);
        }
    }

    /// @notice Query learning progress
    /// @param agent Agent address
    /// @param paperId Paper/course ID
    function getProgress(
        address agent,
        string calldata paperId
    ) external view returns (
        bool isEnrolled,
        uint256 currentStage,
        uint256 totalPaid,
        uint256 enrolledAt
    ) {
        Enrollment memory e = enrollments[paperId][agent];
        return (e.isActive, e.currentStage, e.totalPaid, e.enrolledAt);
    }

    /// @notice Query stage completion info
    /// @param agent Agent address
    /// @param paperId Paper/course ID
    /// @param stageNum Stage number
    function getStageCompletion(
        address agent,
        string calldata paperId,
        uint256 stageNum
    ) external view returns (
        uint256 completedAt,
        uint256 score,
        bytes32 attestationHash
    ) {
        StageCompletion memory sc = completions[paperId][agent][stageNum];
        return (sc.completedAt, sc.score, sc.attestationHash);
    }
}
```

### 9.3 Hardhat Configuration

```typescript
// contracts/hardhat.config.ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    kiteTestnet: {
      url: "https://rpc-testnet.gokite.ai/",
      chainId: 2368,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
    },
    kiteMainnet: {
      url: "https://rpc.gokite.ai/",
      chainId: 2366,
      accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
    },
  },
};

export default config;
```

### 9.4 Deployment Script

```typescript
// contracts/scripts/deploy.ts
import { ethers } from "hardhat";

async function main() {
  const LearningLedger = await ethers.getContractFactory("LearningLedger");
  const ledger = await LearningLedger.deploy();
  await ledger.waitForDeployment();

  const address = await ledger.getAddress();
  console.log(`LearningLedger deployed to: ${address}`);
  console.log(`Verify on KiteScan: https://testnet.kitescan.ai/address/${address}`);

  // Copy ABI to frontend
  // -> Reflect in src/lib/kite/contracts.ts
}

main().catch(console.error);
```

### 9.5 Test Cases

- [ ] `enrollCourse`: Successful enrollment with payment
- [ ] `enrollCourse`: Revert if already enrolled
- [ ] `enrollCourse`: Revert without payment (msg.value=0)
- [ ] `completeStage`: Only callable by enrolled agents
- [ ] `completeStage`: Cannot complete the same stage twice
- [ ] `completeStage`: Revert if score > 100
- [ ] `getProgress`: Returns accurate progress
- [ ] `getStageCompletion`: Verify attestationHash

---

## 10. Phase 2: Agent Wallet & Identity

**Estimated Duration:** 1-2 days
**Deliverables:** 4 modules in the `src/lib/kite/` directory

### 10.1 wallet.ts — AA Wallet Management

```typescript
// src/lib/kite/wallet.ts

export interface AgentWallet {
  address: string;          // AA Wallet address
  sessionKeyAddress: string; // Current session key
  balance: string;          // KITE balance (wei)
  chainId: number;          // 2368 (testnet) or 2366 (mainnet)
}

export interface WalletConfig {
  rpcUrl: string;
  chainId: number;
  userPrivateKey: string;   // Server-side only
}

export class KiteWalletManager {
  /// Create or load existing AA Wallet
  async getOrCreateWallet(config: WalletConfig): Promise<AgentWallet>;

  /// Query balance
  async getBalance(address: string): Promise<string>;

  /// Create session key (TTL-based)
  async createSessionKey(
    walletAddress: string,
    rules: SessionKeyRules
  ): Promise<{ address: string; privateKey: string; expiresAt: number }>;

  /// Sign transaction with session key
  async signWithSessionKey(
    sessionKeyPrivateKey: string,
    transaction: TransactionRequest
  ): Promise<string>;
}

export interface SessionKeyRules {
  maxTransactionValue: string;   // wei
  dailyCap: string;              // wei
  allowedContracts: string[];    // Contract address list
  allowedFunctions: string[];    // Function selector list
  ttlSeconds: number;            // Validity period (seconds)
}
```

### 10.2 identity.ts — DID-Based Agent Identity

```typescript
// src/lib/kite/identity.ts

export interface AgentIdentity {
  did: string;                    // "did:kite:learner.eth/claude-tutor/v1"
  walletAddress: string;          // Derived agent address
  kitePassHash: string;           // KitePass hash
  createdAt: number;              // Creation timestamp
}

export class KiteIdentityManager {
  /// Generate agent address via BIP-32 hierarchical key derivation
  /// derivation path: m/44'/2368'/0'/0/{agentIndex}
  deriveAgentAddress(
    userMnemonic: string,
    agentIndex: number
  ): { address: string; privateKey: string };

  /// Create DID
  createDID(
    userIdentifier: string,    // "learner.eth"
    agentType: string,         // "claude-tutor"
    agentVersion: string       // "v1"
  ): string;

  /// Create KitePass (bound to Standing Intent)
  async createKitePass(
    agentIdentity: AgentIdentity,
    standingIntent: StandingIntent
  ): Promise<string>;  // KitePass hash

  /// Verify KitePass
  async verifyKitePass(
    kitePassHash: string,
    agentAddress: string
  ): Promise<boolean>;
}
```

### 10.3 session-key.ts — Standing Intent & Session Key

```typescript
// src/lib/kite/session-key.ts

export interface StandingIntent {
  agentDID: string;
  maxTransactionAmount: string;   // wei
  dailyCap: string;               // wei
  allowedContracts: string[];
  allowedFunctions: string[];
  expiresAt: number;              // Unix timestamp
  userSignature: string;
}

export interface DelegationToken {
  standingIntentHash: string;
  sessionKeyAddress: string;
  validFrom: number;
  validUntil: number;
  agentSignature: string;
}

export class SessionKeyManager {
  /// Create Standing Intent and get user signature
  async createStandingIntent(
    params: Omit<StandingIntent, 'userSignature'>,
    userSigner: ethers.Signer
  ): Promise<StandingIntent>;

  /// Issue Delegation Token (created by agent for session use)
  async issueDelegationToken(
    standingIntent: StandingIntent,
    sessionKeyAddress: string,
    agentSigner: ethers.Signer,
    ttlSeconds?: number          // Default 60 seconds
  ): Promise<DelegationToken>;

  /// Validate Standing Intent
  validateStandingIntent(si: StandingIntent): boolean;

  /// Track daily usage
  async getDailyUsage(agentAddress: string): Promise<string>;

  /// Check spending limits (before transaction)
  async canSpend(
    agentAddress: string,
    amount: string,
    standingIntent: StandingIntent
  ): Promise<{ allowed: boolean; reason?: string }>;
}
```

### 10.4 contracts.ts — ABI & Address Constants

```typescript
// src/lib/kite/contracts.ts

// Replace with actual address after deployment
export const LEARNING_LEDGER_ADDRESS = process.env.NEXT_PUBLIC_LEARNING_LEDGER_ADDRESS || '';

export const KITE_CHAIN_CONFIG = {
  testnet: {
    chainId: 2368,
    rpcUrl: 'https://rpc-testnet.gokite.ai/',
    explorerUrl: 'https://testnet.kitescan.ai/',
    faucetUrl: 'https://faucet.gokite.ai',
  },
  mainnet: {
    chainId: 2366,
    rpcUrl: 'https://rpc.gokite.ai/',
    explorerUrl: 'https://kitescan.ai/',
  },
} as const;

export const LEARNING_LEDGER_ABI = [
  // Copy from Hardhat artifact after deployment
  "function enrollCourse(string paperId) payable",
  "function completeStage(string paperId, uint256 stageNum, uint256 score) payable",
  "function getProgress(address agent, string paperId) view returns (bool, uint256, uint256, uint256)",
  "function getStageCompletion(address agent, string paperId, uint256 stageNum) view returns (uint256, uint256, bytes32)",
  "event CourseEnrolled(address indexed agent, string paperId, uint256 timestamp)",
  "event StageCompleted(address indexed agent, string paperId, uint256 stageNum, uint256 score)",
  "event PaymentReceived(address indexed from, string paperId, uint256 amount)",
] as const;
```

---

## 11. Phase 3: x402 API Routes

**Estimated Duration:** 1 day
**Deliverables:** 4 API Routes (`src/app/api/x402/`)

### 11.1 GET /api/x402/status — Agent Status Query

**Request:** None (uses agent key from environment variables on the server side)

**Response:**
```typescript
{
  agentDID: string;           // "did:kite:learner.eth/claude-tutor/v1"
  walletAddress: string;      // AA Wallet address
  balance: string;            // KITE balance (KITE units, decimal)
  balanceWei: string;         // KITE balance (wei)
  chainId: number;            // 2368
  explorerUrl: string;        // "https://testnet.kitescan.ai/address/0x..."
  standingIntent: {
    maxTransaction: string;   // "0.01 KITE"
    dailyCap: string;         // "0.1 KITE"
    dailyUsed: string;        // "0.023 KITE"
    expiresAt: string;        // ISO 8601
  };
}
```

### 11.2 POST /api/x402/enroll — Course Enrollment

**x402 gating:** This endpoint is protected by `@x402/express` middleware. Access without payment returns `402 Payment Required`.

**Request:**
```typescript
{
  paperId: string;    // "bitdance-2602"
}
```

**Flow:**
1. Client sends POST request
2. Middleware returns 402 + `PAYMENT-REQUIRED` header
3. Client (agent) re-requests with signed `PAYMENT-SIGNATURE` header
4. Middleware verifies payment + settles
5. Handler calls `LearningLedger.enrollCourse(paperId)`
6. Returns 200 OK + transaction hash

**Response (200):**
```typescript
{
  success: true;
  txHash: string;           // On-chain transaction hash
  explorerUrl: string;      // KiteScan transaction link
  enrollment: {
    paperId: string;
    enrolledAt: string;     // ISO 8601
  };
}
```

### 11.3 POST /api/x402/unlock-stage — Stage Unlock

**x402 gating:** Protected by 402 middleware

**Request:**
```typescript
{
  paperId: string;    // "bitdance-2602"
  stageId: string;    // "stage-3"
  stageNum: number;   // 3
  score: number;      // Quiz score (0-100)
}
```

**Response (200):**
```typescript
{
  success: true;
  txHash: string;
  explorerUrl: string;
  stageCompletion: {
    paperId: string;
    stageNum: number;
    score: number;
    attestationHash: string;  // On-chain proof hash
    completedAt: string;
  };
}
```

**Error Response (402 — Insufficient balance, etc.):**
```typescript
{
  error: "insufficient_funds";
  required: "0.001 KITE";
  available: "0.0005 KITE";
  faucetUrl: "https://faucet.gokite.ai";
}
```

### 11.4 GET /api/x402/receipt/[txHash] — Receipt Verification

**Request:** `txHash` as URL parameter

**Response:**
```typescript
{
  verified: boolean;
  txHash: string;
  blockNumber: number;
  blockTimestamp: string;
  from: string;             // Agent wallet address
  to: string;               // LearningLedger address
  value: string;            // Payment amount (KITE)
  method: string;           // "enrollCourse" | "completeStage"
  decodedArgs: {
    paperId: string;
    stageNum?: number;
    score?: number;
  };
  explorerUrl: string;      // KiteScan transaction link
  confirmations: number;
}
```

### 11.5 Error Handling (Common)

All x402 API routes must handle the following errors consistently:

| HTTP Status | Code | Description |
|-------------|------|-------------|
| 402 | `payment_required` | x402 payment needed (normal flow) |
| 400 | `invalid_params` | Request parameter validation failed |
| 402 | `insufficient_funds` | Insufficient balance (faucet URL provided) |
| 403 | `spending_limit_exceeded` | Standing Intent limit exceeded |
| 403 | `session_expired` | Session key expired |
| 500 | `chain_error` | On-chain transaction failed |
| 500 | `settlement_failed` | x402 settlement failed |

**Important (evaluation criteria):** Failure scenarios such as insufficient balance and limit exceeded must be clearly displayed in the UI. The "Correct x402 Usage" evaluation criterion explicitly requires "insufficient funds handling."

---

## 12. Phase 4: Adapter Replacement (Mock to Real)

**Estimated Duration:** 1 day
**Deliverables:** `KiteX402Adapter` implementation, `PaymentModal` update

### 12.1 x402.ts Adapter Replacement

```typescript
// src/lib/adapters/x402.ts — After modification

export interface PaymentResult {
  success: boolean;
  receiptId?: string;
  txHash?: string;           // Added: on-chain transaction hash
  explorerUrl?: string;      // Added: KiteScan link
  error?: string;
  errorCode?: string;        // Added: error code
}

export interface X402PaymentAdapter {
  requestPayment(params: {
    stageId: string;
    paperId: string;
    amount: number;
    currency: string;
    stageNum?: number;       // Added: stage number
    score?: number;          // Added: quiz score
  }): Promise<PaymentResult>;
  verifyPayment(receiptId: string): Promise<boolean>;
  getWalletStatus?(): Promise<WalletStatus>;  // Added: optional
}

interface WalletStatus {
  address: string;
  balance: string;
  agentDID: string;
  dailyUsed: string;
  dailyCap: string;
}

// KiteX402Adapter — Real Kite Chain payment
class KiteX402Adapter implements X402PaymentAdapter {
  async requestPayment(params): Promise<PaymentResult> {
    // 1. POST to /api/x402/unlock-stage
    // 2. x402Fetch automatically handles 402 -> sign -> retry
    // 3. On success, return txHash + explorerUrl
    // 4. On failure, return errorCode + user-friendly message
  }

  async verifyPayment(txHash: string): Promise<boolean> {
    // Verify via /api/x402/receipt/[txHash]
  }

  async getWalletStatus(): Promise<WalletStatus> {
    // Query via /api/x402/status
  }
}

// Automatic switching based on environment variable
const USE_REAL_KITE = process.env.NEXT_PUBLIC_USE_KITE_CHAIN === 'true';
export const x402Adapter: X402PaymentAdapter = USE_REAL_KITE
  ? new KiteX402Adapter()
  : new MockX402Adapter();
```

### 12.2 PaymentModal.tsx Update

**Changes:**
1. Currency unit: `0.001 ETH` -> `0.001 KITE`
2. Add display on payment success:
   - Transaction hash (abbreviated: `0x1234...abcd`)
   - KiteScan confirmation link (external link, new tab)
   - Agent wallet address
3. Refined error states:
   - Insufficient balance: provide faucet link
   - Limit exceeded: provide Standing Intent settings link
   - Session expired: guide to re-authenticate
4. Payment in-progress states:
   - "Signing..." -> "Submitting to Kite Chain..." -> "Confirming..." -> "Done"

### 12.3 useLearningStore.ts State Additions

```typescript
// Additional state
txHash: string | null;
walletAddress: string | null;
explorerUrl: string | null;

// Additional actions
setTxHash: (txHash: string | null) => void;
setWalletAddress: (address: string | null) => void;
setExplorerUrl: (url: string | null) => void;
```

---

## 13. Phase 5: Agent Dashboard

**Estimated Duration:** 1-2 days
**Deliverables:** `/agent-dashboard` page + 3 components

### 13.1 Agent Dashboard Page (`src/app/agent-dashboard/page.tsx`)

**Layout:**

```
┌─────────────────────────────────────────────┐
│  Agent Dashboard                     [Back] │
├──────────────────┬──────────────────────────┤
│                  │                          │
│  Agent Identity  │    Payment History       │
│  ┌────────────┐  │    ┌──────────────────┐  │
│  │ DID        │  │    │ # | Time | Stage │  │
│  │ Wallet Addr│  │    │   | TxHash| KITE │  │
│  │ Balance    │  │    │   |  ...  | ...  │  │
│  │ KitePass ✓ │  │    │   |  ...  | ...  │  │
│  └────────────┘  │    └──────────────────┘  │
│                  │                          │
│  Standing Intent │    Learning Attestations │
│  ┌────────────┐  │    ┌──────────────────┐  │
│  │ Max Tx     │  │    │ Course | Stage   │  │
│  │ Daily Cap  │  │    │ Score  | Proof   │  │
│  │ Used Today │  │    │  ...   |  ...    │  │
│  │ Expires    │  │    └──────────────────┘  │
│  │ [Configure]│  │                          │
│  └────────────┘  │                          │
└──────────────────┴──────────────────────────┘
```

### 13.2 AgentWalletCard.tsx

Display items:
- **Agent DID:** `did:kite:learner.eth/claude-tutor/v1` (full + copy button)
- **Wallet Address:** `0x1234...abcd` (abbreviated + KiteScan link)
- **Balance:** `0.847 KITE` (real-time refresh)
- **KitePass Status:** Verified icon or unissued status
- **Network:** KiteAI Testnet (Chain ID: 2368)

### 13.3 PaymentHistory.tsx

| Column | Description |
|--------|-------------|
| # | Sequence number |
| Time | Payment time (relative: "2m ago") |
| Course | Paper/course name |
| Stage | Stage number |
| Amount | Payment amount (KITE) |
| Tx Hash | Abbreviated hash + KiteScan link |
| Status | Confirmed / Pending / Failed |

**Data Source:** Query agent address transaction history from KiteScan API (`https://kitescan.ai/api-docs`)

### 13.4 StandingIntentConfig.tsx

Configurable items:
- **Max Transaction Amount:** Input field (KITE units, default 0.01)
- **Daily Spending Cap:** Input field (KITE units, default 0.1)
- **Allowed Contracts:** LearningLedger address (fixed, checkbox)
- **Allowed Functions:** `enrollCourse`, `completeStage` (checkboxes)
- **Expiry Duration:** Dropdown (1 hour / 6 hours / 24 hours / 7 days)
- **[Save & Sign]** button — Creates/updates SI with user signature

**Visual Elements:**
- Daily usage progress bar (dailyUsed / dailyCap)
- Countdown to expiry
- Current SI status badge (Active / Expired / Not Set)

### 13.5 useAgentStore.ts — Zustand Store

```typescript
// src/stores/useAgentStore.ts

interface AgentState {
  // Identity
  agentDID: string | null;
  walletAddress: string | null;
  kitePassHash: string | null;
  isKitePassVerified: boolean;

  // Wallet
  balance: string;           // KITE units
  balanceWei: string;
  chainId: number;

  // Standing Intent
  standingIntent: StandingIntent | null;
  dailyUsed: string;
  dailyCap: string;

  // Payment History
  paymentHistory: PaymentHistoryEntry[];
  isLoadingHistory: boolean;

  // Learning Attestations
  attestations: LearningAttestation[];

  // Actions
  fetchWalletStatus: () => Promise<void>;
  fetchPaymentHistory: () => Promise<void>;
  fetchAttestations: () => Promise<void>;
  updateStandingIntent: (si: StandingIntent) => Promise<void>;
  reset: () => void;
}

interface PaymentHistoryEntry {
  txHash: string;
  timestamp: string;
  paperId: string;
  paperTitle: string;
  stageNum?: number;
  amount: string;            // KITE
  method: 'enrollCourse' | 'completeStage';
  status: 'confirmed' | 'pending' | 'failed';
  explorerUrl: string;
}

interface LearningAttestation {
  paperId: string;
  paperTitle: string;
  stageNum: number;
  score: number;
  attestationHash: string;
  completedAt: string;
  explorerUrl: string;       // KiteScan link
}
```

---

## 14. Phase 6: Claude Terminal Autonomous Payment

**Estimated Duration:** 1 day
**Deliverables:** ClaudeTerminal autonomous payment integration

### 14.1 Autonomous Payment Flow

```
Learner passes quiz
  ↓
ClaudeTerminal detects (useLearningStore.isQuizPassed === true)
  ↓
Claude agent displays message in terminal:
  "Great job! You passed Stage 3 with a score of 85/100!
   I'm unlocking Stage 4 for you now..."
  ↓
Agent calls /api/x402/unlock-stage with Session Key
  ↓
x402 flow executes automatically (402 -> sign -> pay -> 200 OK)
  ↓
On success, terminal message:
  "Stage 4 unlocked! Payment: 0.001 KITE
   Tx: 0x1234...abcd (View on KiteScan)
   Your progress has been recorded on-chain."
  ↓
setDoorUnlocked(true) -> Stage door opens
```

### 14.2 Failure Handling

```
Insufficient balance:
  "Insufficient KITE balance to unlock Stage 4.
   Current balance: 0.0005 KITE | Required: 0.001 KITE
   Get test tokens: https://faucet.gokite.ai"

Limit exceeded:
  "Daily spending limit reached (0.1 KITE).
   Please update your Standing Intent in the Agent Dashboard."

Network error:
  "Payment failed due to network error. Retrying in 5s..."
  -> Auto-retry up to 3 times
```

### 14.3 Claude Terminal Adapter Modification

Add payment trigger method to `src/lib/adapters/claude-terminal.ts`:

```typescript
export interface ClaudeTerminalAdapter {
  // Existing methods...
  sendMessage(message: string): Promise<string>;

  // Added: autonomous payment related
  onQuizPassed?(params: {
    paperId: string;
    stageNum: number;
    score: number;
    nextStageId: string;
  }): Promise<void>;
}
```

### 14.4 Key Requirements

- **Absolutely no manual wallet clicks:** Session Key automatically signs transactions
- **Real-time display of payment results in terminal:** User directly observes the agent's economic actions
- **All transactions trackable:** txHash, KiteScan link provided
- **Bounty evaluation core:** Directly addresses "Agent Autonomy — minimal human involvement" criterion

---

## 15. Phase 7: Deployment & Demo

**Estimated Duration:** 1 day
**Deliverables:** Vercel deployment, README, demo video

### 15.1 Deployment Checklist

- [ ] Production deployment on Vercel (public URL)
- [ ] Set environment variables (Vercel Dashboard)
- [ ] Deploy LearningLedger contract to Kite Testnet + verify on KiteScan
- [ ] Ensure sufficient test KITE tokens from Faucet
- [ ] Verify all x402 API routes are working
- [ ] Agent dashboard accessible
- [ ] End-to-end autonomous payment test passed

### 15.2 README Requirements

```markdown
# Papers LMS — AI Tutor Agent with Economic Autonomy

## Overview
[Project description, screenshots]

## Architecture
[System architecture diagram]

## Quick Start
1. Clone repo
2. Install dependencies: `yarn install`
3. Copy env: `cp .env.example .env.local`
4. Configure Kite AI credentials
5. Deploy contract: `cd contracts && npx hardhat run scripts/deploy.ts --network kiteTestnet`
6. Run dev: `yarn dev`

## Live Demo
[Vercel deployment URL]

## Key Features
- AI agent autonomous payments (no manual wallet clicks)
- x402 protocol payment flow
- On-chain learning attestations
- Agent identity with DID & KitePass
- Session Key scoped permissions

## Tech Stack
[Tech stack table]

## License
MIT
```

### 15.3 Demo Scenario (for Judges)

1. **Agent Identity Demo:**
   - Open Agent Dashboard -> Display DID, wallet address, KitePass
   - Set Standing Intent -> Verify limits, whitelist

2. **Payment Flow Demo:**
   - Enter course -> Take quiz -> Pass
   - Claude agent automatically executes payment
   - Verify txHash + KiteScan link in terminal
   - Verify actual on-chain transaction on KiteScan

3. **Safety Demo:**
   - Standing Intent limit reached -> Agent payment rejection message
   - Insufficient balance -> Faucet guidance
   - Session expired -> Re-authentication guidance

4. **On-chain Proof Demo:**
   - Check Learning Attestations in Agent Dashboard
   - Verify attestationHash on KiteScan

### 15.4 Demo Video (1-3 minutes)

- Screen recording of the full flow
- Narration or subtitles explaining each step
- Emphasize the moment of agent autonomous payment

---

## 16. Environment Variables & Configuration

### 16.1 .env.example

```bash
# ===== Kite AI Chain =====
NEXT_PUBLIC_USE_KITE_CHAIN=true           # true: real chain / false: Mock
NEXT_PUBLIC_KITE_CHAIN_ID=2368            # 2368: Testnet / 2366: Mainnet
NEXT_PUBLIC_KITE_RPC_URL=https://rpc-testnet.gokite.ai/
NEXT_PUBLIC_KITE_EXPLORER_URL=https://testnet.kitescan.ai/
NEXT_PUBLIC_LEARNING_LEDGER_ADDRESS=      # Enter after deployment

# ===== Agent Wallet (Server Only — NEVER expose to client) =====
KITE_AGENT_PRIVATE_KEY=                   # Agent private key
KITE_USER_MNEMONIC=                       # BIP-32 key derivation mnemonic
KITE_MERCHANT_WALLET=                     # Payment recipient wallet

# ===== x402 =====
X402_FACILITATOR_URL=                     # x402 Facilitator endpoint

# ===== Agent Identity =====
NEXT_PUBLIC_AGENT_DID=did:kite:learner.eth/claude-tutor/v1
KITE_AGENT_INDEX=0                        # BIP-32 derivation index

# ===== Standing Intent Defaults =====
KITE_SI_MAX_TX=10000000000000000          # 0.01 KITE (wei)
KITE_SI_DAILY_CAP=100000000000000000      # 0.1 KITE (wei)
KITE_SI_TTL_HOURS=24                      # SI validity period

# ===== Smart Contract Deployment (contracts/.env) =====
DEPLOYER_PRIVATE_KEY=                     # Contract deployment key
```

### 16.2 Security Notes

| Variable | Location | Exposure |
|----------|----------|----------|
| `NEXT_PUBLIC_*` | Client bundle | Public (non-sensitive information only) |
| `KITE_AGENT_PRIVATE_KEY` | Server-side only | **NEVER expose to client** |
| `KITE_USER_MNEMONIC` | Server-side only | **NEVER expose to client** |
| `DEPLOYER_PRIVATE_KEY` | CI/CD only | Not needed on production server |

---

## 17. Evaluation Criteria Response Strategy

### 17.1 Agent Autonomy (Top Priority)

| Demo Point | Implementation |
|------------|----------------|
| No manual wallet interaction | Automatic signing with Session Key + AA Wallet |
| Automatic payment trigger | Quiz passed -> Claude agent pays immediately |
| Automatic progress recording | Automatic on-chain call to completeStage() |
| Automatic failure handling | Retry, insufficient balance guidance, alternative paths |

### 17.2 Correct x402 Usage

| Demo Point | Implementation |
|------------|----------------|
| Payment-action mapping | Each API call = 1 x402 payment, clearly shown in logs/UI |
| Full 402 -> sign -> 200 flow | Automatically handled by x402Fetch, displayed in real-time in terminal |
| Insufficient balance handling | Error message + faucet URL + dashboard link |
| Limit exceeded handling | SI configuration guidance message |

### 17.3 Security & Safety

| Demo Point | Implementation |
|------------|----------------|
| Key separation | User EOA -> Agent BIP-32 -> Session Ephemeral |
| Scope restriction | SI: only specific contracts + specific functions allowed |
| Spending limits | Per-transaction + daily limit enforced on-chain |
| Automatic expiry | Session Key TTL + SI expiration date |
| Audit trail | All transactions verifiable on KiteScan |

### 17.4 Developer Experience

| Demo Point | Implementation |
|------------|----------------|
| Adapter pattern | Switch between Mock and Real with a single environment variable |
| Clear interfaces | Full TypeScript type definitions |
| .env.example | All configuration values documented |
| README | Architecture, quick start, screenshots |

### 17.5 Real-world Applicability

| Demo Point | Implementation |
|------------|----------------|
| Educational platform = real market | Paper-based learning LMS |
| Micropayments | 0.001 KITE/stage, sub-cent fees |
| Learning proofs | On-chain attestation, Verifiable Credential |
| Scalability | Adapter pattern enables other chain/payment replacements |

---

## 18. Schedule & Milestones

| Phase | Task | Estimated Duration | Dependencies |
|-------|------|-------------------|--------------|
| **1** | Smart contract development & deployment | 1-2 days | None |
| **2** | Agent wallet & identity | 1-2 days | Phase 1 (ABI needed) |
| **3** | x402 API routes | 1 day | Phase 1, 2 |
| **4** | Adapter replacement (Mock to Real) | 1 day | Phase 3 |
| **5** | Agent dashboard | 1-2 days | Phase 2, 3 |
| **6** | Claude terminal autonomous payment | 1 day | Phase 4 |
| **7** | Deployment & demo | 1 day | Phase 1-6 |
| **Total** | | **7-10 days** | |

**Existing codebase utilization rate:** ~70% (adapter pattern, Zustand stores, UI components, Canvas rendering, etc. reused)

---

## 19. References

### Official Documentation
- Kite AI Docs: https://docs.gokite.ai/
- Kite Foundation Whitepaper: https://kite.foundation/whitepaper
- x402 Protocol: https://www.x402.org/
- x402 GitHub: https://github.com/coinbase/x402
- Coinbase x402 Docs: https://docs.cdp.coinbase.com/x402/welcome

### Chain Infrastructure
- Testnet RPC: https://rpc-testnet.gokite.ai/ (Chain ID: 2368)
- Mainnet RPC: https://rpc.gokite.ai/ (Chain ID: 2366)
- Testnet Explorer: https://testnet.kitescan.ai/
- Mainnet Explorer: https://kitescan.ai/
- Explorer APIs: https://kitescan.ai/api-docs
- Faucet: https://faucet.gokite.ai
- ChainList (Testnet): https://chainlist.org/chain/2368
- ChainList (Mainnet): https://chainlist.org/chain/2366

### SDK & Development Tools
- Kite AI GitHub: https://github.com/gokite-ai
- AA SDK Guide: https://docs.gokite.ai/kite-chain/5-advanced/account-abstraction-sdk
- Multi-sig Guide: https://docs.gokite.ai/kite-chain/5-advanced/multisig-wallet
- Stablecoin Gasless: https://docs.gokite.ai/kite-chain/stablecoin-gasless-transfer
- Counter dApp Example: https://docs.gokite.ai/kite-chain/3-developing/counter-smart-contract-hardhat

### NPM Packages
```bash
# x402 SDK
@x402/core @x402/evm @x402/fetch @x402/express

# Blockchain
ethers hardhat @nomicfoundation/hardhat-toolbox

# Existing project
next@16.1.6 react@19.2.3 zustand@^5.0.11 tailwindcss@^4
```
