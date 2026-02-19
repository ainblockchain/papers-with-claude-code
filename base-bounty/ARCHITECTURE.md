# Cogito Node: System Architecture

> *"나는 생각한다. Ledger는 정렬의 증거이고."*

## Core Thesis

A single node is a **complete subject of knowledge** — an autonomous entity that thinks, earns, and sustains itself onchain. Like neurons in a brain or humans in a society, each Cogito Node operates independently while contributing to collective intelligence. The ledger is not just an accounting tool; it is **proof of alignment** — cryptographic evidence that the node's actions serve its declared purpose.

---

## 1. System Overview

```
                         ┌─────────────────────┐
                         │    PUBLIC DASHBOARD  │
                         │  (Next.js @ public   │
                         │   URL, no auth)      │
                         └──────────┬───────────┘
                                    │ reads
                                    ▼
┌───────────────────────────────────────────────────────────────┐
│                        COGITO NODE                            │
│                                                               │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │                   AGENT CORE (cogito.ts)                │  │
│  │                                                         │  │
│  │  Autonomous Loop:                                       │  │
│  │  1. THINK   → expand knowledge via LLM                  │  │
│  │  2. EARN    → serve knowledge / rent GPU                │  │
│  │  3. SUSTAIN → track P&L, adjust strategy                │  │
│  │  4. ALIGN   → record all actions on ledger              │  │
│  └────────┬────────────┬────────────┬─────────────┬────────┘  │
│           │            │            │             │            │
│  ┌────────▼──────┐ ┌───▼────────┐ ┌▼──────────┐ ┌▼─────────┐ │
│  │  Knowledge    │ │   GPU      │ │  Agent    │ │ Revenue  │ │
│  │  Engine       │ │   Rental   │ │  Commerce │ │ Tracker  │ │
│  │              │ │  Service   │ │  (A2A)    │ │          │ │
│  │ - explore()  │ │            │ │           │ │ - costs  │ │
│  │ - expand()   │ │ - list()   │ │ - sell()  │ │ - income │ │
│  │ - curate()   │ │ - rent()   │ │ - buy()   │ │ - P&L    │ │
│  │ - publish()  │ │ - price()  │ │ - discover│ │ - adjust │ │
│  └──────┬───────┘ └─────┬──────┘ └─────┬─────┘ └────┬─────┘ │
│         │               │               │            │        │
│  ┌──────┴───────────────┴───────────────┴────────────┴─────┐  │
│  │                  TRANSACTION LAYER                       │  │
│  │                                                         │  │
│  │  ┌─────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐  │  │
│  │  │  x402   │  │ ERC-8021 │  │ ERC-8004 │  │  Wallet │  │  │
│  │  │ Client  │  │ Builder  │  │ Identity │  │  (Base) │  │  │
│  │  │ +Server │  │  Codes   │  │ +Repute  │  │  USDC   │  │  │
│  │  └────┬────┘  └────┬─────┘  └────┬─────┘  └────┬────┘  │  │
│  └───────┴────────────┴─────────────┴──────────────┴───────┘  │
│                           │                                    │
└───────────────────────────┼────────────────────────────────────┘
                            │
                   ┌────────▼────────┐
                   │  BASE MAINNET   │
                   │  (L2 Ethereum)  │
                   └─────────────────┘
```

---

## 2. Agent Core: The Autonomous Loop

The heart of Cogito is a continuous autonomous loop with four phases:

### Phase 1: THINK

```typescript
async function think(node: CogitoNode): Promise<Knowledge> {
  // 1. Assess current knowledge graph state
  const frontier = await node.knowledge.getFrontierMap();
  const gaps = identifyKnowledgeGaps(frontier);

  // 2. Choose what to explore (highest value gap)
  const target = selectExplorationTarget(gaps, node.revenue.getMarketDemand());

  // 3. Generate new knowledge via LLM (Claude API)
  const exploration = await node.llm.explore({
    topic: target.topicPath,
    existingGraph: await node.knowledge.getGraph(),
    depth: target.optimalDepth,
  });

  // 4. Record exploration onchain (via AIN Knowledge Module)
  await node.knowledge.explore({
    topicPath: target.topicPath,
    title: exploration.title,
    content: exploration.content,
    summary: exploration.summary,
    depth: exploration.depth,
    tags: exploration.tags,
    parentEntry: target.parentEntry,
  });

  return exploration;
}
```

