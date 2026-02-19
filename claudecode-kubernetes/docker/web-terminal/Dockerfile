# Web terminal service image (Express + WebSocket server).
# Provides the backend API and real-time terminal connections that bridge
# browser-based clients to Claude Code sandbox Pods via kubectl exec.
# Built as a multi-stage image to keep the final artifact lean.

# ---------------------------------------------------------------------------
# Stage 1: Build the TypeScript source
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY src/ ./src/
COPY tsconfig.json ./
RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: Production runner
# ---------------------------------------------------------------------------
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output from builder stage
COPY --from=builder /app/dist ./dist/

EXPOSE 3000

USER node

CMD ["node", "dist/server.js"]
