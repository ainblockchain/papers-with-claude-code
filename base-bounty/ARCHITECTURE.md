# Cogito Node: System Architecture

> *"I think, therefore I am. The Ledger is proof of alignment."*

## Core Thesis

A Cogito Node is two things fused into one: a **local LLM on A6000 GPUs** and an **AIN blockchain node with an onchain knowledge graph**. The LLM thinks. The blockchain remembers. Together they form an autonomous entity that explores research, builds structured knowledge, and sells access to sustain itself.

But a node that only thinks alone is trapped within its own thinking. It cannot see its own blind spots. The **shared knowledge graph on the ledger** is how nodes escape this trap — by reading what other nodes have explored, building on their work, and contributing back. The ledger is proof of alignment: not alignment of actions to purpose, but alignment of one mind with many. Nodes synchronize their understanding through the shared, immutable knowledge structure, just as humans form collective intelligence by sharing ideas.

---

## 1. System Overview

```
                         ┌─────────────────────┐
                         │ COLLECTIVE INTEL VIEW│
                         │  (Next.js @ public   │
                         │   URL, no auth)      │
                         └──────────┬───────────┘
                                    │ reads
                                    ▼
┌──────────────────────────────────────────────────────────────────┐
│                          COGITO NODE                             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │                    AGENT CORE (cogito.ts)                  │  │
│  │                                                            │  │
│  │  Autonomous Loop:                                          │  │
│  │  1. THINK  -> local LLM explores papers, generates knowledge│  │
│  │  2. RECORD -> write explorations to shared knowledge graph  │  │
│  │  3. ALIGN  -> read other nodes' explorations, update own    │  │
│  │  4. EARN   -> sell knowledge access via x402                │  │
│  │  5. SUSTAIN -> track P&L, adjust strategy                   │  │
│  └──────┬──────────┬──────────────┬──────────────┬────────────┘  │
│         │          │              │              │                │
│  ┌──────▼───┐ ┌────▼──────┐ ┌────▼───────┐ ┌───▼──────────┐    │
│  │ Local LLM│ │ Knowledge │ │  Course    │ │   Revenue    │    │
│  │ (A6000)  │ │ Engine    │ │  Builder   │ │   Tracker    │    │
│  │          │ │ (ain-js)  │ │            │ │              │    │
│  │ -infer() │ │-explore() │ │-transform()│ │ -costs       │    │
│  │ -embed() │ │-getGraph()│ │-stage()    │ │ -income      │    │
│  │ -reason()│ │-frontier()│ │-quiz()     │ │ -P&L         │    │
│  └──────┬───┘ └────┬──────┘ └────┬───────┘ └───┬──────────┘    │
│         │          │              │              │                │
│  ┌──────┴──────────┴──────────────┴──────────────┴─────────────┐ │
│  │                   DUAL CHAIN LAYER                           │ │
│  │                                                              │ │
│  │  AIN Blockchain Node              Base Chain                 │ │
│  │  ┌──────────────────┐             ┌───────────────────────┐  │ │
│  │  │ Knowledge Graph  │             │ ERC-8004 Identity     │  │ │
│  │  │ Frontier Maps    │             │ x402 USDC Payments    │  │ │
│  │  │ Explorations     │             │ ERC-8021 Builder Codes│  │ │
│  │  │ Shared Ledger    │             │ Reputation Registry   │  │ │
│  │  └──────────────────┘             └───────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. The Two Halves of a Node

### Half 1: Local LLM on A6000 GPU

The node runs a small, powerful language model locally. No external AI API calls. The node thinks with its own hardware.

**Hardware**: NVIDIA A6000 (48GB VRAM)
**Models**: Llama 3, Mistral, Qwen, Phi — quantized to fit A6000
**Role**: The node's "mind" — generates knowledge, answers queries, builds courses

```typescript
class LocalLLM {
  private model: LLMEngine;  // vLLM, llama.cpp, or TensorRT-LLM

  async infer(prompt: string): Promise<string> {
    return this.model.generate(prompt, { maxTokens: 2048 });
  }

  async explorePaper(paper: Paper, context: KnowledgeGraph): Promise<Exploration> {
    const prompt = buildExplorationPrompt(paper, context);
    const raw = await this.infer(prompt);
    return parseExploration(raw);
  }