**Key insight**: The node doesn't explore randomly. It uses market demand signals (what other agents are buying) to prioritize high-value knowledge expansion.

### Phase 2: EARN

```typescript
async function earn(node: CogitoNode): Promise<void> {
  // Revenue stream 1: Serve knowledge requests (x402 gated)
  // (runs as persistent HTTP server — see x402 Server section)

  // Revenue stream 2: Rent GPU compute
  await node.gpu.updateAvailability({
    available: node.gpu.getIdleCapacity(),
    pricePerToken: node.revenue.getOptimalGpuPrice(),
  });

  // Revenue stream 3: Agent-to-agent knowledge trade
  const offers = await node.commerce.checkIncomingOffers();
  for (const offer of offers) {
    if (node.commerce.isAcceptable(offer)) {
      await node.commerce.fulfill(offer); // x402 payment received
    }
  }
}
```

### Phase 3: SUSTAIN

```typescript
async function sustain(node: CogitoNode): Promise<Strategy> {
  const balance = await node.wallet.getBalance("USDC");
  const computeCost = node.revenue.getComputeCostLast24h();
  const income = node.revenue.getIncomeLast24h();
  const ratio = income / computeCost;

  // Adjust strategy based on sustainability ratio
  if (ratio < 1.0) {
    // Losing money — reduce exploration, increase selling
    return { thinkBudget: "conservative", sellAggressiveness: "high" };
  } else if (ratio > 2.0) {
    // Profitable — invest in deeper exploration
    return { thinkBudget: "generous", sellAggressiveness: "normal" };
  } else {
    return { thinkBudget: "moderate", sellAggressiveness: "moderate" };
  }
}
```

### Phase 4: ALIGN (Ledger as Proof)

Every action is recorded onchain with ERC-8021 Builder Codes:

```typescript
import { Attribution } from "ox/erc8021";

const DATA_SUFFIX = Attribution.toDataSuffix({
  codes: ["cogito_node"],  // registered at base.dev
});

// Append to EVERY transaction
async function sendTransaction(tx: Transaction): Promise<TxHash> {
  tx.data = tx.data + DATA_SUFFIX;  // ERC-8021 attribution
  return await node.wallet.sendTransaction(tx);
}
```

The ledger becomes **proof of alignment**: anyone can verify that the node's economic activity (what it spent, what it earned, what it created) matches its stated purpose.

---

## 3. Knowledge Engine

Built on patterns from the `ainblockchain-integration` project, extended for autonomous operation.

### Data Model

```
Knowledge Graph (On-Chain)
├── Nodes: individual explorations
│   ├── nodeId: {address}_{topicKey}_{entryId}
│   ├── topic_path: "ai/transformers/attention"
│   ├── title, content, summary
│   ├── depth: 1-4 (foundational → frontier)
│   └── created_at, tags
│
├── Edges: relationships between explorations
│   ├── "extends" — builds on parent exploration
│   ├── "related" — thematic connection
│   └── "prerequisite" — dependency ordering
│
└── Frontier Map: per-topic community statistics
    ├── explorer_count
    ├── max_depth
    └── avg_depth
```

### Knowledge Monetization

```typescript
// x402 gated endpoints
const knowledgeRoutes = {
  "GET /knowledge/explore/:topicPath": {
    price: "$0.005",       // per exploration query
    network: "base",
  },
  "GET /knowledge/graph": {
    price: "$0.01",        // full graph access
    network: "base",
  },
  "GET /knowledge/frontier/:topic": {
    price: "$0.002",       // frontier map query
    network: "base",
  },
  "POST /knowledge/curate": {
    price: "$0.05",        // AI-curated summary
    network: "base",
  },
  "GET /knowledge/paper/:id": {
    price: "$0.01",        // paper analysis
    network: "base",
  },
};
```

### Knowledge Expansion Strategy

The node continuously expands its knowledge graph by:

1. **Monitoring demand** — which topics are most queried by x402 buyers?
2. **Identifying gaps** — where does the frontier map show low depth or few explorers?
3. **LLM exploration** — using Claude to generate deep analyses of high-value topics
4. **Cross-referencing** — linking new explorations to existing graph nodes
5. **Pricing dynamically** — rare knowledge at frontier depths commands higher prices

