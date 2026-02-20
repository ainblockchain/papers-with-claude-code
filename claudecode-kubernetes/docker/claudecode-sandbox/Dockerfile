# User sandbox image — Claude Code is pre-configured and ready to use
# The Pod stays alive with sleep infinity, and claude is executed directly via exec.
# The API key is injected through the proxy; only a dummy key exists in the Pod.
# managed-settings.json blocks dangerous tools like Bash/Edit/Write.

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install required system packages
RUN apt-get update && apt-get install -y \
    curl \
    git \
    vim \
    nano \
    wget \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 20 LTS (NodeSource)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Claude Code CLI globally
RUN npm install -g @anthropic-ai/claude-code

# Create non-root user (no sudo privileges — security hardening)
RUN useradd -m -s /bin/bash claude

# Claude Code managed settings — system level, cannot be overridden by user
# Blocks dangerous tools like Bash, Edit, Write and allows only Read/Glob/Grep
RUN mkdir -p /etc/claude-code
COPY managed-settings.json /etc/claude-code/managed-settings.json
RUN chmod 444 /etc/claude-code/managed-settings.json

# Claude Code user settings directory + defense-in-depth settings
RUN mkdir -p /home/claude/.claude && \
    chown -R claude:claude /home/claude/.claude
COPY settings.json /home/claude/.claude/settings.json
RUN chown claude:claude /home/claude/.claude/settings.json && \
    chmod 444 /home/claude/.claude/settings.json

# Backup settings.json — for restoration when .claude/ is hidden by PV mount
RUN mkdir -p /etc/claude-defaults && \
    cp /home/claude/.claude/settings.json /etc/claude-defaults/settings.json && \
    chmod 444 /etc/claude-defaults/settings.json

# Learning assistant CLAUDE.md — system instructions for Claude Code to reference
COPY CLAUDE.md /home/claude/CLAUDE.md
RUN chown claude:claude /home/claude/CLAUDE.md && \
    chmod 444 /home/claude/CLAUDE.md

# Claude Code execution wrapper script
COPY start-claude.sh /usr/local/bin/start-claude.sh
RUN chmod +x /usr/local/bin/start-claude.sh

WORKDIR /home/claude

USER claude

CMD ["sleep", "infinity"]
