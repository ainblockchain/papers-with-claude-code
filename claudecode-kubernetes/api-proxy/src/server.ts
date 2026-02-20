// API Proxy service entry point
// Relays Anthropic API requests coming from sandbox Pods,
// replacing the dummy API key with the real key loaded from a K8s Secret

import express from 'express';
import { createProxyRouter } from './proxy.js';

const PORT = parseInt(process.env.PORT || '8080', 10);

const app = express();

// Health check — for K8s liveness/readiness probes
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-proxy' });
});

// Root path — for proxy status check
app.get('/', (_req, res) => {
  res.json({
    service: 'claudecode-api-proxy',
    description: 'Anthropic API reverse proxy for sandboxed Claude Code sessions',
    allowedPaths: ['/v1/messages', '/v1/messages/count_tokens'],
  });
});

// Register proxy router
// Body parser must not be used for SSE streaming to work correctly
app.use(createProxyRouter());

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[API Proxy] Listening on port ${PORT}`);
  console.log(`[API Proxy] Proxying to https://api.anthropic.com`);
  console.log(`[API Proxy] Allowed paths: /v1/messages, /v1/messages/count_tokens`);
});
