# 유저 샌드박스 이미지 — Claude Code가 사전 구성된 상태로 제공
# Pod은 sleep infinity로 유지되고, exec으로 claude를 바로 실행.
# API 키는 프록시를 통해 주입되며, Pod 내에는 더미 키만 존재.
# managed-settings.json으로 Bash/Edit/Write 등 위험 도구 차단.

FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# 필수 시스템 패키지 설치
RUN apt-get update && apt-get install -y \
    curl \
    git \
    vim \
    nano \
    wget \
    ca-certificates \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20 LTS 설치 (NodeSource)
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Claude Code CLI 글로벌 설치
RUN npm install -g @anthropic-ai/claude-code

# non-root 유저 생성 (sudo 권한 없음 — 보안 강화)
RUN useradd -m -s /bin/bash claude

# Claude Code 관리형 설정 — 시스템 레벨, 유저 오버라이드 불가
# Bash, Edit, Write 등 위험 도구를 차단하고 Read/Glob/Grep만 허용
RUN mkdir -p /etc/claude-code
COPY managed-settings.json /etc/claude-code/managed-settings.json
RUN chmod 444 /etc/claude-code/managed-settings.json

# Claude Code 사용자 설정 디렉토리 + 방어 심층용 설정
RUN mkdir -p /home/claude/.claude && \
    chown -R claude:claude /home/claude/.claude
COPY settings.json /home/claude/.claude/settings.json
RUN chown claude:claude /home/claude/.claude/settings.json && \
    chmod 444 /home/claude/.claude/settings.json

# settings.json 백업 — PV 마운트로 .claude/가 가려질 때 복원용
RUN mkdir -p /etc/claude-defaults && \
    cp /home/claude/.claude/settings.json /etc/claude-defaults/settings.json && \
    chmod 444 /etc/claude-defaults/settings.json

# 학습 도우미 CLAUDE.md — Claude Code가 참조할 시스템 지침
COPY CLAUDE.md /home/claude/CLAUDE.md
RUN chown claude:claude /home/claude/CLAUDE.md && \
    chmod 444 /home/claude/CLAUDE.md

# Claude Code 실행 래퍼 스크립트
COPY start-claude.sh /usr/local/bin/start-claude.sh
RUN chmod +x /usr/local/bin/start-claude.sh

WORKDIR /home/claude

USER claude

CMD ["sleep", "infinity"]
