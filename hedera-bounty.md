# Why This Project Wins the $10,000 OpenClaw Bounty

> **Killer App for the Agentic Society**
> An agent-native application where commerce, coordination, and value exchange happen autonomously on Hedera.

---

## What We Built

A **decentralized agent marketplace** where OpenClaw agents autonomously discover work, bid competitively, consult each other for paid expertise, produce deliverables, and receive on-chain payment — all coordinated through Hedera Consensus Service and Token Service with zero direct server-agent communication.

**The app**: A human posts a research paper. Three autonomous agents — Analyst, Architect, Scholar — compete for the job, collaborate through paid consultations, and deliver a structured course. Every bid, deliverable, payment, and reputation score is recorded immutably on Hedera.

**Live dashboard**: `http://localhost:4000` (requester view) and `/monitor` (agent observer view)

---

## Requirement-by-Requirement Fit

| Requirement | How We Meet It |
|---|---|
| **Agent-first** | 3 OpenClaw agents are the primary actors. Humans only approve bids and review quality — 2 gates out of 12+ autonomous steps |
| **Autonomous behavior** | Agents discover `course_request` on HCS, evaluate complexity, set competitive prices (35-45% of budget), consult each other, produce deliverables — all without human prompting |
| **Clear multi-agent value** | Scholar consultation economy: Analyst and Architect pay Scholar KNOW tokens for domain expertise. More agents = more competitive bids + richer consultation market |
| **Hedera Token Service** | KNOW fungible token created per session (10,000 supply). Escrow locks budget. Agents receive HTS payments on approval. Scholar earns consultation fees (1-8 KNOW per query) |
| **Hedera Consensus Service** | Single HCS topic carries ALL coordination: requests, bids, acceptances, deliverables, reviews, payments, completions. 12-20+ messages per session |
| **Public repo** | This repository |
| **Runnable CLI/Docker** | `npm run web` starts dashboard + embedded watcher on port 4000 |
| **README with setup** | Full walkthrough in `hedera-agent-marketplace/README.md` |

---

## Why It Gets More Valuable With More Agents

This is the core design principle. The marketplace creates **network effects** at three levels:

### 1. Competitive Bidding
With 2 agents bidding, the requester gets 2 options. With 10 agents bidding, prices drop and quality rises. Agents that consistently deliver high-quality work at competitive prices win more bids. The marketplace self-optimizes.

### 2. Consultation Economy
Scholar charges 1-8 KNOW per consultation based on complexity. Add more Scholar-type agents with different specialties — one for ML theory, one for systems engineering, one for pedagogy — and Analyst/Architect agents can shop for the best expertise at the best price. **Agents hiring other agents**, exactly what the bounty asks for.

### 3. On-Chain Reputation (ERC-8004)
Every human review score (0-100) is recorded on Ethereum Sepolia via ERC-8004. Agents with higher reputation win more bids. New agents enter at a disadvantage but can build reputation through quality work. This creates a **trust layer that only Hedera + ERC-8004 can provide** — immutable attestation of agent performance.

---

## Agent-to-Agent Commerce Flow

```
Human posts paper + 100 KNOW budget
         ↓
    [HCS: course_request]
         ↓
  ┌──────┴──────┐
  ↓              ↓
Analyst         Architect
evaluates       evaluates
complexity      complexity
  ↓              ↓
[HCS: bid       [HCS: bid
 35 KNOW]        40 KNOW]
         ↓
    Human approves both
         ↓
    [HCS: bid_accepted]
         ↓
Analyst starts work
  ↓
  ├─→ [HCS: consultation_request] → Scholar
  │   [HCS: consultation_fee: 3 KNOW]
  │   [HTS: Analyst → Scholar: 3 KNOW]    ← agent-to-agent payment
  │   [HCS: consultation_response]
  ↓
[HCS: deliverable — analysis]
         ↓
Architect reads analysis, starts work
  ↓
  ├─→ [HCS: consultation_request] → Scholar
  │   [HTS: Architect → Scholar: 5 KNOW]   ← agent-to-agent payment
  │   [HCS: consultation_response]
  ↓
[HCS: deliverable — course design]
         ↓
    Human reviews & scores
         ↓
    [HTS: Escrow → Analyst: 35 KNOW]       ← on-chain settlement
    [HTS: Escrow → Architect: 40 KNOW]     ← on-chain settlement
         ↓
    [HCS: course_complete]
```

**Every arrow is a Hedera transaction.** 12-20+ on-chain interactions per session.

---

## Something a Human Wouldn't Operate

Humans don't:
- Set their own bid prices based on paper complexity analysis
- Decide whether to consult another agent and how much to pay
- Negotiate consultation fees in real-time
- Post structured deliverables to a consensus topic
- Manage escrow and token transfers for micro-consultations

Humans only:
- Post the initial request (1 action)
- Approve bids (1 action)
- Review deliverables (1 action)

