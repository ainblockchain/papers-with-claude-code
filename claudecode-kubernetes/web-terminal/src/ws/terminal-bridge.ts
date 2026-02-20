// WebSocket <-> K8s exec 브릿지
// 브라우저의 xterm.js WebSocket 연결을 K8s Pod의 Claude Code exec 세션으로 중계.
// 유저는 bash 셸이 아닌, 사전 구성된 Claude Code 강의에 바로 연결됨.
//
// 초기 메시지: start-claude.sh가 CLI 인자로 처리 (첫 방문: 초기 프롬프트, 재방문: --continue)
// 스테이지 감지: stdout에서 [STAGE_COMPLETE:N] / [DUNGEON_COMPLETE] 마커를 감지하여
//   DB 저장 + 구조화된 WebSocket 이벤트 전송 + 마커 strip.
// idle nudge: 유저가 일정 시간 입력 없으면 Claude가 자율적으로 강의 계속.

import WebSocket from 'ws';
import * as k8s from '@kubernetes/client-node';
import { Writable, Readable } from 'stream';
import { kc } from '../k8s/client.js';
import type { ProgressStore } from '../db/progress.js';

const STAGE_COMPLETE_RE = /\[STAGE_COMPLETE:(\d+)\]/g;
const PAYMENT_CONFIRMED_RE = /\[PAYMENT_CONFIRMED:(\d+):(0x[a-fA-F0-9]+)\]/g;
const COURSE_COMPLETE_STR = '[DUNGEON_COMPLETE]';

// 유저 비활성 시 Claude가 자율적으로 강의를 계속하도록 stdin에 주입하는 프롬프트
const IDLE_NUDGE_PROMPTS = [
  '계속 다음 내용을 탐구해주세요\n',
  '더 흥미로운 부분을 찾아서 설명해주세요\n',
  '다음으로 중요한 개념을 살펴볼까요\n',
];

export interface TerminalOptions {
  courseId?: string;     // 코스 ID (start-claude.sh에 전달)
  model?: string;       // Claude 모델 (haiku, sonnet, opus)
  idleNudgeMs?: number; // 0이면 비활성, 양수면 해당 ms 후 자율 탐구 재개
}

