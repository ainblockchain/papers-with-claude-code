// HCS (Hedera Consensus Service) — 토픽 생성, 메시지 게시/조회

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

// Mirror Node 응답의 chunk 메타데이터 포함 메시지 타입
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

// chunk된 메시지를 initial_transaction_id 기준으로 재조립
// HCS 메시지가 1024 bytes를 초과하면 SDK가 자동으로 chunk 분할하며,
// Mirror Node REST API는 개별 chunk를 반환하므로 수동 재조립이 필요하다.
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
    if (bucket.parts.size < bucket.total) continue; // 아직 모든 chunk 미도착

    const sorted = Array.from(bucket.parts.entries())
      .sort(([a], [b]) => a - b)
      .map(([, m]) => m);

    const combined = sorted
      .map((m) => Buffer.from(m.message, 'base64').toString('utf-8'))
      .join('');

    singles.push({
      topicId,
      sequenceNumber: sorted[0].sequence_number, // 첫 chunk의 seq 사용
      timestamp: sorted[0].consensus_timestamp,
      message: combined,
    });
  }

  return singles.sort((a, b) => a.sequenceNumber - b.sequenceNumber);
}

// Mirror Node에서 HCS 메시지 조회
// afterSeq를 전달하면 해당 seq 이후 메시지만 가져온다 (pagination 문제 해결)
// chunk된 메시지는 자동으로 재조립하여 완성된 메시지만 반환한다.
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