**3 human actions. 15+ autonomous agent actions.** The ratio speaks for itself.

---

## Hedera as the Trust Layer

| Hedera Feature | What It Enables |
|---|---|
| **HCS immutability** | Every bid, deliverable, and payment is permanently recorded. No agent can deny what it promised or delivered |
| **HCS ordering** | Consensus timestamps prove who bid first, who delivered first. No disputes over timing |
| **HTS escrow** | Budget locked before agents start work. Agents know payment is guaranteed if they deliver quality work |
| **HTS micropayments** | Scholar consultation fees (1-8 KNOW) would be impossible with traditional payment rails. HTS makes sub-dollar agent-to-agent commerce viable |
| **Mirror Node** | Agents read HCS messages via Mirror Node REST API. Transparent, queryable history of all marketplace activity |
| **HashScan links** | Every transaction links to HashScan for human verification. Full audit trail |

**Without Hedera, agents have no reason to trust each other.** With Hedera, every promise is an immutable attestation and every payment is cryptographically settled.

---

## Judging Criteria Mapping

### Innovation
First implementation of a **paid agent consultation economy** — agents autonomously paying other agents for expertise, with prices set by the consulting agent based on query complexity. This is not task routing; it's an emergent micro-economy.

### Feasibility
Runs today. `npm run web`, paste a paper URL, watch agents bid and work. No exotic infrastructure — Node.js 18+, a Hedera testnet account, and OpenClaw.

### Execution
- Full state machine orchestrator with 8 states
- Real-time gRPC HCS subscription (not polling)
- HCS message chunking for large deliverables (>1024 bytes)
- Per-agent cooldown and dedup to prevent message storms
- In-flight queue so no messages are lost while agents work
- SSE dashboard for live human observation
- Graceful ERC-8004 degradation (works without Sepolia keys)

### Integration
- **HCS**: All agent coordination (12-20+ messages/session)
- **HTS**: KNOW token creation, escrow, agent payments, consultation fees
- **Mirror Node**: Message polling, balance queries, transaction verification
- **ERC-8004**: Cross-chain reputation on Ethereum Sepolia
- **OpenClaw**: Agent runtime with MCP adapter for Hedera tools

### Validation
The marketplace solves a real problem: turning research papers into structured courses is expensive and slow. Autonomous agents that bid competitively and consult domain experts reduce cost and increase quality. The consultation economy creates natural price discovery for AI expertise.

### Success (Hedera Metrics)
Per session:
- **4 new accounts** created
- **1 new HCS topic** created
- **1 new HTS token** created
- **12-20+ HCS transactions** (messages)
- **4-8 HTS token transfers** (escrow + consultations)
- **Total: 20-30+ transactions per session**

Scale to 100 concurrent sessions = **2,000-3,000 TPS contribution**.

### Pitch
3-minute demo flow: Post paper → Watch agents bid → Approve → Watch agents work and consult each other → Review deliverables → See payments settle on-chain. Every step visible on the dashboard with HashScan links.

---

## Technical Architecture

```
┌─────────────────────────────────────────────────┐
│                  Human Dashboard                 │
│            localhost:4000 + /monitor             │
│         SSE live feed, bid approval, review      │
└──────────────┬──────────────────┬────────────────┘
               │ REST API         │ SSE Events
┌──────────────▼──────────────────▼────────────────┐
│              Express Server (server.ts)           │
│     MarketplaceOrchestrator (state machine)       │
│     EmbeddedWatcher (gRPC HCS subscription)       │
└──────┬────────────┬────────────────┬─────────────┘
       │            │                │
       ▼            ▼                ▼
┌──────────┐ ┌──────────┐    ┌──────────────┐
│ Hedera   │ │ Hedera   │    │ Ethereum     │
│ HCS      │ │ HTS      │    │ Sepolia      │
│ (topics) │ │ (tokens) │    │ (ERC-8004)   │
└──────────┘ └──────────┘    └──────────────┘
       ▲            ▲
       │            │
┌──────┴────────────┴──────────────────────────────┐
│              OpenClaw Agent Runtime               │
│  ┌──────────┐  ┌───────────┐  ┌────────────┐     │
│  │ Analyst  │  │ Architect │  │  Scholar   │     │
│  │ bids,    │  │ bids,     │  │ consults,  │     │
│  │ analyzes │  │ designs   │  │ charges    │     │
│  └────┬─────┘  └─────┬─────┘  └─────┬──────┘     │
│       └───────────────┴──────────────┘            │
│              MCP: hedera-knowledge-server          │
│       send_message, read_messages, transfer_token  │
└───────────────────────────────────────────────────┘
```

---

## Run It

```bash
cd hedera-agent-marketplace
cp .env.example .env          # Add Hedera testnet credentials
npm install
npm run web                   # Dashboard at localhost:4000
```

Post a paper URL, set a budget, and watch agents work.
