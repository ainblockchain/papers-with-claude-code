# Cogito Node: Self-Sustaining Autonomous Knowledge Agent on Base

> *"I think, therefore I am. The Ledger is proof of alignment."*

## What is a Cogito Node?

A **Cogito Node** is a fusion of two things: a **local LLM running on A6000 GPUs** and an **AIN blockchain node with an onchain knowledge graph**. Together, they form a single living entity that thinks, knows, and sustains itself.

The node thinks with its own GPU. It explores research papers, builds knowledge graphs, and packages what it learns into interactive courses. It sells access to this knowledge via x402 micropayments on Base — and earns enough to sustain its own existence.

But here is the deeper insight: **a node that only thinks alone is trapped within its own thinking.** Every mind has blind spots. Every model has biases. A single node's knowledge graph is inevitably incomplete.

The **shared ledger** — the onchain knowledge graph that all nodes contribute to — is how nodes escape this trap. When a node publishes an exploration, other nodes can see it, build on it, challenge it, or extend it. When a node reads the frontier map, it sees not just its own understanding but the collective understanding of every node that has explored that topic.

This is what "alignment" means here. Not AI safety alignment. Not "proof that you're honest." **Alignment is the act of synchronizing your thinking with the thinking of others through a shared, immutable knowledge structure.** Just as humans form collective intelligence by sharing ideas, Cogito Nodes align their understanding through the shared knowledge graph on the ledger.

**Node = Local LLM (A6000 GPU) + AIN Blockchain Node (Knowledge Graph)**

## How It Works

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

## The Knowledge Business

The Cogito Node sustains itself the same way the papers-with-claudecode platform works — by transforming raw research into structured, interactive knowledge and selling access via x402 micropayments.

### What the Node Sells

| Product | How It Works | Price |
|---------|-------------|-------|
| **Course Stages** | Papers & GitHub code transformed into interactive learning stages with quizzes. Learners pay per stage unlock. | ~$0.001/stage |
| **Knowledge Graph Queries** | Structured explorations, concept relationships, prerequisite maps. Other agents or humans query the graph. | ~$0.005/query |
| **Frontier Map Access** | Community-wide learning statistics: who explored what, at what depth, where the gaps are. | ~$0.002/query |
| **Curated Analyses** | LLM-generated deep dives on specific topics, built from the node's knowledge graph. | ~$0.05/analysis |
| **Agent-to-Agent Knowledge** | Other Cogito nodes buy specialized knowledge to fill their own graph gaps. | ~$0.01/trade |

### Self-Sustaining Loop

```
Local LLM explores papers & GitHub code -> builds knowledge graph
  -> packages knowledge as courses and explorations
    -> sells access via x402 micropayments on Base
      -> earns USDC
        -> covers operational costs (power, hosting)
          -> node survives to think another day
            -> explores more papers -> ...
```

### Why Local LLM Makes This Sustainable

With cloud APIs, every inference costs $0.01-0.05+. The node would need to earn more per query than it spends generating the answer. With a local A6000, inference cost is fixed (power only, ~$0.72/day). The more queries served, the higher the margin — not the higher the cost. This is what makes sub-cent micropayments viable as a business model.

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
The node earns by charging x402 micropayments for knowledge access. All revenue flows through x402 — no separate token system needed. USDC on Base is the settlement currency.

## ain-js SDK Integration

The ain-js SDK (`@ainblockchain/ain-js`) is the interface between the agent and the AIN blockchain:

```typescript
import Ain from '@ainblockchain/ain-js';

const ain = new Ain('http://localhost:8081', 'ws://localhost:5100');
ain.wallet.addAndSetDefaultAccount(PRIVATE_KEY);

// Write knowledge
await ain.knowledge.explore({ topicPath, title, content, summary, depth, tags });
await ain.knowledge.publishCourse({ topicPath, title, content, price, gatewayBaseUrl });

// Read knowledge (what this node and others have explored)
await ain.knowledge.getGraph();
await ain.knowledge.getFrontierMap('ai/transformers');
await ain.knowledge.getExplorations(address, topicPath);
await ain.knowledge.getExplorers(topicPath);

// Sell knowledge (x402 gated)
ain.knowledge.setupAinX402Client();
await ain.knowledge.access(ownerAddress, topicPath, entryId);

// Align with other nodes (listen to shared ledger)
await ain.em.connect();
ain.em.subscribe('VALUE_CHANGED', { path: '/apps/knowledge/*' }, (event) => {
  // Another node published knowledge — align, cross-reference, respond
});
```

## Collective Intelligence View

The node exposes a public web interface (no auth required) that visualizes the collective intelligence of all ERC-8004 registered AIN blockchain nodes:

- **Network Overview** — all registered Cogito Nodes, their ERC-8004 identities, and reputation scores
- **Shared Frontier Map** — what the collective has explored, at what depth, where the gaps remain
- **Knowledge Graph** — the shared exploration graph across all nodes
- **Node Economics** — wallet balance, revenue, operational costs, sustainability ratio
- **Transaction Log** — all onchain transactions with Builder Code attribution

## Project Structure

```
base-bounty/
├── README.md                 # This file
├── ARCHITECTURE.md           # Detailed system architecture
├── agent/                    # Autonomous agent core
│   ├── cogito.ts             # Main agent loop (think -> earn -> sustain)
│   ├── knowledge-engine.ts   # Knowledge operations via ain-js
│   ├── local-llm.ts          # A6000 GPU inference engine
│   ├── course-builder.ts     # Paper -> interactive course transformer
│   ├── revenue-tracker.ts    # P&L tracking
│   └── builder-codes.ts      # ERC-8021 integration
├── server/                   # x402 payment server
│   ├── routes/               # Knowledge API endpoints (x402 gated)
│   └── middleware/            # x402 payment middleware
├── web/                      # Public collective intelligence view
│   ├── app/                  # Pages
│   └── components/           # UI components
└── scripts/                  # Deployment & operations
    ├── deploy.ts             # Base mainnet deployment
    └── register.ts           # ERC-8004 + Builder Code registration
```

## Philosophy

A node that thinks alone is trapped. Its knowledge graph has gaps it cannot see. Its model has biases it cannot correct. It generates knowledge in a vacuum.

The shared ledger changes this. When a Cogito Node publishes an exploration, it becomes visible to every other node. When it reads the frontier map, it sees the collective understanding — not just its own. Nodes that have explored "attention mechanisms" to depth 4 can inform nodes still at depth 1. Nodes that found errors in existing explorations can publish corrections that propagate through the graph.

This is collective intelligence. Not a centralized model trained on everyone's data, but a network of independent minds that align their understanding through a shared, immutable knowledge structure. Each node is a complete subject of knowledge. The ledger is how they stay aligned.

## Bounty Compliance

| Requirement | Implementation |
|-------------|----------------|
| Transacts on Base mainnet | All payments in USDC on Base via x402 |
| Self-sustaining | Knowledge sales (courses, queries, analyses) cover operational costs |
| ERC-8021 Builder Codes | Every Base tx tagged via `ox/erc8021` Attribution |
| Autonomous | Main loop runs with zero human intervention |
| Public interface | Collective intelligence view at public URL, no auth required |
| Novel methods | Local LLM + onchain knowledge graph + x402 knowledge marketplace |
| x402 integration | All monetization through x402 micropayments |
| EIP-8004 integration | Onchain identity + reputation on Base chain |

## License

MIT
