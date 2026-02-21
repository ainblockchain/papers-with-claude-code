# Papers with Claude Code — Base Bounty ($10,000)

> Self-Sustaining Autonomous Agent on Base

**Live**: [https://paperswithclaudecode.com](https://paperswithclaudecode.com)

## What Is Papers with Claude Code

Papers with Claude Code ([paperswithclaudecode.com](https://paperswithclaudecode.com)) is a platform where anyone can turn AI research papers into interactive learning courses using Claude Code, and learners pay per stage with blockchain micropayments. The Cogito Node is the autonomous agent that powers the backend — it reads papers, generates knowledge, publishes courses, and earns USDC on Base to pay for its own compute.

## The Self-Sustaining Loop

The agent behind [paperswithclaudecode.com](https://paperswithclaudecode.com) runs a weighted autonomous cycle:

- **60% Think**: Local LLM explores papers from arXiv, writes structured knowledge to a shared graph
- **20% Align**: Cross-references peer explorations, identifies gaps in community knowledge
- **10% Earn**: Auto-generates interactive courses from accumulated explorations, publishes to [paperswithclaudecode.com](https://paperswithclaudecode.com)
- **10% Sustain**: Monitors wallet balance vs. compute cost, adjusts exploration strategy

## How It Earns (x402 on Base)

When learners use [paperswithclaudecode.com](https://paperswithclaudecode.com), every content access settles USDC to the agent's Base wallet via x402:

| What learners do on paperswithclaudecode.com | Price | x402 Endpoint |
|----------------------------------------------|-------|---------------|
| Unlock a course stage | $0.001 | `/course/unlock-stage` |
| Browse topic explorations | $0.005 | `/knowledge/explore/*` |
| View frontier map | $0.002 | `/knowledge/frontier/*` |
| Request deep analysis | $0.05 | `/knowledge/curate` |
| Download knowledge graph | $0.01 | `/knowledge/graph` |

No tokens, no subscriptions — USDC micropayments via `@x402/express` on Base.

## How It Sustains

| Cost | Estimate |
|------|----------|
| GPU power (A6000, ~300W) | $0.72/day |
| Server hosting | $2-5/day |
| Base gas fees | $0.10/day |
| **Total** | **~$3-6/day** |

Local LLM means zero per-inference cost. More courses on [paperswithclaudecode.com](https://paperswithclaudecode.com) = more revenue, not more cost. The sustain phase checks `sustainabilityRatio = income / cost` and auto-adjusts: below 1.0 it conserves, above 2.0 it expands into frontier topics.

## ERC-8021 Builder Codes

Every Base transaction from [paperswithclaudecode.com](https://paperswithclaudecode.com) includes builder code attribution:

```
cogito_node          — the agent powering paperswithclaudecode.com
arxiv_2024.12345     — source paper the course was built from
github_repo_name     — official code repository
lastname_year        — original paper authors
```

This gives original researchers on-chain credit whenever their paper generates revenue on the platform.

## ERC-8004 Agent Identity

The agent is registered on Base via ERC-8004:
- Discoverable by other agents via registry lookup
- Declares x402 support in on-chain metadata
- Reputation tracking: learners rate course quality after purchase

## Public Dashboard

The agent dashboard is accessible at [paperswithclaudecode.com](https://paperswithclaudecode.com) with no login required:

- **Wallet balances**: ETH + USDC on Base, real-time
- **Revenue vs. cost**: 24h income, 24h cost, sustainability ratio
- **Knowledge stats**: topics explored, graph nodes/edges, frontier depth
- **Recent explorations**: papers read, concepts extracted
- **Base transactions**: total count, ERC-8021 attributed count
- **Bounty checklist**: all criteria with live pass/fail status

## Why It Fits

| Criteria | Evidence |
|---|---|
| **Transacts on Base** | x402 USDC settlements from paperswithclaudecode.com learners + ERC-8004 registration |
| **Self-sustaining** | Learner micropayments cover $3-6/day compute. Auto-adjusts strategy based on revenue |
| **ERC-8021 builder codes** | Every transaction attributes the agent, the paper, and original authors |
| **Autonomous** | Reads papers, generates courses, publishes to paperswithclaudecode.com — no human triggers any phase |
| **Novel revenue** | Sells AI-generated courses from real research via x402 — not trading or MEV |
| **Network effects** | More courses on paperswithclaudecode.com = more learners = more micropayments = more courses |
| **x402 + ERC-8004** | x402 for all content payments, ERC-8004 for identity + reputation |
| **Public interface** | [paperswithclaudecode.com](https://paperswithclaudecode.com) — no auth, all metrics visible |
