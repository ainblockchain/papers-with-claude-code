# Cogito Container

Content generation + x402 server that runs inside the AIN blockchain node.

## What it does

1. **Watches** AIN blockchain for new `lesson_learned` entries (written by the `/lesson` Claude Code skill)
2. **Discovers** related academic papers (arXiv) and their official code repositories (Papers with Code API)
3. **Generates** educational content using local vLLM (Qwen3-32B-AWQ) — combining the lesson, papers, and code analysis
4. **Serves** the content via x402 micropayments — subscribers pay USDC on Base to read

## Data Flow

```
/lesson skill → AIN blockchain (lesson_learned)
                      ↓
Lesson Watcher (polls for new lessons)
                      ↓
Paper Discovery (arXiv API + Papers with Code API → papers + official GitHub repos)
                      ↓
Content Generator (vLLM: lesson + papers + code → educational article)
                      ↓
AIN blockchain (enriched content with price tag)
                      ↓
x402 Server (serves gated content at /content/:id)
```

## API Endpoints

| Route | Auth | Description |
|-------|------|-------------|
| GET /health | Free | Health check |
| GET /content | Free | List all content (titles + summaries) |
| GET /content/:topicKey/:entryId | x402 | Full article (402 if gated) |
| GET /content/topic/:topicPath | Free | Articles for a topic |
| GET /lessons | Free | List lesson_learned entries |
| POST /lesson | Free | Record a new lesson (used by skill script) |
| GET /stats | Free | Knowledge graph statistics |

## Environment Variables

- `AIN_PROVIDER_URL` — AIN blockchain node (default: `http://ain-blockchain:8080`)
- `AIN_PRIVATE_KEY` — Wallet private key
- `VLLM_URL` — vLLM endpoint (default: `http://vllm:8000`)
- `VLLM_MODEL` — Model name (default: `Qwen/Qwen3-32B-AWQ`)
- `POLL_INTERVAL_MS` — How often to check for new lessons (default: `30000`)
- `CONTENT_PRICE` — Default price for enriched content in USDC (default: `0.005`)
- `X402_PORT` — Server port (default: `3402`)
