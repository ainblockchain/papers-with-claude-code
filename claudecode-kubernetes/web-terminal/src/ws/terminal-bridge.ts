// WebSocket <-> K8s exec bridge
// Relays browser xterm.js WebSocket connection to K8s Pod Claude Code exec session.
// Users connect directly to a pre-configured Claude Code course, not a bash shell.
//
// Initial message: handled by start-claude.sh via CLI args (first visit: initial prompt, revisit: --continue)
// Stage detection: detects [STAGE_COMPLETE:N] / [DUNGEON_COMPLETE] markers in stdout,
//   saves to DB + sends structured WebSocket events + strips markers.
// Idle nudge: if user is inactive for a period, Claude autonomously continues the lesson.

import WebSocket from 'ws';
import * as k8s from '@kubernetes/client-node';
import { Writable, Readable } from 'stream';
import { kc } from '../k8s/client.js';
import type { ProgressStore } from '../db/progress.js';

const STAGE_COMPLETE_RE = /\[STAGE_COMPLETE:(\d+)\]/g;
const PAYMENT_CONFIRMED_RE = /\[PAYMENT_CONFIRMED:(\d+):(0x[a-fA-F0-9]+)\]/g;
const COURSE_COMPLETE_STR = '[DUNGEON_COMPLETE]';

// Prompts injected into stdin when user is idle, so Claude autonomously continues the lesson
const IDLE_NUDGE_PROMPTS = [
  'Please continue exploring the next topic\n',
  'Find and explain a more interesting part\n',
  'Shall we look at the next important concept?\n',
];

export interface TerminalOptions {
  courseId?: string;     // Course ID (passed to start-claude.sh)
  model?: string;       // Claude model (haiku, sonnet, opus)
  idleNudgeMs?: number; // 0 = disabled, positive = resume autonomous exploration after N ms
  mode?: string;        // learner (default) | generator
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
  const { model = 'opus', idleNudgeMs = 0, mode = 'learner' } = options ?? {};

  let isCleanedUp = false;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let nudgeIndex = 0;
  let k8sExecWs: WebSocket | null = null; // K8s exec WebSocket for resize support

  // Idle heartbeat: inject autonomous exploration prompt when user is inactive
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

  // Writable stream that forwards Pod stdout/stderr to browser WebSocket
  // Detects [STAGE_COMPLETE:N] / [DUNGEON_COMPLETE] markers, sends events, and strips them
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

      // Detect and process [STAGE_COMPLETE:N] markers
      // Safety net: if X402_MERCHANT_WALLET is set (production), verify payment before saving
      const merchantWallet = process.env.X402_MERCHANT_WALLET;
      let stageMatch: RegExpExecArray | null;
      STAGE_COMPLETE_RE.lastIndex = 0;
      while ((stageMatch = STAGE_COMPLETE_RE.exec(text)) !== null) {
        const stageNumber = parseInt(stageMatch[1], 10);
        if (userId && courseId && progressStore && sessionId) {
          if (merchantWallet && !progressStore.isStageUnlocked(userId, courseId, stageNumber)) {
            // Production mode: stage not paid — skip DB save, notify frontend
            console.log(`[terminal-bridge] Unpaid stage completion blocked: user=${userId}, course=${courseId}, stage=${stageNumber}`);
            ws.send(JSON.stringify({ type: 'stage_complete_unpaid', stageNumber }));
          } else {
            // Dev mode (no wallet) or already paid — save normally
            progressStore.saveStageComplete(userId, courseId, stageNumber, sessionId);
            ws.send(JSON.stringify({ type: 'stage_complete', stageNumber }));
          }
        } else {
          ws.send(JSON.stringify({ type: 'stage_complete', stageNumber }));
        }
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

      // Forward remaining text (after stripping markers) to the terminal
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

  // Readable stream that receives browser key input and forwards to Pod stdin
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

  // Forward each browser key input to stdin
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
      // Not JSON, treat as raw text (fallback)
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

  // Pass courseId, model, mode, userId as arguments to start-claude.sh
  // start-claude.sh branches by mode (learner/generator); learner detects first visit vs revisit
  // userId (5th arg) is written to /tmp/session-context for the payment flow
  const execCommand = ['/usr/local/bin/start-claude.sh', courseId || '', model, mode, userId || ''];

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

    // Handle K8s exec process termination (e.g. Claude CLI exits after "done", /exit, or crash).
    // Without this, the browser WebSocket stays open with no data after the process ends.
    k8sExecWs.on('close', () => {
      console.log(`[terminal-bridge] K8s exec closed for pod ${podName}`);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'session_end', reason: 'process_exit' }));
        ws.close(1000, 'Process exited');
      }
      cleanup();
    });

    k8sExecWs.on('error', (err) => {
      console.error(`[terminal-bridge] K8s exec error for pod ${podName}:`, err.message);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'session_end', reason: 'error' }));
        ws.close(1011, 'K8s exec error');
      }
      cleanup();
    });

    // Send auto_start event to frontend (for loading UI -> "in session" transition)
    // No separate prompt injection needed since start-claude.sh sends initial message via CLI args
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