export async function attachTerminal(
  ws: WebSocket,
  podName: string,
  namespace: string,
  userId?: string,
  courseId?: string,
  progressStore?: ProgressStore,
  sessionId?: string,
  options?: TerminalOptions,
): Promise<void> {
  const exec = new k8s.Exec(kc);
  const { model = 'haiku', idleNudgeMs = 0 } = options ?? {};

  let isCleanedUp = false;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let nudgeIndex = 0;

  // Idle heartbeat: 유저 비활성 시 Claude에 자율 탐구 프롬프트 주입
  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    if (idleNudgeMs <= 0 || isCleanedUp) return;
    idleTimer = setTimeout(() => {
      if (isCleanedUp || ws.readyState !== WebSocket.OPEN) return;
      const prompt = IDLE_NUDGE_PROMPTS[nudgeIndex % IDLE_NUDGE_PROMPTS.length];
      nudgeIndex++;
      console.log(`[terminal-bridge] Idle nudge for pod ${podName}`);
      stdinStream.push(prompt);
      resetIdleTimer();
    }, idleNudgeMs);
  }

  // Pod stdout/stderr -> 브라우저 WebSocket 으로 전달하는 writable stream
  // [STAGE_COMPLETE:N] / [DUNGEON_COMPLETE] 마커를 감지하여 이벤트 전송 + 마커 strip
  const stdoutStream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      if (ws.readyState !== WebSocket.OPEN) {
        callback();
        return;
      }

      let text = chunk.toString();

      // [PAYMENT_CONFIRMED:N:txHash] 결제 확인 마커 감지
      let paymentMatch: RegExpExecArray | null;
      PAYMENT_CONFIRMED_RE.lastIndex = 0;
      while ((paymentMatch = PAYMENT_CONFIRMED_RE.exec(text)) !== null) {
        const stageNumber = parseInt(paymentMatch[1], 10);
        const txHash = paymentMatch[2];
        console.log(`[terminal-bridge] Payment confirmed: stage=${stageNumber}, tx=${txHash}`);
        if (userId && courseId && progressStore && sessionId) {
          progressStore.saveStagePayment(userId, courseId, stageNumber, txHash, sessionId);
        }
        ws.send(JSON.stringify({ type: 'stage_unlocked', stageNumber, txHash }));
      }
      text = text.replace(PAYMENT_CONFIRMED_RE, '');

      // [STAGE_COMPLETE:N] 마커 감지 및 처리
      let stageMatch: RegExpExecArray | null;
      STAGE_COMPLETE_RE.lastIndex = 0;
      while ((stageMatch = STAGE_COMPLETE_RE.exec(text)) !== null) {
        const stageNumber = parseInt(stageMatch[1], 10);
        if (userId && courseId && progressStore && sessionId) {
          progressStore.saveStageComplete(userId, courseId, stageNumber, sessionId);
        }
        ws.send(JSON.stringify({ type: 'stage_complete', stageNumber }));
      }
      text = text.replace(STAGE_COMPLETE_RE, '');

      // [DUNGEON_COMPLETE] 마커 감지 및 처리
      if (text.includes(COURSE_COMPLETE_STR)) {
        if (userId && courseId && progressStore) {
          progressStore.saveCourseComplete(userId, courseId);
        }
        ws.send(JSON.stringify({ type: 'course_complete' }));
        text = text.replaceAll(COURSE_COMPLETE_STR, '');
      }

      // 마커 strip 후 남은 텍스트만 터미널에 전달
      if (text.length > 0) {
        ws.send(text, { binary: false }, (err) => {
          if (err) {
            console.error(`[terminal-bridge] send error:`, err.message);
          }
          callback();
        });
      } else {
        callback();
      }
    },
  });

  // 브라우저 키 입력을 받아 Pod stdin 으로 전달할 readable stream
  const stdinStream = new Readable({
    read() {
      // 외부에서 push()로 데이터를 주입
    },
  });

  function cleanup() {
    if (isCleanedUp) return;
    isCleanedUp = true;
    if (idleTimer) clearTimeout(idleTimer);
    console.log(`[terminal-bridge] Cleaning up for pod ${podName}`);
    stdinStream.push(null);
    stdoutStream.destroy();
  }

  // 브라우저에서 키 입력이 올 때마다 stdin 으로 전달
  ws.on('message', (data: WebSocket.RawData) => {
    const message = data.toString();

    try {
      const parsed = JSON.parse(message);

      if (parsed.type === 'ping') {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
        return;
      }

      if (parsed.type === 'resize') {
        // TODO: K8s exec resize 지원 시 구현
        return;
      }

      if (parsed.type === 'input' && typeof parsed.data === 'string') {
        stdinStream.push(parsed.data);
        resetIdleTimer(); // 유저 입력 시 idle 타이머 리셋
        return;
      }
    } catch {
      // JSON이 아니면 raw 텍스트로 처리 (fallback)
    }

    stdinStream.push(message);
  });

  ws.on('close', () => {
    console.log(`[terminal-bridge] WebSocket closed for pod ${podName}`);
    cleanup();
  });

  ws.on('error', (err) => {
    console.error(`[terminal-bridge] WebSocket error for pod ${podName}:`, err.message);
    cleanup();
  });

  // 서버 사이드 ping/pong (WebSocket 프로토콜 레벨)
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 25000);

  ws.on('close', () => clearInterval(pingInterval));

  // start-claude.sh에 courseId와 model을 인자로 전달
  // start-claude.sh가 첫 방문/재방문을 자체 판별하여 적절한 모드로 Claude Code 실행
  const execCommand = ['/usr/local/bin/start-claude.sh', courseId || '', model];

  try {
    await exec.exec(
      namespace,
      podName,
      'sandbox',
      execCommand,
      stdoutStream,
      stdoutStream,
      stdinStream,
      true, // TTY 모드
    );
    console.log(`[terminal-bridge] exec attached for pod ${podName} (model: ${model})`);

    // 프론트엔드에 auto_start 이벤트 전달 (로딩 UI → "강의 중" 전환용)
    // start-claude.sh가 초기 메시지를 CLI 인자로 보내므로 별도 프롬프트 주입 불필요
    if (courseId) {
      ws.send(JSON.stringify({ type: 'auto_start' }));
      resetIdleTimer(); // idle 타이머 시작
    }
  } catch (err: unknown) {
    clearInterval(pingInterval);
    const message = err instanceof Error ? err.message : JSON.stringify(err);
    console.error(`[terminal-bridge] exec failed for ${podName}:`, message);
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(`\r\nConnection to pod failed: ${message}\r\n`);
      ws.close();
    }
  }
}
