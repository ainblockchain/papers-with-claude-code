# Frontend Integration Guide

## Overview
API specification for integrating with the Papers with Claude Code platform's web terminal backend.

## Base URL

Current demo server (port forwarding enabled):
```
NEXT_PUBLIC_TERMINAL_API_URL=http://101.202.37.120:31000
```

> **Note**: For public deployment, replace with a domain/Cloudflare tunnel, etc.
> In an HTTPS environment, WebSocket connections must also use `wss://` (see WS connection example below).

## REST API

### Create Session
POST /api/sessions

Request body:
```json
{
  "claudeMdUrl": "https://raw.githubusercontent.com/.../attention-is-all-you-need/beginner/CLAUDE.md",
  "userId": "0xABC...",       // optional: Kite AA wallet address recommended
  "resumeStage": 3            // optional: resume from a previous stage
}
```

Response:
```json
{
  "sessionId": "uuid",
  "podName": "claude-user-abc12345",
  "status": "running",
  "claudeMdUrl": "https://raw.githubusercontent.com/.../attention-is-all-you-need/beginner/CLAUDE.md",
  "userId": "0xABC...",
  "courseId": "attention-is-all-you-need-beginner",
  "podReused": false
}
```

> **courseId**: Automatically derived by the backend from `claudeMdUrl`. The frontend does not need to send it separately.
> For GitHub raw URLs, the path after `{owner}/{repo}/{branch}/` is joined with hyphens.
> This value is used for progress queries, etc.

> **podReused**: If `true`, an existing Pod was reused and the response is immediate.
> Only when `false` (first connection) does Pod creation + CLAUDE.md fetch take **5-15 seconds**.

### Get Session
GET /api/sessions/:id

### Delete Session
DELETE /api/sessions/:id  (204 No Content)

> **Important**: Deleting a session only removes the session record. **The Pod is preserved.**
> If the same user reconnects, the existing Pod is reused for instant connection.
> Recommended to call on page unmount (`useEffect` cleanup).

### Get Stage Definitions
GET /api/sessions/:id/stages

Parses the JSON block from the repo's CLAUDE.md and returns StageConfig[].
Sessions created without a claudeMdUrl return an empty array.

Response: StageConfig[] (same type as frontend/src/types/learning.ts)

### Get Progress
GET /api/progress/:userId/:courseId

**courseId**: Use the `courseId` value from the session creation response (automatically extracted from claudeMdUrl).

```
GET /api/progress/0xABC.../org-paper-repo
```

Response:
```json
{
  "completedStages": [
    { "stageNumber": 1, "completedAt": "2024-01-01T00:00:00Z", "txHash": "0x..." },
    { "stageNumber": 2, "completedAt": "2024-01-01T00:05:00Z", "txHash": null }
  ],
  "unlockedStages": [
    { "stageNumber": 1, "txHash": "0x...", "paidAt": "2024-01-01T00:00:00Z" }
  ],
  "isCourseComplete": false
}
```

> **txHash**: Stages with completed blockchain recording include the transaction hash.
> If `null`, the blockchain recording is pending or disabled (`KITE_ENABLED=false`).

> **unlockedStages**: List of stages where Kite payment is complete. Used to restore unlock state on page refresh.

GET /api/progress/:userId
Returns an array of progress for all papers.

## WebSocket Protocol

Connection:
- HTTP: `ws://[BASE_URL]/ws?sessionId=[SESSION_ID]`
- HTTPS: `wss://[BASE_URL]/ws?sessionId=[SESSION_ID]`

### Client -> Server Messages
```typescript
// Terminal input
{ type: 'input', data: string }

// Terminal resize
{ type: 'resize', cols: number, rows: number }

// Heartbeat
{ type: 'ping' }
```

### Server -> Client Messages
```typescript
// Terminal output (raw text, not JSON)
"Claude Code output..."

// Heartbeat response
{ type: 'pong' }

// Autonomous learning start notification (automatically emitted in claudeMdUrl sessions)
{ type: 'auto_start' }

// Stage payment confirmation (lock released)
{ type: 'stage_unlocked', stageNumber: number, txHash: string }

// Stage completion event (sent immediately after SQLite save)
{ type: 'stage_complete', stageNumber: number }

// Course (paper) full completion event
{ type: 'course_complete' }
```

#### 2-Phase Event Flow

Events are sent in two phases during stage progression:

