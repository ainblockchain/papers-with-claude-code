// WebSocket <-> K8s exec bridge
// Relays browser xterm.js WebSocket connections to K8s Pod Claude Code exec sessions.
// Users are connected directly to a pre-configured Claude Code lesson, not a bash shell.
//
// Initial message: Handled by start-claude.sh as a CLI argument (first visit: initial prompt, return visit: --continue)
// Stage detection: Detects [STAGE_COMPLETE:N] / [DUNGEON_COMPLETE] markers in stdout,
//   saves to DB + sends structured WebSocket events + strips markers.
// Idle nudge: When the user is inactive for a period, Claude autonomously continues the lesson.

import WebSocket from 'ws';
import * as k8s from '@kubernetes/client-node';
import { Writable, Readable } from 'stream';
import { kc } from '../k8s/client.js';
import type { ProgressStore } from '../db/progress.js';

const STAGE_COMPLETE_RE = /\[STAGE_COMPLETE:(\d+)\]/g;
const PAYMENT_CONFIRMED_RE = /\[PAYMENT_CONFIRMED:(\d+):(0x[a-fA-F0-9]+)\]/g;
const COURSE_COMPLETE_STR = '[DUNGEON_COMPLETE]';

// Prompts injected into stdin so Claude autonomously continues the lesson when the user is idle
const IDLE_NUDGE_PROMPTS = [
  'Please continue exploring the next topic\n',
  'Please find and explain more interesting parts\n',
  'Shall we look at the next important concept\n',
];

export interface TerminalOptions {
  courseId?: string;     // Course ID (passed to start-claude.sh)
  model?: string;       // Claude model (haiku, sonnet, opus)
  idleNudgeMs?: number; // 0 means disabled, positive value resumes autonomous exploration after that many ms
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
  let k8sExecWs: WebSocket | null = null; // K8s exec WebSocket for resize support

  // Idle heartbeat: Inject autonomous exploration prompt to Claude when user is inactive
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

  // Writable stream that forwards Pod stdout/stderr to the browser WebSocket
  // Detects [STAGE_COMPLETE:N] / [DUNGEON_COMPLETE] markers and sends events + strips markers
  const stdoutStream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      if (ws.readyState !== WebSocket.OPEN) {
        callback();
        return;
      }

      let text = chunk.toString();

      // Detect [PAYMENT_CONFIRMED:N:txHash] payment confirmation marker
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

      // Detect and process [STAGE_COMPLETE:N] marker
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

      // Detect and process [DUNGEON_COMPLETE] marker
      if (text.includes(COURSE_COMPLETE_STR)) {
        if (userId && courseId && progressStore) {
          progressStore.saveCourseComplete(userId, courseId);
        }
        ws.send(JSON.stringify({ type: 'course_complete' }));
        text = text.replaceAll(COURSE_COMPLETE_STR, '');
      }

      // Forward only the remaining text to the terminal after stripping markers
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

  // Readable stream that receives browser key input and forwards it to Pod stdin
  const stdinStream = new Readable({
    read() {
      // Data is injected externally via push()
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

  // Forward each key input from the browser to stdin
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

      if (parsed.type === 'resize' && parsed.cols && parsed.rows) {
        // Forward resize to K8s exec via channel 4 (TTY resize channel)
        if (k8sExecWs && k8sExecWs.readyState === WebSocket.OPEN) {
          const payload = JSON.stringify({ Width: parsed.cols, Height: parsed.rows });
          const buf = Buffer.alloc(1 + payload.length);
          buf.writeUInt8(4, 0); // channel 4 = resize
          buf.write(payload, 1);
          k8sExecWs.send(buf);
        }
        return;
      }

      if (parsed.type === 'input' && typeof parsed.data === 'string') {
        stdinStream.push(parsed.data);
        resetIdleTimer(); // Reset idle timer on user input
        return;
      }
    } catch {
      // If not JSON, treat as raw text (fallback)
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

  // Server-side ping/pong (WebSocket protocol level)
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.ping();
    } else {
      clearInterval(pingInterval);
    }
  }, 25000);

  ws.on('close', () => clearInterval(pingInterval));

  // Pass courseId and model as arguments to start-claude.sh
  // start-claude.sh determines first visit/return visit on its own and runs Claude Code in the appropriate mode
  const execCommand = ['/usr/local/bin/start-claude.sh', courseId || '', model];

  try {
    k8sExecWs = await exec.exec(
      namespace,
      podName,
      'sandbox',
      execCommand,
      stdoutStream,
      stdoutStream,
      stdinStream,
      true, // TTY mode
    ) as unknown as WebSocket;
    console.log(`[terminal-bridge] exec attached for pod ${podName} (model: ${model})`);

    // Send auto_start event to frontend (for loading UI -> "lesson in progress" transition)
    // No need for separate prompt injection since start-claude.sh sends the initial message as a CLI argument
    if (courseId) {
      ws.send(JSON.stringify({ type: 'auto_start' }));
      resetIdleTimer(); // Start idle timer
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
