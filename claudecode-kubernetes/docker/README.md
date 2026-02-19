# Docker Images

Container images for the Claude Code Kubernetes platform.

## Structure

```
docker/
  claudecode-sandbox/   # User sandbox image (Ubuntu + Node.js + Claude Code CLI)
  web-terminal/         # Web terminal backend service image (Express + WebSocket)
```

### claudecode-sandbox

Per-user sandbox environment. Each user session runs as a Pod with this image. The container runs `sleep infinity` and users connect interactively via `kubectl exec`. Includes Node.js 20, Claude Code CLI, and common development tools.

**보안 설정:**
- `managed-settings.json` → `/etc/claude-code/managed-settings.json`: 시스템 레벨 도구 제한 (Bash/Edit/Write 차단, Read/Glob/Grep만 허용). 유저 오버라이드 불가.
- `settings.json` → `~/.claude/settings.json`: 방어 심층용 중복 제한.
- `CLAUDE.md` → `~/CLAUDE.md`: 학습 도우미 역할 지침 + API 키 노출 금지.
- sudo 권한 제거 (이전 버전에서는 NOPASSWD 허용).
- 진짜 API 키 미포함 — 더미 키만 사용, 프록시에서 교체.

### web-terminal

Multi-stage build for the Express + WebSocket backend service. Compiles TypeScript in the builder stage, then produces a minimal production image with only runtime dependencies and static assets.
