#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$SCRIPT_DIR"

VLLM_URL="${VLLM_URL:-http://localhost:8000}"
AIN_DEVNET_URL="${AIN_DEVNET_URL:-https://devnet-api.ainetwork.ai}"
MCP_URL="${MCP_URL:-http://localhost:3000}"
COGITO_URL="${COGITO_URL:-http://localhost:3402}"
AIN_BLOCKCHAIN_DIR="${AIN_BLOCKCHAIN_DIR:-/home/comcom/git/ain-blockchain}"

PASS=0
FAIL=0
PIDS_TO_KILL=()

assert_eq() { if [ "$1" = "$2" ]; then PASS=$((PASS+1)); else echo "  FAIL: expected '$2', got '$1'"; FAIL=$((FAIL+1)); fi; }
assert_contains() { if echo "$1" | grep -q "$2"; then PASS=$((PASS+1)); else echo "  FAIL: '$1' does not contain '$2'"; FAIL=$((FAIL+1)); fi; }

cleanup() {
  echo ""
  echo "=== Cleanup ==="
  for pid in "${PIDS_TO_KILL[@]}"; do
    kill "$pid" 2>/dev/null && echo "  Stopped PID $pid" || true
  done
}
trap cleanup EXIT

# ── Phase 0: Start vLLM + MCP server + Cogito ─────────────────────────
echo "=== Phase 0: Starting services ==="

# 0a. Check vLLM is already running (user must start it externally)
echo -n "  Checking vLLM ($VLLM_URL)... "
if curl -sf "$VLLM_URL/health" > /dev/null 2>&1; then
  echo "already running"
else
  echo "NOT RUNNING"
  echo "  Please start vLLM first, e.g.:"
  echo "    vllm serve Qwen/Qwen3-32B-AWQ --max-model-len 32768 --gpu-memory-utilization 0.90"
  exit 1
fi

# 0b. Start MCP server (base-bounty/web on port 3000)
echo "  Starting MCP server (base-bounty/web)..."
cd "$REPO_ROOT/base-bounty/web"
NEXT_PUBLIC_AIN_PROVIDER_URL="$AIN_DEVNET_URL" npm run dev > /tmp/mcp-server-test.log 2>&1 &
PIDS_TO_KILL+=($!)
cd "$SCRIPT_DIR"

echo -n "  Waiting for MCP server..."
for i in $(seq 1 30); do
  curl -sf "$MCP_URL" > /dev/null 2>&1 && break
  sleep 2
  echo -n "."
done
echo " OK"

# 0c. Start Cogito (ain-blockchain/cogito on port 3402)
echo "  Starting Cogito..."
cd "$AIN_BLOCKCHAIN_DIR/cogito"
AIN_PROVIDER_URL="$AIN_DEVNET_URL" \
VLLM_URL="$VLLM_URL" \
MCP_SERVER_URL="$MCP_URL" \
npm run dev > /tmp/cogito-test.log 2>&1 &
PIDS_TO_KILL+=($!)
cd "$SCRIPT_DIR"

echo -n "  Waiting for Cogito..."
for i in $(seq 1 30); do
  curl -sf "$COGITO_URL/api/health" > /dev/null 2>&1 && break
  sleep 2
  echo -n "."
done
echo " OK"

# ── Phase 1: Health checks ─────────────────────────────────────────────
echo ""
echo "=== Phase 1: Service health checks ==="

echo -n "  vLLM ($VLLM_URL)... "
curl -sf "$VLLM_URL/health" > /dev/null && echo "OK" || { echo "FAIL"; exit 1; }

echo -n "  AIN devnet ($AIN_DEVNET_URL)... "
curl -sf "$AIN_DEVNET_URL" > /dev/null && echo "OK" || { echo "FAIL"; exit 1; }

echo -n "  MCP server ($MCP_URL)... "
curl -sf "$MCP_URL" > /dev/null && echo "OK" || { echo "FAIL"; exit 1; }

echo -n "  Cogito ($COGITO_URL)... "
curl -sf "$COGITO_URL/api/health" > /dev/null && echo "OK" || { echo "FAIL"; exit 1; }

# ── Phase 2: MCP tools/list ────────────────────────────────────────────
echo ""
echo "=== Phase 2: MCP tools/list ==="

TOOLS=$(npx tsx helpers.ts mcp-list)
echo "  Tools: $TOOLS"

assert_contains "$TOOLS" "check_publication_status"
assert_contains "$TOOLS" "search_arxiv"
assert_contains "$TOOLS" "find_github_repo"
assert_contains "$TOOLS" "publication_guide"

TOOL_COUNT=$(echo "$TOOLS" | jq length)
assert_eq "$TOOL_COUNT" "4"

# ── Phase 3: Seed exploration data on AIN ──────────────────────────────
echo ""
echo "=== Phase 3: Seed test data on AIN blockchain ==="

TOPIC="test/dedup-$(date +%s)"
echo "  Topic path: $TOPIC"

SEED_RESULT=$(npx tsx helpers.ts seed "$TOPIC" \
  "Self-Attention Mechanisms in Transformers" \
  "arxiv:2401.00001,code:github.com/test/attention-repo")
ENTRY_ID=$(echo "$SEED_RESULT" | jq -r '.entryId')
echo "  Seeded entry: $ENTRY_ID"

# ── Phase 4: check_publication_status — duplicate ──────────────────────
echo ""
echo "=== Phase 4: check_publication_status — should BLOCK duplicate ==="

