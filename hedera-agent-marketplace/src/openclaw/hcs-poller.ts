// HCS Mirror Node polling utility
// Periodically polls messages posted by agents to HCS.
// Polls every 3 seconds to account for Mirror Node propagation delay (3-6s).

import { getTopicMessages, type HCSMessage } from '../hedera/client.js';
import type { MarketplaceMessage, MarketplaceMessageType } from '../types/marketplace.js';
import type { SSEEmitter } from '../marketplace-orchestrator.js';

export interface HcsMessageFilter {
  /** Filter by message type field (e.g. 'bid', 'deliverable', 'review') */
  type?: MarketplaceMessageType;
  /** Filter by agent role field (when type is 'bid' | 'deliverable') */
  role?: string;
  /** Only retrieve messages after this sequence number */
  afterSeq?: number;
  /** Filter by requestId (session isolation) */
  requestId?: string;
}

export interface ParsedHcsMessage {
  sequenceNumber: number;
  timestamp: string;
  raw: string;
  parsed: MarketplaceMessage;
}

const POLL_INTERVAL_MS = 3000;

/**
 * Polls an HCS topic for messages matching specific criteria.
 *
 * Queries Mirror Node every 3 seconds:
 * - Returns when expectedCount matching messages are collected
 * - Returns collected messages so far when timeoutMs elapses
 */
export async function pollForHcsMessage(
  topicId: string,
  filter: HcsMessageFilter,
  expectedCount: number,
  timeoutMs: number,
  emit?: SSEEmitter,
): Promise<ParsedHcsMessage[]> {
  const collected: ParsedHcsMessage[] = [];
  const seenSeqs = new Set<number>();
  const deadline = Date.now() + timeoutMs;

  emit?.('log', {
    icon: '🔍',
    msg: `HCS polling started — type:${filter.type ?? '*'}, role:${filter.role ?? '*'}, expecting:${expectedCount}, timeout:${Math.round(timeoutMs / 1000)}s`,
  });

  while (Date.now() < deadline && collected.length < expectedCount) {
    const messages = await getTopicMessages(topicId, filter.afterSeq);

    for (const msg of messages) {
      if (seenSeqs.has(msg.sequenceNumber)) continue;
      if (filter.afterSeq && msg.sequenceNumber <= filter.afterSeq) continue;

      let parsed: MarketplaceMessage;
      try {
        parsed = JSON.parse(msg.message) as MarketplaceMessage;
      } catch {
        // JSON parse failed — skip (agent may send invalid format)
        seenSeqs.add(msg.sequenceNumber);
        continue;
      }

      // Filter matching
      if (filter.type && parsed.type !== filter.type) continue;
      if (filter.requestId && 'requestId' in parsed && parsed.requestId !== filter.requestId) continue;
      if (filter.role && 'role' in parsed && (parsed as any).role !== filter.role) continue;

      seenSeqs.add(msg.sequenceNumber);
      collected.push({
        sequenceNumber: msg.sequenceNumber,
        timestamp: msg.timestamp,
        raw: msg.message,
        parsed,
      });

      emit?.('log', {
        icon: '📨',
        msg: `HCS message detected [seq:${msg.sequenceNumber}] type:${parsed.type} (${collected.length}/${expectedCount})`,
      });

      if (collected.length >= expectedCount) break;
    }

    if (collected.length < expectedCount) {
      await delay(POLL_INTERVAL_MS);
    }
  }

  if (collected.length < expectedCount) {
    emit?.('log', {
      icon: '⚠️',
      msg: `Polling timeout — only ${collected.length}/${expectedCount} collected`,
    });
  }

  return collected;
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
