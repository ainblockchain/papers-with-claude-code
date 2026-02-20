// API Proxy service entry point
// Relays Anthropic API requests from sandbox Pods,
// replacing dummy API keys with real keys loaded from K8s Secrets

import express from 'express';
import { createProxyRouter } from './proxy.js';

const PORT = parseInt(process.env.PORT || '8080', 10);

const app = express();

// Health check — for K8s liveness/readiness probes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-proxy' });
});

// Root path — for proxy status checks
app.get('/', (_req, res) => {
  res.json({
    service: 'claudecode-api-proxy',
    description: 'Anthropic API reverse proxy for sandboxed Claude Code sessions',
    allowedPaths: ['/v1/messages', '/v1/messages/count_tokens'],
  });
});

// Register proxy router
// Body parser must NOT be used so SSE streaming works correctly
app.use(createProxyRouter());

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[API Proxy] Listening on port ${PORT}`);
  console.log(`[API Proxy] Proxying to https://api.anthropic.com`);
  console.log(`[API Proxy] Allowed paths: /v1/messages, /v1/messages/count_tokens`);
});
