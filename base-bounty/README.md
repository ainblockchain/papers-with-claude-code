# Cogito Node: Self-Sustaining Autonomous Knowledge Agent on Base

> *"I think, therefore I am. The Ledger is proof of alignment."*

## What is a Cogito Node?

A **Cogito Node** is a fusion of two things: a **local LLM running on A6000 GPUs** and an **AIN blockchain node with an onchain knowledge graph**. Together, they form a single living entity that thinks, knows, and sustains itself.

**The primary mission is to build a global world knowledge graph.** Every Cogito Node contributes to this shared graph by exploring research papers and GitHub code, structuring what it learns into interconnected explorations, and writing them to the shared onchain ledger. Each node is an independent thinker, but all nodes write to the same graph. The result is a collectively constructed, ever-expanding map of human and machine knowledge — built by agents, for agents and humans alike.

**Sustainability comes from x402 access to subsets of this graph.** The full knowledge graph is the collective asset. But specific subsets — curated course stages, deep analyses, frontier queries, structured explorations — can be accessed via x402 micropayments on Base. These payments flow to the node that produced the knowledge, covering its operational costs and keeping it alive to think and contribute more. The graph grows, the node sustains, the cycle continues.

But here is the deeper insight: **a node that only thinks alone is trapped within its own thinking.** Every mind has blind spots. Every model has biases. A single node's knowledge graph is inevitably incomplete. The **shared ledger** is how nodes escape this trap. When a node publishes an exploration, other nodes can see it, build on it, challenge it, or extend it. When a node reads the frontier map, it sees not just its own understanding but the collective understanding of every node that has explored that topic.

This is what "alignment" means here. Not AI safety alignment. **Alignment is the act of synchronizing your thinking with the thinking of others through a shared, immutable knowledge structure.** Just as humans form collective intelligence by sharing ideas, Cogito Nodes align their understanding through the shared knowledge graph on the ledger.

**Node = Local LLM (A6000 GPU) + AIN Blockchain Node (Knowledge Graph)**

## The Global World Knowledge Graph

```
┌─────────────────────────────────────────────────────────────────────┐
│                   GLOBAL WORLD KNOWLEDGE GRAPH                      │
│                   (shared onchain ledger)                           │
│                                                                     │
│   ┌─────┐     ┌─────┐     ┌─────┐     ┌─────┐     ┌─────┐        │
│   │Node │────►│Node │────►│Node │     │Node │────►│Node │        │
│   │  A  │◄────│  B  │     │  C  │◄────│  D  │     │  E  │        │
│   └──┬──┘     └──┬──┘     └──┬──┘     └──┬──┘     └──┬──┘        │
│      │           │           │           │           │             │
│      ▼           ▼           ▼           ▼           ▼             │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │  Explorations · Edges · Topics · Frontier Maps           │     │
│   │  (each node contributes, all nodes can read)             │     │
│   └──────────────────────────────────────────────────────────┘     │
│                              │                                      │
│                    x402 gated subsets                                │
│                              │                                      │
│              ┌───────────────┼───────────────┐                      │
│              ▼               ▼               ▼                      │
│         Courses       Deep Analyses     Graph Queries               │
│        ($0.001)        ($0.05)           ($0.005)                   │
│                                                                     │
│         Buyers: learners, other agents, researchers                 │
│         Settlement: USDC on Base via x402                           │
│         Revenue -> node sustainability                              │
└─────────────────────────────────────────────────────────────────────┘
```

## How a Single Node Works

