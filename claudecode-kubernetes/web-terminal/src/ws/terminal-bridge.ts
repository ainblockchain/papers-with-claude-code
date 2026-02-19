// WebSocket <-> K8s exec 브릿지
// 브라우저의 xterm.js WebSocket 연결을 K8s Pod의 Claude Code exec 세션으로 중계.
// 유저는 bash 셸이 아닌, 사전 구성된 Claude Code에 바로 연결됨.
// stdout 스트림에서 [STAGE_COMPLETE:N] / [DUNGEON_COMPLETE] 마커를 감지하여
// DB 저장 + 구조화된 WebSocket 이벤트 전송 + 마커 strip 처리.

import WebSocket from 'ws';
import * as k8s from '@kubernetes/client-node';
import { Writable, Readable } from 'stream';
import { kc } from '../k8s/client.js';
import type { ProgressStore } from '../db/progress.js';

const STAGE_COMPLETE_RE = /\[STAGE_COMPLETE:(\d+)\]/g;
const COURSE_COMPLETE_STR = '[DUNGEON_COMPLETE]';

export async function attachTerminal(
  ws: WebSocket,
  podName: string,
  namespace: string,
  userId?: string,
  paperId?: string,
  progressStore?: ProgressStore,
  sessionId?: string,
): Promise<void> {
  const exec = new k8s.Exec(kc);

  let isCleanedUp = false;

  // Pod stdout/stderr -> 브라우저 WebSocket 으로 전달하는 writable stream
  // [STAGE_COMPLETE:N] / [DUNGEON_COMPLETE] 마커를 감지하여 이벤트 전송 + 마커 strip
  const stdoutStream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      if (ws.readyState !== WebSocket.OPEN) {
        callback();
        return;
      }

      let text = chunk.toString();

      // [STAGE_COMPLETE:N] 마커 감지 및 처리
      let stageMatch: RegExpExecArray | null;
      STAGE_COMPLETE_RE.lastIndex = 0;
      while ((stageMatch = STAGE_COMPLETE_RE.exec(text)) !== null) {
        const stageNumber = parseInt(stageMatch[1], 10);
        if (userId && paperId && progressStore && sessionId) {
          progressStore.saveStageComplete(userId, paperId, stageNumber, sessionId);
        }
        ws.send(JSON.stringify({ type: 'stage_complete', stageNumber }));
      }
      text = text.replace(STAGE_COMPLETE_RE, '');

      // [DUNGEON_COMPLETE] 마커 감지 및 처리
      if (text.includes(COURSE_COMPLETE_STR)) {
        if (userId && paperId && progressStore) {
          progressStore.saveCourseComplete(userId, paperId);
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
    console.log(`[terminal-bridge] Cleaning up for pod ${podName}`);
    stdinStream.push(null);
    stdoutStream.destroy();
  }

  // 브라우저에서 키 입력이 올 때마다 stdin 으로 전달
  ws.on('message', (data: WebSocket.RawData) => {
    const message = data.toString();

    try {
      const parsed = JSON.parse(message);

      // heartbeat ping에 pong 응답
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
        return;
      }
    } catch {
      // JSON이 아니면 raw 텍스트로 처리 (fallback)
    }

    // JSON 파싱 실패 또는 알 수 없는 타입이면 raw 입력으로 전달
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
  // 브라우저가 자동으로 pong 응답 → 연결 상태 확인
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 25000);

  ws.on('close', () => clearInterval(pingInterval));

  try {
    await exec.exec(
      namespace,
      podName,
      'sandbox',
      ['/usr/local/bin/start-claude.sh'],
      stdoutStream,   // Pod stdout -> 브라우저
      stdoutStream,   // Pod stderr -> 브라우저 (stdout과 병합)
      stdinStream,    // 브라우저 -> Pod stdin
      true,           // TTY 모드
    );
    console.log(`[terminal-bridge] exec attached for pod ${podName}`);
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
