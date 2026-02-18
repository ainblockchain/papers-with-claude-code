# AI Network Blockchain Integration

Integration layer with the AI Network blockchain for on-chain learning progress, explorer discovery, and decentralized collaboration.

## How it works

Generated courses use the [AIN blockchain](https://ainetwork.ai/) Knowledge module to:

- **Track progress on-chain**: Each concept completion is recorded via `ain.knowledge.explore()`
- **Discover explorers**: See who else has explored each topic via `ain.knowledge.getExplorers()`
- **Frontier map**: Community-wide stats per topic (explorer count, max depth, avg depth)
- **x402 payment gating**: Premium lessons can require on-chain payment via `ain.knowledge.access()`

## Architecture

The course repo contains **no helper scripts** — the tutor (Claude Code) calls ain-js directly via inline `node -e` commands. The blockchain directory has two files:

**`blockchain/package.json`** — installs ain-js from a git branch:
```json
{
  "name": "blockchain-helper",
  "private": true,
  "dependencies": {
    "@ainblockchain/ain-js": "github:ainblockchain/ain-js#feat/knowledge-module"
  }
}
```

**`blockchain/config.json`** — topic mappings:
```json
{
  "provider_url": "http://localhost:8081",
  "topic_map": { "concept_id": "transformers/foundations/concept_id" },
  "depth_map": { "concept_id": 1 }
}
```

### Key ain-js Knowledge API

| Method | Description |
|--------|-------------|
| `ain.knowledge.explore(input)` | Record exploration with graph node (topicPath, title, content, summary, depth, tags, parentEntry?, relatedEntries?) |
| `ain.knowledge.publishCourse(input)` | Publish gated content: uploads to gateway + records metadata on-chain (topicPath, title, content, summary, depth, tags, price, gatewayBaseUrl, parentEntry?, relatedEntries?) |
| `ain.knowledge.setupAinX402Client()` | Configure AIN-token x402 client for paying to access gated content |
| `ain.knowledge.access(owner, topicPath, entryId)` | Access gated content (x402 payment flow: 402 -> pay -> verify -> content) |
| `ain.knowledge.getExplorers(topicPath)` | List addresses that explored a topic |
| `ain.knowledge.getExplorations(address, topicPath)` | Get explorations by a specific user |
| `ain.knowledge.getExplorationsByUser(address)` | Get all explorations by a user across all topics |
| `ain.knowledge.getAccessReceipts(buyerAddress)` | Get all purchase receipts for a buyer |
| `ain.knowledge.getFrontierMap(topicPrefix)` | Per-topic stats (explorer_count, max_depth, avg_depth) |
| `ain.knowledge.getTopicStats(topicPath)` | Stats for a single topic |
| `ain.knowledge.getGraph()` | Get full knowledge graph (all nodes and edges) |
| `ain.knowledge.getGraphNode(nodeId)` | Get a single graph node by ID |
| `ain.knowledge.getNodeEdges(nodeId)` | Get all edges connected to a node |
| `ain.knowledge.buildNodeId(address, topicPath, entryId)` | Build a node ID from entry reference |

### Knowledge graph (on-chain)

Every `explore()` or `publishCourse()` call writes a graph node on-chain. Entries can be linked:

- **`parentEntry`**: creates an `extends` edge (this entry builds on a prior one)
- **`relatedEntries`**: creates `related` or `prerequisite` edges

On-chain paths:
```
/apps/knowledge/graph/nodes/{nodeId}    -> { address, topic_path, entry_id, title, depth, created_at }
/apps/knowledge/graph/edges/{nodeId}/{targetNodeId} -> { type, created_at, created_by }
```

Node ID format: `{address}_{topicKey}_{entryId}` (e.g. `0xABC_blockchain|consensus_-Olj_abc`)

### x402 gated content

Content can be published behind an AIN-token payment gate:

1. `publishCourse()` uploads content to a gateway server and records metadata on-chain with `content: null`, `gateway_url`, `content_hash`, and `price`
2. `setupAinX402Client()` configures the AIN transfer payment scheme
3. `access()` handles the full 402 flow: request -> HTTP 402 -> AIN transfer -> verify on-chain -> serve content
4. Access receipts are recorded on-chain at `/apps/knowledge/access/{buyerAddress}/{entryKey}`

### Friend progress lookup

Any address's learning progress can be queried on-chain:

- `getExplorationsByUser(address)` returns all explorations across all topics
- `getAccessReceipts(address)` returns all purchase history
- Graph edges show how a friend's entries connect to each other

This enables shared learning management where learners can track each other's progress.

### Inline command pattern

All blockchain calls follow this pattern in `CLAUDE.md`:

```bash
node -e "
  const Ain = require('./blockchain/node_modules/@ainblockchain/ain-js').default;
  const cfg = require('./blockchain/config.json');
  const ain = new Ain(cfg.provider_url);
  const fs = require('fs');
  const pk = fs.readFileSync('blockchain/.env','utf-8').match(/AIN_PRIVATE_KEY=(.+)/)[1].trim();
  ain.wallet.addAndSetDefaultAccount(pk);
  ain.knowledge.explore({
    topicPath: cfg.topic_map['concept_id'],
    title: 'Title', content: 'Content', summary: 'Summary',
    depth: cfg.depth_map['concept_id'] || 1, tags: 'concept_id',
    parentEntry: { ownerAddress: '0x...', topicPath: 'parent/topic', entryId: 'parent_id' }
  }).then(r => console.log(JSON.stringify(r)));
"
```

## Learner flow

1. Learner runs `cd blockchain && npm install` to install ain-js from git
2. Learner opens Claude Code in the course repo
3. Tutor runs wallet setup → private key saved to `blockchain/.env`
3. Learner completes a quiz → tutor records on-chain via `ain.knowledge.explore()` with graph node + optional parent edge
4. Learner says "friends" → tutor queries `ain.knowledge.getExplorationsByUser(address)` to show a friend's full progress with graph connections
5. Learner says "frontier" → tutor queries `ain.knowledge.getFrontierMap()`
6. Learner says "graph" → tutor queries `ain.knowledge.getGraph()` to visualize the on-chain knowledge graph with nodes and edges
7. Learner reaches a premium lesson → tutor calls `ain.knowledge.setupAinX402Client()` then `ain.knowledge.access()` to pay and retrieve content

## Example course

The `example-course/` directory contains a fully generated Transformer course with blockchain integration:

```
example-course/
├── CLAUDE.md              # Tutor instructions with ain-js API
├── README.md              # Learner setup guide
├── .gitignore
├── .learner/
│   └── profile.json       # Learner profile (wallet_address)
├── blockchain/
│   └── config.json        # Topic map, depth map, provider URL
└── knowledge/
    ├── graph.json          # 33-node knowledge graph
    └── courses.json        # 6 courses, 33 lessons
```

## Requirements

- Node.js >= 16
- AIN blockchain node (local or testnet)

ain-js is installed automatically from `github:ainblockchain/ain-js#feat/knowledge-module` via the generated `blockchain/package.json`.

## Enabling blockchain in kg-extractor

```bash
python3 -m kg_extractor pipeline \
  --repo /path/to/source-repo \
  --output /path/to/course \
  --enable-blockchain
```

See [knowledge-graph-builder](../knowledge-graph-builder/) for the full pipeline.
