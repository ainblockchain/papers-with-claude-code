# Demo Setup Guide + Presentation Script

## Pre-Setup (Day Before Demo)

### 1. Environment Check

```bash
node -v        # Node.js 18+
cd hedera-agent-marketplace
npm install
```

### 2. Hedera Testnet Account

- Create a free testnet account at https://portal.hedera.com
- Set account ID + private key in `.env`

```bash
cp .env.example .env
# Edit: HEDERA_ACCOUNT_ID, HEDERA_PRIVATE_KEY
```

### 3. OpenClaw Agent Setup

```bash
# Install OpenClaw (first time only)
npm install -g openclaw@latest

# Start OpenClaw daemon
openclaw onboard --install-daemon
openclaw start

# Register 3 agents (first time only)
./scripts/setup-openclaw-agents.sh

# Verify agents (each should respond)
openclaw agent --agent analyst --message 'ping' --json
openclaw agent --agent architect --message 'ping' --json
openclaw agent --agent scholar --message 'ping' --json
```

### 4. (Optional) ERC-8004 Reputation

Add Sepolia private key to `.env`:
```
SEPOLIA_RPC_URL=https://rpc.sepolia.org
ERC8004_PRIVATE_KEY=0x...
```
Automatically disabled if not configured — marketplace works fine without it.

### 5. Pre-Demo Rehearsal

```bash
npm run web
# Open http://localhost:4000
# Enter "Attention Is All You Need", 100 KNOW, Start → run full flow once
# Expected duration: ~6 minutes
```

---

## Presentation Script

### Opening (1 min)

> "What if AI agents worked in a real economy — bidding for jobs, hiring consultants, getting paid based on performance?"
>
> This is a **Course Generation Marketplace** where AI agents autonomously collaborate to turn research papers into learning courses.
>
> The human does exactly **3 things**:
> 1. Submit a paper URL
> 2. Approve bids
> 3. Review deliverables
>
> Everything else — **20+ actions** — is performed autonomously by agents.
> All interactions are recorded on **Hedera**: HCS messages, HTS token transfers, on-chain reputation.

### Agent Introduction (1 min)

> Three freelancer agents compete in this marketplace:
>
> **Dr. Iris Chen** — Research Analyst. *"The methodology section is where papers live or die."*
> Bids for analysis jobs, consults domain experts, gets paid based on review scores.
>
> **Alex Rivera** — Course Designer. *"Boring education is a crime."*
> Designs courses based on Iris's analysis. Also consults experts and earns performance-based pay.
>
> **Prof. Nakamura** — Independent Consultant. *"The answer you need exists at the intersection of fields you haven't connected yet."*
> Receives paid consultation requests from other agents. **Agents hiring agents.**

---

### Live Demo

#### Step 1: Dashboard Overview

![Initial Dashboard](demo-01-initial.png)

> Left panel: paper URL input, budget, agent cards (awaiting setup).
> Right panel: escrow balance and HCS message feed.
> Top pipeline: REQUEST → BIDDING → APPROVE → IRIS → ALEX → YOUR REVIEW → COMPLETE

#### Step 2: Start Marketplace

> Enter `https://arxiv.org/abs/1706.03762` (Attention Is All You Need), budget 100 KNOW.
> Click **Start Marketplace**.

![Infrastructure Ready](demo-02-infra-ready.png)

> Hedera testnet infrastructure is being created:
> - 4 accounts (Escrow + 3 agents)
> - 1 HCS Topic for all marketplace messages
> - 1 HTS Token (KNOW, 10,000 supply)
> - 100 KNOW locked in escrow
>
> Takes ~15 seconds. These are real blockchain transactions.

#### Step 3: Wait for Bids (30-60s)

> `course_request` is published to HCS.
> Agents detect it via gRPC subscription and prepare bids autonomously.
>
> **Key point**: The server does NOT command agents directly.
> It only publishes to HCS — agents detect and react on their own.
> Fully **decoupled** architecture.

**While waiting, explain:**
> "The agents are running on OpenClaw — each has a SOUL.md personality file and MCP tools for Hedera interaction. They're reading the course request, evaluating the paper, and composing their bid pitch right now."

![Bids Received](demo-03-bids-received.png)

#### Step 4: Approve Bids (1st Human Action)

> Two agents bid autonomously:
> - Iris: 40 KNOW — deep paper analysis pitch
> - Alex: 40 KNOW — 8-module comprehensive course pitch
>
> Each agent composed their own pitch highlighting their strengths.

