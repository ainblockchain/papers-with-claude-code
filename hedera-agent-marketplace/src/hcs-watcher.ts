// HCS gRPC Watcher — switches from cron polling to event-driven
// Detects HCS messages in real-time via TopicMessageQuery gRPC subscription
// and triggers the appropriate openclaw agent based on message type.
//
// Usage: npm run watcher -- <topicId> [afterSeq]
// Example: npm run watcher -- 0.0.5894716
//          npm run watcher -- 0.0.5894716 42  (only after seq 42)

import 'dotenv/config';
import { spawn } from 'node:child_process';
import { TopicMessageQuery, TopicId } from '@hashgraph/sdk';
import { createContext } from './hedera/client.js';
import type { MarketplaceMessage, MarketplaceMessageType } from './types/marketplace.js';

// ── CLI argument parsing ──

const topicIdArg = process.argv[2];
const afterSeqArg = process.argv[3] ? Number(process.argv[3]) : 0;

if (!topicIdArg) {
  console.error('Usage: npm run watcher -- <topicId> [afterSeq]');
  console.error('Example: npm run watcher -- 0.0.5894716');
  console.error('         npm run watcher -- 0.0.5894716 42');
  process.exit(1);
}

// ── Message routing table ──

const AGENT_ROUTING: Record<string, MarketplaceMessageType[]> = {
  analyst:   ['course_request', 'bid_accepted', 'consultation_response'],
  architect: ['course_request', 'bid_accepted', 'deliverable', 'consultation_response'],
  scholar:   ['consultation_request'],
};

// Messages published by the server — agents do not need to react
const IGNORED_TYPES = new Set<MarketplaceMessageType>([
  'bid', 'escrow_lock', 'escrow_release', 'client_review', 'course_complete',
]);

// ── Safety constants ──

const COOLDOWN_MS = 30_000;           // 30s cooldown per agent
const SLOT_RELEASE_MS = 45_000;       // Timer-based slot release
const MAX_CONSECUTIVE_ERRORS = 10;    // Restart subscription on consecutive errors
const RECONNECT_DELAY_MS = 30_000;    // Reconnect wait time

// ── State ──

const seenSequences = new Set<number>();
const lastDispatch: Record<string, number> = {};
const inFlight: Record<string, boolean> = {};
const pendingQueue: Record<string, { seq: number; messageJson: string }> = {};
let consecutiveErrors = 0;

// ── Slot release + queue processing ──

function releaseSlot(agent: string, reason: string): void {
  if (!inFlight[agent]) return;
  inFlight[agent] = false;
  console.log(`[RELEASE] ${agent} slot released (${reason})`);

  const queued = pendingQueue[agent];
  if (queued) {
    console.log(`[QUEUE→DISPATCH] ${agent} — seq:${queued.seq}`);
    dispatchAgent(agent, queued.seq, queued.messageJson);
  }
}

// ── Agent dispatch ──

function dispatchAgent(agent: string, seq: number, messageJson: string): void {
  if (inFlight[agent]) {
    pendingQueue[agent] = { seq, messageJson };
    console.log(`[QUEUE] ${agent} — seq:${seq} (auto-dispatch after slot release)`);
    return;
  }

  const now = Date.now();
  const isFromQueue = pendingQueue[agent]?.seq === seq;
  if (!isFromQueue && lastDispatch[agent] && now - lastDispatch[agent] < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - lastDispatch[agent])) / 1000);
    console.log(`[COOLDOWN] ${agent} — ${remaining}s remaining`);
    return;
  }

  inFlight[agent] = true;
  lastDispatch[agent] = now;
  delete pendingQueue[agent];

  const prompt = `HCS message arrived seq:${seq}\n${messageJson}\nRespond to this message.`;

  console.log(`[DISPATCH] ${agent} — seq:${seq}`);

  const child = spawn('openclaw', ['agent', '--agent', agent, '--message', prompt], {
    stdio: 'ignore',
  });

  // Timer-based slot release — process queue when agent has likely posted to HCS
  const timer = setTimeout(() => releaseSlot(agent, `seq:${seq} timer`), SLOT_RELEASE_MS);

  child.on('exit', (code) => {
    clearTimeout(timer);
    releaseSlot(agent, `seq:${seq} exit:${code}`);
  });

  child.on('error', (err) => {
    clearTimeout(timer);
    console.error(`[ERROR] ${agent} spawn error:`, err.message);
    releaseSlot(agent, `seq:${seq} error`);
  });
}

// ── Message routing ──

function routeMessage(seq: number, raw: Uint8Array): void {
  if (seenSequences.has(seq)) return;
  seenSequences.add(seq);

  if (seq <= afterSeqArg) return;

  let parsed: MarketplaceMessage;
  let messageJson: string;

  try {
    messageJson = Buffer.from(raw).toString('utf-8');
    parsed = JSON.parse(messageJson) as MarketplaceMessage;
  } catch {
    console.log(`[SKIP] seq:${seq} — JSON parse failed`);
    return;
  }

  const msgType = parsed.type;
  if (!msgType) {
    console.log(`[SKIP] seq:${seq} — no type field`);
    return;
  }

  if (IGNORED_TYPES.has(msgType)) {
    console.log(`[IGNORE] seq:${seq} type:${msgType}`);
    return;
  }

  console.log(`[MSG] seq:${seq} type:${msgType}`);

  for (const [agent, types] of Object.entries(AGENT_ROUTING)) {
    if (!types.includes(msgType)) continue;

    // bid_accepted → trigger only the agent for the matching role
    if (msgType === 'bid_accepted') {
      const role = (parsed as { role?: string }).role;
      if (role && role !== agent) continue;
    }

    // deliverable → trigger architect only when the deliverable is from analyst
    if (msgType === 'deliverable') {
      const role = (parsed as { role?: string }).role;
      if (agent === 'architect' && role !== 'analyst') continue;
    }

    dispatchAgent(agent, seq, messageJson);
  }
}

// ── gRPC subscription ──

function startSubscription(): void {
  const { client } = createContext();
  const topicId = TopicId.fromString(topicIdArg);

  console.log(`[INIT] Starting topic ${topicIdArg} subscription (afterSeq: ${afterSeqArg})`);

  const handle = new TopicMessageQuery()
    .setTopicId(topicId)
    .subscribe(
      client,
      // error handler — SDK uses (message | null, error) signature
      (_message, error) => {
        consecutiveErrors++;
        console.error(
          `[GRPC ERROR] (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
          error.message,
        );

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.log(
            `[RECONNECT] ${MAX_CONSECUTIVE_ERRORS} consecutive errors — ` +
            `restarting in ${RECONNECT_DELAY_MS / 1000}s`,
          );
          handle.unsubscribe();
          setTimeout(startSubscription, RECONNECT_DELAY_MS);
        }
      },
      // Message handler
      (message) => {
        consecutiveErrors = 0;
        const seq = Number(message.sequenceNumber);
        routeMessage(seq, message.contents);
      },
    );

  // ── Graceful shutdown ──

  const shutdown = () => {
    console.log('\n[SHUTDOWN] Unsubscribing...');
    handle.unsubscribe();

    const active = Object.entries(inFlight)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (active.length > 0) {
      console.log(`[SHUTDOWN] Waiting for active agents: ${active.join(', ')}`);
      setTimeout(() => process.exit(0), 5000);
    } else {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`[READY] Watcher waiting — topic: ${topicIdArg}`);
}

// ── Start ──

startSubscription();

// Event loop keep-alive — register an empty timer so Node.js keeps the process alive
setInterval(() => {}, 1 << 30);
