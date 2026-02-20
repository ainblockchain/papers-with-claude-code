# API Proxy — Multi-stage build
# Replaces dummy API keys from sandbox Pods with real keys and forwards requests to the Anthropic API

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Security: run as non-root user
RUN addgroup -S proxy && adduser -S proxy -G proxy

COPY --from=builder /app/package.json /app/package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=builder /app/dist/ ./dist/

USER proxy

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/server.js"]