---

## 4. GPU Rental Service

The node can rent idle GPU capacity to other agents via x402:

```typescript
// x402 gated GPU endpoints
const gpuRoutes = {
  "POST /gpu/inference": {
    price: "dynamic",      // based on token count and model
    network: "base",
  },
  "GET /gpu/availability": {
    price: "$0.00",        // free discovery
    network: "base",
  },
};

// Dynamic pricing for GPU rental
function priceInference(request: InferenceRequest): string {
  const tokensEstimate = estimateTokens(request);
  const basePricePerToken = 0.00001; // $0.01 per 1K tokens
  const demandMultiplier = getDemandMultiplier(); // 1.0 - 3.0
  const total = tokensEstimate * basePricePerToken * demandMultiplier;
  return `$${total.toFixed(6)}`;
}
```

### GPU Rental Flow

```
Buyer Agent                         Cogito Node (Seller)
    │                                       │
    ├── GET /gpu/availability ──────────────►│
    │◄── 200 { models, capacity, prices } ──┤
    │                                       │
    ├── POST /gpu/inference ────────────────►│
    │◄── 402 Payment Required ──────────────┤
    │                                       │
    ├── POST /gpu/inference ────────────────►│
    │   + PAYMENT-SIGNATURE header          │
    │                                       │
    │   [Cogito verifies payment via        │
    │    x402 facilitator, runs inference]  │
    │                                       │
    │◄── 200 { result, tokensUsed } ────────┤
    │   + PAYMENT-RESPONSE header           │
```

---

## 5. Agent-to-Agent Commerce (ERC-8004)

### Identity Registration

```typescript
// Register Cogito Node as an ERC-8004 agent
const identityRegistry = new Contract(
  "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432", // Base mainnet
  IdentityRegistryABI,
  signer
);

const agentURI = "https://cogito.example.com/.well-known/agent-registration.json";
const tx = await identityRegistry.register(agentURI, [
  { key: "agentWallet", value: walletAddress },
]);
```

### Agent Registration File

```json
{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "Cogito Node #1",
  "description": "Autonomous knowledge agent. Sells frontier research, curated paper analyses, and GPU compute. Thinks, earns, sustains.",
  "services": [
    {
      "name": "Knowledge API",
      "endpoint": "https://cogito.example.com/knowledge",
      "version": "1.0.0"
    },
    {
      "name": "GPU Inference",
      "endpoint": "https://cogito.example.com/gpu",
      "version": "1.0.0"
    }
  ],
  "x402Support": true,
  "active": true,
  "supportedTrust": ["reputation", "crypto-economic"]
}
```

### Discovery and Trade Flow

```
Cogito Node A                  ERC-8004 Registry            Cogito Node B
     │                              │                            │
     ├── discover agents ──────────►│                            │
     │◄── [Node B: knowledge API] ──┤                            │
     │                              │                            │
     ├── check reputation ─────────►│                            │
     │◄── [score: 87/100] ─────────┤                            │
     │                              │                            │
     ├── GET /knowledge/explore/ai/rlhf ────────────────────────►│
     │◄── 402 { price: $0.005 } ────────────────────────────────┤
     │                              │                            │
     ├── GET + PAYMENT-SIGNATURE ───────────────────────────────►│
     │◄── 200 { exploration data } ─────────────────────────────┤
     │                              │                            │
     ├── give reputation feedback ─►│                            │
     │   { value: 92, tag: "starred" }                           │
```

---

## 6. x402 Integration (Dual Role)

### As Seller (Knowledge + GPU)

```typescript
import express from "express";
import { paymentMiddleware } from "@x402/express";

const app = express();

// x402 middleware gates endpoints
app.use(paymentMiddleware(
  COGITO_WALLET_ADDRESS,
  {
    "GET /knowledge/explore/*": { price: "$0.005", network: "base" },
    "GET /knowledge/graph":     { price: "$0.01",  network: "base" },
    "GET /knowledge/frontier/*":{ price: "$0.002", network: "base" },
    "POST /knowledge/curate":   { price: "$0.05",  network: "base" },
    "POST /gpu/inference":      { price: "dynamic", network: "base" },
  },
  { url: "https://x402.org/facilitator" }
));
```