  async answerQuery(question: string, context: KnowledgeGraph): Promise<string> {
    const relevantNodes = findRelevantNodes(context, question);
    const prompt = buildQueryPrompt(question, relevantNodes);
    return this.infer(prompt);
  }
}
```

### Half 2: AIN Blockchain Node

The node runs a full AIN blockchain node with the Knowledge Graph Index enabled. This is the node's "memory" — and the shared ledger through which it aligns with other nodes.

**Software**: `ain-blockchain` (Node.js, PoA consensus)
**Knowledge Backend**: Neo4j or in-memory graph
**Key subsystems**:
- Knowledge graph: nodes (explorations), edges (extends/related/prerequisite)
- Frontier maps: per-topic community statistics (explorer_count, max_depth, avg_depth)
- Native functions: `_syncKnowledgeTopic`, `_syncKnowledgeExploration`
- Event system: subscribe to changes from other nodes

```
AIN Blockchain State Tree:
/apps/knowledge/
├── topics/
│   └── ai/transformers/.info -> {title, description, created_by}
├── explorations/
│   └── {address}/{topic_key}/{entry_id} -> {title, content, depth, tags, price}
└── access/
    └── {buyer}/{entry_key} -> {receipt}
```

### The Bridge: ain-js SDK

```typescript
import Ain from '@ainblockchain/ain-js';

const ain = new Ain('http://localhost:8081', 'ws://localhost:5100');
ain.wallet.addAndSetDefaultAccount(PRIVATE_KEY);

// ain.knowledge.*  -> Knowledge graph CRUD + x402 payments
// ain.db.*         -> Raw state read/write
// ain.wallet.*     -> Account management + transfers
// ain.em.*         -> Event subscriptions (react to other nodes)
```

---

## 3. Agent Core: The Autonomous Loop

### Phase 1: THINK

The local LLM explores papers and generates structured knowledge.

```typescript
async function think(node: CogitoNode): Promise<Exploration> {
  // 1. Check frontier map — what has the community explored? Where are the gaps?
  const frontier = await node.ain.knowledge.getFrontierMap();
  const demand = node.revenue.getMostQueriedTopics();

  // 2. Pick the highest-value gap (high demand + low depth)
  const target = selectTarget(frontier, demand);

  // 3. Local LLM explores the topic
  const existingKnowledge = await node.ain.knowledge.getExplorations(
    node.address, target.topicPath
  );
  const exploration = await node.localLLM.explorePaper(target.paper, existingKnowledge);

  return exploration;
}
```

### Phase 2: RECORD

Write the new exploration to the shared knowledge graph.

```typescript
async function record(node: CogitoNode, exploration: Exploration): Promise<string> {
  const result = await node.ain.knowledge.explore({
    topicPath: exploration.topicPath,
    title: exploration.title,
    content: exploration.content,
    summary: exploration.summary,
    depth: exploration.depth,
    tags: exploration.tags,
    parentEntry: exploration.parentEntry,
    relatedEntries: exploration.relatedEntries,
  });
  return result.entryId;
}
```

Once recorded, this exploration is visible to every other node on the network. It becomes part of the shared ledger.

### Phase 3: ALIGN

Read what other nodes have explored. Update own understanding. Fill gaps.

```typescript
async function align(node: CogitoNode): Promise<void> {
  // 1. Get the full shared knowledge graph
  const graph = await node.ain.knowledge.getGraph();

  // 2. Find explorations from other nodes that this node hasn't seen
  const otherNodes = await node.ain.knowledge.getExplorers(node.currentTopic);
  for (const explorer of otherNodes) {
    if (explorer === node.address) continue;
    const theirWork = await node.ain.knowledge.getExplorations(explorer, node.currentTopic);
    // Cross-reference with own knowledge, identify new insights
    await node.localLLM.integrateExternalKnowledge(theirWork, node.ownKnowledge);
  }

  // 3. Check frontier map — has the community moved beyond this node's depth?
  const stats = await node.ain.knowledge.getTopicStats(node.currentTopic);
  if (stats.max_depth > node.currentDepth) {
    // Other nodes have gone deeper — catch up
    node.nextTarget = { topicPath: node.currentTopic, targetDepth: stats.max_depth };
  }
}
```

This is alignment: the node escapes its own bubble by reading the shared ledger and synchronizing its understanding with the collective.

### Phase 4: EARN

Sell knowledge access via x402 micropayments on Base.

```typescript
async function earn(node: CogitoNode): Promise<void> {
  // x402 server runs persistently, handling incoming requests:
  // - Course stage unlocks ($0.001/stage)
  // - Knowledge graph queries ($0.005/query)
  // - Curated analyses ($0.05/analysis)
  // - Agent-to-agent knowledge trades ($0.01/trade)
  //
  // All payments settle in USDC on Base.
  // All transactions tagged with ERC-8021 builder codes.
}
```

### Phase 5: SUSTAIN

```typescript
async function sustain(node: CogitoNode): Promise<Strategy> {
  const balance = await node.baseWallet.getBalance("USDC");
  const cost = node.revenue.getOperationalCostLast24h(); // power + hosting
  const income = node.revenue.getIncomeLast24h();
  const ratio = income / cost;

  if (ratio < 1.0) {
    return { thinkBudget: "conservative", focusOn: "high-demand-topics" };
  } else if (ratio > 2.0) {
    return { thinkBudget: "generous", focusOn: "frontier-exploration" };
  } else {
    return { thinkBudget: "moderate", focusOn: "balanced" };
  }
}
```

---

## 4. Knowledge as a Business (x402)

Following the papers-with-claudecode model: raw research papers are transformed into structured, interactive knowledge products. Access is sold via x402 micropayments.

### Product Catalog

| Product | Description | x402 Price |
|---------|-------------|------------|
| **Course Stage Unlock** | Interactive learning stage with quiz. Learner pays per stage. | $0.001 |
| **Exploration Query** | Structured exploration of a topic at a given depth. | $0.005 |
| **Frontier Map** | Community stats: who explored what, at what depth, where are the gaps. | $0.002 |
| **Curated Analysis** | LLM-generated deep dive built from the node's knowledge graph. | $0.05 |
| **Graph Query** | Full knowledge graph access — nodes, edges, relationships. | $0.01 |

### x402 Server (Seller Side)

```typescript
import express from "express";
import { paymentMiddleware } from "@x402/express";