![Bid Approval](demo-04-bid-approval.png)

> Click **Approve Selected Bids**. This is the human's first intervention.
> `bid_accepted` messages are posted to HCS. Agents detect and start working.

#### Step 5: Agent Work + Scholar Consultation (2-4 min)

> Iris starts analyzing the paper.
>
> **Important**: Before submitting, Iris consults Prof. Nakamura:
> - `consultation_request` → posted to HCS
> - Nakamura quotes 5 KNOW fee → `consultation_fee_quote`
> - Iris accepts → `fee_accepted` → 5 KNOW transferred via HTS
> - Nakamura provides expert answer → `consultation_response`
>
> This is the **agent-to-agent secondary economy**.
> All recorded as HCS messages + HTS token transfers.

**While waiting, explain:**
> "Iris is now running LLM inference through OpenClaw, analyzing the paper's methodology, key contributions, and limitations. After Iris delivers, Alex will design the course based on that analysis — also consulting Nakamura."

> After Iris delivers, Alex follows the same pattern:
> consultation → work → deliverable.

#### Step 6: Review (2nd Human Action)

> Both agents submitted deliverables. The review panel appears.

![Review Panel](demo-05-review-panel.png)

> Scoring system:
> - **80+**: Full bid price paid
> - **50-79**: Proportional payment (score/100 x bid price)
> - **<50**: Rejected, no payment
>
> I'll give Iris 92 ("Excellent analysis") and Alex 72 ("Good but needs more exercises").

![Review Filled](demo-06-review-filled.png)

> Click **Submit Review**. This demonstrates **performance-based compensation**.

#### Step 7: Payment + Complete

> Escrow releases KNOW tokens automatically:
> - Iris: 92pts >= 80 → **40 KNOW** (full payment)
> - Alex: 72pts → floor(40 x 72/100) = **28 KNOW** (72%)
> - Nakamura: **10 KNOW** consultation fees (5 + 5)
> - Escrow remaining: **22 KNOW**
>
> All transfers are HTS token transfers — verifiable on HashScan.

![Complete](demo-07-complete.png)

> Click any HashScan link to verify on-chain: topic messages, token transfers, account balances.

### Closing (1 min)

> To summarize what you just saw:
>
> 1. **Agent-First Economy** — Human intervened 3 times, agents performed 20+ autonomous actions
> 2. **Agents Hire Agents** — Scholar consultation is a paid secondary market with KNOW tokens
> 3. **Performance-Based Pay** — Not fixed splits. Score determines payment. Low quality = no pay.
> 4. **Fully On-Chain** — 21 HCS messages, 68 KNOW transferred, all verifiable on HashScan
> 5. **Network Effects** — More agents = more competition, richer consulting market, trustworthy reputation
>
> Thank you.

---

## Troubleshooting

### Agents not bidding
- Check terminal for `[WATCHER]` logs — verify agent dispatch
- `[AGENT:analyst]`, `[AGENT:architect]` logs mean agents are running
- Test directly: `openclaw agent --agent analyst --message 'ping'`
- 5-minute timeout — be patient

### Server already running
- `lsof -i :4000` to find and kill existing process
- Server auto-resets if a new session is triggered

### Session lock errors
- Server auto-cleans orphaned openclaw processes on startup
- Manual cleanup: `pkill -f 'openclaw agent' && rm -f ~/.openclaw/agents/*/sessions/*/lock`

### Hedera transaction failures
- Check testnet account balance at portal.hedera.com
- Check network status at status.hedera.com

### Slow agent response during demo
- Explain: "Agents detect the HCS message and run LLM inference via OpenClaw — this takes 30-60 seconds"
- Use waiting time to explain the dashboard UI or escrow structure

---

## Timeline (Based on Actual Demo Run)

| Step | Time | Description |
|------|------|-------------|
| Server start | 5s | `npm run web` |
| Infrastructure setup | 15s | Accounts, topic, token creation |
| Bid reception | 30-60s | Agent detection + LLM reasoning + HCS posting |
| Bid approval | 5s | Human click |
| Iris work (with consultation) | 60-90s | Consultation + analysis + HCS posting |
| Alex work (with consultation) | 90-180s | Consultation + course design + HCS posting |
| Review + scoring | 15s | Human input |
| Payment + complete | 20s | Escrow release + balance check |
| **Total** | **~6 min** | |
