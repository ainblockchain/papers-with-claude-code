// HCS Mirror Node 폴링 유틸리티
// 에이전트가 HCS에 게시한 메시지를 주기적으로 폴링하여 감지한다.
// Mirror Node 반영 지연(3-6초)을 감안해 3초 간격으로 폴링한다.

import { getTopicMessages, type HCSMessage } from '../hedera/client.js';
import type { MarketplaceMessage, MarketplaceMessageType } from '../types/marketplace.js';
import type { SSEEmitter } from '../marketplace-orchestrator.js';

export interface HcsMessageFilter {
  /** 메시지 type 필드로 필터 (예: 'bid', 'deliverable', 'review') */
  type?: MarketplaceMessageType;
  /** 에이전트 role 필드로 필터 (type이 'bid'|'deliverable'일 때) */
  role?: string;
  /** 이 시퀀스 번호 이후의 메시지만 검색 */
  afterSeq?: number;
  /** requestId로 필터 (세션 격리) */
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
 * HCS 토픽을 폴링하여 특정 조건의 메시지를 감지한다.
 *
 * Mirror Node에 3초 간격으로 조회하면서:
 * - filter 조건에 맞는 메시지가 expectedCount만큼 모이면 반환
 * - timeoutMs 경과 시 지금까지 수집된 메시지를 반환
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
    msg: `HCS 폴링 시작 — type:${filter.type ?? '*'}, role:${filter.role ?? '*'}, 대기:${expectedCount}건, timeout:${Math.round(timeoutMs / 1000)}초`,
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
        // JSON 파싱 실패 — 무시 (에이전트가 잘못된 포맷을 보낼 수 있음)
        seenSeqs.add(msg.sequenceNumber);
        continue;
      }

      // 필터 매칭
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
        msg: `HCS 메시지 감지 [seq:${msg.sequenceNumber}] type:${parsed.type} (${collected.length}/${expectedCount})`,
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
      msg: `폴링 타임아웃 — ${collected.length}/${expectedCount}건만 수집됨`,
    });
  }

  return collected;
}

function delay(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}
