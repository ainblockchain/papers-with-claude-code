// API Proxy 서비스 진입점
// 샌드박스 Pod에서 오는 Anthropic API 요청을 중계하며,
// 더미 API 키를 K8s Secret에서 로드한 진짜 키로 교체

import express from 'express';
import { createProxyRouter } from './proxy.js';

const PORT = parseInt(process.env.PORT || '8080', 10);

const app = express();

// Health check — K8s liveness/readiness probe용
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-proxy' });
});

// 루트 경로 — 프록시 상태 확인용
app.get('/', (_req, res) => {
  res.json({
    service: 'claudecode-api-proxy',
    description: 'Anthropic API reverse proxy for sandboxed Claude Code sessions',
    allowedPaths: ['/v1/messages', '/v1/messages/count_tokens'],
  });
});

// 프록시 라우터 등록
// body parser를 사용하지 않아야 SSE 스트리밍이 정상 작동
app.use(createProxyRouter());

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[API Proxy] Listening on port ${PORT}`);
  console.log(`[API Proxy] Proxying to https://api.anthropic.com`);
  console.log(`[API Proxy] Allowed paths: /v1/messages, /v1/messages/count_tokens`);
});
