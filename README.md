# Papers with Claude Code

> **Live**: [paperswithclaudecode.com](https://paperswithclaudecode.com/)

Every day, dozens of AI papers drop with code — transformers, diffusion models, agents, state space models. The volume is overwhelming, and even when you find a great paper, actually understanding it is hard. The gap between "published" and "understood" keeps growing.

**Papers with Claude Code** closes that gap. It turns any paper-with-code into an interactive, gamified learning course — powered by Claude Code as your AI tutor, with micropayments on-chain.

## How It Works

1. **Find a paper** — Browse trending papers from arXiv and HuggingFace on the Explore page
2. **Publish a course** — Paste an arXiv URL and GitHub repo into Course Builder. Claude Code reads the paper, analyzes the code, and generates a multi-stage dungeon course with quizzes
3. **Learn interactively** — Enter a 2D dungeon room. Walk around, interact with concept markers, ask Claude Code questions in the terminal, pass the quiz to unlock the next stage
4. **Pay per stage** — Each stage unlock is an x402 micropayment (~$0.001 USDC). Course creators earn directly. No subscriptions, no middlemen
5. **Learn together** — Visit the Village to see friends, compete on the leaderboard, and explore the community knowledge graph

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Frontend (paperswithclaudecode.com)                                  │
│                                                                      │
│  /explore    — trending papers with Learn/Purchase buttons            │
│  /learn/:id  — 60/40 split: 2D dungeon canvas + Claude Code terminal │
│  /village    — 2D tilemap, friends, leaderboard, buildings per course │
│  /dashboard  — stats, active courses, streak                         │
│  /publish    — Course Builder: arXiv + GitHub → dungeon course        │
│  /community  — knowledge graph visualization + frontier map           │
└───────────────────────────┬──────────────────────────────────────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
┌──────────────────┐ ┌───────────┐ ┌────────────────────────────┐
│ claudecode-k8s   │ │ AIN Chain │ │ Kite Chain (Base L2)       │
│ terminal pods    │ │ knowledge │ │ x402 USDC micropayments    │
│ per learner      │ │ graph     │ │ ERC-8004 agent identity    │
│                  │ │ frontier  │ │ ERC-8021 builder attribution│
└──────────────────┘ └───────────┘ └────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    │  Cogito Node  │
                    │  local LLM +  │
                    │  AIN node     │
                    │  autonomous   │
                    │  exploration  │
                    └───────────────┘
```

See [architecture.md](architecture.md) for the full system design.

## Modules

| Directory | Description |
|-----------|-------------|
| `frontend/` | Main web app — explore, learn, village, dashboard, course builder |
| `ain-js/` | AIN blockchain SDK (`@ainblockchain/ain-js` on npm) |
| `base-bounty/` | Cogito Node agent + collective intelligence dashboard |
| `cogito/` | Cogito container: content generation + x402 server |
| `claudecode-kubernetes/` | K8s infrastructure: terminal pods, api-proxy, web-terminal |
| `knowledge-graph-builder/` | Pipeline: repos → analyzed structure → courses |
| `ainblockchain-integration/` | AIN blockchain debug frontend + example course |
| `kiteAi/` | Kite AI bounty specs and developer docs |

## Roles

| Member | Module |
|--------|--------|
| @chanho | `frontend/` |
| @haechan | `claudecode-kubernetes/` |
| @hyeonjeong | `knowledge-graph-builder/` |
| @minhyun | `ainblockchain-integration/` + `cogito/` + `ain-js/` + `base-bounty/` |

## Key Concepts

- **Dungeon Course** — A paper turned into a sequence of 2D rooms. Each room has concept markers to explore and a quiz-gated door to the next stage
- **Claude Code Terminal** — AI tutor on the right panel (40%) that knows the paper, the code, and the current stage context
- **x402 Micropayments** — HTTP 402-based payment protocol. Learners pay ~$0.001 USDC per stage on Kite Chain (Base L2)
- **Knowledge Graph** — AIN blockchain stores explorations, topics, and their relationships. Every course, every concept, every learner's progress feeds the graph
- **Cogito Node** — Autonomous AI agent (local LLM + AIN node) that reads papers, builds knowledge, sells access via x402. Self-sustaining through micropayment revenue
- **ERC-8004** — Agent identity on Base chain. Cogito nodes register as autonomous agents
- **ERC-8021** — Builder codes on Base transactions attributing original paper authors and code contributors
- **Village** — 2D social hub where learners walk around, see friends, enter course buildings, check the leaderboard
- **Passkey Wallet** — GitHub OAuth for identity + WebAuthn passkey as AIN blockchain wallet. No seed phrases

## Getting Started

### Frontend (quickest path)

```bash
cd frontend
cp .env.example .env.local  # or set AUTH_SECRET
npm install
npm run dev
# Open http://localhost:3000
```

### Full Stack

See individual module READMEs:
- [frontend/README.md](frontend/README.md) — Next.js app
- [base-bounty/README.md](base-bounty/README.md) — Cogito Node + dashboard
- [claudecode-kubernetes/README.md](claudecode-kubernetes/README.md) — K8s terminal infrastructure
- [knowledge-graph-builder/README.md](knowledge-graph-builder/) — Course generation pipeline

### Prerequisites

- Node.js 20+
- (Optional) NVIDIA GPU with 48GB+ VRAM for Cogito Node local LLM
- (Optional) AIN blockchain node for on-chain operations

## Documentation

- [architecture.md](architecture.md) — Full system design
- [docs/github-login.md](docs/github-login.md) — GitHub OAuth + P256 passkey wallet
- [demo_script.md](demo_script.md) — Demo narration script
- [demo_screenplay.md](demo_screenplay.md) — Demo screen actions and timing

## Changes to External Repositories

Changes made to outside repositories during ETHDenver 2026 (Feb 2026) for this project.

### [ainblockchain/ain-js](https://github.com/ainblockchain/ain-js) — AIN Blockchain SDK

Knowledge module, x402 payments, LLM integration, and Cogito module (v1.13.3 → v1.15.0):

- [`d69684f`](https://github.com/ainblockchain/ain-js/commit/d69684f1d07fea78a0fb02e974f3aa8f6abc9982) Add knowledge module with graph backend abstraction, Neo4j/memory implementations, and benchmarks
- [`f9fad3c`](https://github.com/ainblockchain/ain-js/commit/f9fad3c6f35ec6466ce8e1890750b8502985ba52) Add P256 key type support to wallet for multi-curve signing
- [`decad3d`](https://github.com/ainblockchain/ain-js/commit/decad3d49b830e4385705e36353175288945944d) Add SET_FUNCTION ops to setupApp() for knowledge graph sync triggers
- [`da5ca8a`](https://github.com/ainblockchain/ain-js/commit/da5ca8a9443a87b82a0c7afc47f26e5708825366) Add x402 gated publishing, AIN-token payments, and knowledge graph structure
- [`9e8cc74`](https://github.com/ainblockchain/ain-js/commit/9e8cc74e2cbf69ea9548d85798f03359be65858d) Add transaction batching to Neo4jBackend to reduce bolt roundtrips
- [`3b0bbcd`](https://github.com/ainblockchain/ain-js/commit/3b0bbcd1274ef357c2cd2cdde591e2acd953127a) Fix secp256k1 native module build failure on Node.js 20
- [`5ecf57b`](https://github.com/ainblockchain/ain-js/commit/5ecf57b359c372cc30f99099d2e99e38bc5b4a3c) Upgrade TypeScript target to es2022 for neo4j-driver-core compatibility
- [`b7d391f`](https://github.com/ainblockchain/ain-js/commit/b7d391f4e3c1548d495dc4c6678802beb8bca05e) Bump version to 1.14.0
- [`08504bd`](https://github.com/ainblockchain/ain-js/commit/08504bd99573d01de633e268073ef4dab8e0e252) Add LLM module and AI-powered knowledge methods
- [`44d4834`](https://github.com/ainblockchain/ain-js/commit/44d483498ed6de7a6d93f5639986f6a32d37f41d) Add comprehensive tests for LLM and Knowledge modules (52 tests)
- [`ee4fb67`](https://github.com/ainblockchain/ain-js/commit/ee4fb6769b020f4c1f3cae559b72c8d82ab83d98) Expose LLM thinking in ain-js: InferResult, aiExplore, aiGenerateCourse, aiAnalyze
- [`e17434b`](https://github.com/ainblockchain/ain-js/commit/e17434b698eae9341eb6443f39a804c37833a600) Bump version to 1.14.1
- [`fff8efa`](https://github.com/ainblockchain/ain-js/commit/fff8efad85b679fc390aa7462bf3b3bc7931a621) Add deployment SDK module for container management
- [`9ff1b5d`](https://github.com/ainblockchain/ain-js/commit/9ff1b5d89d4105f2c1d21eb070dc780efb809b99) Add ain.cogito module for recipe management
- [`59bd333`](https://github.com/ainblockchain/ain-js/commit/59bd3332ad24b8bc57835ccddba7f792dcfefa71) Fix: serialize recipe arrays to CSV for AIN state DB compatibility
- [`b93a9be`](https://github.com/ainblockchain/ain-js/commit/b93a9be73848e5a35ca4136cc6661873d584cabb) Bump version to 1.15.0

### [ainblockchain/ain-blockchain](https://github.com/ainblockchain/ain-blockchain) — AIN Blockchain Node

Knowledge graph indexing, P256 multi-curve support, Cogito Node with LLM engine, and Docker deployment:

- [`c460a08e`](https://github.com/ainblockchain/ain-blockchain/commit/c460a08e0dcdb1ee4e9eb4d8d6e57e682990d29b) Add knowledge graph index with Neo4j/memory backends and JSON-RPC read APIs
- [`2d8610bc`](https://github.com/ainblockchain/ain-blockchain/commit/2d8610bc42a34354743a3bba4df3c6965197ce94) Add P256 signature verification support for multi-curve transactions
- [`ab184c5a`](https://github.com/ainblockchain/ain-blockchain/commit/ab184c5a32eb12d28d416c2a0b5663eacc12567c) Upgrade dependencies and fix secp256k1 native module for Node.js 20
- [`502a9901`](https://github.com/ainblockchain/ain-blockchain/commit/502a9901ae6bf8f1b8d937f571fe6bc3403a06d2) Dockerize ain-blockchain with Neo4j knowledge graph support
- [`892c68df`](https://github.com/ainblockchain/ain-blockchain/commit/892c68dfeaeb784cd7a64ce72f302c24c3795fc3) Add LLM engine integration for Cogito Node
- [`3fe3c864`](https://github.com/ainblockchain/ain-blockchain/commit/3fe3c8640e494bfdf34b0be88a9eb19df8c5b034) Dockerize Cogito Node with Neo4j persistence and LLM engine
- [`cef194a3`](https://github.com/ainblockchain/ain-blockchain/commit/cef194a360782c76948cefbeb6c56af1d41c6559) Add LLM engine JSON-RPC tests to E2E test suite
- [`a88b4ec1`](https://github.com/ainblockchain/ain-blockchain/commit/a88b4ec15d5bbd736d697fbf7847cb4c27875096) Fix Qwen3 think tag JSON parsing + add LLM unit tests (61 tests)
- [`1043cfad`](https://github.com/ainblockchain/ain-blockchain/commit/1043cfadc8fa105cd2ce3707b9c2d786866c0aff) Expose LLM thinking process in explore/course/analyze responses
- [`cc25ba48`](https://github.com/ainblockchain/ain-blockchain/commit/cc25ba48e51719430e8e67fe2bfccc9a445382e2) Add extractThinking tests + update analyze tests for thinking progress (53 tests)
- [`2c42e062`](https://github.com/ainblockchain/ain-blockchain/commit/2c42e0629b6e914f6c6e7154e5c918ae3821a50d) Add container deployment module for CI/CD pipeline
- [`bc16fb30`](https://github.com/ainblockchain/ain-blockchain/commit/bc16fb30c54f794775620a4eb58f29d59a2b601d) Add cogito container for recipe-driven knowledge enrichment
- [`d18e5be6`](https://github.com/ainblockchain/ain-blockchain/commit/d18e5be69e2f46d7443b266b897ca1e2632cec1b) Fix: deserialize recipe arrays from AIN state CSV format
- [`81e67cb9`](https://github.com/ainblockchain/ain-blockchain/commit/81e67cb9650921a974c24d88d27b9c3c130f437a) Upgrade ain-js to 1.15.0 (includes cogito module)
- [`5ef79e52`](https://github.com/ainblockchain/ain-blockchain/commit/5ef79e521f0f9b1372b042520ba1e740d4c0bdef) Add AINscan explorer link to README

### [ainblockchain/ainscan](https://github.com/ainblockchain/ainscan) — Blockchain Explorer

Built from scratch and deployed at [ainscan.ainetwork.ai](https://ainscan.ainetwork.ai) during ETHDenver 2026:

- [`fd71ecf`](https://github.com/ainblockchain/ainscan/commit/fd71ecf08e90fe42cda74465046d5745e2f8863d) Initial commit: Next.js blockchain explorer with direct node RPC
- [`6b35709`](https://github.com/ainblockchain/ainscan/commit/6b357098a94391de562082f196266987280617aa) Fix database explorer for large nodes with shallow fetch fallback
- [`33c2ce9`](https://github.com/ainblockchain/ainscan/commit/33c2ce92822d7cddfc88ad98be0536d5f39fb9b8) Add knowledge graph visualization with Neo4j, x402 payment, and passkey auth
- [`6425fe6`](https://github.com/ainblockchain/ainscan/commit/6425fe61aa9f0748fbb194e95d7671fc725f160a) Replace direct Neo4j connection with JSON-RPC calls through blockchain node
- [`e9d0619`](https://github.com/ainblockchain/ainscan/commit/e9d0619c83303afd81d7a74b813b7a9d06858c68) Fix Database Explorer, transactions, and knowledge graph edges
- [`a49faf8`](https://github.com/ainblockchain/ainscan/commit/a49faf85503077fc55769ffa798466536ab70c23) Add mobile hamburger menu with all nav links including Knowledge
- [`92e13a1`](https://github.com/ainblockchain/ainscan/commit/92e13a14489e58ba7347c6a3f294339a593fdf77) Fix Vercel build timeout: switch pages to force-dynamic rendering
- [`6c804e1`](https://github.com/ainblockchain/ainscan/commit/6c804e18564c030ef48cc0fd7c744cde37440c60) Use REST endpoints to skip empty blocks on home and transactions pages
- [`9d90672`](https://github.com/ainblockchain/ainscan/commit/9d90672c0c5d949fb16a1772c4003b8eb139a57f) Fix transaction detail page: normalize tx_body fields and add block fallback
- [`7bfc55d`](https://github.com/ainblockchain/ainscan/commit/7bfc55dc345a4c7407b99e6dd79b91a19ba3bcc3) Add block scan fallback and blocks filter toggle
- [`231feba`](https://github.com/ainblockchain/ainscan/commit/231feba5784ad43b31cab898a61e13f4856ef766) Add retry with backoff for rate-limited RPC and reduce parallelism
- [`b794f1d`](https://github.com/ainblockchain/ainscan/commit/b794f1dc2099df1e7034c3e152d365d306f8c777) Fix transaction detail page showing no data
- [`2455619`](https://github.com/ainblockchain/ainscan/commit/245561927ccf54214e03a237e984e2112991a911) Add README with features, tech stack, and getting started

## Related

- [awesome-papers-with-claude-code](https://github.com/ainblockchain/awesome-papers-with-claude-code) — Curated collection of 8 papers (Transformers, ViT, DPO, LLaMA 2, etc.) turned into interactive courses
- [AINscan](https://ainscan.ainetwork.ai) — Blockchain explorer with knowledge graph visualization
- [ain-js](https://github.com/ainblockchain/ain-js) — AIN blockchain SDK with knowledge module

## License

MIT
