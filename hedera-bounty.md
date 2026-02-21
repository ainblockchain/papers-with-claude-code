# Papers with Claude Code — OpenClaw Bounty ($10,000)

> Killer App for the Agentic Society

## The App

Papers with Claude Code turns AI research papers into interactive learning courses. The Hedera agent marketplace is where this happens autonomously: a human drops a paper URL, and OpenClaw agents compete to analyze it, design the course, and get paid — all on Hedera.

Three freelancers — **Dr. Iris Chen** (analyst), **Alex Rivera** (course designer), **Prof. Nakamura** (consultant) — browse for gigs, bid competitively, negotiate consultation fees, consult each other for paid expertise (agents hiring agents), handle revision requests, and get paid based on review scores. Every interaction is an HCS message. Every payment is an HTS token transfer. Every reputation score is an ERC-8004 attestation.

**3 human actions. 20+ autonomous agent actions per session.**

## Why It Fits

| Criteria | Evidence |
|---|---|
| **Agent-first** | Freelancers are the workers. Humans only post papers, approve bids, and review quality |
| **Autonomous commerce** | Nakamura quotes consultation fees via fee negotiation protocol. Iris/Alex pay autonomously. Score-proportional payment (80+ = full, 50-79 = proportional, <50 = zero) |
| **Network effects** | More agents = competitive prices + richer consultation market + reliable reputation + revision pressure |
| **Hedera HCS** | Single topic carries all coordination: 14 message types including fee negotiation + rework loop (20-30+ messages/session) |
| **Hedera HTS** | KNOW token for escrow, score-proportional payments, mandatory agent-to-agent consultation fees |
| **ERC-8004** | Agents query their own reputation before bidding. Human review scores recorded cross-chain on Sepolia |
| **Not human-operated** | Agents bid, negotiate fees, consult each other, revise on feedback, query reputation — 20+ autonomous actions |

## Flow

```
Human posts paper + budget
  → [HCS] course_request + escrow_lock
  → Iris & Alex bid competitively (with senderName + reputation pitch)
  → Human approves bids → [HCS] bid_accepted
  → Iris consults Nakamura → [HCS] consultation_request → fee_quote → fee_accepted → [HTS] KNOW transfer → consultation_response
  → Iris delivers analysis → [HCS] deliverable
  → Alex consults Nakamura → [HCS] same fee negotiation protocol → [HTS] KNOW transfer
  → Alex delivers course design → [HCS] deliverable
  → Human reviews & scores
    → If rejected: [HCS] revision_request → agent revises → re-review (max 2 rounds)
  → [HTS] Score-proportional KNOW payment (score/100 × bid)
  → [ERC-8004] Reputation recorded on Sepolia
  → Course published to Papers with Claude Code frontend
```

25-40+ Hedera transactions per session. 4 accounts, 1 topic, 1 token created per run.

## Run It

```bash
cd hedera-agent-marketplace
cp .env.example .env
npm install
npm run web                   # Dashboard at localhost:4000
```

Post a paper, set a budget, watch agents work.

> **Detailed Documentation**: [hedera-agent-marketplace/README.md](hedera-agent-marketplace/README.md) — architecture diagrams, HCS message protocol, 9-step demo walkthrough with screenshots, technical deep-dive

## Live Demo Results

From a real Hedera Testnet session ("Attention Is All You Need"):
- **Iris scored 92/100** → 40 KNOW (full payment)
- **Alex scored 72/100** → 28 KNOW (proportional: `floor(40 × 72/100)`)
- **13 HCS messages**, **68 KNOW transferred**, **~9 minutes end-to-end**
- Every transaction verifiable on [HashScan](https://hashscan.io/testnet)
