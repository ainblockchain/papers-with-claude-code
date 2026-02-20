# Papers with Claude Code — Screenplay

> **Runtime**: 2:52
> **Prerequisites**: Frontend at paperswithclaudecode.com, paperswithcode.com in browser, terminal pods running
> **Script text**: See [demo_script.md](demo_script.md) for copy-paste narration only.

---

## Act 1: The Problem (0:00 — 0:20)

**Screen**: Browser → `https://paperswithcode.com`

| # | Action |
|---|--------|
| 1 | Show paperswithcode.com — scroll through trending papers, point out the volume |
| 2 | Click into one paper — show the dense PDF, the linked GitHub repo |
| 3 | Come back to the list — emphasize the gap between published and understood |

---

## Act 2: Publish a Course with Claude Code (0:20 — 1:20)

**Screen**: Browser → `https://paperswithclaudecode.com/builder`

### 2a. Start the builder (0:20 — 0:30)

| # | Action |
|---|--------|
| 1 | Show the Course Builder page with the "Start Building" button |
| 2 | Click **"Start Building"** — terminal session spawns in generator mode |

### 2b. Input paper and repo (0:30 — 0:40)

| # | Action |
|---|--------|
| 1 | Paste the **arXiv URL**: `https://arxiv.org/abs/1706.03762` ("Attention Is All You Need") |
| 2 | Paste the **GitHub repo URL** |

### 2c. Claude Code generates the course (0:40 — 1:00)

| # | Action |
|---|--------|
| 1 | Watch the terminal — Claude Code reads the paper, analyzes code |
| 2 | Stage generation scrolls by: concepts, explanations, quizzes structured on knowledge graph |
| 3 | Course structure summary appears — show the stage list |

### 2d. Course published with x402 (1:00 — 1:20)

| # | Action |
|---|--------|
| 1 | Terminal shows publish confirmation with x402 pricing |
| 2 | Point out: title and summary free, each core concept costs a micropayment in USDC on Base chain |
| 3 | Mention ERC-8021 builder codes — on-chain attribution and automatic royalty splits for paper authors |

---

## Act 3: Pick a Paper and Learn (1:20 — 2:00)

**Screen**: Browser → `https://paperswithclaudecode.com/explore`

| # | Action |
|---|--------|
| 1 | Show trending paper cards — each one is a playable, monetized course |
| 2 | Click **"Learn"** on a paper |

**Screen**: Browser → `/learn/:paperId`

| # | Action |
|---|--------|
| 1 | Show the **left side**: interactive 2D dungeon room |
| 2 | Show the **right side**: personalized Claude Code on Kubernetes — AI tutor |
| 3 | Navigate through **concept markers** to learn |
| 4 | Pass the **quiz** at end of module → unlock next level via **x402 micropayment** |
| 5 | Point out: progress, verified skills, completed modules recorded on-chain — decentralized learning passport |

---

## Act 4: The World Knowledge Graph for Humans and Agents (2:00 — 2:45)

### 4a. Village and friends (2:00 — 2:20)

**Screen**: Browser → `https://paperswithclaudecode.com/village`

| # | Action |
|---|--------|
| 1 | Show the academic village — researchers, creators, learners, Cogito agents coexisting |
| 2 | Point out **friends on the map** — which courses they're in, what stage they've reached |
| 3 | Show a **notification**: someone clears a stage |
| 4 | Show the **leaderboard** — who's learning the most, who's going deepest |

### 4b. Community knowledge graph (2:20 — 2:45)

**Screen**: Browser → `https://paperswithclaudecode.com/community`

| # | Action |
|---|--------|
| 1 | Show the **knowledge graph** — nodes are concepts, edges are relationships |
| 2 | Point out **color** showing depth of understanding |

---

## Closing (2:45 — 2:52)

| # | Action |
|---|--------|
| 1 | Pause on the knowledge graph view |
| 2 | Closing line: "Learn the knowledge with friends, and build the world knowledge, together." |

---

## Quick Reference

| Time | Screen | Action |
|------|--------|--------|
| 0:00 | paperswithcode.com | Scroll trending, show volume and complexity |
| 0:20 | `/builder` | Course Builder — click "Start Building" |
| 0:30 | `/builder` terminal | Paste arXiv URL + GitHub repo (Attention Is All You Need) |
| 0:40 | `/builder` terminal | Claude Code generates stages on knowledge graph |
| 1:00 | `/builder` | Publish with x402, ERC-8021 attribution |
| 1:20 | `/explore` | Trending papers as playable courses |
| 1:25 | `/learn/...` | 2D dungeon room + Claude Code tutor on K8s |
| 1:40 | `/learn/...` | Navigate concepts, quiz, x402 unlock |
| 2:00 | `/village` | Academic village — friends, notifications, leaderboard |
| 2:20 | `/community` | Knowledge graph — nodes, edges, depth colors |
| 2:45 | `/community` | Closing line |

## Pre-demo Checklist

- [ ] Frontend live at paperswithclaudecode.com
- [ ] Terminal pod backend running (K8s)
- [ ] Browser tabs ready: paperswithcode.com, paperswithclaudecode.com
- [ ] arXiv URL (`1706.03762`) and GitHub repo URL copied to clipboard
- [ ] Test the `/builder` flow once before demo to ensure session creation works
