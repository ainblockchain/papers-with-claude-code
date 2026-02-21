// Client dashboard server (port 4000)
// Does not control agents directly — only publishes tasks to HCS + provides human approval API
// Agents are auto-triggered by HCS Watcher (hcs-watcher.ts) upon message detection
//
// Run: npm run web → http://localhost:4000

import 'dotenv/config';
import express from 'express';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  createContext,
  setupMarketplaceInfra,
  getTopicMessages,
  getAllTopicMessages,
  getTokenBalance,
  hashscanUrl,
} from './hedera/client.js';
import { MarketplaceOrchestrator } from './marketplace-orchestrator.js';
import { startEmbeddedWatcher } from './embedded-watcher.js';
import type { BidApproval, ClientReview, MarketplaceInfra, MarketplaceMessage } from './types/marketplace.js';
import { getProfile } from './config/agent-profiles.js';

// Kill orphaned openclaw agent processes and remove session locks
// Prevents session lock conflicts when restarting the server
function cleanupAgentProcesses(): void {
  try {
    execSync("pkill -f 'openclaw agent' 2>/dev/null || true", { stdio: 'ignore' });
  } catch { /* ignore */ }
  try {
    execSync("rm -f ~/.openclaw/agents/*/sessions/*/lock 2>/dev/null || true", { stdio: 'ignore' });
  } catch { /* ignore */ }
  console.log('[CLEANUP] Killed orphaned openclaw processes & removed session locks');
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 4000;

app.use(express.json());
app.use(express.static(join(__dirname, '../public')));

// ── Marketplace state ──

let currentOrchestrator: MarketplaceOrchestrator | null = null;
let currentInfra: MarketplaceInfra | null = null;
let isRunning = false;

// Status check endpoint
app.get('/api/status', (_req, res) => {
  res.json({
    mode: 'autonomous',
    state: currentOrchestrator?.getState() ?? 'IDLE',
    running: isRunning,
  });
});

// ── Marketplace trigger — publish course_request to HCS ──

// ── State reset — unlock if a previous session terminated abnormally ──

app.post('/api/marketplace/reset', (_req, res) => {
  isRunning = false;
  currentOrchestrator = null;
  currentInfra = null;
  pendingTrigger = null;
  res.json({ ok: true, message: 'Marketplace state reset' });
});

app.post('/api/marketplace/trigger', async (req, res) => {
  // If a previous session remains, force cleanup and start a new session
  if (isRunning) {
    console.log('[RESET] Cleaning up previous session — new trigger received');
    isRunning = false;
    currentOrchestrator = null;
    currentInfra = null;
    pendingTrigger = null;
  }
  // Always clean up orphaned agent processes before a new session
  cleanupAgentProcesses();

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

// ── Bid approval API — called after the client selects a bid ──

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

// ── Review API — called after the client reviews a deliverable ──

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

// ── SSE marketplace feed (real-time HCS message streaming) ──

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
    // ── Step 1: Infrastructure setup ──
    send('step', { step: 1, title: 'Connect to Hedera testnet & create infrastructure' });
    send('log', { icon: '⏳', msg: 'Initializing Hedera client...' });

    const ctx = createContext();
    send('log', { icon: '✅', msg: `Operator: ${ctx.operatorId.toString()}` });

    send('log', { icon: '⏳', msg: 'Setting up marketplace infrastructure (creating 4 accounts in parallel)...' });
    const infra = await setupMarketplaceInfra(ctx, trigger.budget, (msg) => send('log', { icon: '⏳', msg }));
    currentInfra = infra;

    // Send agent card data with persona profiles
    send('agent', {
      role: 'escrow',
      accountId: infra.escrowAccount.accountId,
      url: hashscanUrl('account', infra.escrowAccount.accountId),
      profile: { name: 'Escrow', fullName: 'Escrow Account', specialty: 'Fund Management', tagline: '', icon: '🔒', color: '#6366f1' },
    });
    for (const role of ['analyst', 'architect', 'scholar'] as const) {
      const account = role === 'analyst' ? infra.analystAccount
        : role === 'architect' ? infra.architectAccount
        : infra.scholarAccount;
      send('agent', {
        role,
        accountId: account.accountId,
        url: hashscanUrl('account', account.accountId),
        profile: getProfile(role),
      });
    }

    // Send infrastructure card data
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
    send('log', { icon: '✅', msg: 'Infrastructure ready' });

    // ── Embedded watcher: start gRPC subscription right after topic creation ──
    const watcher = startEmbeddedWatcher(ctx, infra.topicId, (msg) => {
      send('log', { icon: '📡', msg });
    }, (agent, chunk) => {
      send('agent_output', { agent, text: chunk });
    });
    send('log', { icon: '📡', msg: `HCS watcher active — waiting for automatic agent triggers` });

    // ── Steps 2+: run marketplace orchestrator ──
    const orchestrator = new MarketplaceOrchestrator(ctx);
    currentOrchestrator = orchestrator;

    try {
      await orchestrator.run(infra, trigger.paperUrl, trigger.budget, trigger.description, send);
    } finally {
      watcher.unsubscribe();
    }

    // ── Complete ──
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

// ── Agent monitor (/monitor) — read-only HCS feed observation ──

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
  let maxSeq = 0;
  let running = true;
  req.on('close', () => { running = false; });

  // Phase 1: Initial load — fetch ALL messages (newest first) via pagination
  try {
    const allMessages = await getAllTopicMessages(topicId);
    for (const msg of allMessages) {
      seenSeqs.add(msg.sequenceNumber);
      maxSeq = Math.max(maxSeq, msg.sequenceNumber);

      let parsed: MarketplaceMessage;
      try {
        parsed = JSON.parse(msg.message) as MarketplaceMessage;
      } catch {
        send('raw_message', { seq: msg.sequenceNumber, timestamp: msg.timestamp, raw: msg.message });
        continue;
      }
      send('hcs_message', { seq: msg.sequenceNumber, hcsTimestamp: msg.timestamp, ...parsed });
    }
    send('initial_load_complete', { total: allMessages.length });
  } catch (err: any) {
    send('poll_error', { message: `Initial load failed: ${err.message ?? String(err)}` });
  }

  // Phase 2: Incremental polling — only new messages after maxSeq
  while (running) {
    try {
      const newMessages = await getTopicMessages(topicId, maxSeq);
      for (const msg of newMessages) {
        if (seenSeqs.has(msg.sequenceNumber)) continue;
        seenSeqs.add(msg.sequenceNumber);
        maxSeq = Math.max(maxSeq, msg.sequenceNumber);

        let parsed: MarketplaceMessage;
        try {
          parsed = JSON.parse(msg.message) as MarketplaceMessage;
        } catch {
          send('new_message', { seq: msg.sequenceNumber, timestamp: msg.timestamp, raw: msg.message, _raw: true });
          continue;
        }
        send('new_message', { seq: msg.sequenceNumber, hcsTimestamp: msg.timestamp, ...parsed });
      }
    } catch (err: any) {
      send('poll_error', { message: err.message ?? String(err) });
    }
    await new Promise(r => setTimeout(r, 3000));
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

// Prevent process from exiting immediately due to Hedera SDK gRPC channels unref'ing the event loop
setInterval(() => {}, 1 << 30);

// Clean slate on startup
cleanupAgentProcesses();

app.listen(PORT, () => {
  console.log(`\n  🏪 Course Generation Marketplace`);
  console.log(`  → Dashboard: http://localhost:${PORT}`);
  console.log(`  → Monitor:   http://localhost:${PORT}/monitor`);
  console.log(`  📡 HCS Watcher auto-triggers agents upon message detection\n`);
});
