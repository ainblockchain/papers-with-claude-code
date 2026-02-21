// HCS (Hedera Consensus Service) — topic creation, message submission/retrieval

import {
  TopicCreateTransaction,
  TopicMessageSubmitTransaction,
  TopicId,
} from '@hashgraph/sdk';

import type { HederaContext, HCSMessage } from './context.js';

export async function createTopic(
  ctx: HederaContext,
  memo: string,
): Promise<string> {
  const tx = await new TopicCreateTransaction()
    .setTopicMemo(memo)
    .execute(ctx.client);

  const receipt = await tx.getReceipt(ctx.client);
  return receipt.topicId!.toString();
}

export async function submitMessage(
  ctx: HederaContext,
  topicId: string,
  message: string,
): Promise<HCSMessage> {
  const tx = await new TopicMessageSubmitTransaction()
    .setTopicId(TopicId.fromString(topicId))
    .setMessage(message)
    .execute(ctx.client);

  const receipt = await tx.getReceipt(ctx.client);

  return {
    topicId,
    sequenceNumber: receipt.topicSequenceNumber?.toNumber() ?? 0,
    timestamp: new Date().toISOString(),
    message,
  };
}

// Message type including chunk metadata from Mirror Node response
interface MirrorMessage {
  sequence_number: number;
  consensus_timestamp: string;
  message: string;
  chunk_info?: {
    initial_transaction_id: { transaction_valid_start: string; account_id: string };
    total: number;
    number: number;
  };
}

// Reassemble chunked messages by initial_transaction_id
// When HCS messages exceed 1024 bytes, the SDK automatically splits them into chunks.
// The Mirror Node REST API returns individual chunks, so manual reassembly is required.
function reassembleChunks(raw: MirrorMessage[], topicId: string): HCSMessage[] {
  const singles: HCSMessage[] = [];
  const chunkBuckets = new Map<string, { total: number; parts: Map<number, MirrorMessage> }>();

  for (const m of raw) {
    if (!m.chunk_info || m.chunk_info.total <= 1) {
      singles.push({
        topicId,
        sequenceNumber: m.sequence_number,
        timestamp: m.consensus_timestamp,
        message: Buffer.from(m.message, 'base64').toString('utf-8'),
      });
      continue;
    }

    const key = `${m.chunk_info.initial_transaction_id.account_id}@${m.chunk_info.initial_transaction_id.transaction_valid_start}`;
    let bucket = chunkBuckets.get(key);
    if (!bucket) {
      bucket = { total: m.chunk_info.total, parts: new Map() };
      chunkBuckets.set(key, bucket);
    }
    bucket.parts.set(m.chunk_info.number, m);
  }

  for (const [, bucket] of chunkBuckets) {
    if (bucket.parts.size < bucket.total) continue; // not all chunks received yet

    const sorted = Array.from(bucket.parts.entries())
      .sort(([a], [b]) => a - b)
      .map(([, m]) => m);

    const combined = sorted
      .map((m) => Buffer.from(m.message, 'base64').toString('utf-8'))
      .join('');

    singles.push({
      topicId,
      sequenceNumber: sorted[0].sequence_number, // use first chunk's seq
      timestamp: sorted[0].consensus_timestamp,
      message: combined,
    });
  }

  return singles.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
}

// Retrieve ALL HCS messages from Mirror Node via pagination (100 per page)
// Returns messages in descending order (newest first) for monitor initial load.
export async function getAllTopicMessages(topicId: string): Promise<HCSMessage[]> {
  const all: HCSMessage[] = [];
  let nextUrl: string | null =
    `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=100&order=desc`;

  while (nextUrl) {
    try {
      const res = await fetch(nextUrl);
      const data = await res.json() as { messages?: MirrorMessage[]; links?: { next?: string } };
      const batch = reassembleChunks(data.messages ?? [], topicId);
      all.push(...batch);
      nextUrl = data.links?.next
        ? `https://testnet.mirrornode.hedera.com${data.links.next}`
        : null;
    } catch {
      break;
    }
  }
  return all; // already in desc order (newest first)
}

// Retrieve HCS messages from Mirror Node (single page, asc order)
// If afterSeq is provided, only fetches messages after that sequence number (for incremental polling)
// Chunked messages are automatically reassembled, returning only complete messages.
export async function getTopicMessages(
  topicId: string,
  afterSeq?: number,
): Promise<HCSMessage[]> {
  let url = `https://testnet.mirrornode.hedera.com/api/v1/topics/${topicId}/messages?limit=100`;
  if (afterSeq != null && afterSeq > 0) {
    url += `&sequencenumber=gt:${afterSeq}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json() as { messages?: MirrorMessage[] };
    return reassembleChunks(data.messages ?? [], topicId);
  } catch {
    return [];
  }
}