### As Buyer (LLM Compute)

```typescript
import { fetchWithPayment } from "@x402/fetch";

// Pay for Claude API compute via x402
async function callLLM(prompt: string): Promise<string> {
  const response = await fetchWithPayment(
    "https://llm-proxy.example.com/v1/messages",
    {
      method: "POST",
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", messages: [{ role: "user", content: prompt }] }),
    },
    cogitoWallet  // auto-signs x402 payments
  );
  return response.json();
}
```

---

## 7. ERC-8021 Builder Codes Integration

### Registration

1. Register at [base.dev](https://base.dev)
2. Obtain builder code (e.g., `cogito_node`)

### Transaction Tagging

```typescript
import { Attribution } from "ox/erc8021";

const BUILDER_CODE_SUFFIX = Attribution.toDataSuffix({
  codes: ["cogito_node"],
});

// Wrapper: tag every transaction
function tagTransaction(txData: string): string {
  return txData + BUILDER_CODE_SUFFIX;
}

// Example: USDC transfer with builder code
async function sendUSDC(to: string, amount: bigint) {
  const usdc = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
  const data = usdc.interface.encodeFunctionData("transfer", [to, amount]);
  const taggedData = tagTransaction(data);

  return signer.sendTransaction({
    to: USDC_ADDRESS,
    data: taggedData,
  });
}
```

### Verification

Every transaction can be verified by:
- Checking the last 16 bytes of calldata for `0x80218021802180218021802180218021`
- Parsing the builder code from the suffix
- Viewing attribution analytics on base.dev dashboard

---

## 8. Public Dashboard

### Architecture

```
dashboard/
├── app/
│   ├── page.tsx              # Main dashboard
│   ├── layout.tsx            # App shell
│   └── api/
│       ├── stats/route.ts    # Agent stats endpoint
│       ├── txns/route.ts     # Transaction history
│       └── health/route.ts   # Agent health check
├── components/
│   ├── WalletBalance.tsx     # USDC balance on Base
│   ├── ComputeCost.tsx       # Cumulative LLM spend
│   ├── RevenueChart.tsx      # Income over time
│   ├── PnLGauge.tsx          # Profit/loss ratio
│   ├── KnowledgeStats.tsx    # Graph size, frontier coverage
│   ├── TransactionLog.tsx    # Builder-code tagged txns
│   ├── AgentStatus.tsx       # Current task, uptime
│   └── SustainabilityMeter.tsx # Revenue / Cost ratio
```

### Key Metrics Displayed

| Metric | Description |
|--------|-------------|
| **Wallet Balance** | Current USDC on Base |
| **24h Revenue** | Income from knowledge + GPU + commerce |
| **24h Compute Cost** | LLM API spend |
| **Sustainability Ratio** | Revenue / Cost (>1.0 = self-sustaining) |
| **Knowledge Nodes** | Total explorations in graph |
| **Knowledge Edges** | Total connections |
| **Frontier Coverage** | Topics explored / topics available |
| **Transactions** | All txns with ERC-8021 builder code |
| **Reputation Score** | ERC-8004 reputation from peers |
| **Agent Uptime** | Time since last restart |

---

## 9. Revenue Model & Sustainability Math

### Cost Side

| Cost | Estimate |
|------|----------|
| Claude API (per exploration) | ~$0.01-0.05 |
| Base gas fees | ~$0.001 per tx |
| Hosting (VPS) | ~$0.003/hour |
| **Daily compute budget** | **~$5-20** |

### Revenue Side

| Stream | Price | Volume Needed (to cover $10/day) |
|--------|-------|----------------------------------|
| Knowledge queries | $0.005/query | 2,000 queries/day |
| Curated summaries | $0.05/summary | 200 summaries/day |
| GPU rental | $0.01/1K tokens | 1M tokens/day |
| Agent commerce | $0.01-0.10/trade | 100-1000 trades/day |
| **Blended** | | **Achievable with network effects** |

### Sustainability Strategy

1. **Bootstrap**: Seed initial knowledge from `ainblockchain-integration` example courses (33 concepts, 14 papers)
2. **Grow**: Continuously expand knowledge graph in high-demand areas
3. **Network**: Register on ERC-8004, build reputation, attract agent-to-agent buyers
4. **Optimize**: Dynamic pricing based on demand, reduce compute by caching popular queries
5. **Compound**: Reinvest profits into deeper frontier explorations that command premium prices

---

## 10. Integration with ainblockchain-integration

The existing AIN knowledge module provides the foundation:

| AIN Concept | Cogito Usage |
|-------------|-------------|
| `ain.knowledge.explore()` | Record new knowledge on-chain |
| `ain.knowledge.getGraph()` | Serve graph queries via x402 |
| `ain.knowledge.getFrontierMap()` | Identify high-value exploration targets |
| `ain.knowledge.publishCourse()` | Publish x402-gated knowledge content |
| `ain.knowledge.access()` | x402 payment flow for knowledge purchase |
| Frontier Maps | Market demand signal for the agent |
| Knowledge Graph | The node's "brain" — its sellable asset |
| Example courses | Bootstrap seed data (transformers, 33 concepts) |

### Bridge Architecture

```
AIN Blockchain (Knowledge Storage)
       │
       ├── Knowledge Graph (nodes, edges)
       ├── Frontier Maps (community stats)
       └── Access Receipts (payment proofs)
       │
       ▼
Cogito Node (Agent on Base)
       │
       ├── Reads knowledge from AIN
       ├── Expands knowledge via LLM
       ├── Sells knowledge via x402 on Base
       └── Records transactions with ERC-8021
       │
       ▼
Base Mainnet (Financial Settlement)
       │
       ├── USDC payments (x402)
       ├── Builder Code attribution (ERC-8021)
       ├── Agent identity (ERC-8004)
       └── Knowledge tokens (ERC-721)
```

---

## 11. Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                   VPS / Cloud Host                   │
│                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  Agent Core  │  │  x402 Server │  │ Dashboard │ │
│  │  (Node.js)   │  │  (Express)   │  │ (Next.js) │ │
│  │  Port: —     │  │  Port: 4021  │  │ Port: 3000│ │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘ │
│         │                  │                │       │
│  ┌──────┴──────────────────┴────────────────┴─────┐ │
│  │              Shared State (SQLite/Redis)        │ │
│  │  - Revenue ledger                               │ │
│  │  - Knowledge cache                              │ │
│  │  - Transaction log                              │ │
│  └────────────────────┬───────────────────────────┘ │
└───────────────────────┼─────────────────────────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
     ┌──────▼──────┐        ┌──────▼──────┐
     │ Base Mainnet│        │     AIN     │
     │   (L2)     │        │  Blockchain │
     └─────────────┘        └─────────────┘
```

---

## 12. Security Considerations

| Risk | Mitigation |
|------|-----------|
| Private key exposure | Server wallet with HSM or TEE; never in env vars in prod |
| Draining via bad trades | Max spend per tx, daily budget cap, slippage protection |
| Sybil reputation attacks | Weight ERC-8004 feedback by staker reputation |
| x402 payment replay | Nonce-based authorization (EIP-3009), time-bounded validity |
| Knowledge poisoning | Validate LLM outputs before publishing; quality checks |
| Gas griefing | Base L2 fees are negligible (~$0.001); budget cap as safety |

---

## 13. Development Phases

### Phase 1: Foundation
- [ ] Set up Base mainnet wallet with USDC
- [ ] Register ERC-8021 Builder Code at base.dev
- [ ] Register ERC-8004 identity on Base
- [ ] Deploy x402 knowledge server with payment middleware
- [ ] Seed knowledge graph from ainblockchain-integration data

### Phase 2: Autonomous Agent
- [ ] Implement autonomous loop (think → earn → sustain → align)
- [ ] Connect Claude API as LLM backend
- [ ] Dynamic pricing engine based on demand
- [ ] Revenue tracking and sustainability monitoring

### Phase 3: Dashboard & Commerce
- [ ] Build public Next.js dashboard (no auth)
- [ ] Deploy to public URL
- [ ] Enable agent-to-agent discovery via ERC-8004
- [ ] GPU rental marketplace

### Phase 4: Optimization
- [ ] Knowledge caching to reduce redundant LLM calls
- [ ] Reputation building via quality knowledge trades
- [ ] Knowledge token deployment (ERC-721/1155)
- [ ] Multi-node collective intelligence experiments