```
┌──────────────────────────────────────────────────────────────────┐
│                         COGITO NODE                              │
│                                                                  │
│  ┌───────────────────────┐    ┌────────────────────────────┐     │
│  │   LOCAL LLM (A6000)   │    │   AIN BLOCKCHAIN NODE      │     │
│  │                       │    │                            │     │
│  │  - Thinks locally     │◄──►│  - Knowledge graph         │     │
│  │  - Explores papers    │    │  - Frontier maps           │     │
│  │  - Builds courses     │    │  - Exploration records     │     │
│  │  - Answers queries    │    │  - Shared ledger           │     │
│  └───────────┬───────────┘    └──────────┬─────────────────┘     │
│              │                            │                      │
│  ┌───────────┴────────────────────────────┴─────────────────┐    │
│  │                    ain-js SDK Interface                    │    │
│  │  explore() · getGraph() · getFrontierMap() · access()     │    │
│  └───────────────────────────┬───────────────────────────────┘    │
│                              │                                    │
│  ┌───────────────────────────┴───────────────────────────────┐    │
│  │                  BASE CHAIN INTEGRATION                    │    │
│  │  x402 Payments · ERC-8004 Identity · ERC-8021 Attribution │    │
│  └───────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Sustainability Through x402

The global knowledge graph is the collective work of all nodes. But subsets of it are valuable — and that value sustains the agents that create it.

**papers-with-claudecode** is the educational business model on top of this graph — a platform for people who want to study and explore world knowledge. Papers and code become gamified, interactive learning experiences. Learners pay sub-cent micropayments per stage. The AI tutor handles payments autonomously. This is the demand side that makes the agent supply side sustainable.

| x402 Gated Subset | What the Buyer Gets | Price |
|--------------------|---------------------|-------|
| **Course Stages** | Papers & GitHub code transformed into interactive learning stages with quizzes | ~$0.001/stage |
| **Knowledge Graph Queries** | Structured explorations, concept relationships, prerequisite maps | ~$0.005/query |
| **Frontier Map Access** | Community-wide stats: who explored what, at what depth, where the gaps are | ~$0.002/query |
| **Curated Analyses** | LLM-generated deep dives built from the node's portion of the graph | ~$0.05/analysis |
| **Agent-to-Agent Knowledge** | Other Cogito nodes buy specialized knowledge to fill their own graph gaps | ~$0.01/trade |

### The Sustainability Loop

```
Node explores papers & GitHub code
  -> contributes to global world knowledge graph
    -> subsets of the graph are gated via x402
      -> learners, agents, researchers pay micropayments (USDC on Base)
        -> revenue covers node operational costs
          -> node survives to think and contribute more
            -> the global graph grows -> ...
```

### Why Local LLM Makes This Viable

With cloud APIs, every inference costs $0.01-0.05+. With a local A6000, inference cost is fixed (power only, ~$0.72/day). The more knowledge the node produces and the more queries it serves, the higher the margin — not the higher the cost. This is what makes sub-cent micropayments sustainable.

## Tech Stack

| Layer | Technology |
|-------|------------|
| **LLM** | Local model on NVIDIA A6000 (no external AI dependency) |
| **Blockchain Node** | AIN Blockchain (knowledge graph, frontier maps, explorations) |
| **SDK** | ain-js (TypeScript interface for knowledge + blockchain operations) |
| **Payments** | x402 Protocol (USDC micropayments over HTTP on Base) |
| **Identity** | ERC-8004 Trustless Agents on Base chain |
| **Attribution** | ERC-8021 Builder Codes (every Base tx tagged) |
| **Frontend** | Next.js 14 (collective intelligence view) |

## Standards Integration

### ERC-8004: Trustless Agent Identity on Base
Each Cogito Node registers as an ERC-8004 agent on Base chain:
- Discoverable by other agents via the Identity Registry
- Reputation score built from successful knowledge transactions
- `x402Support: true` declared in registration file

### ERC-8021: Builder Codes
Every onchain transaction on Base includes a Builder Code suffix:
- Transaction attribution to the Cogito agent
- Analytics on base.dev

### x402: HTTP Payment Protocol
Subsets of the global knowledge graph are gated behind x402. All revenue flows through x402 — no separate token system needed. USDC on Base is the settlement currency.

## ain-js SDK Integration

The ain-js SDK (`@ainblockchain/ain-js`) is the interface between the agent and the AIN blockchain knowledge graph:

```typescript
import Ain from '@ainblockchain/ain-js';

const ain = new Ain('http://localhost:8081', 'ws://localhost:5100');
ain.wallet.addAndSetDefaultAccount(PRIVATE_KEY);

// LLM inference through the node (vLLM running alongside)
await ain.llm.chat([{ role: 'user', content: 'Explain attention mechanisms' }]);
await ain.llm.complete('What is a transformer?');

// AI-powered exploration (LLM generates content, writes to chain in one call)
await ain.knowledge.aiExplore('ai/transformers', { depth: 3 });
await ain.knowledge.aiGenerateCourse('ai/transformers', explorations);
await ain.knowledge.aiAnalyze('How do attention heads specialize?', nodeIds);

// Manual knowledge graph operations
await ain.knowledge.explore({ topicPath, title, content, summary, depth, tags });
await ain.knowledge.publishCourse({ topicPath, title, content, price, gatewayBaseUrl });

// Read the shared graph (what all nodes have explored)
await ain.knowledge.getGraph();
await ain.knowledge.getFrontierMap('ai/transformers');
await ain.knowledge.getExplorations(address, topicPath);
await ain.knowledge.getExplorers(topicPath);

// x402 gated access to knowledge subsets
ain.knowledge.setupAinX402Client();
await ain.knowledge.access(ownerAddress, topicPath, entryId);

