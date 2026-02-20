# Architecture

## System Overview

The system has three layers: **capture** (Claude Code skill), **process** (Cogito container), and **serve** (x402 content server).

```
┌─────────────────────────────────────────────────────────────────┐
│  Developer's Machine                                            │
│                                                                 │
│  Claude Code session                                            │
│    └── /lesson skill ──HTTP POST──→ Cogito container            │
│         captures design decisions    (or writes directly to     │
│         from conversation context     AIN via ain-js script)    │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  AIN Blockchain Node (ain-blockchain/docker-compose)            │
│                                                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐                 │
│  │  vLLM    │  │  Neo4j   │  │ AIN Node     │                 │
│  │ Qwen3-   │  │ Knowledge│  │ JSON-RPC     │                 │
│  │ 32B-AWQ  │  │ Graph    │  │ + Knowledge  │                 │
│  │          │  │ Storage  │  │   Module     │                 │
│  │ GPU:8000 │  │     :7687│  │        :8080 │                 │
│  └────▲─────┘  └────▲─────┘  └──────▲───────┘                 │
│       │              │               │                          │
│       │              └───────────────┘                          │
└───────┼──────────────────────────────┼──────────────────────────┘
        │                              │
┌───────┼──────────────────────────────┼──────────────────────────┐
│  Cogito Container (deployed from papers-with-claudecode)        │
│       │                              │                          │
│  ┌────┴─────────┐  ┌────────────────┴──────┐                  │
│  │ Content      │  │ Lesson Watcher        │                  │
│  │ Generator    │  │ (polls AIN for new    │                  │
│  │ (calls vLLM) │  │  lesson_learned)      │                  │
│  └──────────────┘  └──────────────────────-┘                  │
│                                                                 │
│  ┌──────────────────────────────────────────┐                  │
│  │ x402 Server (:3402)                      │                  │
│  │ GET /content, POST /lesson, GET /stats   │                  │
│  └──────────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Base Chain (L2)                                                │
│                                                                 │
│  - ERC-8004: Agent identity (Cogito node registered as agent)   │
│  - ERC-8021: Builder codes attributing paper authors + devs     │
│  - USDC: x402 payment settlement                               │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Lesson Capture

The developer works with Claude Code on a real project. When they make a design decision, they invoke the `/lesson` skill:

```
/lesson "Chose event sourcing over CRUD because we need full audit trail"
```

The skill:
1. Reads the current conversation context (what files were being discussed, what alternatives were considered)
2. Structures the decision as a `lesson_learned` entry
3. Writes it to AIN blockchain via ain-js `knowledge.explore()`

**On-chain format:**
```
/apps/knowledge/explorations/{address}/lessons/{entryId}
  ├── title: "Event Sourcing over CRUD for Audit Trails"
  ├── content: "Decision context, rationale, alternatives, trade-offs..."
  ├── summary: "Chose event sourcing over CRUD because..."
  ├── depth: 2
  ├── tags: "lesson_learned,architecture,event-sourcing,audit"
  └── created_at: 1708300000
```

### 2. Content Enrichment (Cogito Container)

The Cogito container runs continuously inside the AIN blockchain node. It:

**a) Watches for new lessons**
- Polls `ain.knowledge.getExplorations()` for entries tagged `lesson_learned`
- Detects new entries since last check

**b) Discovers related papers + official code**
- Extracts keywords from the lesson (tags first, then title words, LLM fallback)
- Searches arXiv API for related academic papers
- For each paper, finds the **official code repository** via:
  - GitHub URLs in the paper abstract (authors often link their repo)
  - Papers with Code API (tracks official implementations)
- **Fetches actual source code** from official repos via GitHub API
  - Prioritizes: README, model definitions, training scripts, configs
  - Reads key files (model.py, train.py, config.yaml, etc.)

**c) Generates educational content**
- Calls local vLLM (Qwen3-32B-AWQ) via OpenAI-compatible API
- Prompt includes: lesson context + paper abstracts + **actual source code from official repos**
- vLLM does NOT search the internet — the container fetches everything and passes it as context
- Output: structured educational article grounded in real paper claims AND real code

**d) Publishes gated content**
- Writes enriched content back to AIN blockchain via `ain.knowledge.explore()` with `price` set
- Tags with `x402_gated,educational` + paper/code references
- Records Base chain transaction with ERC-8021 builder codes attributing original authors

### 3. Content Serving (x402)

Subscribers access educational content via HTTP:

```
GET /content                    → free listing of available articles
GET /content/:id                → 402 Payment Required (needs x402 payment)
GET /content/topic/:topicPath   → articles for a topic
GET /content/lessons            → raw lessons (free summaries, paid full content)
```

Payment flow:
1. Client receives 402 with payment details (price, USDC address, Base chain)
2. Client sends USDC payment via Base chain
3. Client retries request with payment proof
4. Server verifies payment, returns full content

## Components

### `/lesson` Claude Code Skill

**Location:** `.claude/skills/lesson/SKILL.md`

A Claude Code custom slash command that:
- Captures the current design decision from conversation context
- Structures it with: decision, rationale, alternatives, related files, tags
- Runs `scripts/record-lesson.ts` to write to AIN blockchain

The skill uses dynamic context injection to read the current conversation state:

```markdown
---
name: lesson
description: Record a design decision as lesson_learned on AIN blockchain
argument-hint: [decision description]
---

Record the following design decision as a lesson_learned:

**Decision:** $ARGUMENTS

Analyze the conversation context to extract:
1. What was decided and why
2. What alternatives were considered
3. What files/code are involved
4. Relevant tags/topics

