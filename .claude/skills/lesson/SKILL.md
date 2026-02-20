---
name: lesson
description: Record a design decision as a lesson_learned on AIN blockchain. Use when the developer makes an architectural choice, picks a library, or resolves a trade-off.
argument-hint: [decision description]
allowed-tools: Bash(node *), Bash(npx *), Read, Grep
---

Record the following design decision as a **lesson_learned** on the AIN blockchain knowledge graph.

**Decision:** $ARGUMENTS

## What to capture

Analyze the conversation context and extract:

1. **Title** — A concise name for this decision (e.g., "Event Sourcing over CRUD for Audit Trails")
2. **Content** — The full context:
   - What was decided and why
   - What alternatives were considered and why they were rejected
   - What files/code are involved
   - Any relevant papers, articles, or documentation that informed the decision
3. **Summary** — 1-2 sentence summary of the decision
4. **Topic path** — Categorize under one of: `lessons/architecture`, `lessons/engineering`, `lessons/ai`, `lessons/blockchain`, `lessons/security`, or a custom `lessons/{category}`
5. **Tags** — Relevant keywords (the system auto-adds `lesson_learned`)

## How to record

Find and run the record-lesson.js script. It exists in one of these locations:

```bash
# Check project-level first, then global
SCRIPT="$(dirname "$(readlink -f "$0")")/scripts/record-lesson.js"
if [ ! -f "$SCRIPT" ]; then
  SCRIPT="$HOME/.claude/skills/lesson/scripts/record-lesson.js"
fi
```

Run it:

```bash
node "$HOME/.claude/skills/lesson/scripts/record-lesson.js" \
  --title "Your title here" \
  --content "Full decision context..." \
  --summary "Brief summary" \
  --topic "lessons/architecture" \
  --tags "tag1,tag2,tag3"
```

The script auto-installs ain-js on first run if needed. The AIN private key is loaded automatically from `~/.claude/ain-config.json` — do NOT pass it via env var or command line.

If the script fails, fall back to calling the Cogito container API:

```bash
curl -X POST http://localhost:3402/lesson \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Your title here",
    "content": "Full decision context...",
    "summary": "Brief summary",
    "topicPath": "lessons/architecture",
    "tags": ["tag1", "tag2"]
  }'
```

## After recording

Confirm to the user:
- What was recorded (title + summary)
- The topic path it was filed under
- That the Cogito container will automatically enrich it with related papers and their official code repositories
