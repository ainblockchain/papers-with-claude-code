#!/bin/bash
# Claude Code execution wrapper — starts a paper learning session
# When a user connects to the terminal, the lesson starts immediately.
#
# Usage: start-claude.sh [COURSE_ID] [MODEL]
#   COURSE_ID: Paper identifier (e.g., dlgochan-papers-test-repo)
#   MODEL:    Claude model (e.g., haiku, sonnet, opus). Default: haiku
#
# Behavior:
#   First visit → claude "initial message" (reads CLAUDE.md and starts the lesson immediately)
#   Return visit → claude --continue (resumes the previous conversation)
#
# Security:
#   Skips trust/permission dialogs with --dangerously-skip-permissions.
#   Actual tool restrictions are enforced by /etc/claude-code/managed-settings.json (user cannot override).
#   Uses a dummy key instead of the real API key (the proxy replaces it with the real key).

COURSE_ID="${1:-}"
MODEL="${2:-haiku}"

# ─── ANTHROPIC_BASE_URL validation ────────────────────
if [ -z "$ANTHROPIC_BASE_URL" ]; then
  echo "Error: ANTHROPIC_BASE_URL environment variable is not set."
  exit 1
fi

# ─── Dummy API key setup ───────────────────────────
API_KEY="${ANTHROPIC_API_KEY:-sk-ant-api01-SANDBOX-PLACEHOLDER-KEY-DO-NOT-USE-xxxxxxxxxxxxxxxxxxxx}"
KEY_SUFFIX="${API_KEY: -8}"

mkdir -p ~/.claude

# Restore permissions so the file can be overwritten if previously locked with chmod 444
[ -f ~/.claude.json ] && chmod 644 ~/.claude.json

cat > ~/.claude.json << EOF
{
  "primaryApiKey": "${API_KEY}",
  "customApiKeyResponses": ["${KEY_SUFFIX}"],
  "hasCompletedOnboarding": true,
  "hasTrustDialogAccepted": true,
  "hasTrustDialogHooksAccepted": true,
  "lastOnboardingVersion": "2.1.45",
  "changelogLastFetched": 9999999999999
}
EOF

chmod 444 ~/.claude.json
unset ANTHROPIC_API_KEY

# ─── Restore settings.json (if hidden by PV mount) ─
mkdir -p /home/claude/.claude
if [ ! -f /home/claude/.claude/settings.json ]; then
  cp /etc/claude-defaults/settings.json /home/claude/.claude/settings.json 2>/dev/null
fi

# ─── Change working directory ─────────────────────────
if [ -n "$COURSE_ID" ] && [ -d "/home/claude/papers/${COURSE_ID}" ]; then
  cd "/home/claude/papers/${COURSE_ID}"
elif [ -d "/home/claude/papers/current" ]; then
  cd /home/claude/papers/current
fi

# ─── resumeStage context (optional) ────────────────
RESUME_HINT=""
if [ -f "/tmp/resume-context" ]; then
  source /tmp/resume-context
  RESUME_HINT=" The student is resuming learning from Stage ${RESUME_FROM_STAGE}."
fi

# ─── First visit vs return visit detection ─────────────────────
# Use a marker file to check if a previous Claude Code session existed.
# Persisted on PV, so it survives Pod restarts.
MARKER="/home/claude/papers/${COURSE_ID}/.claude-session-started"
COMMON_FLAGS="--dangerously-skip-permissions --model ${MODEL}"

if [ -n "$COURSE_ID" ] && [ -f "$MARKER" ]; then
  # Return visit: resume the previous conversation
  exec claude $COMMON_FLAGS --continue
else
  # First visit: create marker and start the lesson with an initial message
  [ -n "$COURSE_ID" ] && touch "$MARKER" 2>/dev/null
  INITIAL_MSG="Starting the learning course for this paper.${RESUME_HINT} Please read CLAUDE.md and begin exploring."
  exec claude $COMMON_FLAGS "$INITIAL_MSG"
fi