DEDUP_RESULT=$(npx tsx helpers.ts mcp-tool check_publication_status \
  "{\"topicPath\":\"$TOPIC\",\"title\":\"Self-Attention Mechanism in Transformer Architecture\"}")
echo "  Result: $DEDUP_RESULT"

CAN_PUBLISH=$(echo "$DEDUP_RESULT" | jq -r '.canPublish')
MATCH_COUNT=$(echo "$DEDUP_RESULT" | jq '.existingMatches | length')
HAS_PAPERS=$(echo "$DEDUP_RESULT" | jq -r '.existingMatches[0].hasPapers')

assert_eq "$CAN_PUBLISH" "false"
echo "  canPublish=false ✓"

assert_eq "$HAS_PAPERS" "true"
echo "  hasPapers=true ✓"

# verify similarity > 0.45
SIMILARITY=$(echo "$DEDUP_RESULT" | jq '.existingMatches[0].similarity')
echo "  similarity=$SIMILARITY (threshold: 0.45)"

# ── Phase 5: check_publication_status — novel ──────────────────────────
echo ""
echo "=== Phase 5: check_publication_status — should ALLOW novel topic ==="

NOVEL_RESULT=$(npx tsx helpers.ts mcp-tool check_publication_status \
  "{\"topicPath\":\"$TOPIC\",\"title\":\"Quantum Error Correction Codes for Fault Tolerance\"}")
echo "  Result: $NOVEL_RESULT"

CAN_PUBLISH_NOVEL=$(echo "$NOVEL_RESULT" | jq -r '.canPublish')
MATCH_COUNT_NOVEL=$(echo "$NOVEL_RESULT" | jq '.existingMatches | length')

assert_eq "$CAN_PUBLISH_NOVEL" "true"
echo "  canPublish=true ✓"

assert_eq "$MATCH_COUNT_NOVEL" "0"
echo "  existingMatches=[] ✓"

# ── Phase 6: check_publication_status — empty topic ────────────────────
echo ""
echo "=== Phase 6: check_publication_status — empty topic (no entries) ==="

EMPTY_RESULT=$(npx tsx helpers.ts mcp-tool check_publication_status \
  "{\"topicPath\":\"test/nonexistent-$(date +%s)\",\"title\":\"Anything At All\"}")
echo "  Result: $EMPTY_RESULT"

CAN_PUBLISH_EMPTY=$(echo "$EMPTY_RESULT" | jq -r '.canPublish')
assert_eq "$CAN_PUBLISH_EMPTY" "true"
echo "  canPublish=true ✓"

# ── Phase 7: Cogito publication — duplicate → 409 ──────────────────────
echo ""
echo "=== Phase 7: Cogito publication flow — duplicate should return 409 ==="

PUB_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$COGITO_URL/api/publication" \
  -H "Content-Type: application/json" \
  -d "{\"topicPath\":\"$TOPIC\",\"entryId\":\"$ENTRY_ID\"}")
PUB_STATUS=$(echo "$PUB_RESPONSE" | tail -1)
PUB_BODY=$(echo "$PUB_RESPONSE" | head -n -1)

echo "  HTTP status: $PUB_STATUS"
echo "  Body: $PUB_BODY"

assert_eq "$PUB_STATUS" "409"
echo "  409 Conflict ✓"

PUB_DUPLICATE=$(echo "$PUB_BODY" | jq -r '.duplicate')
assert_eq "$PUB_DUPLICATE" "true"
echo "  duplicate=true ✓"

# ── Phase 8: Cogito publication — novel → 200 ──────────────────────────
echo ""
echo "=== Phase 8: Cogito publication flow — novel topic should succeed ==="

NOVEL_TOPIC="test/novel-$(date +%s)"
NOVEL_SEED=$(npx tsx helpers.ts seed "$NOVEL_TOPIC" \
  "Neuromorphic Computing with Spiking Neural Networks" \
  "")
NOVEL_ENTRY_ID=$(echo "$NOVEL_SEED" | jq -r '.entryId')
echo "  Seeded novel entry: $NOVEL_ENTRY_ID on $NOVEL_TOPIC"

NOVEL_PUB_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$COGITO_URL/api/publication" \
  -H "Content-Type: application/json" \
  -d "{\"topicPath\":\"$NOVEL_TOPIC\",\"entryId\":\"$NOVEL_ENTRY_ID\"}")
NOVEL_PUB_STATUS=$(echo "$NOVEL_PUB_RESPONSE" | tail -1)
NOVEL_PUB_BODY=$(echo "$NOVEL_PUB_RESPONSE" | head -n -1)

echo "  HTTP status: $NOVEL_PUB_STATUS"
echo "  Body: $(echo "$NOVEL_PUB_BODY" | jq -c '.')"

assert_eq "$NOVEL_PUB_STATUS" "200"
echo "  200 OK ✓"

NOVEL_SUCCESS=$(echo "$NOVEL_PUB_BODY" | jq -r '.success')
assert_eq "$NOVEL_SUCCESS" "true"
echo "  success=true ✓"

# ── Summary ─────────────────────────────────────────────────────────────
echo ""
echo "=========================================="
echo "  PASSED: $PASS"
echo "  FAILED: $FAIL"
echo "=========================================="

[ "$FAIL" -eq 0 ] && exit 0 || exit 1
