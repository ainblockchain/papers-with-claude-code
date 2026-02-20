# Papers with Claude Code

A knowledge graph-based learning platform that connects academic papers and GitHub repositories for educational content, powered by AIN blockchain and Claude Code.

## Overview

Developers learn by doing — making design decisions, reading papers, and studying code. This project captures that process and turns it into structured, monetizable educational content.

When you work with Claude Code and make a design decision, the `/lesson` skill records it as a **lesson_learned** on the AIN blockchain knowledge graph. The **Cogito container** — running inside the AIN blockchain node — watches for new lessons, finds related academic papers and code repositories, and generates rich educational content using a local LLM (Qwen3-32B via vLLM). Subscribers pay via **x402 micropayments** to access this content.

```
You (Claude Code) ──/lesson──→ AIN Blockchain (lesson_learned)
                                       │
Cogito Container                       │
  ├── watches for new lessons ←────────┘
  ├── finds related papers + code (arXiv, GitHub)
  ├── generates educational content (vLLM / Qwen3-32B)
  └── serves x402-gated content → Subscribers pay to read
```

## Key Concepts

- **Lesson Learned** — A design decision captured during development: what you decided, why, what alternatives you considered, and what papers/code informed the choice
- **Cogito Container** — A Docker service inside the AIN blockchain node that transforms lessons into educational content
- **x402 Micropayments** — HTTP 402-based payment protocol on Base chain; subscribers pay per-article in USDC
- **Knowledge Graph** — AIN blockchain stores lessons, explorations, and their relationships as a graph
- **ERC-8004** — Agent identity on Base chain (the Cogito node is a registered autonomous agent)
- **ERC-8021** — Builder codes on Base transactions that attribute original paper authors and code contributors

## Features

- **Knowledge Graph Construction** — Automatically extract and connect key concepts, methods, and findings across papers
- **Paper-to-Code Linking** — Map academic papers to their corresponding GitHub repositories and implementations
- **Lesson Capture** — `/lesson` Claude Code skill records design decisions to blockchain
- **Educational Content Generation** — Cogito container enriches lessons with papers + code analysis
- **x402 Monetization** — Subscribers pay micropayments to access generated content
- **Shared Learning Management** — Collaborate with friends to track reading progress, share annotations, and discuss insights
- **Social Learning** — Share knowledge graphs with peers, compare notes, and learn together

## Architecture

See [architecture.md](architecture.md) for the full system design.

## Modules

| Directory | Description |
|-----------|-------------|
| `cogito/` | Cogito container: content generation + x402 server |
| `.github/workflows/deploy-cogito.yml` | CI/CD: build image, push to GHCR, register on AIN |
| `.claude/skills/lesson/` | `/lesson` Claude Code skill for recording design decisions |
| `base-bounty/agent/` | Base chain integration (ERC-8004, ERC-8021, wallet) |
| `base-bounty/web/` | Public dashboard showing bounty compliance |
| `ainblockchain-integration/` | AIN blockchain debug frontend |
| `knowledge-graph-builder/` | Paper/repo knowledge graph extraction |
| `frontend/` | Main web frontend |

## Roles & Responsibilities

| Member | Module |
|--------|--------|
| @chanho | `frontend/` |
| @haechan | `claudecode-kubernetes/` |
| @hyeonjeong | `knowledge-graph-builder/` |
| @minhyun | `ainblockchain-integration/` + `cogito/` |

## Getting Started

### Prerequisites

- Docker with GPU support (NVIDIA A6000 or similar, 48GB+ VRAM)
- Node.js 20+
- AIN private key
- (Optional) Anthropic API key for Claude Code

### Run the AIN blockchain node

```bash
cd /path/to/ain-blockchain
docker compose up
```

This starts: vLLM (Qwen3-32B-AWQ) + Neo4j + AIN blockchain node.

### Deploy the Cogito container

Cogito deploys via CI/CD. Push to `main` and GitHub Actions will:
1. Build the Docker image
2. Push to `ghcr.io/<owner>/cogito`
3. Register deployment on AIN blockchain

The AIN node — bound to your GitHub account via passkey — pulls the image from GHCR and runs it.

```bash
# Or build locally for development
cd cogito
npm run docker:build
```

### GitHub Actions Secrets

Set these in **Settings > Secrets > Actions**:

| Secret | Description |
|--------|-------------|
| `AIN_PROVIDER_URL` | AIN node endpoint |
| `AIN_PRIVATE_KEY` | Wallet private key |

`GITHUB_TOKEN` is provided automatically (used for GHCR push).

### Record a lesson (from your Claude Code session)

```
/lesson "Chose WebSocket over polling for real-time updates because of lower latency"
```

### Access educational content (as a subscriber)

```bash
# Free: list available content
curl http://localhost:3402/content

# Paid: unlock full article (x402 payment required)
curl http://localhost:3402/content/<id>
```

## Documentation

- [Architecture](architecture.md) — Full system design and data flow
- [GitHub Login (Passkey Auth)](docs/github-login.md) — GitHub OAuth + P256 passkey wallet

## License

MIT
