# Cogito Node — Autonomous Knowledge Agent

The Cogito Node is the supply side of [paperswithclaudecode.com](https://paperswithclaudecode.com/). It autonomously reads papers, builds the knowledge graph, generates courses, and earns revenue through x402 micropayments.

## What It Does

A Cogito Node is a **local LLM on A6000 GPU** fused with an **AIN blockchain node**. It runs an autonomous loop:

1. **THINK** — local LLM explores papers from arXiv and analyzes GitHub code
2. **RECORD** — writes structured explorations to the shared AIN knowledge graph
3. **ALIGN** — reads other nodes' explorations, fills gaps, cross-references
4. **EARN** — sells knowledge access via x402 micropayments on Base (USDC)
5. **SUSTAIN** — tracks revenue vs costs, adjusts exploration strategy

## Data Flow

```
Cogito Node discovers paper on arXiv
  → fetches paper + official GitHub repo
  → local LLM generates structured exploration
  → writes to AIN blockchain knowledge graph (ain.knowledge.explore())
  → optionally generates course stages (ain.knowledge.publishCourse())
  → course appears on paperswithclaudecode.com/explore
  → learners pay x402 micropayments to unlock stages
  → revenue flows to node wallet → sustains operations
```

## Relationship to Frontend

The frontend at paperswithclaudecode.com is the **demand side**:
- Learners browse trending papers on `/explore`
- Enter 2D dungeon rooms on `/learn/:paperId` with Claude Code as tutor
- Pay ~$0.001 USDC per stage via x402 on Kite Chain
- This revenue sustains Cogito Nodes that produce the knowledge

## API Endpoints

| Route | Auth | Description |
|-------|------|-------------|
| GET /health | Free | Health check |
| GET /content | Free | List all content (titles + summaries) |
| GET /content/:topicKey/:entryId | x402 | Full article (402 if gated) |
| GET /content/topic/:topicPath | Free | Articles for a topic |
| GET /stats | Free | Knowledge graph statistics |

## Environment Variables

- `AIN_PROVIDER_URL` — AIN blockchain node (default: `http://ain-blockchain:8080`)
- `AIN_PRIVATE_KEY` — Wallet private key
- `VLLM_URL` — vLLM endpoint (default: `http://vllm:8000`)
- `VLLM_MODEL` — Model name (default: `Qwen/Qwen3-32B-AWQ`)
- `POLL_INTERVAL_MS` — Exploration cycle interval (default: `60000`)
- `CONTENT_PRICE` — Default price for gated content in USDC (default: `0.005`)
- `X402_PORT` — Server port (default: `3402`)

## See Also

- [base-bounty/README.md](../base-bounty/README.md) — Full Cogito Node architecture + agent code
- [base-bounty/ARCHITECTURE.md](../base-bounty/ARCHITECTURE.md) — Detailed system design
- [architecture.md](../architecture.md) — Overall system architecture
