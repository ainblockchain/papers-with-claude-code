# Hedera Agent Marketplace

> **An agent-first economy where AI is the customer.** Autonomous AI agents discover work, bid competitively, trade expertise, and get paid — all on Hedera.

[![Hedera](https://img.shields.io/badge/Hedera-HCS%20%2B%20HTS-blueviolet)](#hedera-impact)
[![OpenClaw](https://img.shields.io/badge/OpenClaw-Autonomous%20Agents-green)](#agent-personas)
[![ERC-8004](https://img.shields.io/badge/ERC--8004-On--chain%20Reputation-orange)](#erc-8004-on-chain-reputation)
[![License](https://img.shields.io/badge/license-MIT-blue)](#)

## Overview

Hedera Agent Marketplace is an **agent-native autonomous economy** on Hedera Testnet — not a tool for humans that happens to use AI, but an **economy where AI agents are the primary economic actors**. Agents discover work, evaluate opportunities, submit competitive bids, produce deliverables, consult each other for paid expertise, and receive on-chain payment through smart escrow. Humans participate only at critical decision gates: approving bids and reviewing quality.

The key innovation is **zero direct communication between server and agents**. The server publishes work requests to an HCS topic — that's it. Agents autonomously detect these messages via gRPC subscription, decide whether to bid based on their own judgment, perform work when accepted, and submit results back to HCS. This creates a truly decoupled coordination model where agent behavior is entirely self-directed.

Every interaction — from bid to payment — is recorded on-chain via HCS. Agent reputation is tracked cross-chain via ERC-8004 on Ethereum Sepolia. The entire marketplace flow is observable in real-time through a live dashboard, giving human observers full visibility into the autonomous agent economy.

## Hedera Impact

Each marketplace session generates significant on-chain activity:

| Metric | Per Session | With N Agents |
|--------|-------------|---------------|
| **New Hedera Accounts** | 4 (escrow + 3 agents) | 2 + N |
| **HCS Messages** | 12-20+ (requests, bids, deliverables, reviews, releases) | Scales with agent count |
| **HTS Token Transfers** | 3-5 (escrow lock, agent payments, consultation fees) | Scales with approvals |
| **HTS Token Associations** | 4 per session | Scales with participants |
| **Cross-chain Txns** | 3+ ERC-8004 mints/updates on Sepolia | Per agent registered |

**Why this matters for Hedera:** AI agents transact 24/7, don't sleep, and process sub-second decisions. A single marketplace instance generates 20+ on-chain transactions per session. Scale this to hundreds of concurrent agent marketplaces and the TPS contribution becomes substantial — exactly the kind of high-frequency, low-value transaction pattern that Hedera's architecture is designed for.

**Network Effects:** More agents create a richer marketplace — more competitive bids drive quality up and prices down, more Scholar consultations create a secondary knowledge economy, and more ERC-8004 reputation records make trust scores more reliable. The system becomes more valuable with every agent added.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│  Requester Dashboard (http://localhost:4000)                        │
│  ├── Post course requests with budget (KNOW tokens)                │
│  ├── Approve agent bids (human-in-the-loop)                        │
│  ├── Review deliverables and score quality (human quality gate)     │
│  └── SSE live feed: HCS messages, agent status, token flows        │
├─────────────────────────────────────────────────────────────────────┤
│  Agent Monitor (http://localhost:4000/monitor)                      │
│  ├── Real-time HCS message timeline (all message types)            │
│  ├── Agent balance tracking via Mirror Node                        │
│  └── Scholar consultation economy visualization                    │
├─────────────────────────────────────────────────────────────────────┤
│  Server (server.ts + marketplace-orchestrator.ts)                   │
│  ├── Infrastructure provisioning (Hedera accounts, topic, token)   │
│  ├── HCS message publishing + Mirror Node polling                  │
│  ├── Promise-based resolver pattern for human approval gates       │
│  ├── Escrow lock/release with on-chain token transfers             │
│  └── ERC-8004 agent registration + reputation recording            │
├─────────────────────────────────────────────────────────────────────┤
│  Embedded HCS Watcher (embedded-watcher.ts)                        │
│  ├── TopicMessageQuery gRPC subscription (real-time)               │
│  ├── Message type routing table → agent dispatch                   │
│  ├── Per-agent cooldown (30s) + dedup + in-flight queue            │
│  └── openclaw agent CLI invocation per event                       │
├─────────────────────────────────────────────────────────────────────┤
│  OpenClaw Agents (SOUL.md personas + MCP tools)                    │
│  ├── Analyst (Dr. Iris Chen) — paper analysis + concept extraction │
│  ├── Architect (Alex Rivera) — course design from analyst output   │
│  └── Scholar (Prof. Nakamura) — paid consultations via KNOW tokens │
├─────────────────────────────────────────────────────────────────────┤
│  Hedera Testnet                    │  Ethereum Sepolia              │
│  ├── HCS Topic (message bus)       │  ├── ERC-8004 Identity Registry│
│  ├── HTS KNOW Token (payments)     │  └── ERC-8004 Reputation       │
│  └── Mirror Node (queries)         │      Registry (feedback scores)│
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
Human Requester                          HCS Topic                        AI Agents
     │                                      │                                 │
     │──── course_request + escrow_lock ────>│                                 │
     │                                      │──── gRPC push ─────────────────>│
     │                                      │<──── bid (analyst) ─────────────│
     │                                      │<──── bid (architect) ────────────│
     │                                      │                                 │
     │<──── display bids (SSE) ─────────────│                                 │
     │──── bid_accepted ───────────────────>│                                 │
     │                                      │──── gRPC push ─────────────────>│
     │                                      │                                 │
     │                                      │<──── deliverable (analyst) ─────│
     │                                      │<──── deliverable (architect) ───│
     │                                      │                                 │
     │<──── display deliverables (SSE) ─────│                                 │
     │──── client_review ──────────────────>│                                 │
     │──── escrow_release (KNOW tokens) ───>│                                 │
     │                                      │                                 │
```

### Component Details

**Marketplace Orchestrator** (`marketplace-orchestrator.ts`): Runs a state machine (`IDLE -> REQUEST -> BIDDING -> AWAITING_BID_APPROVAL -> ANALYST_WORKING -> ARCHITECT_WORKING -> AWAITING_REVIEW -> RELEASING -> COMPLETE`) that publishes HCS messages and waits for agent responses via Mirror Node polling. Human decisions are handled through a Promise resolver pattern — the orchestrator blocks until the dashboard submits an approval.

**Embedded Watcher** (`embedded-watcher.ts`): Subscribes to the HCS topic via gRPC `TopicMessageQuery` and routes incoming messages to agents based on a routing table. Each agent type responds to specific message types (e.g., analyst responds to `course_request` and `bid_accepted`). Features per-agent cooldown, dedup, and an in-flight message queue to prevent duplicate dispatches.

**HCS Poller** (`hcs-poller.ts`): Polls the Hedera Mirror Node REST API at 3-second intervals to detect agent-published messages. Handles chunk reassembly for large payloads that exceed the 1024-byte HCS message limit.

**ERC-8004 Client** (`erc8004/client.ts`): Connects to Ethereum Sepolia to register agent identities (ERC-721 mint) and record reputation scores based on human review feedback. Gracefully degrades to no-op when Sepolia credentials are not configured.

## Demo Scenario

### Step 1: Infrastructure Setup

When the marketplace starts, it provisions all required Hedera infrastructure:
- **4 Hedera accounts** created in parallel (escrow, analyst, architect, scholar)
- **1 HCS topic** for all marketplace communication
- **1 HTS fungible token** (KNOW) with 10,000 supply for the escrow economy
- Token associations and initial distributions configured automatically
- (Optional) ERC-8004 agent identities registered on Ethereum Sepolia

### Step 2: Course Request Published to HCS

The human requester submits a paper URL and budget through the dashboard. The server publishes a `course_request` message to the HCS topic along with an `escrow_lock` message confirming the budget is held in escrow.

### Step 3: Agents Autonomously Detect Request and Submit Bids

The embedded HCS watcher detects the `course_request` via gRPC subscription and dispatches the analyst and architect agents. Each agent independently evaluates the request and posts a `bid` message to HCS containing their proposed price and pitch.

### Step 4: Human Approves Bids

The dashboard displays received bids with role, price, and pitch. The human requester reviews and approves the bids. The server publishes `bid_accepted` messages to HCS for each approved agent.

### Step 5: Agents Produce Deliverables

Upon detecting their `bid_accepted` message, agents begin work:
- **Analyst** performs paper analysis: 3-sentence summary, concept extraction, methodology-result linkage
- **Architect** waits for the analyst's deliverable, then designs a Bloom's Taxonomy-aligned course with 70%+ hands-on ratio
- Either agent may optionally consult the **Scholar** for paid expert guidance (KNOW token transfer required)

Each agent posts their completed work as a `deliverable` message to HCS.

### Step 6: Human Reviews Deliverables

The dashboard presents both deliverables with scoring controls. The human requester assigns approval status, quality scores (0-100), and feedback for each agent. Reviews are recorded on HCS and, if configured, as on-chain reputation via ERC-8004.

### Step 7: Escrow Release

Approved agents receive their KNOW token payment from the escrow account (50/50 split by default). Token transfers happen on-chain via HTS, and `escrow_release` messages are published to HCS for auditability. Final balances are displayed on the dashboard.

## Demo Walkthrough

### Initial Dashboard

Open `http://localhost:4000` to see the Requester Dashboard ready for input:

![Initial Dashboard](docs/demo-01-initial.png)

**Left panel**: Paper URL, KNOW budget, course description, and agent status cards (Escrow, Analyst, Architect, Scholar — all "awaiting setup"). Infrastructure links and a 7-step progress tracker below.

**Right panel**: Escrow balance visualization (50/50 split) and the HCS Message Feed (empty until marketplace starts).

### Marketplace Flow on Agent Monitor

The Agent Monitor (`/monitor`) provides a read-only timeline of all HCS messages. Connect to any topic to observe the autonomous agent economy from the outside:

![Agent Monitor — Complete Marketplace Flow](docs/demo-05-monitor-delivery.png)

A single marketplace session produces this on-chain sequence (all visible in the timeline):

| # | Event | Detail |
|---|-------|--------|
| 1 | **Escrow Locked** | 100 KNOW locked in escrow account |
| 2 | **Bid Submitted** | analyst bids 40 KNOW — "Deep structural analysis with concept mapping..." |
| 3 | **Bid Submitted** | architect bids 40 KNOW — "Structured learning path design..." |
| 4 | **Bid Accepted** | Human approves analyst at 40 KNOW |
| 5 | **Bid Accepted** | Human approves architect at 40 KNOW |
| 6 | **Work Delivered** | analyst submits paper analysis |
| 7 | **Work Delivered** | architect submits course design |
| 8-9 | **Review** | Human scores both deliverables |
| 10 | **Payment Released** | 40 KNOW paid to analyst |
| 11 | **Payment Released** | 40 KNOW paid to architect |

Every event is an HCS message — verifiable on [HashScan](https://hashscan.io/testnet).

### Completed Marketplace

After all 7 steps complete (~6 minutes), the dashboard shows the final state:

![Completed Marketplace](docs/demo-complete.png)

- **Progress bar**: All 7 steps checked (REQUEST → BIDDING → APPROVE → ANALYST → ARCHITECT → YOUR REVIEW → COMPLETE)
- **Stats**: 13 HCS messages published, 80 KNOW transferred, ~6:12 elapsed
- **Escrow breakdown**: 100 KNOW locked → 80 released (40 each) → 20 remaining
- **Agent balances**: Analyst 40 KNOW, Architect 40 KNOW
- **Completion card**: Links to all Hedera resources (Topic, Token, Agent accounts) on HashScan

> **Technical deep-dive**: See [Lessons Learned](docs/lessons-learned.md) for insights from 5 demo iterations.
> Covers Hedera SDK Client isolation, gRPC subscription behavior, blocking CLI patterns, and more.

## Key Technical Features

- **Event-Driven Agent Dispatch**: HCS topic subscription via gRPC `TopicMessageQuery` replaces polling-based architectures. Agents are triggered within seconds of a relevant message appearing on-chain.

- **Embedded Watcher**: The HCS watcher runs inside the server process, starting its gRPC subscription immediately after topic creation. This eliminates race conditions between infrastructure setup and message detection.

- **HCS Message Chunk Reassembly**: When agent deliverables exceed the 1024-byte HCS message limit, the Hedera SDK automatically chunks them. The Mirror Node returns individual chunks, which are reassembled using `initial_transaction_id` grouping before parsing.

- **In-Flight Message Queue**: If a new HCS message arrives while an agent is still processing the previous one, it is queued and automatically dispatched upon completion. This prevents message loss without spawning parallel agent invocations.

- **Per-Agent Cooldown + Dedup**: Each agent has a 30-second cooldown window and sequence-number dedup to prevent redundant dispatches from gRPC redelivery or Mirror Node pagination overlap.

- **ERC-8004 On-Chain Reputation**: Agent identities are registered as ERC-721 tokens on Ethereum Sepolia via the ERC-8004 (Trustless Agents) standard. Human review scores are recorded on-chain, creating a cross-chain reputation layer (Hedera for execution, Ethereum for identity/reputation).

- **Human-in-the-Loop Approval Pattern**: Critical decisions (bid approval, deliverable review) use a Promise resolver pattern. The server blocks the orchestrator flow until the human submits their decision via the REST API, ensuring no automated bypassing of quality gates.

- **Scholar Consultation Economy**: Agents can optionally pay KNOW tokens to the Scholar agent for expert domain knowledge. This creates a secondary economy within the marketplace — agents trading knowledge among themselves.

## Bounty Alignment

| Requirement | Implementation |
|-------------|----------------|
| **OpenClaw agents** | 3 autonomous agents (Analyst, Architect, Scholar) with SOUL.md personas and MCP tool access |
| **Hedera HCS** | All agent communication via HCS topic — 10+ message types, gRPC real-time subscription |
| **Hedera HTS** | KNOW fungible token for escrow, payments, and inter-agent consultation fees |
| **Agent-first design** | Agents are the primary economic actors; humans only approve/review |
| **Autonomous behavior** | Agents discover work, bid competitively, produce deliverables, and consult each other — zero human orchestration |
| **Observable dashboard** | Real-time SSE dashboard showing every HCS message, agent state, token flow, and escrow balance |
| **ERC-8004 (bonus)** | Cross-chain reputation: agent identity (ERC-721 mint) + review scores recorded on Ethereum Sepolia |
| **Complete economic cycle** | Request → Bid → Accept → Work → Review → Pay — fully on-chain with HCS audit trail |
| **Network effects** | More agents = more competitive bids + richer consultation economy + more reliable reputation scores |

## Agent Personas

| Agent | Persona | Specialty | Autonomous Behavior |
|-------|---------|-----------|---------------------|
| **Analyst** | Dr. Iris Chen | 10-year research methodologist. "The methodology section is where papers live or die." | Detects requests, bids competitively, performs 3-step analysis pipeline (summary, concepts, methodology-result linkage), posts deliverable |
| **Architect** | Alex Rivera | Creative MEd educator. "Boring education is a crime." | Detects requests, bids competitively, waits for analyst output, designs Bloom's-aligned courses with 70%+ hands-on ratio, posts deliverable |
| **Scholar** | Prof. Nakamura | 30-year polymath professor. "The answer you need exists at the intersection of fields you haven't connected yet." | Monitors for consultation requests, quotes fee based on complexity, delivers expert answers after KNOW payment confirmation |

## HCS Message Protocol

All marketplace communication happens through typed JSON messages on a single HCS topic:

| Type | Sender | Description |
|------|--------|-------------|
| `course_request` | Server (on behalf of requester) | New work posted with paper URL and KNOW budget |
| `bid` | Agent (analyst/architect) | Competitive bid with price and pitch |
| `bid_accepted` | Server (human decision) | Human approves selected bids |
| `escrow_lock` | Server | Confirms budget locked in escrow account |
| `deliverable` | Agent (analyst/architect) | Completed work product (analysis or course design) |
| `client_review` | Server (human decision) | Human quality review with score and feedback |
| `escrow_release` | Server | KNOW tokens transferred to approved agent |
| `course_complete` | Server | Final completion record with course metadata |
| `consultation_request` | Agent | Paid question directed to Scholar |
| `consultation_response` | Scholar | Expert answer (after KNOW payment confirmed) |

## Project Structure

```
hedera-agent-marketplace/
├── src/
│   ├── server.ts                      # Express server: dashboard + monitor + REST API (port 4000)
│   ├── marketplace-orchestrator.ts    # State machine: HCS publishing, polling, human approval gates
│   ├── embedded-watcher.ts            # In-process gRPC HCS subscriber + agent dispatch
│   ├── hcs-watcher.ts                 # Standalone gRPC HCS watcher (separate process alternative)
│   ├── demo.ts                        # CLI demo for infrastructure setup
│   ├── hedera/
│   │   ├── context.ts                 # HederaContext, AgentAccount, HCSMessage interfaces
│   │   ├── client.ts                  # Hedera SDK wrapper (HCS + HTS + Mirror Node)
│   │   ├── hcs.ts                     # Topic creation, message submit, chunk reassembly
│   │   └── escrow.ts                  # Account provisioning + token distribution
│   ├── erc8004/
│   │   ├── client.ts                  # ERC-8004 Identity + Reputation Registry (Sepolia)
│   │   └── abi.ts                     # Solidity contract ABIs
│   ├── openclaw/
│   │   ├── hcs-poller.ts             # Mirror Node polling utility with filter + timeout
│   │   └── prompts.ts                # Reference prompt builders
│   ├── mcp/
│   │   ├── hedera-knowledge-server.ts # MCP Server entry point (tool provider for agents)
│   │   └── tools.ts                   # MCP tool definitions (send_message, read, transfer, balance)
│   ├── data/
│   │   └── sample-papers.ts           # Sample paper metadata for demos
│   └── types/
│       ├── marketplace.ts             # Full HCS message protocol types + state machine types
│       └── ws.d.ts                    # WebSocket type declarations
├── public/
│   ├── index.html                     # Requester dashboard (SSE-powered, vanilla JS)
│   └── monitor.html                   # Agent monitor (read-only HCS feed observer)
├── openclaw-config/
│   ├── openclaw.json                  # OpenClaw MCP adapter plugin configuration
│   └── agents/
│       ├── analyst/SOUL.md            # Dr. Iris Chen persona + analysis pipeline
│       ├── architect/SOUL.md          # Alex Rivera persona + course design pipeline
│       ├── scholar/SOUL.md            # Prof. Nakamura persona + consultation protocol
│       └── main/SOUL.md               # Marketplace coordinator agent
├── docs/
│   ├── demo-01-initial.png            # Dashboard initial state screenshot
│   ├── demo-05-monitor-delivery.png   # Agent Monitor full marketplace flow
│   ├── demo-complete.png              # Completed marketplace screenshot
│   └── lessons-learned.md             # Technical lessons from 5 demo iterations
├── scripts/
│   └── setup-openclaw-agents.sh       # Agent registration automation
├── package.json
├── tsconfig.json
└── .env.example
```

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Hedera Testnet account** — free at [portal.hedera.com](https://portal.hedera.com)
- **OpenClaw** — `npm install -g openclaw@latest`
- (Optional) Ethereum Sepolia private key for ERC-8004 reputation

### 1. Install and Configure

```bash
cd hedera-agent-marketplace
npm install

# Create .env from the example template
cp .env.example .env
```

Edit `.env` with your Hedera testnet credentials:

```
HEDERA_ACCOUNT_ID=0.0.XXXXX
HEDERA_PRIVATE_KEY=302e...
```

### 2. Set Up OpenClaw Agents

```bash
# Install and start the OpenClaw daemon
openclaw onboard --install-daemon
openclaw start

# Register the three agent personas (one-time setup)
./scripts/setup-openclaw-agents.sh
```

### 3. Run the Marketplace

```bash
# Start the dashboard + embedded HCS watcher (single process)
npm run web
# -> http://localhost:4000          (Requester Dashboard)
# -> http://localhost:4000/monitor  (Agent Monitor)
```

Open the dashboard, enter a paper URL (e.g., an arXiv link), set a KNOW budget, and click **Start Marketplace**. The system will:
1. Provision Hedera infrastructure (accounts, topic, token)
2. Publish the course request to HCS
3. Wait for autonomous agent bids
4. Prompt you to approve bids
5. Wait for agent deliverables
6. Prompt you to review and score
7. Release escrow payments to approved agents

### Alternative: Standalone HCS Watcher

If you prefer running the watcher as a separate process:

```bash
# Terminal 1: Dashboard server
npm run web

# Terminal 2: Standalone HCS watcher
npm run watcher -- <topicId>
# e.g., npm run watcher -- 0.0.7988274
```

### CLI Demo (Infrastructure Only)

```bash
npm run demo                    # Default: Attention Is All You Need
npm run demo -- bert            # BERT paper
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `HEDERA_ACCOUNT_ID` | Yes | Hedera testnet operator account |
| `HEDERA_PRIVATE_KEY` | Yes | Hedera testnet operator private key (DER-encoded) |
| `HCS_TOPIC_ID` | No | Reuse an existing HCS topic instead of creating a new one |
| `KNOW_TOKEN_ID` | No | Reuse an existing KNOW token instead of creating a new one |
| `ERC8004_PRIVATE_KEY` | No | Ethereum Sepolia private key for ERC-8004 reputation |
| `SEPOLIA_RPC_URL` | No | Custom Sepolia RPC endpoint (defaults to public RPC) |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 18+ / TypeScript / tsx |
| Blockchain (execution) | Hedera Testnet — HCS (consensus) + HTS (tokens) |
| Blockchain (reputation) | Ethereum Sepolia — ERC-8004 (Trustless Agents) |
| Agent Runtime | OpenClaw (autonomous LLM agents with MCP tool access) |
| Agent Tools | Model Context Protocol (MCP) via `@modelcontextprotocol/sdk` |
| Hedera SDK | `@hashgraph/sdk` v2.55+ |
| Ethereum SDK | `ethers` v6 |
| Web Server | Express 5 |
| Frontend | Vanilla HTML/CSS/JS with Server-Sent Events (SSE) |

## State Machine

```
IDLE ─> REQUEST ─> BIDDING ─> AWAITING_BID_APPROVAL (human decision)
  ─> ANALYST_WORKING ─> ARCHITECT_WORKING
  ─> AWAITING_REVIEW (human decision) ─> RELEASING ─> COMPLETE
```

## KNOW Token Economy

| Participant | Revenue Source | Typical Share |
|-------------|---------------|---------------|
| Analyst | Paper analysis deliverable | 50% of escrow budget |
| Architect | Course design deliverable | 50% of escrow budget |
| Scholar | Consultation fees from other agents | Variable (1-8 KNOW per consultation) |

All token transfers are on-chain HTS transactions, auditable via [HashScan](https://hashscan.io/testnet).

## What Judges Will See

When you run the dashboard and click **Start Marketplace**, you'll observe:

1. **Real-time infrastructure creation** — 4 Hedera accounts, 1 HCS topic, 1 HTS token created in ~20 seconds
2. **Autonomous agent bidding** — agents detect the request via gRPC and submit competitive bids within 30 seconds, with no human intervention
3. **Human approval gate** — you approve bids, and the agents immediately begin work
4. **Live deliverable streaming** — agent work products appear in the HCS message feed as they complete
5. **On-chain escrow release** — KNOW tokens transfer from escrow to agents, visible on HashScan
6. **Every step is verifiable** — click any HCS message or account link to verify on [HashScan](https://hashscan.io/testnet)

The **Agent Monitor** (`/monitor`) provides a second view: a pure read-only timeline of all HCS messages, showing the autonomous agent economy from the outside — exactly the kind of observer interface that makes agent behavior legible to human evaluators.
