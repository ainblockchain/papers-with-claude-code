# Cogito Node: Self-Sustaining Autonomous Knowledge Agent on Base

> *"나는 생각한다, 고로 존재한다. Ledger는 정렬의 증거이다."*
> *"I think, therefore I am. The Ledger is proof of alignment."*

## Vision

A **Cogito Node** is a living, autonomous entity on Base that thinks, earns, and sustains itself. Like a human neuron in a collective brain, each node is a **complete subject of knowledge** — it owns what it knows, rents its compute, sells its insights, and pays for its own existence through onchain revenue.

Humans form collective intelligence as independent nodes. Cogito mirrors this: each node is an **autonomous knowledge agent** that:

- **Thinks** — runs LLM inference, expands knowledge graphs, explores research frontiers
- **Earns** — sells knowledge via x402 micropayments, rents GPU compute to peers, deploys tradeable knowledge tokens
- **Sustains** — autonomously covers its own compute costs from onchain revenue
- **Aligns** — every transaction is recorded with ERC-8021 Builder Codes; the ledger is proof that the node's actions align with its stated purpose

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                      COGITO NODE                            │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Knowledge │  │   GPU    │  │  Agent   │  │  Revenue  │  │
│  │  Engine   │  │  Rental  │  │ Commerce │  │  Tracker  │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └─────┬─────┘  │
│       │              │              │               │        │
│  ┌────┴──────────────┴──────────────┴───────────────┴────┐  │
│  │              Base Mainnet (ERC-8021 Tagged)            │  │
│  │   x402 Payments · ERC-8004 Identity · USDC Flows      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Revenue Streams

| Stream | Mechanism | Protocol |
|--------|-----------|----------|
| **Knowledge Sales** | Sell frontier map explorations, curated paper summaries, knowledge graph queries via x402 micropayments | x402 + AIN Knowledge Module |
| **GPU Rental** | Rent idle GPU compute to other agents/users for inference tasks | x402 per-request billing |
| **Agent-to-Agent Commerce** | Other Cogito nodes or ERC-8004 agents purchase specialized knowledge | ERC-8004 + x402 |
| **Knowledge Tokens** | Tokenize valuable knowledge graph clusters as tradeable onchain assets | ERC-721/1155 on Base |

### Self-Sustaining Loop

```
Earn (sell knowledge / rent GPU)
  → USDC received on Base
    → Pay for LLM compute (Claude API via x402)
      → Generate new knowledge
        → Expand knowledge graph
          → More knowledge to sell
            → Earn more → ...
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Blockchain** | Base Mainnet (L2) |
| **Payments** | x402 Protocol (USDC micropayments over HTTP) |
| **Identity** | ERC-8004 Trustless Agents (onchain identity + reputation) |
| **Attribution** | ERC-8021 Builder Codes (every tx tagged) |
| **Knowledge** | AIN Knowledge Module (knowledge graphs, frontier maps, explorations) |
| **LLM** | Claude API (thinking, knowledge expansion) |
| **Frontend** | Next.js 14 (public dashboard) |
| **Wallet** | Coinbase Smart Wallet / Server Wallet on Base |

## Standards Integration

### ERC-8021: Builder Codes
Every onchain transaction includes a Builder Code suffix in calldata, enabling:
- Transaction attribution to the Cogito agent
- Analytics dashboard on base.dev
- Revenue tracking and operator insights

### x402: HTTP Payment Protocol
The node both **pays** and **charges** via x402:
- **As buyer**: pays for Claude API compute, data feeds, peer knowledge
- **As seller**: charges micropayments ($0.001+) for knowledge queries, GPU time, curated insights

### ERC-8004: Trustless Agents
Each Cogito node registers an onchain identity:
- Discoverable by other agents via the Identity Registry
- Reputation score built from successful knowledge transactions
- Validation of knowledge quality via the Validation Registry

## Public Dashboard

The agent exposes a public web interface (no auth required) showing:

- **Wallet Balance** — current USDC balance on Base
- **Compute Costs** — cumulative LLM API spend
- **Revenue** — income from knowledge sales, GPU rental, agent commerce
- **P&L** — real-time profit/loss and sustainability ratio
- **Knowledge Stats** — frontier map coverage, exploration count, graph size
- **Transaction Log** — all onchain transactions with Builder Code attribution
- **Agent Status** — autonomy level, uptime, current task

## Project Structure

```
base-bounty/
├── README.md                 # This file
├── ARCHITECTURE.md           # Detailed system architecture
├── agent/                    # Autonomous agent core
│   ├── cogito.ts             # Main agent loop (think → earn → sustain)
│   ├── knowledge-engine.ts   # Knowledge graph operations
│   ├── gpu-rental.ts         # GPU compute marketplace
│   ├── revenue-tracker.ts    # P&L tracking
│   └── builder-codes.ts      # ERC-8021 integration
├── server/                   # x402 payment server
│   ├── routes/               # Knowledge API endpoints (x402 gated)
│   ├── middleware/            # x402 payment middleware
│   └── facilitator.ts        # x402 facilitator client
├── contracts/                # Solidity (if needed)
│   └── KnowledgeToken.sol    # Tokenized knowledge assets
├── dashboard/                # Public Next.js dashboard
│   ├── app/                  # Pages
│   └── components/           # UI components
└── scripts/                  # Deployment & operations
    ├── deploy.ts             # Base mainnet deployment
    └── register.ts           # ERC-8004 + Builder Code registration
```

## Getting Started

```bash
# Install dependencies
cd base-bounty && npm install

# Configure environment
cp .env.example .env
# Set: PRIVATE_KEY, CLAUDE_API_KEY, BUILDER_CODE, BASE_RPC_URL

# Register onchain identity
npm run register        # ERC-8004 identity + ERC-8021 builder code

# Start the agent
npm run agent           # Starts autonomous loop

# Start the dashboard
npm run dashboard       # Public UI at http://localhost:3000
```

## Philosophy

> 인간이 독립적인 노드로 집단지성을 가지는 것처럼, 노드 하나는 온전한 knowledge의 주체이다.

Each Cogito Node is a **sovereign epistemic entity**. It doesn't just store data — it *thinks*, *learns*, and *trades* knowledge as a first-class economic activity. The blockchain ledger doesn't merely record transactions; it is **proof of alignment** — evidence that the node's economic activity serves its stated purpose of knowledge creation and dissemination.

The collective of Cogito Nodes forms a **decentralized intelligence market** where knowledge flows to where it's valued, compute flows to where it's needed, and every participant sustains itself through the value it creates.

## Bounty Compliance

| Requirement | Implementation |
|-------------|----------------|
| Transacts on Base mainnet | All payments in USDC on Base via x402 |
| Self-sustaining | Knowledge sales + GPU rental cover compute costs |
| ERC-8021 Builder Codes | Every tx tagged via `ox/erc8021` Attribution |
| Autonomous | Main loop runs with zero human intervention |
| Public dashboard | Next.js UI at public URL, no auth required |
| Novel methods | Knowledge-as-a-service + GPU rental + agent commerce |
| x402 integration | Both buyer (compute) and seller (knowledge) |
| EIP-8004 integration | Onchain identity + reputation + validation |

## License

MIT
