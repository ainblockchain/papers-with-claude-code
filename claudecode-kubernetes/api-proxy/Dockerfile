# API Proxy — 멀티스테이지 빌드
# 샌드박스 Pod의 더미 API 키를 진짜 키로 교체하여 Anthropic API에 전달

# Stage 1: 빌드
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: 프로덕션
FROM node:20-alpine

WORKDIR /app

# 보안: non-root 유저 사용
RUN addgroup -S proxy && adduser -S proxy -G proxy

COPY --from=builder /app/package.json /app/package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/dist/ ./dist/

USER proxy

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/server.js"]