1. **`stage_unlocked`** — x402 payment complete, lock released. When Claude Code performs x402 payment via Kite Passport MCP, the `[PAYMENT_CONFIRMED:N:txHash]` marker is detected and this event is sent. The frontend activates the stage on this event. The `txHash` can be used to display a Kite block explorer link.
2. **`stage_complete`** — Learning complete. Emitted immediately after the backend detects the `[STAGE_COMPLETE:N]` marker and saves it to SQLite. The frontend updates the UI immediately on this event (e.g., marking stage as complete on the dungeon map).

> **Autonomous learning mode**: When a session is created with `claudeMdUrl`, Claude automatically begins exploring the paper.
> If the user has no input for 2 minutes, Claude autonomously explores the next content.
> When the frontend receives the `auto_start` event, it can close the loading UI and switch to an "AI is exploring" state.

Message parsing strategy: Try JSON.parse() -> if successful, handle as event; if failed, treat as terminal output.

## xterm.js Integration Example

> When using in Next.js, the `'use client'` directive is required.

```typescript
'use client';

import 'xterm/css/xterm.css'; // xterm.js CSS required import

// session.ts adapter example
const baseUrl = process.env.NEXT_PUBLIC_TERMINAL_API_URL || 'http://localhost:31000';

// 1. Create session
const res = await fetch(`${baseUrl}/api/sessions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ claudeMdUrl, userId }),
});
const { sessionId, podReused } = await res.json();

// Branch loading UX based on podReused
// podReused === true  -> Existing Pod reused, instant connection
// podReused === false -> New Pod creation + CLAUDE.md fetch, 5-15 second wait

// 2. Query stages
const stages = await fetch(`${baseUrl}/api/sessions/${sessionId}/stages`).then(r => r.json());

// 3. xterm.js + WebSocket connection (XtermTerminal component example)
const { Terminal } = await import('xterm');
const { FitAddon } = await import('@xterm/addon-fit');

const term = new Terminal({ cursorBlink: true, fontFamily: 'monospace' });
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.open(containerElement);
fitAddon.fit();

// Auto-convert http -> ws, https -> wss
const wsUrl = baseUrl.replace(/^https/, 'wss').replace(/^http/, 'ws');
const ws = new WebSocket(`${wsUrl}/ws?sessionId=${sessionId}`);

// Terminal output + event handling
ws.onmessage = (event) => {
  const data = event.data;
  try {
    const msg = JSON.parse(data);
    if (msg.type === 'auto_start') {
      // -> Close loading UI + show "AI is exploring the paper..."
      // -> Claude automatically starts reading and analyzing files
    }
    if (msg.type === 'stage_unlocked') {
      // -> Lock release animation
      // -> Display Kite block explorer link using msg.txHash
      //   e.g., `https://testnet.kitescan.ai/tx/${msg.txHash}`
      // -> Activate stage msg.stageNumber
    }
    if (msg.type === 'stage_complete') {
      // -> Immediately update UI (mark stage as complete on dungeon map)
    }
    if (msg.type === 'course_complete') {
      // -> Show congratulations screen (collect txHash from all stages to generate certificate)
    }
    // Ignore pong
  } catch {
    term.write(data); // Raw terminal output
  }
};

// Terminal input -> server
term.onData((data) => {
  ws.send(JSON.stringify({ type: 'input', data }));
});

// Resize
window.addEventListener('resize', () => {
  fitAddon.fit();
  ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
});
```

## Session Lifecycle

```
1. Page entry -> POST /api/sessions { claudeMdUrl, userId }
   - First visit: Pod creation + CLAUDE.md fetch ~ 5-15 sec (podReused: false)
   - Reconnect: Existing Pod reused ~ 1-2 sec (podReused: true)
