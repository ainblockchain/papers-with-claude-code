// Embedded HCS watcher — gRPC subscription + agent dispatch within the server process
//
// Unlike hcs-watcher.ts (standalone process), this is integrated into the server SSE feed
// and starts subscribing right after topic creation, eliminating race conditions.
// State (dedup, cooldown) is isolated per session, unaffected by previous sessions.
//
// The openclaw agent command blocks until the agent finishes, so we use
// spawn + timer-based slot release.
// Since agents need ~30-40s to post to HCS,
// we release the slot after 45s to dispatch the next queued message.

import { spawn } from 'node:child_process';
import { Client, Timestamp, TopicMessageQuery, TopicId } from '@hashgraph/sdk';
import type { HederaContext } from './hedera/context.js';
import type { MarketplaceMessageType } from './types/marketplace.js';

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

// ── Configuration ──

const COOLDOWN_MS = 30_000;
// Estimated time for openclaw agent to process a message and post to HCS.
// After this time, the in-flight slot is released to dispatch the next queued message.
// The agent process itself may continue running (blocking CLI).
const SLOT_RELEASE_MS = 45_000;

export interface WatcherHandle {
  unsubscribe: () => void;
}

type LogFn = (msg: string) => void;

/**
 * Starts an HCS gRPC subscription within the server process
 * and auto-dispatches openclaw agents based on message type.
 *
 * Each call has isolated state (dedup, cooldown, in-flight),
 * so it is unaffected by previous sessions.
 */
export function startEmbeddedWatcher(
  ctx: HederaContext,
  topicId: string,
  onLog?: LogFn,
): WatcherHandle {
  // Per-session isolated state
  const seenSequences = new Set<number>();
  const lastDispatch: Record<string, number> = {};
  const inFlight: Record<string, boolean> = {};
  // Queue messages arriving while in-flight — auto-dispatch after slot release
  const pendingQueue: Record<string, { seq: number; messageJson: string }> = {};

  function log(msg: string): void {
    console.log(msg);
    onLog?.(msg);
  }

  // ── Slot release + queue processing ──

  function releaseSlot(agent: string, reason: string): void {
    if (!inFlight[agent]) return;
    inFlight[agent] = false;
    log(`[WATCHER] ${agent} slot released (${reason})`);

    const queued = pendingQueue[agent];
    if (queued) {
      log(`[WATCHER] ${agent} processing queue — seq:${queued.seq}`);
      dispatchAgent(agent, queued.seq, queued.messageJson);
    }
  }

  // ── Agent dispatch ──

  function dispatchAgent(agent: string, seq: number, messageJson: string): void {
    if (inFlight[agent]) {
      pendingQueue[agent] = { seq, messageJson };
      log(`[WATCHER] ${agent} queued — seq:${seq} (auto-dispatch after slot release)`);
      return;
    }

    const now = Date.now();
    const isFromQueue = pendingQueue[agent]?.seq === seq;
    if (!isFromQueue && lastDispatch[agent] && now - lastDispatch[agent] < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastDispatch[agent])) / 1000);
      log(`[WATCHER] ${agent} cooldown ${remaining}s`);
      return;
    }

    inFlight[agent] = true;
    lastDispatch[agent] = now;
    delete pendingQueue[agent];

    const prompt = `HCS message arrived seq:${seq}\n${messageJson}\nRespond to this message.`;

    log(`[WATCHER] ${agent} dispatched — seq:${seq}`);

    const child = spawn('openclaw', ['agent', '--agent', agent, '--message', prompt], {
      stdio: 'ignore',
    });

    // Timer-based slot release — process queue when agent has likely posted to HCS
    const timer = setTimeout(() => releaseSlot(agent, `seq:${seq} timer`), SLOT_RELEASE_MS);

    // Release immediately on process exit (if it finishes before the timer)
    child.on('exit', (code) => {
      clearTimeout(timer);
      releaseSlot(agent, `seq:${seq} exit:${code}`);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      log(`[WATCHER] ${agent} spawn error: ${err.message}`);
      releaseSlot(agent, `seq:${seq} error`);
    });
  }

  // ── Message routing ──

  function routeMessage(seq: number, raw: Uint8Array): void {
    if (seenSequences.has(seq)) return;
    seenSequences.add(seq);

    let messageJson: string;
    let parsed: { type?: MarketplaceMessageType; role?: string };

    try {
      messageJson = Buffer.from(raw).toString('utf-8');
      parsed = JSON.parse(messageJson);
    } catch {
      log(`[WATCHER] seq:${seq} JSON parse failed — skipping`);
      return;
    }

    const msgType = parsed.type;
    if (!msgType || IGNORED_TYPES.has(msgType)) return;

    log(`[WATCHER] seq:${seq} type:${msgType}`);

    for (const [agent, types] of Object.entries(AGENT_ROUTING)) {
      if (!types.includes(msgType)) continue;

      // bid_accepted → trigger only the agent for the matching role
      if (msgType === 'bid_accepted' && parsed.role && parsed.role !== agent) continue;

      // deliverable → trigger architect only when the deliverable is from analyst
      if (msgType === 'deliverable' && agent === 'architect' && parsed.role !== 'analyst') continue;

      dispatchAgent(agent, seq, messageJson);
    }
  }

  // ── Start gRPC subscription ──
  // The server's ctx.client is used for consensus transactions,
  // so we create a separate Client instance for mirror node gRPC subscriptions.
  // Using the same Client for both transactions and subscriptions can cause the subscription to go silent.
  const mirrorClient = Client.forTestnet().setOperator(
    ctx.operatorId,
    ctx.operatorKey,
  );

  // Start receiving from 5 seconds ago to prevent replaying old messages
  // 5-second buffer ensures we don't miss course_request posted right after watcher starts
  const startTime = Timestamp.fromDate(new Date(Date.now() - 5_000));

  const handle = new TopicMessageQuery()
    .setTopicId(TopicId.fromString(topicId))
    .setStartTime(startTime)
    .subscribe(
      mirrorClient,
      (_message, error) => {
        log(`[WATCHER] gRPC error: ${error.message}`);
      },
      (message) => {
        const seq = Number(message.sequenceNumber);
        routeMessage(seq, message.contents);
      },
    );

  log(`[WATCHER] Topic ${topicId} subscription started (independent mirror client)`);

  return {
    unsubscribe: () => {
      handle.unsubscribe();
      mirrorClient.close();
      log(`[WATCHER] Topic ${topicId} subscription cancelled`);
    },
  };
}
