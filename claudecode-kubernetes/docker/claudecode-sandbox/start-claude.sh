#!/bin/bash
# Claude Code 실행 래퍼 — 온보딩 스킵 + API 프록시 경유 설정
# K8s exec으로 이 스크립트를 호출하면 즉시 Claude Code 채팅 인터페이스에 연결됨
#
# 보안 변경사항:
# - 진짜 API 키 대신 더미 키를 사용 (프록시가 실제 키로 교체)
# - ANTHROPIC_BASE_URL로 프록시 서버를 가리킴
# - ~/.claude.json을 읽기 전용으로 설정하여 키 노출 최소화
#
# ref: https://github.com/anthropics/claude-code/issues/4714
# ref: https://github.com/anthropics/claude-code/issues/5572

# ANTHROPIC_BASE_URL 검증 — 프록시를 통해서만 API 접근
if [ -z "$ANTHROPIC_BASE_URL" ]; then
  echo "Error: ANTHROPIC_BASE_URL 환경변수가 설정되지 않았습니다."
  echo "API Proxy 서비스 주소가 필요합니다."
  exit 1
fi

# 더미 키 사용 — 실제 키는 프록시에서 교체됨
# ANTHROPIC_API_KEY 환경변수가 있으면 사용, 없으면 더미 키 생성
API_KEY="${ANTHROPIC_API_KEY:-sk-ant-api01-SANDBOX-PLACEHOLDER-KEY-DO-NOT-USE-xxxxxxxxxxxxxxxxxxxx}"
KEY_SUFFIX="${API_KEY: -8}"

# ~/.claude 디렉토리 생성
mkdir -p ~/.claude

# ~/.claude.json (홈 디렉토리 루트) — Claude Code 내부 상태 파일
# 온보딩/다이얼로그 완료 플래그 + 더미 API 키 설정
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

# 읽기 전용으로 설정 — cat으로 내용 노출 시에도 더미 키만 보임
chmod 444 ~/.claude.json

# 환경변수 정리 — 프롬프트 회피 + 키 노출 최소화
unset ANTHROPIC_API_KEY

# 논문 레포가 클론되어 있으면 해당 디렉토리에서 Claude Code 시작
if [ -d "/home/claude/paper" ]; then
  cd /home/claude/paper
fi

# 이전 진행 상태 복원 (프론트엔드가 resumeStage를 전달한 경우)
if [ -f "/tmp/resume-context" ]; then
  source /tmp/resume-context
  export CLAUDE_RESUME_HINT="학생은 Stage ${RESUME_FROM_STAGE}부터 학습을 계속합니다."
fi

# Claude Code 실행 (ANTHROPIC_BASE_URL은 유지 — 프록시 주소)
exec claude
