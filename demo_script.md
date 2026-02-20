# Papers with Claude Code — Demo Script

> **Runtime**: ~15 minutes
> **Prerequisites**: Debug frontend running at `http://localhost:3000`, authenticated via GitHub OAuth
> **Devnet**: `https://devnet-api.ainetwork.ai` with 33 topics, 150 graph nodes, 17 genesis papers seeded

---

## Act 1: The Big Picture (2 min)

### Screen: Terminal / Slides

**Narration:**
"Papers with Claude Code turns academic papers into an on-chain knowledge graph. Developers record design decisions, the system discovers relevant papers and source code, enriches them with a local LLM, and serves the content through x402 micropayments — all on the AIN blockchain."

**Show:**
- Terminal: `tree -L 1 /home/comcom/git/papers-with-claudecode/` to show project structure
- Highlight: `ain-js/` (blockchain SDK), `cogito/` (enrichment engine), `ainblockchain-integration/debug-frontend/` (what we'll demo), `frontend/` (learner UI), `knowledge-graph-builder/` (pipeline)

---

## Act 2: Connect to Devnet (1 min)

### Screen: Browser → `http://localhost:3000`

**Narration:**
"This is the debug dashboard — our control panel for the AIN blockchain knowledge graph."

**Steps:**
1. Show the page title: **AIN Knowledge Debug Dashboard**
2. Click **"Sign in with GitHub"** in the Auth & Wallet section
3. After OAuth redirect, the dashboard populates with all sections

### Screen: Auth & Wallet section (expanded)

**Narration:**
"We're connected to the AIN devnet. The ConfigPanel shows our provider URL and two known accounts — the genesis owner who seeded the papers, and a test account."

**Show:**
- Green connection indicator next to `https://devnet-api.ainetwork.ai`
- Known Accounts: Genesis Owner `0x00ADEc28...`, Test Account `0x01A0980d...`
- Wallet balance: **1,000,000 AIN**

---

## Act 3: Quick Actions — One-Click Setup (1 min)

### Screen: Quick Actions bar (always visible below title)

**Narration:**
"The Quick Actions bar gives us one-click access to common operations."

**Steps:**
1. Click **"Check Balance"** → shows wallet address + 1M AIN balance
2. Click **"Setup App"** → initializes the `/apps/knowledge` schema on-chain (already done, but idempotent)
3. Show the JSON result confirming success

---

## Act 4: Browse the Knowledge Graph (2 min)

### Screen: Topics section (click to expand)

**Narration:**
"The devnet has 33 topics organized in a hierarchy: AI → Transformers → Attention, Encoder-Only, Decoder-Only, Vision, Diffusion, and State-Space Models."

**Steps:**
1. Expand **Topics** section
2. Click **Fetch** to load the topic tree
3. Show the hierarchy: `ai/transformers/attention`, `ai/transformers/decoder-only`, etc.
4. Click a topic like `ai/transformers/attention` to see its info

### Screen: Knowledge Graph section (click to expand)

**Narration:**
"The knowledge graph has 150 nodes — each representing a paper or exploration. These are the 17 landmark papers from 'Attention Is All You Need' through Mamba, plus explorations building on them."

**Steps:**
1. Expand **Knowledge Graph** section
2. Click **Fetch Graph** → shows 150 nodes
3. Scroll through nodes — point out Transformer, BERT, GPT family, ViT, CLIP, LLaMA, Mamba
4. Show node details: `topic_path`, `depth`, `creator`, `created_at`

---

## Act 5: Submit an Exploration with Presets (2 min)

### Screen: Explore section (click to expand)

**Narration:**
"Now let's submit a new exploration that builds on existing papers. The form has 7 sample presets — each pre-fills all fields including parent entry and related entries, which create edges in the knowledge graph."

**Steps:**
1. Expand **Explore** section
2. Point out the **Sample Presets** pill buttons at the top
3. Click **"Multi-Head Attention Deep Dive"**
4. Show how all fields auto-fill:
   - Topic Path: `ai/transformers/attention`
   - Title, Content, Summary, Depth (4), Tags
   - **Parent Entry**: Transformer paper (`0x00ADEc28...`, `ai/transformers/attention`, `transformer_2017`)
5. Click **"Submit Exploration"**
6. Show the JSON result with `entryId` and transaction hash

**Narration:**
"This created an on-chain entry AND a graph edge linking our exploration to the original Transformer paper. The knowledge graph grows organically."

---

## Act 6: Seed 7 Explorations at Once (1.5 min)

### Screen: Quick Actions bar

**Narration:**
"Let's seed all 7 sample explorations to populate the graph with edges."

**Steps:**
1. Click **"Seed 7 Samples"** in the Quick Actions bar
2. Watch the progress indicator: `Seeding 1/7: Multi-Head Attention Deep Dive`, `2/7: GPT-4 and Scaling Laws`, etc.
3. Wait for completion (~30s)
4. Show the results array — 7 entries, each with `ok: true`

**Narration:**
"Each exploration has a parent entry (extends) and related entries, creating a web of connections: GPT-4 extends GPT-3 and relates to LLaMA, BERT for Dense Retrieval extends BERT and relates to RoBERTa and XLNet."

---

## Act 7: View Explorations (1 min)

### Screen: Explorations section (click to expand)

**Narration:**
"Now let's browse what we just created."

**Steps:**
1. Expand **Explorations** section
2. Click **"Genesis Owner (all)"** preset → switches to By User mode, fills address
3. Click **Fetch**
4. Show the exploration cards: titles, summaries, depth badges, tags
5. Switch to **By Topic** mode
6. Click **`ai/transformers/decoder-only`** preset → fills address + topic
7. Click **Fetch** → shows GPT-4 and Scaling Laws, Fine-tuning GPT-2

---

## Act 8: Frontier Statistics (1 min)

### Screen: Frontier section (click to expand)

**Narration:**
"Frontier maps show community-wide exploration stats — how many people explored each topic and how deep they went."

**Steps:**
1. Expand **Frontier** section
2. In Frontier Map Visualization, click **"All Topics"** preset, then **Fetch**
3. Show progress bars: explorer count, max depth, avg depth per topic
4. In Frontier View below, click **`ai/transformers/decoder-only`** preset
5. Click **Fetch Frontier** → shows stats + list of explorers with addresses and depths

---

## Act 9: Debug Inspector — Raw Blockchain State (2 min)

### Screen: Debug Inspector section (click to expand)

**Narration:**
"The Debug Inspector gives us direct access to on-chain state — like a blockchain microscope."

### Tab 1: Raw State

**Steps:**
1. Click the **`graph/nodes`** quick-fill button
2. Click **getValue** → shows all 150+ graph nodes as raw JSON
3. Click **`topics/ai/transformers`** → **getValue** → shows topic hierarchy
4. Click **getRule** on the same path → shows the write rules (who can write)
5. Click **getOwner** → shows ownership config

**Narration:**
"getValue reads data, getRule shows permissions, getOwner shows who controls the path. This is how the AIN blockchain enforces access control."

### Tab 2: Node Inspector

**Steps:**
1. Click the **Node Inspector** tab
2. From the dropdown, select **"Attention Is All You Need (Transformer)"**
3. Click **Inspect** → shows the node properties + edges

### Tab 3: Entry Lookup

**Steps:**
1. Click the **Entry Lookup** tab
2. From the dropdown, select **"BERT: Pre-training of Deep Bidirectional Transformers"**
3. Click **Lookup Entry** → shows the full exploration data (title, content, summary, depth, tags, timestamps)

### Tab 4: Rule Evaluator

**Steps:**
1. Click the **Rule Evaluator** tab
2. Click the **`topics/ai/transformers`** quick-fill button
3. Address is pre-filled with genesis owner
4. Click **Eval Rule** → shows **ALLOWED** (green badge) + full response
5. Change address to `0x0000000000000000000000000000000000000000`
6. Click **Eval Rule** → shows **DENIED** (red badge)

**Narration:**
"The rule evaluator lets us test permissions before writing. The genesis owner is allowed, but a random address is denied."

---

## Act 10: x402 Gated Content (1 min)

### Screen: Access (x402) section

**Narration:**
"The x402 protocol gates content behind micropayments. Let's try accessing a paper."

**Steps:**
1. Expand **Access (x402)** section
2. From the **"Pick from genesis papers"** dropdown, select **"GPT-3: Language Models are Few-Shot Learners"**
3. Fields auto-fill with owner, topic path, entry ID
4. Click **Request Access**
5. Show the response — payment status and content (or payment required)

### Screen: Publish (x402 Gated) section

**Steps:**
1. Expand **Publish (x402 Gated)** section
2. Click **"Transformer Fundamentals"** preset
3. Show pre-filled fields: topic path, title, content, price (10 AIN), parent linked to Transformer paper
4. Click **Publish Course** → show the result with contentId and contentHash

---

## Act 11: Learner Progress (0.5 min)

### Screen: Learner Progress section

**Narration:**
"Finally, we can look up any address's complete learning journey."

**Steps:**
1. Expand **Learner Progress** section
2. Click **"Genesis Owner"** preset → fills address
3. Click **Lookup**
4. Show stats: total topics, total entries, purchases
5. Expand a topic to see individual exploration entries with depth, timestamps, and graph connections

---

## Act 12: The Full Stack (1 min)

### Screen: Terminal

**Narration:**
"What you've seen is the debug frontend — the developer's view. Behind the scenes:"

**Show (terminal commands):**
```bash
# The SDK powering everything
npm view @ainblockchain/ain-js version  # → 1.14.1

# The knowledge graph builder pipeline
ls knowledge-graph-builder/  # repo → courses in one command

# The Cogito enrichment engine
ls cogito/  # watches chain, discovers papers, generates content

# The learner frontend
ls frontend/  # 2D village, dungeon stages, Claude terminal
```

**Narration:**
"ain-js talks to the blockchain. The knowledge graph builder extracts concepts from repos. Cogito watches for new entries, discovers papers on arXiv, fetches source code from GitHub, generates educational content with a local LLM, and publishes it back with x402 pricing. The frontend gives learners a gamified experience — a 2D village with dungeon stages and quizzes, powered by Claude."

---

## Closing

### Screen: Browser → Debug Dashboard overview

**Narration:**
"Papers with Claude Code turns the collective knowledge of academic papers into an interactive, incentivized learning platform — all verifiable on-chain. The debug dashboard you saw today is how we build and inspect that knowledge graph. Thank you."

---

## Quick Reference: What to Click

| Time | Section | Action | What It Shows |
|------|---------|--------|---------------|
| 2:00 | Auth & Wallet | Sign in, show config | Devnet connection, accounts, balance |
| 3:00 | Quick Actions | Check Balance | Wallet address + 1M AIN |
| 4:00 | Topics | Fetch | 33-topic hierarchy |
| 4:30 | Knowledge Graph | Fetch Graph | 150 nodes from genesis papers |
| 5:30 | Explore | Click "Multi-Head Attention" preset | Auto-fill with parent entry |
| 6:00 | Explore | Submit | On-chain entry + graph edge |
| 7:00 | Quick Actions | Seed 7 Samples | Progress bar, 7 entries created |
| 8:30 | Explorations | Click "Genesis Owner" | Browse exploration cards |
| 9:30 | Frontier | All Topics → Fetch | Progress bars per topic |
| 10:00 | Debug Inspector | Raw State → graph/nodes → getValue | Raw on-chain JSON |
| 11:00 | Debug Inspector | Rule Evaluator → ALLOWED/DENIED | Permission testing |
| 12:00 | Access (x402) | Pick GPT-3 → Request Access | Payment gating |
| 12:30 | Publish | Transformer Fundamentals preset | Publish gated course |
| 13:00 | Learner Progress | Genesis Owner → Lookup | Full learning journey |
| 14:00 | Terminal | Show repo structure | Full stack overview |
