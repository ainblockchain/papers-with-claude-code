# Papers with Claude Code — Screenplay

> **Runtime**: ~4.5 minutes
> **Prerequisites**: Frontend at `http://localhost:3000`, HuggingFace Papers in browser, terminal pods running
> **Script text**: See [demo_script.md](demo_script.md) for copy-paste narration only.

---

## Act 1: The Problem (30 sec)

**Screen**: Browser → `https://huggingface.co/papers`

| # | Action |
|---|--------|
| 1 | Scroll through the trending papers list — point out the sheer volume |
| 2 | Click into one paper — show the dense PDF, the linked GitHub repo |
| 3 | Come back to the list |

---

## Act 2: Publish a Course with Claude Code (1.5 min)

**Screen**: Browser → `http://localhost:3000/publish` (Course Builder)

### 2a. Start the builder (10 sec)

| # | Action |
|---|--------|
| 1 | Show the Course Builder page with the "Start Building" button |
| 2 | Click **"Start Building"** — terminal session spawns in generator mode |

### 2b. Input paper and repo (15 sec)

| # | Action |
|---|--------|
| 1 | Paste an **arXiv URL** into the terminal prompt (e.g. `https://arxiv.org/abs/1706.03762`) |
| 2 | Paste the **GitHub repo URL** (e.g. `https://github.com/tensorflow/tensor2tensor`) |
| 3 | Enter a **course name** when prompted |

### 2c. Claude Code generates the course (30 sec)

| # | Action |
|---|--------|
| 1 | Watch the terminal — Claude Code reads the paper, analyzes code |
| 2 | Stage generation scrolls by: concepts, explanations, quizzes being created |
| 3 | Course structure summary appears — show the stage list |

### 2d. Course published (15 sec)

| # | Action |
|---|--------|
| 1 | Terminal shows publish confirmation with x402 pricing |
| 2 | Navigate to `/explore` — show the newly published course in the list |
| 3 | Point out: title, summary (free), stage count, price per stage |

---

## Act 3: Pick a Paper and Learn (1.5 min)

**Screen**: Browser → `/explore`

| # | Action |
|---|--------|
| 1 | Show paper cards with Learn/Purchase buttons, star counts, arXiv links |
| 2 | Click **"Learn"** on a paper (e.g. "Attention Is All You Need") |

**Screen**: Browser → `/learn/attention-is-all-you-need`

| # | Action |
|---|--------|
| 1 | **Move the player** with WASD — walk to a concept marker, press **E** |
| 2 | **Concept overlay** appears: "Scaled Dot-Product Attention" with explanation |
| 3 | Walk to the **door** → press **E** → **Quiz modal** appears |
| 4 | Answer the quiz → correct → door unlocks |
| 5 | **Payment modal**: "Unlock Stage 2 — 0.001 USDT" → click **Unlock** |
| 6 | Payment confirms on Kite Chain with tx hash |
| 7 | **Claude terminal** on the right — ask a question, get an explanation |

---

## Act 4: The Knowledge Graph — Humans, Agents, and the World (1 min)

**Screen**: Browser → `/village`

### 4a. Village and friends (20 sec)

| # | Action |
|---|--------|
| 1 | Show the village map — player avatar, friend avatars moving in real time |
| 2 | Point out the **sidebar**: online friends list with course/stage they're in |
| 3 | Show a **notification toast** pop up: "Alice cleared Stage 2 of BitDance Course!" |
| 4 | Point out the **leaderboard** — ranked by progress |

### 4b. Community knowledge graph (25 sec)

**Screen**: Browser → `/community`

| # | Action |
|---|--------|
| 1 | Show the **knowledge graph** canvas — nodes colored by depth (green/blue/amber/red), edges connecting concepts |
| 2 | Point out node count and edge count stats |
| 3 | Show the **frontier map** — topics with explorer count, max depth, average depth bars |
| 4 | Enter a learner's AIN address — show their personal progress: topics, entries, purchases |

### 4c. Closing (15 sec)

| # | Action |
|---|--------|
| 1 | Pause on the knowledge graph view |
| 2 | Closing line |

---

## Quick Reference

| Time | Screen | Action |
|------|--------|--------|
| 0:00 | HuggingFace Papers | Scroll trending, show volume and complexity |
| 0:30 | `/publish` | Course Builder — click "Start Building" |
| 0:40 | `/publish` terminal | Paste arXiv URL + GitHub repo |
| 0:55 | `/publish` terminal | Claude Code generates stages |
| 1:25 | `/publish` → `/explore` | Publish confirmation, see course in explore list |
| 1:40 | `/explore` | Browse paper cards, click "Learn" |
| 2:00 | `/learn/...` | Move player, interact with concepts |
| 2:30 | `/learn/...` | Quiz → pass → payment modal → unlock |
| 3:00 | `/learn/...` | Claude terminal: ask a question |
| 3:15 | `/village` | Village map, friends, leaderboard, notifications |
| 3:35 | `/community` | Knowledge graph, frontier map, learner progress |
| 4:00 | `/community` | Closing line |

## Pre-demo Checklist

- [ ] Frontend running at `http://localhost:3000`
- [ ] Terminal pod backend running (K8s or local)
- [ ] Browser tabs ready: HuggingFace Papers, localhost:3000
- [ ] arXiv URL and GitHub repo URL copied to clipboard
- [ ] Test the `/publish` flow once before demo to ensure session creation works