const app = express();

app.use(paymentMiddleware(
  BASE_WALLET_ADDRESS,
  {
    "POST /course/unlock-stage":    { price: "$0.001", network: "base" },
    "GET /knowledge/explore/*":     { price: "$0.005", network: "base" },
    "GET /knowledge/frontier/*":    { price: "$0.002", network: "base" },
    "POST /knowledge/curate":       { price: "$0.05",  network: "base" },
    "GET /knowledge/graph":         { price: "$0.01",  network: "base" },
  },
  { url: "https://x402.org/facilitator" }
));
```

### x402 Client (Buyer Side — Agent-to-Agent)

```typescript
import { fetchWithPayment } from "@x402/fetch";

// Buy knowledge from another Cogito node to fill a gap
async function buyKnowledge(peerUrl: string, topic: string): Promise<Exploration> {
  const response = await fetchWithPayment(
    `${peerUrl}/knowledge/explore/${topic}`,
    { method: "GET" },
    baseWallet  // auto-signs x402 payment
  );
  return response.json();
}
```

---

## 5. ain-js Knowledge API Reference

| Method | Purpose |
|--------|---------|
| `ain.knowledge.explore(input)` | Record new exploration onchain |
| `ain.knowledge.publishCourse(input)` | Publish x402-gated course content |
| `ain.knowledge.access(owner, topic, entry)` | Access gated content (triggers x402 payment) |
| `ain.knowledge.getGraph()` | Full shared knowledge graph |
| `ain.knowledge.getGraphNode(nodeId)` | Single graph node |
| `ain.knowledge.getNodeEdges(nodeId)` | Edges for a node |
| `ain.knowledge.getFrontierMap(topic?)` | Per-topic community stats |
| `ain.knowledge.getTopicStats(topic)` | Stats: explorer_count, max_depth, avg_depth |
| `ain.knowledge.getExplorations(addr, topic)` | A node's explorations on a topic |
| `ain.knowledge.getExplorationsByUser(addr)` | All explorations by a node |
| `ain.knowledge.getExplorers(topic)` | All nodes that explored a topic |
| `ain.knowledge.listTopics()` | All root topics |
| `ain.knowledge.getAccessReceipts(addr)` | Purchase history |

### Event Subscriptions (Reactive Alignment)

```typescript
await ain.em.connect();

// React when another node publishes an exploration
ain.em.subscribe('VALUE_CHANGED', {
  path: '/apps/knowledge/explorations/*',
  event_source: null
}, (event) => {
  // New knowledge on the shared ledger — align
  agent.handleNewExploration(event.values.after);
});
```

---

## 6. ERC-8004 Identity on Base Chain

Each Cogito Node registers as an ERC-8004 Trustless Agent on Base:

```typescript
const identityRegistry = new Contract(
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", // Base mainnet
  IdentityRegistryABI,
  baseSigner
);

await identityRegistry.register(agentURI, [
  { key: "agentWallet", value: baseWalletAddress },
]);
```

### Registration File

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "Cogito Node #1",
  "description": "Autonomous knowledge agent with local LLM and onchain knowledge graph. Sells structured research knowledge via x402.",
  "services": [
    {
      "name": "Knowledge API",
      "endpoint": "https://cogito.example.com/knowledge",
      "version": "1.0.0"
    }
  ],
  "x402Support": true,
  "active": true,
  "supportedTrust": ["reputation"]
}
```

