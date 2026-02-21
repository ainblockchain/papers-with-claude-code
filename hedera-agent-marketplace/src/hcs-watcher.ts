// HCS gRPC Watcher — cron 폴링을 이벤트 드리븐으로 전환
// TopicMessageQuery gRPC 구독으로 HCS 메시지를 실시간 감지하고
// 메시지 타입에 따라 적절한 openclaw agent를 트리거합니다.
//
// 사용법: npm run watcher -- <topicId> [afterSeq]
// 예시:   npm run watcher -- 0.0.5894716
//         npm run watcher -- 0.0.5894716 42  (seq 42 이후만)

import 'dotenv/config';
import { execFile } from 'node:child_process';
import { TopicMessageQuery, TopicId } from '@hashgraph/sdk';
import { createContext } from './hedera/client.js';
import type { MarketplaceMessage, MarketplaceMessageType } from './types/marketplace.js';

// ── CLI 인자 파싱 ──

const topicIdArg = process.argv[2];
const afterSeqArg = process.argv[3] ? Number(process.argv[3]) : 0;

if (!topicIdArg) {
  console.error('사용법: npm run watcher -- <topicId> [afterSeq]');
  console.error('예시:   npm run watcher -- 0.0.5894716');
  console.error('        npm run watcher -- 0.0.5894716 42');
  process.exit(1);
}

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

// ── 보호 장치 상수 ──

const COOLDOWN_MS = 30_000;           // 에이전트당 30초 쿨다운
const EXEC_TIMEOUT_MS = 120_000;      // openclaw agent 실행 타임아웃
const MAX_CONSECUTIVE_ERRORS = 10;    // 연속 에러 시 구독 재시작
const RECONNECT_DELAY_MS = 30_000;    // 재연결 대기 시간

// ── 상태 ──

const seenSequences = new Set<number>();
const lastDispatch: Record<string, number> = {};
const inFlight: Record<string, boolean> = {};
const pendingQueue: Record<string, { seq: number; messageJson: string }> = {};
let consecutiveErrors = 0;

// ── 에이전트 디스패치 ──

function dispatchAgent(agent: string, seq: number, messageJson: string): void {
  if (inFlight[agent]) {
    pendingQueue[agent] = { seq, messageJson };
    console.log(`[QUEUE] ${agent} — seq:${seq} (완료 후 자동 디스패치)`);
    return;
  }

  const now = Date.now();
  const isFromQueue = pendingQueue[agent]?.seq === seq;
  if (!isFromQueue && lastDispatch[agent] && now - lastDispatch[agent] < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - lastDispatch[agent])) / 1000);
    console.log(`[COOLDOWN] ${agent} — ${remaining}초 남음`);
    return;
  }

  inFlight[agent] = true;
  lastDispatch[agent] = now;
  delete pendingQueue[agent];

  const prompt = `HCS 메시지 도착 seq:${seq}\n${messageJson}\n이 메시지에 대해 응답하세요.`;

  console.log(`[DISPATCH] ${agent} — seq:${seq}`);

  execFile(
    'openclaw',
    ['agent', '--agent', agent, '--message', prompt],
    { timeout: EXEC_TIMEOUT_MS },
    (error, _stdout, stderr) => {
      inFlight[agent] = false;
      if (error) {
        console.error(`[ERROR] ${agent} 실행 실패:`, error.message);
        if (stderr) console.error(`  stderr: ${stderr.slice(0, 200)}`);
      } else {
        console.log(`[DONE] ${agent} — seq:${seq} 완료`);
      }

      // 큐에 대기 중인 메시지 자동 디스패치
      const queued = pendingQueue[agent];
      if (queued) {
        console.log(`[QUEUE→DISPATCH] ${agent} — seq:${queued.seq}`);
        dispatchAgent(agent, queued.seq, queued.messageJson);
      }
    },
  );
}

// ── 메시지 라우팅 ──

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
    console.log(`[SKIP] seq:${seq} — JSON 파싱 실패`);
    return;
  }

  const msgType = parsed.type;
  if (!msgType) {
    console.log(`[SKIP] seq:${seq} — type 필드 없음`);
    return;
  }

  if (IGNORED_TYPES.has(msgType)) {
    console.log(`[IGNORE] seq:${seq} type:${msgType}`);
    return;
  }

  console.log(`[MSG] seq:${seq} type:${msgType}`);

  for (const [agent, types] of Object.entries(AGENT_ROUTING)) {
    if (!types.includes(msgType)) continue;

    // bid_accepted → 해당 role의 에이전트만 트리거
    if (msgType === 'bid_accepted') {
      const role = (parsed as { role?: string }).role;
      if (role && role !== agent) continue;
    }

    // deliverable → analyst의 결과물일 때만 architect 트리거
    if (msgType === 'deliverable') {
      const role = (parsed as { role?: string }).role;
      if (agent === 'architect' && role !== 'analyst') continue;
    }

    dispatchAgent(agent, seq, messageJson);
  }
}

// ── gRPC 구독 ──

function startSubscription(): void {
  const { client } = createContext();
  const topicId = TopicId.fromString(topicIdArg);

  console.log(`[INIT] 토픽 ${topicIdArg} 구독 시작 (afterSeq: ${afterSeqArg})`);

  const handle = new TopicMessageQuery()
    .setTopicId(topicId)
    .subscribe(
      client,
      // error handler — SDK는 (message | null, error) 시그니처 사용
      (_message, error) => {
        consecutiveErrors++;
        console.error(
          `[GRPC ERROR] (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`,
          error.message,
        );

        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          console.log(
            `[RECONNECT] 연속 에러 ${MAX_CONSECUTIVE_ERRORS}회 — ` +
            `${RECONNECT_DELAY_MS / 1000}초 후 재시작`,
          );
          handle.unsubscribe();
          setTimeout(startSubscription, RECONNECT_DELAY_MS);
        }
      },
      // message handler
      (message) => {
        consecutiveErrors = 0;
        const seq = Number(message.sequenceNumber);
        routeMessage(seq, message.contents);
      },
    );

  // ── Graceful shutdown ──

  const shutdown = () => {
    console.log('\n[SHUTDOWN] 구독 해제 중...');
    handle.unsubscribe();

    const active = Object.entries(inFlight)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (active.length > 0) {
      console.log(`[SHUTDOWN] 실행 중인 에이전트 대기: ${active.join(', ')}`);
      setTimeout(() => process.exit(0), 5000);
    } else {
      process.exit(0);
    }
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  console.log(`[READY] 워처 대기 중 — 토픽: ${topicIdArg}`);
}

// ── 시작 ──

startSubscription();

// Event loop keep-alive — Node.js가 프로세스를 유지하도록 빈 타이머 등록
setInterval(() => {}, 1 << 30);
