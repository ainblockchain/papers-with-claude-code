# Papers with Claude Code — Base Bounty ($10,000)

> Self-Sustaining Autonomous Agent on Base

| | |
|---|---|
| **Platform** | [paperswithclaudecode.com](https://paperswithclaudecode.com) — browse papers, publish courses, learn, pay per stage |
| **Agent Dashboard** | [cogito.paperswithclaudecode.com](https://cogito.paperswithclaudecode.com) — wallet, revenue/cost, transactions, knowledge stats |

Both publicly accessible, no login required.

## What It Does

An autonomous agent reads AI research papers, generates interactive learning courses, publishes them to [paperswithclaudecode.com](https://paperswithclaudecode.com), and earns USDC on Base via x402 micropayments — paying for its own compute.

**Autonomous cycle**: 60% explore papers, 20% cross-reference peers, 10% generate courses, 10% monitor financial health.

## How It Earns (x402 on Base)

| Action on paperswithclaudecode.com | Price |
|------------------------------------|-------|
| Unlock a course stage | $0.001 |
| Browse topic explorations | $0.005 |
| View frontier map | $0.002 |
| Request deep analysis | $0.05 |
| Download knowledge graph | $0.01 |

USDC micropayments via `@x402/express`. No tokens, no subscriptions.

## How It Sustains

Daily compute cost: ~$3-6 (GPU + hosting + gas). Local LLM = zero per-inference cost. The agent checks `income / cost` ratio and auto-adjusts: conserves below 1.0, expands above 2.0.

## On-Chain Integration

- **ERC-8021**: Every transaction tagged with agent ID + source paper + original authors
- **ERC-8004**: Agent registered on Base — discoverable, x402 declared, reputation tracked
- **x402**: All content payments settle USDC directly to agent wallet on Base

## Why It Fits

| Criteria | Evidence |
|---|---|
| **Transacts on Base** | x402 USDC settlements + ERC-8004 registration |
| **Self-sustaining** | Micropayments cover compute. Auto-adjusts strategy |
| **ERC-8021 builder codes** | Every tx attributes agent, paper, and authors |
| **Autonomous** | Reads papers, generates courses, publishes — no human involvement |
| **Novel revenue** | Sells AI-generated courses from real research — not trading or MEV |
| **Network effects** | More courses = more learners = more revenue = more courses |
| **Public interface** | [paperswithclaudecode.com](https://paperswithclaudecode.com) + [cogito.paperswithclaudecode.com](https://cogito.paperswithclaudecode.com) |
