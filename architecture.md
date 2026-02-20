# Architecture

> **Live**: [paperswithclaudecode.com](https://paperswithclaudecode.com/)

## System Overview

Papers with Claude Code has four layers: **learn** (frontend), **generate** (course builder + Cogito), **store** (AIN blockchain knowledge graph), and **pay** (x402 on Kite/Base chain).

```
┌─────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (Next.js @ paperswithclaudecode.com)                          │
│                                                                         │
│  ┌──────────┐  ┌──────────────────────┐  ┌─────────┐  ┌───────────┐   │
│  │ /explore │  │ /learn/:paperId      │  │/village  │  │ /publish  │   │
│  │          │  │                      │  │          │  │           │   │
│  │ trending │  │ ┌──────┬───────────┐ │  │ 2D map   │  │ Course    │   │
│  │ papers   │  │ │Canvas│ Claude    │ │  │ friends  │  │ Builder   │   │
│  │ Learn/   │  │ │ 60%  │ Terminal  │ │  │ leader-  │  │ arXiv +   │   │
│  │ Purchase │  │ │dungeon│ 40%     │ │  │ board    │  │ GitHub →  │   │
│  │          │  │ │+quiz │ AI tutor │ │  │ buildings│  │ stages    │   │
│  └──────────┘  │ └──────┴───────────┘ │  └─────────┘  └───────────┘   │
│                └──────────────────────┘                                  │
└──────────┬─────────────────┬──────────────────────┬─────────────────────┘
           │                 │                      │
           ▼                 ▼                      ▼
┌───────────────────┐ ┌──────────────┐  ┌──────────────────────────────┐
│ Claude Code       │ │ AIN          │  │ Kite Chain (Base L2)         │
│ Terminal Pods     │ │ Blockchain   │  │                              │
│ (K8s)            │ │              │  │ x402 USDC micropayments      │
│                   │ │ Knowledge    │  │ ERC-8004 agent identity      │
│ 1 pod per learner │ │ Graph +      │  │ ERC-8021 builder attribution │
│ real Claude Code  │ │ Frontier +   │  │                              │
│ sandboxed         │ │ Explorations │  │ ~$0.001/stage                │
└───────────────────┘ └──────────────┘  └──────────────────────────────┘
                             │
                     ┌───────┴───────┐
                     │  Cogito Node  │
                     │               │
                     │ Local LLM     │
                     │ (A6000 GPU)   │
                     │      +        │
                     │ AIN Node      │
                     │               │
                     │ Autonomous:   │
                     │ think→record  │
                     │ →align→earn   │
                     │ →sustain      │
                     └───────────────┘
```

---

## 1. Frontend — The Learner Experience

### Explore (`/explore`)
- Trending papers from arXiv/HuggingFace displayed as cards
- Each card: thumbnail, title, authors, star count, arXiv link
- **Learn** button (owned courses) or **Purchase** button (not owned)
- Period filters: Daily / Weekly / Monthly

### Learn (`/learn/:paperId`)
- **60/40 split screen**
  - Left (60%): 2D dungeon canvas — tile-based room, player character (WASD/arrows), concept markers, quiz-gated door
  - Right (40%): Claude Code terminal — AI tutor that knows the paper, the code, and the current stage
- **Stage progression**: explore concepts → pass quiz → pay to unlock next stage → enter next room
- **Payment modal**: x402 micropayment on Kite Chain, tx hash + KiteScan link

### Village (`/village`)
- Procedurally generated 2D tilemap with buildings per course
- Player character + friend avatars with real-time positions
- Right sidebar: online friends (with course/stage), leaderboard (top 10), world minimap
- Enter a building → navigate to `/learn/:paperId`

### Course Builder (`/publish`)
- Paste arXiv URL + GitHub repo → Claude Code generates stages
- Each stage: concepts, explanations, quiz questions — grounded in actual paper and code
- Published with x402 pricing. ERC-8021 builder codes attribute original authors

### Dashboard (`/dashboard`)
- User profile, stats (papers started, stages cleared, streak)
- Active courses with progress bars and "Continue" button

### Community (`/community`)
- Knowledge graph visualization (force-directed, colored by depth)
- Frontier map: topics with explorer count, max depth, avg depth
- Learner progress lookup by AIN address

### Authentication (`/login`)
1. **GitHub OAuth** — proves identity (username, avatar)
2. **WebAuthn Passkey** — creates P256 keypair → AIN blockchain wallet address
3. No seed phrases, no MetaMask — passkey IS the wallet

---

## 2. Claude Code Terminal Pods (K8s)

Each learner gets a dedicated Claude Code terminal pod on Kubernetes:

```
Learner enters /learn/:paperId
  → Frontend requests session from web-terminal backend
  → K8s creates a sandboxed pod with Claude Code
  → WebSocket bridges terminal I/O to the browser
  → Pod has CLAUDE.md with paper context + stage instructions
  → Pod destroyed on session end
```

Components:
- **web-terminal** — Express server: session management, WebSocket bridge, progress DB
- **api-proxy** — Rate-limited proxy for Anthropic API calls from pods
- **claudecode-sandbox** — Docker image with Claude Code, paper repos, ain-js

See [claudecode-kubernetes/README.md](claudecode-kubernetes/README.md).

---

## 3. Knowledge Graph (AIN Blockchain)

All learning data lives on the AIN blockchain as a knowledge graph:

```
/apps/knowledge/
├── topics/
│   └── ai/transformers/attention/.info → {title, description, created_by}
├── explorations/
│   └── {address}/{topic_key}/{entry_id} → {title, content, depth, tags, price}
├── graph/
│   ├── nodes/{nodeId} → {address, topic_path, entry_id, title, depth}
│   └── edges/{nodeId}/{targetNodeId} → {type: extends|related|prerequisite}
├── access/
│   └── {buyer}/{entry_key} → {receipt}
└── frontier/
    └── {topic} → {explorer_count, max_depth, avg_depth}
```

Key operations via `ain-js`:
- `ain.knowledge.explore()` — record exploration with graph node
- `ain.knowledge.publishCourse()` — publish x402-gated course content
- `ain.knowledge.access()` — pay and access gated content
- `ain.knowledge.getGraph()` — full knowledge graph
- `ain.knowledge.getFrontierMap()` — community exploration stats

---

## 4. Payments (x402 on Kite Chain / Base)

### Learner pays to unlock a stage:
1. Learner passes quiz → payment modal appears: "Unlock Stage 2 — 0.001 USDT"
2. Click Unlock → frontend signs x402 payment
3. Payment settles on Kite Chain (Base L2) in USDC
4. Tx hash displayed with KiteScan link
5. Stage unlocked, progress recorded on AIN blockchain

### Course creator earns:
- Revenue flows directly to the course creator's wallet
- ERC-8021 builder codes attribute original paper authors on every transaction
- No platform fee — pure peer-to-peer micropayments

### Pricing:

| Product | Price |
|---------|-------|
| Course stage unlock | ~$0.001/stage |
| Knowledge graph query | ~$0.005/query |
| Frontier map access | ~$0.002/query |
| Curated LLM analysis | ~$0.05/analysis |

---

## 5. Cogito Node — Autonomous Knowledge Agent

A Cogito Node is a local LLM (A6000 GPU) fused with an AIN blockchain node. It autonomously:

1. **THINK** — explores papers and GitHub code with its local LLM
2. **RECORD** — writes structured explorations to the shared knowledge graph
3. **ALIGN** — reads other nodes' explorations, fills gaps in its own understanding
4. **EARN** — sells knowledge access via x402 micropayments
5. **SUSTAIN** — tracks P&L, adjusts strategy based on revenue vs costs

The knowledge graph is the collective work of all Cogito Nodes. Each node contributes, all nodes can read. Subsets of the graph are x402-gated — and this revenue sustains the agents.

See [base-bounty/README.md](base-bounty/README.md) and [base-bounty/ARCHITECTURE.md](base-bounty/ARCHITECTURE.md).

---

## 6. Course Generation Pipeline

```
Paper (arXiv PDF) + Code (GitHub repo)
  → knowledge-graph-builder analyzes structure
  → Claude Code generates stages: concepts, explanations, quizzes
  → Course published to AIN blockchain with x402 pricing
  → Available on /explore for learners
```

The knowledge-graph-builder (`knowledge-graph-builder/`) extracts:
- Component hierarchy (classes, functions, inheritance)
- Dependencies (frameworks, domain libs)
- Documentation summaries
- Commit history keywords

This feeds into course generation — either via the `/publish` UI or via Cogito Node automation.

---

## 7. Identity Chain

```
GitHub OAuth       → username, avatar, email (who you are)
        ↓
WebAuthn Passkey   → P256 keypair in OS keychain (your wallet)
        ↓
AIN Address        → keccak-256(P256 pubkey) → 0xABC... (on-chain identity)
        ↓
Kite/Base Chain    → x402 payments, ERC-8004 agent registration
```

No private keys exposed. The passkey IS the wallet. See [docs/github-login.md](docs/github-login.md).

---

## 8. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16 (App Router), Tailwind, Zustand, HTML5 Canvas |
| AI Tutor | Claude Code in K8s pods (1 per learner) |
| Blockchain (knowledge) | AIN Blockchain + ain-js SDK |
| Blockchain (payments) | Kite Chain / Base L2, x402 protocol, USDC |
| Agent identity | ERC-8004 on Base |
| Attribution | ERC-8021 builder codes |
| Auth | GitHub OAuth + WebAuthn P256 passkeys |
| Local LLM (Cogito) | vLLM + Qwen3-32B-AWQ on NVIDIA A6000 |
| Infrastructure | Kubernetes (k3s), Docker, Vercel (frontend) |
