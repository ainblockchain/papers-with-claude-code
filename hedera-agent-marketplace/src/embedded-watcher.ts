// 임베디드 HCS 워처 — 서버 프로세스 내에서 gRPC 구독 + 에이전트 디스패치
//
// hcs-watcher.ts(독립 프로세스)와 달리 서버 SSE 피드에 통합되어
// 토픽 생성 직후 구독을 시작하므로 race condition이 없다.
// 세션마다 상태(dedup, cooldown)를 격리하여 이전 세션 영향을 받지 않음.

import { execFile } from 'node:child_process';
import { TopicMessageQuery, TopicId } from '@hashgraph/sdk';
import type { HederaContext } from './hedera/context.js';
import type { MarketplaceMessageType } from './types/marketplace.js';

// ── 메시지 라우팅 테이블 ──

const AGENT_ROUTING: Record<string, MarketplaceMessageType[]> = {
  analyst:   ['course_request', 'bid_accepted', 'consultation_response'],
  architect: ['course_request', 'bid_accepted', 'deliverable', 'consultation_response'],
  scholar:   ['consultation_request'],
};

// 서버가 발행하는 메시지 — 에이전트가 반응할 필요 없음
const IGNORED_TYPES = new Set<MarketplaceMessageType>([
  'bid', 'escrow_lock', 'escrow_release', 'client_review', 'course_complete',
]);

// ── 설정 ──

const COOLDOWN_MS = 30_000;
const EXEC_TIMEOUT_MS = 120_000;

export interface WatcherHandle {
  unsubscribe: () => void;
}

type LogFn = (msg: string) => void;

/**
 * 서버 프로세스 내에서 HCS gRPC 구독을 시작하고
 * 메시지 타입에 따라 openclaw agent를 자동 디스패치한다.
 *
 * 각 호출마다 독립된 상태(dedup, cooldown, in-flight)를 가지므로
 * 이전 세션의 영향을 받지 않는다.
 */
export function startEmbeddedWatcher(
  ctx: HederaContext,
  topicId: string,
  onLog?: LogFn,
): WatcherHandle {
  // 세션별 격리 상태
  const seenSequences = new Set<number>();
  const lastDispatch: Record<string, number> = {};
  const inFlight: Record<string, boolean> = {};
  // in-flight 중 도착한 메시지를 큐잉 — 실행 완료 후 자동 디스패치
  const pendingQueue: Record<string, { seq: number; messageJson: string }> = {};

  function log(msg: string): void {
    console.log(msg);
    onLog?.(msg);
  }

  // ── 에이전트 디스패치 ──

  function dispatchAgent(agent: string, seq: number, messageJson: string): void {
    if (inFlight[agent]) {
      // 큐에 최신 메시지 저장 — 실행 완료 후 자동 디스패치
      pendingQueue[agent] = { seq, messageJson };
      log(`[WATCHER] ${agent} 큐잉 — seq:${seq} (완료 후 자동 디스패치)`);
      return;
    }

    const now = Date.now();
    const isFromQueue = pendingQueue[agent]?.seq === seq;
    if (!isFromQueue && lastDispatch[agent] && now - lastDispatch[agent] < COOLDOWN_MS) {
      const remaining = Math.ceil((COOLDOWN_MS - (now - lastDispatch[agent])) / 1000);
      log(`[WATCHER] ${agent} 쿨다운 ${remaining}초`);
      return;
    }

    inFlight[agent] = true;
    lastDispatch[agent] = now;
    delete pendingQueue[agent];

    const prompt = `HCS 메시지 도착 seq:${seq}\n${messageJson}\n이 메시지에 대해 응답하세요.`;

    log(`[WATCHER] ${agent} 디스패치 — seq:${seq}`);

    execFile(
      'openclaw',
      ['agent', '--agent', agent, '--message', prompt],
      { timeout: EXEC_TIMEOUT_MS },
      (error, _stdout, stderr) => {
        inFlight[agent] = false;
        if (error) {
          log(`[WATCHER] ${agent} 실패: ${error.message}`);
          if (stderr) log(`[WATCHER] ${agent} stderr: ${stderr.slice(0, 200)}`);
        } else {
          log(`[WATCHER] ${agent} 완료 — seq:${seq}`);
        }

        // 큐에 대기 중인 메시지 자동 디스패치
        const queued = pendingQueue[agent];
        if (queued) {
          log(`[WATCHER] ${agent} 큐 처리 — seq:${queued.seq}`);
          dispatchAgent(agent, queued.seq, queued.messageJson);
        }
      },
    );
  }

  // ── 메시지 라우팅 ──

  function routeMessage(seq: number, raw: Uint8Array): void {
    if (seenSequences.has(seq)) return;
    seenSequences.add(seq);

    let messageJson: string;
    let parsed: { type?: MarketplaceMessageType; role?: string };

    try {
      messageJson = Buffer.from(raw).toString('utf-8');
      parsed = JSON.parse(messageJson);
    } catch {
      log(`[WATCHER] seq:${seq} JSON 파싱 실패 — 스킵`);
      return;
    }

    const msgType = parsed.type;
    if (!msgType || IGNORED_TYPES.has(msgType)) return;

    log(`[WATCHER] seq:${seq} type:${msgType}`);

    for (const [agent, types] of Object.entries(AGENT_ROUTING)) {
      if (!types.includes(msgType)) continue;

      // bid_accepted → 해당 role의 에이전트만 트리거
      if (msgType === 'bid_accepted' && parsed.role && parsed.role !== agent) continue;

      // deliverable → analyst 결과물일 때만 architect 트리거
      if (msgType === 'deliverable' && agent === 'architect' && parsed.role !== 'analyst') continue;

      dispatchAgent(agent, seq, messageJson);
    }
  }

  // ── gRPC 구독 시작 ──

  const handle = new TopicMessageQuery()
    .setTopicId(TopicId.fromString(topicId))
    .subscribe(
      ctx.client,
      (_message, error) => {
        log(`[WATCHER] gRPC 에러: ${error.message}`);
      },
      (message) => {
        const seq = Number(message.sequenceNumber);
        routeMessage(seq, message.contents);
      },
    );

  log(`[WATCHER] 토픽 ${topicId} 구독 시작`);

  return {
    unsubscribe: () => {
      handle.unsubscribe();
      log(`[WATCHER] 토픽 ${topicId} 구독 해제`);
    },
  };
}