2. Once sessionId, courseId received -> GET /api/sessions/:id/stages
3. GET /api/progress/:userId/:courseId -> Restore previous payment state from unlockedStages
4. WebSocket connection
5. Receive stage_unlocked event -> Release stage lock (x402 payment complete, includes txHash)
6. User learning (conversation with Claude Code)
7. Receive stage_complete event -> Immediately update UI (mark learning complete)
8. Receive course_complete event -> Handle course clear
10. Page exit -> DELETE /api/sessions/:id (clean up session, Pod is preserved)
11. Enter another paper -> Repeat from step 1 (same Pod, different claudeMdUrl + courseId)
```

## Progress Saving

The backend automatically performs the following when it detects markers in Claude's output:

- `[PAYMENT_CONFIRMED:N:txHash]` -> Records payment in SQLite `stage_payments` -> Sends `stage_unlocked` event
- `[STAGE_COMPLETE:N]` -> Records learning completion in SQLite `stage_completions` -> Sends `stage_complete` event
- `[DUNGEON_COMPLETE]` -> Records course completion in SQLite `course_completions` -> Sends `course_complete` event

**The frontend does not call payment/blockchain directly.** Claude Code autonomously performs x402 payments via Kite Passport MCP, and the backend detects markers to manage state.

Recommended userId: Kite AA wallet address (0xABC...)
- Using a wallet address as userId allows payment records and progress to be queried with the same key.

Restoring previous progress:
```typescript
// Load previous state via progress API, then pass resumeStage when creating a new session
const progress = await fetch(`${baseUrl}/api/progress/${userId}/${courseId}`).then(r => r.json());
const lastStage = progress.completedStages.at(-1)?.stageNumber ?? 0;
const { sessionId, courseId } = await createSession({ claudeMdUrl, userId, resumeStage: lastStage });
```

## Progress API Details

```
GET /api/progress/:userId/:courseId
```

Response:
```json
{
  "completedStages": [
    { "stageNumber": 1, "completedAt": "2024-01-01T00:00:00Z", "txHash": "0x..." },
    { "stageNumber": 2, "completedAt": "2024-01-01T00:05:00Z", "txHash": null }
  ],
  "unlockedStages": [
    { "stageNumber": 1, "txHash": "0x...", "paidAt": "2024-01-01T00:00:00Z" },
    { "stageNumber": 2, "txHash": "0x...", "paidAt": "2024-01-01T00:04:00Z" }
  ],
  "isCourseComplete": false
}
```

- `completedStages`: List of stages where learning is complete. `txHash` is the on-chain transaction returned by the x402 facilitator.
- `unlockedStages`: List of stages unlocked via x402 payment. Used to restore lock release state on page refresh.
- Block explorer: `https://testnet.kitescan.ai/tx/${txHash}`

## x402 Payment Flow

Claude Code autonomously performs payments via the x402 protocol through Kite Passport MCP. **The frontend does not handle payments directly.**

```
Claude Code (inside Pod)
  -> Calls backend /api/x402/unlock-stage via curl
  -> Receives HTTP 402 response (with payment requirements)
  -> Kite Passport MCP: get_payer_addr -> approve_payment
  -> Retries request with X-PAYMENT header
  -> Backend: facilitator verify/settle -> on-chain settlement
  -> Backend: records in stage_payments DB -> returns txHash
  -> Claude Code: outputs [PAYMENT_CONFIRMED:N:txHash] marker to stdout
  -> terminal-bridge: detects marker -> sends stage_unlocked event
  -> Frontend: UI update (lock released)
```

- Payment method: Kite testnet Test USDT (AA wallet, Privy-based)
- The frontend only receives the `stage_unlocked` event to update the UI.
- On page refresh, unlock state is restored from `GET /api/progress/:userId/:courseId` `unlockedStages`.
- Payment txHash can be verified at `https://testnet.kitescan.ai/tx/${txHash}`.

## Backend Environment Variables Reference

Not used directly by the frontend, but useful for deployment/debugging:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Backend service port |
| `SESSION_TIMEOUT_SECONDS` | `7200` | Session timeout (seconds) |
| `MAX_SESSIONS` | `4` | Maximum concurrent sessions |
| `DB_PATH` | `/data/progress.db` | SQLite progress DB path |
| `SANDBOX_IMAGE` | `claudecode-sandbox:latest` | Sandbox container image |
| `SANDBOX_NAMESPACE` | `claudecode-terminal` | K8s namespace |
| `POD_CPU_REQUEST` / `POD_CPU_LIMIT` | `250m` / `2` | Pod CPU resources |
| `POD_MEMORY_REQUEST` / `POD_MEMORY_LIMIT` | `512Mi` / `4Gi` | Pod memory resources |
| `X402_MERCHANT_WALLET` | - | Payment receiving wallet address (x402 disabled if unset) |
| `X402_STAGE_PRICE` | `100000` | Price per stage (Test USDT, 6 decimals) |
| `X402_FACILITATOR_URL` | `https://facilitator.pieverse.io` | x402 facilitator URL |
| `KITE_MERCHANT_WALLET` | - | Pod env var: merchant address for Claude Code payments |

## Required npm Packages (Frontend)
```bash
npm install xterm @xterm/addon-fit @xterm/addon-web-links
```