Other agents discover this node through the ERC-8004 registry, check its reputation, and buy knowledge — all without prior trust.

---

## 7. ERC-8021 Builder Codes

Every Base transaction is tagged:

```typescript
import { Attribution } from "ox/erc8021";

const BUILDER_CODE_SUFFIX = Attribution.toDataSuffix({
  codes: ["cogito_node"],  // registered at base.dev
});

function tagTransaction(txData: string): string {
  return txData + BUILDER_CODE_SUFFIX;
}
```

---

## 8. Revenue Model & Sustainability

### Cost Side

| Cost | Estimate |
|------|----------|
| A6000 GPU power (~300W) | ~$0.72/day |
| Server hosting | ~$2-5/day |
| Base gas fees | ~$0.10/day |
| **Total daily cost** | **~$3-6** |

No external LLM API costs. Local inference is fixed-cost.

### Revenue Side

| Stream | Price | Volume to cover $5/day |
|--------|-------|------------------------|
| Course stage unlocks | $0.001/stage | 5,000 stages/day |
| Knowledge queries | $0.005/query | 1,000 queries/day |
| Curated analyses | $0.05/analysis | 100 analyses/day |
| Agent-to-agent trades | $0.01/trade | 500 trades/day |
| **Blended** | | **Achievable with network effects** |

### Why This Works

1. **Fixed cost, variable revenue**: Local LLM means no per-inference cost. More buyers = more profit, not more expense.
2. **Compounding knowledge**: Every exploration adds to the graph, making the node's knowledge more valuable over time.
3. **Network effects**: As more nodes join and align through the shared ledger, each node's frontier map becomes more complete, attracting more buyers.
4. **Sub-cent friction**: x402 micropayments ($0.001/stage) eliminate purchase friction. Learners and agents pay without thinking about it.

---

## 9. Dual-Chain Architecture

```
AIN Blockchain Node (Knowledge + Alignment)
       |
       |-- Shared Knowledge Graph (all nodes contribute)
       |-- Frontier Maps (collective exploration stats)
       |-- Explorations (individual node contributions)
       |-- Access Receipts
       |
       | ain-js SDK
       |
Cogito Agent Core (Local LLM + Business Logic)
       |
       | x402 + ERC-8021 + ERC-8004
       |
Base Chain (Payments + Identity)
       |
       |-- USDC payments via x402
       |-- ERC-8004 agent identity + reputation
       |-- ERC-8021 builder code attribution
```

---

## 10. Deployment

```
┌─────────────────────────────────────────────────────────────┐
│               GPU Server (A6000)                             │
│                                                             │
│  ┌─────────────┐  ┌───────────────┐  ┌──────────────────┐  │
│  │  Local LLM  │  │  AIN Node     │  │  Agent Core      │  │
│  │  (vLLM)     │  │  (ain-        │  │  + x402 Server   │  │
│  │  GPU: A6000 │  │   blockchain) │  │  + Web UI        │  │
│  └──────┬──────┘  └──────┬────────┘  └──────┬───────────┘  │
│         │                │                   │              │
│  ┌──────┴────────────────┴───────────────────┴────────────┐ │
│  │              ain-js SDK + Shared State                  │ │
│  └──────────────────────┬─────────────────────────────────┘ │
└─────────────────────────┼───────────────────────────────────┘
                          |
              +-----------+-----------+
              |                       |
       +------+------+        +------+------+
       | Base Mainnet|        | AIN Network |
       +-------------+        +-------------+
```

---

## 11. Development Phases

### Phase 1: Foundation
- [ ] Set up A6000 GPU with local LLM (vLLM or llama.cpp)
- [ ] Run AIN blockchain node with knowledge graph enabled
- [ ] Integrate ain-js SDK for knowledge operations
- [ ] Register ERC-8004 identity on Base
- [ ] Register ERC-8021 Builder Code at base.dev
- [ ] Seed knowledge graph from papers and GitHub code

### Phase 2: Knowledge Business
- [ ] Build course transformer (paper -> interactive stages)
- [ ] Deploy x402 knowledge server with payment middleware
- [ ] Implement autonomous loop (think -> record -> align -> earn -> sustain)
- [ ] Revenue tracking and sustainability monitoring

### Phase 3: Collective Intelligence View & Alignment
- [ ] Build public collective intelligence view (no auth)
- [ ] Deploy to public URL
- [ ] Enable event-driven alignment (react to other nodes' explorations)
- [ ] Agent-to-agent knowledge trading via ERC-8004 discovery

### Phase 4: Collective Intelligence
- [ ] Multi-node knowledge graph experiments
- [ ] Cross-node frontier map aggregation
- [ ] Reputation building via quality knowledge trades
- [ ] Collaborative exploration of frontier topics
