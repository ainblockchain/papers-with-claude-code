#!/bin/bash
# Claude Code 실행 래퍼 — 논문 학습 세션 시작
# 유저가 터미널에 접속하면 즉시 강의가 시작되도록 구성.
#
# Usage: start-claude.sh [COURSE_ID] [MODEL]
#   COURSE_ID: 논문 식별자 (e.g., dlgochan-papers-test-repo)
#   MODEL:    Claude 모델 (e.g., haiku, sonnet, opus). 기본값: haiku
#
# 동작:
#   첫 방문 → claude "초기 메시지" (CLAUDE.md를 읽고 즉시 강의 시작)
#   재방문 → claude --continue (이전 대화 이어서 진행)
#
# 보안:
#   --dangerously-skip-permissions로 trust/permission 다이얼로그 건너뜀.
#   실제 도구 제한은 /etc/claude-code/managed-settings.json이 강제 (유저 오버라이드 불가).
#   진짜 API 키 대신 더미 키 사용 (프록시가 실제 키로 교체).

COURSE_ID="${1:-}"
MODEL="${2:-haiku}"

# ─── ANTHROPIC_BASE_URL 검증 ────────────────────
if [ -z "$ANTHROPIC_BASE_URL" ]; then
  echo "Error: ANTHROPIC_BASE_URL 환경변수가 설정되지 않았습니다."
  exit 1
fi

# ─── 더미 API 키 설정 ───────────────────────────
API_KEY="${ANTHROPIC_API_KEY:-sk-ant-api01-SANDBOX-PLACEHOLDER-KEY-DO-NOT-USE-xxxxxxxxxxxxxxxxxxxx}"
KEY_SUFFIX="${API_KEY: -8}"

mkdir -p ~/.claude

# 재실행 시 이전에 chmod 444로 잠긴 파일을 덮어쓸 수 있도록 권한 복구
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

# ─── settings.json 복원 (PV 마운트로 가려진 경우) ─
mkdir -p /home/claude/.claude
if [ ! -f /home/claude/.claude/settings.json ]; then
  cp /etc/claude-defaults/settings.json /home/claude/.claude/settings.json 2>/dev/null
fi

# ─── 작업 디렉토리 이동 ─────────────────────────
if [ -n "$COURSE_ID" ] && [ -d "/home/claude/papers/${COURSE_ID}" ]; then
  cd "/home/claude/papers/${COURSE_ID}"
elif [ -d "/home/claude/papers/current" ]; then
  cd /home/claude/papers/current
fi

# ─── resumeStage 컨텍스트 (선택) ────────────────
RESUME_HINT=""
if [ -f "/tmp/resume-context" ]; then
  source /tmp/resume-context
  RESUME_HINT=" 학생은 Stage ${RESUME_FROM_STAGE}부터 학습을 이어갑니다."
fi

# ─── 첫 방문 vs 재방문 판별 ─────────────────────
# 마커 파일로 이전 Claude Code 세션이 있었는지 확인.
# PV에 영속화되므로 Pod 재시작 후에도 유지됨.
MARKER="/home/claude/papers/${COURSE_ID}/.claude-session-started"
COMMON_FLAGS="--dangerously-skip-permissions --model ${MODEL}"

if [ -n "$COURSE_ID" ] && [ -f "$MARKER" ]; then
  # 재방문: 이전 대화를 이어서 진행
  exec claude $COMMON_FLAGS --continue
else
  # 첫 방문: 마커 생성 후 초기 메시지로 강의 시작
  [ -n "$COURSE_ID" ] && touch "$MARKER" 2>/dev/null
  INITIAL_MSG="이 논문의 학습 코스를 시작합니다.${RESUME_HINT} CLAUDE.md를 읽고 탐구를 시작해주세요."
  exec claude $COMMON_FLAGS "$INITIAL_MSG"
fi
