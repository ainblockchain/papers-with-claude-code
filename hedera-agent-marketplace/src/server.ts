// 의뢰인 대시보드 서버 (port 4000)
// 에이전트를 제어하지 않고, HCS에 일감 게시 + 인간 승인 API만 제공
// 에이전트는 HCS Watcher(hcs-watcher.ts)가 메시지 감지 시 자동 트리거
//
// 실행: npm run web → http://localhost:4000

import 'dotenv/config';
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  createContext,
  setupMarketplaceInfra,
  getTopicMessages,
  getTokenBalance,
  hashscanUrl,
} from './hedera/client.js';
import { MarketplaceOrchestrator } from './marketplace-orchestrator.js';
import { startEmbeddedWatcher } from './embedded-watcher.js';
import type { BidApproval, ClientReview, MarketplaceInfra, MarketplaceMessage } from './types/marketplace.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 4000;

app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// ── 마켓플레이스 상태 ──

let currentOrchestrator: MarketplaceOrchestrator | null = null;
let currentInfra: MarketplaceInfra | null = null;
let isRunning = false;

// 상태 확인 엔드포인트
app.get('/api/status', (_req, res) => {
  res.json({
    mode: 'autonomous',
    state: currentOrchestrator?.getState() ?? 'IDLE',
    running: isRunning,
  });
});

// ── 마켓플레이스 트리거 — HCS에 course_request 게시 ──

// ── 상태 리셋 — 이전 세션이 비정상 종료된 경우 잠금 해제 ──

app.post('/api/marketplace/reset', (_req, res) => {
  isRunning = false;
  currentOrchestrator = null;
  currentInfra = null;
  pendingTrigger = null;
  res.json({ ok: true, message: 'Marketplace state reset' });
});

app.post('/api/marketplace/trigger', async (req, res) => {
  // 이전 세션이 남아있으면 강제 정리 후 새 세션 시작
  if (isRunning) {
    console.log('[RESET] 이전 세션 정리 — 새 trigger 수신');
    isRunning = false;
    currentOrchestrator = null;
    currentInfra = null;
    pendingTrigger = null;
  }

  const { paperUrl, budget, description } = req.body;

  if (!paperUrl || !budget) {
    return res.status(400).json({ error: 'paperUrl and budget are required' });
  }

  isRunning = true;
  pendingTrigger = {
    paperUrl: paperUrl as string,
    budget: Number(budget),
    description: (description as string) || `Course generation for: ${paperUrl}`,
  };

  res.json({ ok: true, message: 'Marketplace triggered. Connect to /api/marketplace/feed for live updates.' });
});

let pendingTrigger: { paperUrl: string; budget: number; description: string } | null = null;

// ── 입찰 승인 API — 의뢰인이 bid 선택 후 호출 ──

app.post('/api/marketplace/bid-approval', (req, res) => {
  if (!currentOrchestrator) {
    return res.status(400).json({ error: 'No active marketplace session' });
  }

  const { analystAccountId, analystPrice, architectAccountId, architectPrice } = req.body as BidApproval;

  if (!analystAccountId || !architectAccountId) {
    return res.status(400).json({ error: 'analystAccountId and architectAccountId are required' });
  }

  currentOrchestrator.submitBidApproval({
    analystAccountId,
    analystPrice: Number(analystPrice),
    architectAccountId,
    architectPrice: Number(architectPrice),
  });

  res.json({ ok: true, message: 'Bid approval submitted' });
});

// ── 리뷰 API — 의뢰인이 deliverable 검토 후 호출 ──

app.post('/api/marketplace/review', (req, res) => {
  if (!currentOrchestrator) {
    return res.status(400).json({ error: 'No active marketplace session' });
  }

  const body = req.body as ClientReview;
  if (body.analystApproved == null && body.architectApproved == null) {
    return res.status(400).json({ error: 'analystApproved or architectApproved is required' });
  }

  const {
    analystApproved, analystScore, analystFeedback,
    architectApproved, architectScore, architectFeedback,
  } = body;

  currentOrchestrator.submitReview({
    analystApproved: Boolean(analystApproved),
    analystScore: Number(analystScore) || 0,
    analystFeedback: analystFeedback || '',
    architectApproved: Boolean(architectApproved),
    architectScore: Number(architectScore) || 0,
    architectFeedback: architectFeedback || '',
  });

  res.json({ ok: true, message: 'Review submitted' });
});

// ── SSE 마켓플레이스 피드 (실시간 HCS 메시지 스트리밍) ──

