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

## License

MIT
