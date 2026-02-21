#!/bin/bash
# Claude Code launcher wrapper — starts paper learning / course generation sessions.
# Configured so that the lesson begins immediately when the user connects to the terminal.
#
# Usage: start-claude.sh [COURSE_ID] [MODEL] [MODE] [USER_ID]
#   COURSE_ID: Paper identifier (e.g., dlgochan-papers-test-repo)
#   MODEL:    Claude model (e.g., haiku, sonnet, opus). Default: haiku
#   MODE:     learner (default) | generator
#   USER_ID:  OAuth user ID (optional, written to /tmp/session-context)
#
# Behavior:
#   learner:
#     First visit  → claude "initial message" (reads CLAUDE.md and starts lesson immediately)
#     Return visit → claude --continue (resumes previous conversation)
#   generator:
#     Swaps managed-settings to generator config, sets up Git, clones repo
#     Runs Claude Code in course generation mode
#
# Security:
#   --dangerously-skip-permissions skips the trust/permission dialog.
#   Actual tool restrictions are enforced by /etc/claude-code/managed-settings.json (user cannot override).
#   Uses a dummy API key instead of the real one (proxy replaces it with the real key).

COURSE_ID="${1:-}"
MODEL="${2:-opus}"
MODE="${3:-learner}"
# 4th CLI arg takes precedence over USER_ID env var (set by Pod template)
ARG_USER_ID="${4:-}"
EFFECTIVE_USER_ID="${ARG_USER_ID:-$USER_ID}"

# ─── Validate ANTHROPIC_BASE_URL ─────────────────
if [ -z "$ANTHROPIC_BASE_URL" ]; then
  echo "Error: ANTHROPIC_BASE_URL environment variable is not set."
  exit 1
fi

# ─── Set dummy API key ───────────────────────────
API_KEY="${ANTHROPIC_API_KEY:-sk-ant-api01-SANDBOX-PLACEHOLDER-KEY-DO-NOT-USE-xxxxxxxxxxxxxxxxxxxx}"
KEY_SUFFIX="${API_KEY: -8}"

mkdir -p ~/.claude

# On re-run, delete the previously chmod 444-locked file and recreate it.
# rm -f ensures removal since chmod can fail in some cases (e.g., CLI rewrites the file).
rm -f ~/.claude.json 2>/dev/null; true

cat > ~/.claude.json << EOF
{
  "primaryApiKey": "${API_KEY}",
  "customApiKeyResponses": ["${KEY_SUFFIX}"],
  "hasCompletedOnboarding": true,
  "hasTrustDialogAccepted": true,
  "hasTrustDialogHooksAccepted": true,
  "lastOnboardingVersion": "2.1.45",
  "changelogLastFetched": 9999999999999,
  "mcpServers": {
    "kite-passport": {
      "type": "http",
      "url": "https://neo.dev.gokite.ai/v1/mcp"
    }
  }
}
EOF

chmod 444 ~/.claude.json
unset ANTHROPIC_API_KEY

# ─── Write session context (COURSE_ID, USER_ID) ─────
# Read by CLAUDE.md payment flow; used by Claude to fill curl payloads
cat > /tmp/session-context << CTXEOF
COURSE_ID=${COURSE_ID}
USER_ID=${EFFECTIVE_USER_ID}
CTXEOF

# ─── Restore settings.json (if shadowed by PV mount) ─
mkdir -p /home/claude/.claude
if [ ! -f /home/claude/.claude/settings.json ]; then
  cp /etc/claude-defaults/settings.json /home/claude/.claude/settings.json 2>/dev/null
fi

# ─── Common flags ────────────────────────────────
COMMON_FLAGS="--dangerously-skip-permissions --model ${MODEL}"

# ─── Mode branching ──────────────────────────────
if [ "$MODE" = "generator" ]; then
  # ─── Generator mode ─────────────────────────────────
  # Swap managed-settings to generator config (allows Write/Edit/Bash)
  cp /etc/claude-code/generator-managed-settings.json /etc/claude-code/managed-settings.json 2>/dev/null || true

  # Git config (needed for push after course generation)
  git config --global user.email "generator@papers-with-claude.ai"
  git config --global user.name "Course Generator Bot"
  if [ -n "$GITHUB_TOKEN" ]; then
    echo "https://x-access-token:${GITHUB_TOKEN}@github.com" > ~/.git-credentials
    git config --global credential.helper store
    chmod 600 ~/.git-credentials
  fi

  # Clone/pull awesome-papers repo
  REPO_DIR="/home/claude/workspace"
  mkdir -p "$REPO_DIR"
  cd "$REPO_DIR"
  if [ ! -d "awesome-papers-with-claude-code/.git" ]; then
    git clone https://github.com/ainblockchain/awesome-papers-with-claude-code.git
  else
    cd awesome-papers-with-claude-code && git pull origin main && cd ..
  fi

  # Place generator CLAUDE.md
  cp /home/claude/generator-CLAUDE.md "$REPO_DIR/CLAUDE.md"

  INITIAL_MSG="Course generation mode. Please provide an arXiv, GitHub, or HuggingFace URL along with a CourseName."
  exec claude $COMMON_FLAGS "$INITIAL_MSG"
else
  # ─── Learner mode (default) ─────────────────────
  # Change to working directory
  if [ -n "$COURSE_ID" ] && [ -d "/home/claude/papers/${COURSE_ID}" ]; then
    cd "/home/claude/papers/${COURSE_ID}"
  elif [ -d "/home/claude/papers/current" ]; then
    cd /home/claude/papers/current
  fi

  # Determine current stage number (default: 1, or from resume context)
  CURRENT_STAGE=1
  if [ -f "/tmp/resume-context" ]; then
    source /tmp/resume-context
    CURRENT_STAGE="${RESUME_FROM_STAGE:-1}"
  fi

  # Determine first visit vs return visit.
  # A marker file checks whether a previous Claude Code session existed.
  # Persisted on PV, so it survives Pod restarts.
  MARKER="/home/claude/papers/${COURSE_ID}/.claude-session-started"

  if [ -n "$COURSE_ID" ] && [ -f "$MARKER" ]; then
    # Return visit: resume previous conversation
    exec claude $COMMON_FLAGS --continue
  else
    # First visit: create marker, then start lesson with initial message
    [ -n "$COURSE_ID" ] && touch "$MARKER" 2>/dev/null
    INITIAL_MSG="MANDATORY FIRST STEP: Run 'unlock-stage.sh ${CURRENT_STAGE}' to check payment before doing anything else. If exit code is 42 (payment required), complete payment using Kite MCP tools as described in ~/CLAUDE.md Payment Protocol section. Do NOT start teaching until payment is confirmed. After payment, read the local CLAUDE.md and begin exploring Stage ${CURRENT_STAGE}."
    exec claude $COMMON_FLAGS "$INITIAL_MSG"
  fi
fi