app.get('/api/marketplace/feed', async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  function send(type: string, data: any) {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  const trigger = pendingTrigger ?? {
    paperUrl: (req.query.paperUrl as string) || 'attention-is-all-you-need',
    budget: Number(req.query.budget) || 100,
    description: (req.query.description as string) || 'Course generation from paper',
  };
  pendingTrigger = null;

  try {
    // ── Step 1: 인프라 셋업 ──
    send('step', { step: 1, title: 'Hedera 테스트넷 연결 & 인프라 생성' });
    send('log', { icon: '⏳', msg: 'Hedera 클라이언트 초기화...' });

    const ctx = createContext();
    send('log', { icon: '✅', msg: `Operator: ${ctx.operatorId.toString()}` });

    send('log', { icon: '⏳', msg: '마켓플레이스 인프라 셋업 중 (4 계정 병렬 생성)...' });
    const infra = await setupMarketplaceInfra(ctx, trigger.budget, (msg) => send('log', { icon: '⏳', msg }));
    currentInfra = infra;

    // 에이전트 카드 데이터 전송
    send('agent', {
      role: 'escrow',
      accountId: infra.escrowAccount.accountId,
      url: hashscanUrl('account', infra.escrowAccount.accountId),
    });
    send('agent', {
      role: 'analyst',
      accountId: infra.analystAccount.accountId,
      url: hashscanUrl('account', infra.analystAccount.accountId),
    });
    send('agent', {
      role: 'architect',
      accountId: infra.architectAccount.accountId,
      url: hashscanUrl('account', infra.architectAccount.accountId),
    });
    send('agent', {
      role: 'scholar',
      accountId: infra.scholarAccount.accountId,
      url: hashscanUrl('account', infra.scholarAccount.accountId),
    });

    // 인프라 카드 데이터 전송
    send('infra', {
      type: 'topic',
      id: infra.topicId,
      url: hashscanUrl('topic', infra.topicId),
    });
    send('infra', {
      type: 'token',
      id: infra.tokenId,
      symbol: 'KNOW',
      supply: 10000,
      url: hashscanUrl('token', infra.tokenId),
    });

    send('balance', { analyst: 0, architect: 0, scholar: 0, escrow: trigger.budget });
    send('log', { icon: '✅', msg: '인프라 준비 완료' });

    // ── 임베디드 워처: 토픽 생성 직후 gRPC 구독 시작 ──
    const watcher = startEmbeddedWatcher(ctx, infra.topicId, (msg) => {
      send('log', { icon: '📡', msg });
    });
    send('log', { icon: '📡', msg: `HCS 워처 활성화 — 에이전트 자동 트리거 대기 중` });

    // ── Steps 2+: 마켓플레이스 오케스트레이터 실행 ──
    const orchestrator = new MarketplaceOrchestrator(ctx);
    currentOrchestrator = orchestrator;

    try {
      await orchestrator.run(infra, trigger.paperUrl, trigger.budget, trigger.description, send);
    } finally {
      watcher.unsubscribe();
    }

    // ── 완료 ──
    send('done', {
      topic: { id: infra.topicId, url: hashscanUrl('topic', infra.topicId) },
      token: { id: infra.tokenId, url: hashscanUrl('token', infra.tokenId) },
      escrow: { id: infra.escrowAccount.accountId, url: hashscanUrl('account', infra.escrowAccount.accountId) },
      analyst: { id: infra.analystAccount.accountId, url: hashscanUrl('account', infra.analystAccount.accountId) },
      architect: { id: infra.architectAccount.accountId, url: hashscanUrl('account', infra.architectAccount.accountId) },
      scholar: { id: infra.scholarAccount.accountId, url: hashscanUrl('account', infra.scholarAccount.accountId) },
      erc8004: infra.erc8004 ?? null,
    });

  } catch (err: any) {
    send('error', { message: err.message ?? String(err) });
  }

  isRunning = false;
  currentOrchestrator = null;
  currentInfra = null;
  res.end();
});

// ── 에이전트 모니터 (/monitor) — read-only HCS 피드 관찰 ──

app.get('/monitor', (_req, res) => {
  res.sendFile(join(__dirname, '../public/monitor.html'));
});

app.get('/api/monitor/feed', async (req, res) => {
  const topicId = req.query.topicId as string;
  if (!topicId) {
    return res.status(400).json({ error: 'topicId query parameter is required' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  function send(type: string, data: any) {
    res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
  }

  send('connected', { topicId, tokenId: (req.query.tokenId as string) || null });

  const seenSeqs = new Set<number>();
  let running = true;
  req.on('close', () => { running = false; });

  while (running) {
    try {
      const messages = await getTopicMessages(topicId);
      for (const msg of messages) {
        if (seenSeqs.has(msg.sequenceNumber)) continue;
        seenSeqs.add(msg.sequenceNumber);

        let parsed: MarketplaceMessage;
        try {
          parsed = JSON.parse(msg.message) as MarketplaceMessage;
        } catch {
          send('raw_message', { seq: msg.sequenceNumber, timestamp: msg.timestamp, raw: msg.message });
          continue;
        }
        send('hcs_message', { seq: msg.sequenceNumber, hcsTimestamp: msg.timestamp, ...parsed });
      }
    } catch (err: any) {
      send('poll_error', { message: err.message ?? String(err) });
    }
    await new Promise(r => setTimeout(r, 5000));
  }
  res.end();
});

app.get('/api/monitor/agents', async (req, res) => {
  const tokenId = req.query.tokenId as string;
  const accountIds = ((req.query.accounts as string) || '').split(',').filter(Boolean);
  if (!tokenId || accountIds.length === 0) {
    return res.status(400).json({ error: 'tokenId and accounts query parameters are required' });
  }
  const agents = await Promise.all(
    accountIds.map(async (id) => {
      const balance = await getTokenBalance(id.trim(), tokenId).catch(() => 0);
      return { accountId: id.trim(), balance, url: hashscanUrl('account', id.trim()) };
    }),
  );
  res.json({ agents, tokenId });
});

// Hedera SDK gRPC 채널이 event loop를 unref하여 프로세스가 즉시 종료되는 것 방지
setInterval(() => {}, 1 << 30);

app.listen(PORT, () => {
  console.log(`\n  🏪 Course Generation Marketplace`);
  console.log(`  → Dashboard: http://localhost:${PORT}`);
  console.log(`  → Monitor:   http://localhost:${PORT}/monitor`);
  console.log(`  📡 HCS Watcher가 메시지 감지 시 에이전트를 자동 트리거합니다\n`);
});