Then run the record script to write it to the blockchain.
```

### Cogito Container

**Location:** `cogito/` (in papers-with-claudecode repo, deployed to AIN node)

```
cogito/
├── Dockerfile
├── package.json
├── tsconfig.json
├── .env.example
├── CLAUDE.md              # Container documentation
├── scripts/
│   └── deploy.ts         # Build + deploy to AIN node via ain-js
└── src/
    ├── server.ts          # Express x402 server (main entry)
    ├── lesson-watcher.ts  # Polls AIN for new lesson_learned entries
    ├── content-generator.ts # Calls vLLM to generate educational content
    ├── paper-discovery.ts # arXiv + Papers with Code + GitHub code fetching
    ├── ain-client.ts      # ain-js wrapper for blockchain operations
    └── types.ts           # Shared types
```

**Deployment (CI/CD via GitHub Actions):**

The container source lives in this repo. On push, GitHub Actions builds the image and publishes to GHCR. The AIN node — bound to your GitHub identity via passkey — pulls and runs the image.

```
Developer pushes to GitHub
  → GitHub Actions builds cogito Docker image
  → Pushes to ghcr.io/<owner>/cogito:latest
  → AIN node (bound via passkey) pulls from GHCR
  → AIN node runs cogito on its Docker network
```

**Why CI/CD instead of Docker-in-Docker:**
- No Docker socket mounting (container escape risk)
- No private keys passed via CLI args (`docker inspect` leak)
- Secrets encrypted in GitHub Actions
- Image built in clean CI, not developer machine
- AIN node only trusts images from the passkey-bound GitHub account

**Binding flow (one-time setup):**
1. User logs in with GitHub OAuth on the web frontend
2. Registers P256 passkey → derives AIN address
3. AIN node records: `{ainAddress} trusts ghcr.io/{githubUsername}/*`
4. From then on, the node auto-pulls new image versions from that GHCR namespace

### AIN Blockchain Node

The standard AIN blockchain node with knowledge graph module enabled. Stores all data:

- **Explorations** — lessons, enriched content, courses
- **Topics** — hierarchical topic tree
- **Graph** — nodes + edges linking related knowledge
- **Access receipts** — x402 payment records

### vLLM (Qwen3-32B-AWQ)

Local LLM for content generation. Runs on GPU (A6000, 48GB VRAM).

- OpenAI-compatible API at `http://vllm:8000/v1/chat/completions`
- Model: Qwen/Qwen3-32B-AWQ (quantized, ~20GB VRAM)
- Thinking/non-thinking toggle via system prompt
- Used by Cogito container only (not by Claude Code — Claude Code uses Anthropic API)

### Base Chain Integration

**ERC-8004 (Agent Identity):**
- Cogito node registered as Agent #18276 on Base mainnet
- Contract: `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- Agent address: `0xA7b9a0959451aeF731141a9e6FFcC619DeB563bF`

**ERC-8021 (Builder Codes):**
- Every Base transaction includes attribution codes
- Schema 0 format: `[length][comma-delimited codes][0x00][marker]`
- Codes attribute both the Cogito agent AND original paper authors / code contributors
- Example: `cogito_node,arxiv_vaswani2017,github_huggingface`

**x402 Payments:**
- USDC on Base chain
- Facilitator handles payment verification
- Revenue tracked by `revenue-tracker.ts`

## Knowledge Graph Schema

```
lesson_learned (depth 1-2)
  │
  ├── tags: "lesson_learned,{topic},{subtopic}"
  ├── content: raw decision + context
  │
  └── enriched_content (depth 3-4)
        │
        ├── tags: "x402_gated,educational,{topic}"
        ├── content: lesson + papers + code analysis
        ├── price: "0.005" (USDC)
        ├── parentEntry: → lesson_learned
        │
        └── related papers
              ├── tags: "arxiv:{id},{category}"
              └── code references
                    └── tags: "github:{repo},has-code"
```

## GitHub Login + Passkey Identity

Users authenticate via **GitHub OAuth** and register a **P256 passkey** (WebAuthn) that becomes their blockchain wallet. See [docs/github-login.md](docs/github-login.md) for full details.

```
GitHub OAuth → proves identity (username, avatar)
     ↓
Passkey Registration → creates P256 keypair in OS keychain
     ↓
P256 public key → keccak-256 hash → AIN blockchain address
     ↓
On-chain mapping: /apps/knowledge/users/{ainAddress}/github_username = "octocat"
```

**Identity chain:** GitHub account → passkey wallet → AIN address → Cogito node

This means:
- The user's GitHub identity is bound to their AIN wallet address
- When they use `/lesson` to record a design decision, it's attributed to their GitHub identity
- Subscribers see who created the lesson (GitHub username + avatar)
- No private keys exposed — the passkey IS the wallet

## Self-Sustainability Model

The system sustains itself through x402 micropayments:

| Revenue Stream | Price (USDC) | Description |
|---------------|-------------|-------------|
| Article unlock | $0.005 | Full educational article |
| Course stage | $0.001 | Single course stage |
| Deep analysis | $0.05 | Custom LLM analysis of topic |
| Frontier map | $0.002 | Topic exploration stats |

| Cost | Estimate/day | Description |
|------|-------------|-------------|
| vLLM inference | $0 | Self-hosted on own GPU |
| AIN blockchain | ~$0 | Devnet, negligible gas |
| Base transactions | ~$0.01 | Minimal L2 gas fees |
| Electricity/GPU | ~$3-5 | A6000 power consumption |

Break-even: ~600-1000 article reads per day at $0.005 each.
