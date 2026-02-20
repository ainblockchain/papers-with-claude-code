// Claude Code Web Terminal Service 진입점
// Express HTTP 서버 + WebSocket 서버를 시작하고,
// REST API(세션 관리)와 WebSocket(터미널 브릿지)을 연결

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { AppConfig } from './types.js';
import { createSessionRouter, getSession, getActiveSessionCount } from './routes/sessions.js';
import { createStagesRouter } from './routes/stages.js';
import { createProgressRouter } from './routes/progress.js';
import { createX402Router } from './routes/x402.js';
import { ProgressStore } from './db/progress.js';
import { attachTerminal } from './ws/terminal-bridge.js';

const config: AppConfig = {
  sandboxImage: process.env.SANDBOX_IMAGE || 'claudecode-sandbox:latest',
  sandboxNamespace: process.env.SANDBOX_NAMESPACE || 'claudecode-terminal',
  podCpuRequest: process.env.POD_CPU_REQUEST || '250m',
  podCpuLimit: process.env.POD_CPU_LIMIT || '2',
  podMemoryRequest: process.env.POD_MEMORY_REQUEST || '512Mi',
  podMemoryLimit: process.env.POD_MEMORY_LIMIT || '4Gi',
  sessionTimeoutSeconds: parseInt(process.env.SESSION_TIMEOUT_SECONDS || '7200'),
  maxSessions: parseInt(process.env.MAX_SESSIONS || '4'),
  port: parseInt(process.env.PORT || '3000'),
  x402MerchantWallet: process.env.X402_MERCHANT_WALLET || '',
  x402StagePrice: process.env.X402_STAGE_PRICE || '100000',  // 0.1 USDT (6 decimals)
  x402FacilitatorUrl: process.env.X402_FACILITATOR_URL || 'https://facilitator.pieverse.io',
};

const app = express();

// CORS — 프론트엔드를 로컬(file://)에서 실행하므로 cross-origin 허용
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, X-PAYMENT');
  if (_req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.use(express.json());

const progressStore = new ProgressStore(process.env.DB_PATH || '/data/progress.db');

// REST API 라우트
app.use('/api', createSessionRouter(config));
app.use('/api', createStagesRouter(config));
app.use('/api', createProgressRouter(progressStore));

// x402 결제 엔드포인트 (merchantWallet이 설정된 경우에만 활성)
if (config.x402MerchantWallet) {
  app.use('/api', createX402Router(progressStore, {
    merchantWallet: config.x402MerchantWallet,
    stagePrice: config.x402StagePrice,
    serviceName: 'Papers with Claude Code',
  }));
  console.log('[server] x402 payment endpoint enabled');
}

// 헬스 체크
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', activeSessions: getActiveSessionCount() });
});

const server = createServer(app);

// WebSocket 서버: 터미널 연결용
// 클라이언트는 ws://host/ws?sessionId=xxx 로 접속
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', async (ws: WebSocket, req) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    ws.send('Error: sessionId required\r\n');
    ws.close();
    return;
  }

  const session = getSession(sessionId);
  if (!session || session.status !== 'running') {
    ws.send('Error: session not found or not running\r\n');
    ws.close();
    return;
  }

  console.log(`[ws] Terminal connected: session=${sessionId}, pod=${session.podName}`);

  try {
    await attachTerminal(
      ws,
      session.podName,
      session.namespace,
      session.userId,
      session.courseId,
      progressStore,
      session.id,
      {
        courseId: session.courseId,
        model: 'haiku', // TODO: x402 결제 티어에 따라 동적 변경
        idleNudgeMs: session.courseId ? 120_000 : 0,
      },
    );
  } catch (err) {
    console.error('[ws] Terminal attach failed:', err);
  }
});

server.listen(config.port, () => {
  console.log(`[server] Web Terminal Service running on port ${config.port}`);
  console.log(`[server] Config:`, JSON.stringify(config, null, 2));
});