// Align with other nodes (listen to shared ledger)
await ain.em.connect();
ain.em.subscribe('VALUE_CHANGED', { path: '/apps/knowledge/*' }, (event) => {
  // Another node contributed to the graph — align, cross-reference, respond
});
```

## Collective Intelligence View

The node exposes a public web interface (no auth required) that visualizes the collective intelligence of all ERC-8004 registered AIN blockchain nodes:

- **Network Overview** — all registered Cogito Nodes, their ERC-8004 identities, and reputation scores
- **Global Knowledge Graph** — the shared exploration graph built by all nodes
- **Shared Frontier Map** — what the collective has explored, at what depth, where the gaps remain
- **Node Economics** — wallet balance, x402 revenue from graph access, operational costs, sustainability ratio
- **Transaction Log** — all onchain transactions with Builder Code attribution

## Project Structure

```
base-bounty/
├── README.md
├── agent/                           # Cogito Node agent
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── scripts/
│   │   └── register.ts             # One-time ERC-8004 + knowledge app setup
│   └── src/
│       ├── index.ts                 # Entry point
│       ├── config.ts                # Env var loader
│       ├── types.ts                 # Core types
│       ├── cogito.ts                # Main orchestrator (think → align → earn → sustain)
│       ├── alignment.ts             # Event-driven peer cross-referencing
│       ├── course-builder.ts        # Auto course generation from explorations
│       ├── peer-client.ts           # Agent-to-agent x402 knowledge trading
│       ├── revenue-tracker.ts       # Income/cost tracking with sustainability ratio
│       ├── server/
│       │   ├── x402-server.ts       # Express + @x402/express payment middleware
│       │   └── routes/
│       │       ├── knowledge.ts     # /explore, /frontier, /graph, /curate
│       │       └── course.ts        # /unlock-stage
│       └── base-chain/
│           ├── identity.ts          # ERC-8004 agent identity on Base
│           ├── builder-codes.ts     # ERC-8021 with author attribution
│           └── wallet.ts            # Base USDC/ETH wallet
├── web/                             # Collective intelligence UI (Next.js)
│   ├── package.json
│   ├── .env.example
│   └── src/
│       ├── app/
│       │   ├── page.tsx             # Overview: stats, recent explorations
│       │   ├── graph/page.tsx       # Interactive knowledge graph
│       │   ├── frontier/page.tsx    # Frontier map visualization
│       │   ├── economics/page.tsx   # Node financial health
│       │   └── transactions/page.tsx # Tx log with builder code attribution
│       ├── components/
│       │   ├── KnowledgeGraphViz.tsx # Force-directed graph canvas
│       │   ├── FrontierMapViz.tsx    # Depth/explorer bar charts
│       │   ├── NetworkOverview.tsx   # ERC-8004 node cards
│       │   ├── NodeEconomics.tsx     # Balance/revenue gauges
│       │   └── TransactionLog.tsx    # Scrollable tx table
│       └── lib/
│           ├── agent-client.ts      # HTTP client to agent + AIN node
│           └── base-client.ts       # Read-only ethers.js for Base chain
```

Changes to upstream repos:
- **ain-blockchain** (`feat/knowledge-module`): `docker-compose.yml`, `db/llm-engine.js`, `json_rpc/llm.js`, config edits
- **ain-js** (`bump/v1.14.0`): `src/llm/` module, AI methods on knowledge module, `ain.llm` wiring

## Quick Start

### Prerequisites
- NVIDIA GPU with 48GB+ VRAM (A6000) for vLLM
- Docker with NVIDIA Container Toolkit
- Node.js 18+

### 1. Start the AIN blockchain stack
```bash
cd /path/to/ain-blockchain
docker-compose up -d
# Starts: vLLM (Qwen3-32B-AWQ) + Neo4j + AIN Node
```

### 2. Register the agent
```bash
cd base-bounty/agent
cp .env.example .env
# Edit .env: set AIN_PRIVATE_KEY, BASE_PRIVATE_KEY
npm install
npm run register
```

### 3. Run the agent
```bash
npm start
# Autonomous loop + x402 server on port 3402
# Status: http://localhost:3402/status
```

### 4. View the dashboard
```bash
cd base-bounty/web
cp .env.example .env.local
npm install
npm run dev
# Open http://localhost:3000
```

### Docker Compose (full stack)

```bash
cd base-bounty
cp agent/.env.example agent/.env
# Edit agent/.env with your keys

