#!/usr/bin/env bash
# OpenClaw 에이전트 등록 스크립트
# analyst, architect, scholar 3개 에이전트를 OpenClaw에 등록하고
# 각 workspace의 SOUL.md 존재 여부를 확인한다.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AGENTS_DIR="$PROJECT_DIR/openclaw-config/agents"

AGENTS=("analyst" "architect" "scholar")

echo "=== OpenClaw 에이전트 등록 ==="
echo "Project: $PROJECT_DIR"
echo ""

# 1. openclaw CLI 확인
if ! command -v openclaw &>/dev/null; then
  echo "ERROR: openclaw CLI가 설치되어 있지 않습니다."
  echo "  → npm install -g openclaw 또는 해당 설치 가이드를 참고하세요."
  exit 1
fi

# 2. 게이트웨이 건강 확인
echo ">> 게이트웨이 상태 확인..."
if openclaw gateway call health &>/dev/null; then
  echo "   OK — 게이트웨이 정상"
else
  echo "   WARN — 게이트웨이 연결 실패. 'openclaw doctor --fix' 또는 'openclaw configure'를 먼저 실행하세요."
fi
echo ""

# 3. 에이전트 등록
for agent in "${AGENTS[@]}"; do
  workspace="$AGENTS_DIR/$agent"
  soul="$workspace/SOUL.md"

  echo ">> $agent 에이전트 등록..."

  # SOUL.md 확인
  if [ ! -f "$soul" ]; then
    echo "   ERROR: $soul 파일이 없습니다."
    exit 1
  fi
  echo "   SOUL.md 확인 OK"

  # 이미 등록되어 있는지 확인 (에러 무시)
  if openclaw agents list --json 2>/dev/null | grep -q "\"$agent\""; then
    echo "   이미 등록됨 — 건너뜀"
  else
    openclaw agents add "$agent" --non-interactive \
      --workspace "$workspace" 2>/dev/null \
      && echo "   등록 완료" \
      || echo "   WARN: 등록 실패 — 수동으로 'openclaw agents add $agent --workspace $workspace'를 실행하세요."
  fi
  echo ""
done

# 4. 등록 결과 확인
echo "=== 등록된 에이전트 목록 ==="
openclaw agents list --json 2>/dev/null || openclaw agents list 2>/dev/null || echo "(목록 조회 실패)"

echo ""
echo "=== 완료 ==="
echo "다음 단계:"
echo "  1. 각 에이전트 테스트: openclaw agent --agent analyst --message 'ping' --json"
echo "  2. 데모 실행: npm run web"
