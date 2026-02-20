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

**Security settings:**
- `managed-settings.json` → `/etc/claude-code/managed-settings.json`: System-level tool restrictions (blocks Bash/Edit/Write, allows only Read/Glob/Grep). Cannot be overridden by user.
- `settings.json` → `~/.claude/settings.json`: Defense-in-depth duplicate restrictions.
- `CLAUDE.md` → `~/CLAUDE.md`: Learning assistant role instructions + API key exposure prevention.
- sudo privileges removed (previous versions allowed NOPASSWD).
- No real API key included — only a dummy key is used, replaced by the proxy.

### web-terminal

Multi-stage build for the Express + WebSocket backend service. Compiles TypeScript in the builder stage, then produces a minimal production image with only runtime dependencies and static assets.