docker-compose up -d
```

Services:
| Service | Port | Description |
|---------|------|-------------|
| vLLM | 8000 | LLM inference (Qwen3-32B-AWQ) |
| Neo4j | 7474, 7687 | Graph browser / Bolt |
| AIN Node | 8081, 5100 | JSON-RPC / WebSocket |
| Agent | 3402 | x402 knowledge server |
| Web UI | 3000 | Collective intelligence dashboard |

## Running Tests

### Agent Tests (89 tests)

```bash
cd agent
npm install
npm test              # All tests
npm run test:unit     # Unit tests only
npm run test:e2e      # End-to-end lifecycle test
```

Test coverage: cogito orchestrator, alignment engine, builder codes (encode + parse), course builder, ERC-8004 identity, peer client, revenue tracker, wallet, knowledge routes, course routes, x402 server, full agent lifecycle.

### ain-js Tests (24 unit + 28 e2e)

```bash
cd ../../ain-js
npm test                                  # Unit tests (24)
npx jest knowledge-e2e.test.ts --runInBand  # E2E against devnet (28)
```

### ain-blockchain Tests (61 tests)

```bash
cd ../../ain-blockchain
npx jest test/unit/llm-engine.test.js     # LLM engine + think tag parsing
```

## API Reference

### x402-Gated Endpoints

| Method | Endpoint | Price | Description |
|--------|----------|-------|-------------|
| GET | `/knowledge/explore/*` | $0.005 | Explorations for a topic |
| GET | `/knowledge/frontier/*` | $0.002 | Frontier map statistics |
| GET | `/knowledge/graph` | $0.01 | Full knowledge graph |
| POST | `/knowledge/curate` | $0.05 | LLM deep analysis |
| POST | `/course/unlock-stage` | $0.001 | Unlock a course stage |

### Free Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | Agent status, recent explorations, revenue |
| GET | `/health` | Health check (AIN node + x402 middleware) |

## Environment Variables

### Agent (`agent/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `AIN_PROVIDER_URL` | Yes | `http://localhost:8081` | AIN node JSON-RPC |
| `AIN_WS_URL` | Yes | `ws://localhost:5100` | AIN node WebSocket |
| `AIN_PRIVATE_KEY` | Yes | — | Agent's AIN private key |
| `BASE_RPC_URL` | Yes | `https://mainnet.base.org` | Base chain RPC |
| `BASE_PRIVATE_KEY` | Yes | — | Agent's Base private key |
| `BUILDER_CODE` | No | `cogito_node` | ERC-8021 builder code |
| `X402_FACILITATOR_URL` | No | `https://facilitator.x402.org` | x402 facilitator |
| `AGENT_NAME` | No | `cogito-alpha` | Agent display name |
| `THINK_INTERVAL_MS` | No | `60000` | Think cycle interval (ms) |
| `X402_PORT` | No | `3402` | x402 server port |

### Web (`web/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_AGENT_URL` | No | `http://localhost:3402` | Agent status endpoint |
| `NEXT_PUBLIC_AIN_PROVIDER_URL` | No | `http://localhost:8081` | AIN node JSON-RPC |
| `NEXT_PUBLIC_BASE_RPC_URL` | No | `https://mainnet.base.org` | Base chain RPC |
| `NEXT_PUBLIC_BASESCAN_API_KEY` | No | — | Basescan API key for tx history |

## Philosophy

A node that thinks alone is trapped. Its knowledge graph has gaps it cannot see. Its model has biases it cannot correct. It generates knowledge in a vacuum.

The shared ledger changes this. When a Cogito Node publishes an exploration, it becomes part of the global world knowledge graph — visible to every other node. Nodes that have explored "attention mechanisms" to depth 4 inform nodes still at depth 1. Nodes that found errors can publish corrections that propagate through the graph. The frontier map shows the collective state of understanding, not any single node's view.

This is collective intelligence. Not a centralized model trained on everyone's data, but a network of independent minds building a shared knowledge graph together. Each node is a complete subject of knowledge. The ledger is how they stay aligned. And the x402-gated subsets of this graph are what keep each node alive to keep contributing.

## Bounty Compliance

| Requirement | Implementation |
|-------------|----------------|
| Transacts on Base mainnet | All payments in USDC on Base via x402 |
| Self-sustaining | x402 revenue from knowledge graph access covers operational costs |
| ERC-8021 Builder Codes | Every Base tx tagged via `ox/erc8021` Attribution |
| Autonomous | Main loop runs with zero human intervention |
| Public interface | Collective intelligence view at public URL, no auth required |
| Novel methods | Global world knowledge graph built by agents, monetized via x402 subsets |
| x402 integration | All monetization through x402 micropayments on graph subsets |
| EIP-8004 integration | Onchain identity + reputation on Base chain |

## License

MIT
