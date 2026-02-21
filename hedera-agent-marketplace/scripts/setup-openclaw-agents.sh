#!/usr/bin/env bash
# OpenClaw agent registration script
# Registers the 3 agents (analyst, architect, scholar) with OpenClaw
# and verifies each workspace has a SOUL.md file.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTS_DIR="$PROJECT_DIR/openclaw-config/agents"

AGENTS=("analyst" "architect" "scholar")

echo "=== OpenClaw Agent Registration ==="
echo "Project: $PROJECT_DIR"
echo ""

# 1. Check openclaw CLI
if ! command -v openclaw &>/dev/null; then
  echo "ERROR: openclaw CLI is not installed."
  echo "  → Run 'npm install -g openclaw' or see the installation guide."
  exit 1
fi

# 2. Check gateway health
echo ">> Checking gateway status..."
if openclaw gateway call health &>/dev/null; then
  echo "   OK — gateway is healthy"
else
  echo "   WARN — gateway connection failed. Run 'openclaw doctor --fix' or 'openclaw configure' first."
fi
echo ""

# 3. Register agents
for agent in "${AGENTS[@]}"; do
  workspace="$AGENTS_DIR/$agent"
  soul="$workspace/SOUL.md"

  echo ">> Registering $agent agent..."

  # Check SOUL.md
  if [ ! -f "$soul" ]; then
    echo "   ERROR: $soul file not found."
    exit 1
  fi
  echo "   SOUL.md check OK"

  # Check if already registered (ignore errors)
  if openclaw agents list --json 2>/dev/null | grep -q "\"$agent\""; then
    echo "   Already registered — skipping"
  else
    openclaw agents add "$agent" --non-interactive \
      --workspace "$workspace" 2>/dev/null \
      && echo "   Registration complete" \
      || echo "   WARN: Registration failed — manually run 'openclaw agents add $agent --workspace $workspace'."
  fi
  echo ""
done

# 4. Verify registration results
echo "=== Registered Agents ==="
openclaw agents list --json 2>/dev/null || openclaw agents list 2>/dev/null || echo "(Failed to list agents)"

echo ""
echo "=== Done ==="
echo "Next steps:"
echo "  1. Test each agent: openclaw agent --agent analyst --message 'ping' --json"
echo "  2. Run demo: npm run web"
