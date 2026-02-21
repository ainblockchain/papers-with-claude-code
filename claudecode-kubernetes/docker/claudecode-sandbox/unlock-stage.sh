#!/bin/bash
# Helper script to check/complete x402 stage payment.
# Encapsulates the curl logic so Claude only needs to run one command.
#
# Usage:
#   unlock-stage.sh <stage_number>                  — check if stage is unlocked
#   unlock-stage.sh <stage_number> <payment_base64> — submit payment and unlock
#
# Exit codes:
#   0  — stage is unlocked (already paid or payment just succeeded)
#   42 — payment required (HTTP 402); response body printed to stdout
#   1  — error (server error, network failure, etc.)

STAGE="$1"
PAYMENT_B64="$2"

if [ -z "$STAGE" ]; then
  echo "Usage: unlock-stage.sh <stage_number> [payment_base64]"
  exit 1
fi

# Read session context (COURSE_ID, USER_ID)
if [ -f /tmp/session-context ]; then
  source /tmp/session-context
fi

if [ -z "$COURSE_ID" ] || [ -z "$USER_ID" ]; then
  echo "Error: /tmp/session-context missing or incomplete (need COURSE_ID and USER_ID)"
  exit 1
fi

# Build curl command
CURL_ARGS=(-s -w "\n%{http_code}" -X POST "http://web-terminal-service:3000/api/x402/unlock-stage")
CURL_ARGS+=(-H "Content-Type: application/json")

if [ -n "$PAYMENT_B64" ]; then
  CURL_ARGS+=(-H "X-PAYMENT: $PAYMENT_B64")
fi

CURL_ARGS+=(-d "{\"courseId\":\"$COURSE_ID\",\"stageNumber\":$STAGE,\"userId\":\"$USER_ID\"}")

# Execute
RESPONSE=$(curl "${CURL_ARGS[@]}" 2>/dev/null)
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "$BODY"

if [ "$HTTP_CODE" = "200" ]; then
  exit 0
elif [ "$HTTP_CODE" = "402" ]; then
  exit 42
else
  echo "HTTP $HTTP_CODE"
  exit 1
fi
