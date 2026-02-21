# Lessons Learned — Hedera Agent Marketplace Demo

> Technical lessons from 5 demo iterations.
> Most relate to undocumented runtime behavior of the Hedera SDK.

---

## 1. Hedera Client Instance Isolation (Critical)

**Problem**: `TopicMessageQuery.subscribe()` gRPC subscription silently stops receiving messages.
No error logs — only the subscription start log appears, then no events arrive.

**Cause**: Sharing the server's `ctx.client` (used for consensus transactions) with mirror node gRPC subscriptions.
When the same `Client` instance is used for both `TopicMessageSubmitTransaction` (consensus) and `TopicMessageQuery.subscribe()` (mirror node) simultaneously,
the gRPC subscription silently conflicts and stops receiving messages.

**Solution**:
```typescript
// ❌ Shared Client — subscription goes silent
const handle = new TopicMessageQuery()
  .setTopicId(topicId)
  .subscribe(ctx.client, errorHandler, messageHandler);

// ✅ Separate Client instance — works correctly
const mirrorClient = Client.forTestnet().setOperator(
  ctx.operatorId,
  ctx.operatorKey,
);
const handle = new TopicMessageQuery()
  .setTopicId(topicId)
  .subscribe(mirrorClient, errorHandler, messageHandler);
```

**Lesson**: Consensus node transactions and mirror node gRPC subscriptions in the Hedera SDK must use separate `Client` instances.
This constraint is not documented in the SDK docs, making it hard to debug — the symptom is "silence", not an error.

**File**: `src/embedded-watcher.ts` (lines 163-169)

---

## 2. TopicMessageQuery Past Message Replay (High)

**Problem**: On watcher startup, all past messages (170+) from the topic are replayed, causing agents to react to `course_request` events from previous sessions.

**Cause**: `TopicMessageQuery` replays all messages from topic creation by default.
With shared topics (multiple sessions using the same topic), messages from all previous sessions are received.

**Solution**:
```typescript
// Only receive messages from 5 seconds ago (5s buffer: prevents missing messages published right after watcher start)
const startTime = Timestamp.fromDate(new Date(Date.now() - 5_000));

new TopicMessageQuery()
  .setTopicId(topicId)
  .setStartTime(startTime)  // This is the key
  .subscribe(mirrorClient, errorHandler, messageHandler);
```

**Lesson**: `setStartTime()` is essential for real-time event processing. Omitting it replays the entire message history.
The 5-second buffer resolves timing issues between watcher startup and the first message publication.

**File**: `src/embedded-watcher.ts` (lines 171-177)

---

## 3. Blocking CLI and spawn + Timer Pattern (High)

**Problem**: `execFile('openclaw', ['agent', ...], callback)` — callback never fires.
The agent process never terminates, permanently locking the in-flight slot.

**Cause**: The `openclaw agent` CLI blocks until the agent task fully completes (internally: LLM call + HCS publish + wait).
`execFile` waits for process exit, so the callback fires after tens of minutes or times out.

**Solution**:
```typescript
// spawn + stdio: 'ignore' — detach process and discard output
const child = spawn('openclaw', ['agent', '--agent', agent, '--message', prompt], {
  stdio: 'ignore',
});

// Timer-based slot release — release slot when agent has likely published to HCS (~45s)
const timer = setTimeout(() => releaseSlot(agent, 'timer'), SLOT_RELEASE_MS);

// If process exits before timer, release immediately
child.on('exit', (code) => {
  clearTimeout(timer);
  releaseSlot(agent, `exit:${code}`);
});
```

**Lesson**: For async handling of blocking CLIs, use `spawn` + timer-based slot release instead of `execFile`.
Since the agent's "logical completion" (publishes to HCS) and "physical completion" (process exit) can differ,
a dual strategy works best: timer (~45s) estimates logical completion, process exit confirms physical completion.

**File**: `src/embedded-watcher.ts` (lines 107-124), `src/hcs-watcher.ts` (lines 94-110)

---

## 4. Hedera Timestamp Formats (Medium)

**Problem**: Dashboard shows "Invalid Date" for bid and deliverable timestamps.

**Cause**: Hedera Mirror Node returns timestamps as `"1708342567.123456789"` (seconds.nanoseconds) strings.
JavaScript `new Date("1708342567.123456789")` cannot parse this format.

**Solution**:
```javascript
function fmtTime(ts) {
  if (!ts) return '';
  // Detect Hedera format: "seconds.nanoseconds" (digits.digits)
  var d = (typeof ts === 'string' && /^\d+\.\d+$/.test(ts))
    ? new Date(parseFloat(ts) * 1000)  // seconds to milliseconds
    : new Date(ts);                     // ISO string, etc.
  return isNaN(d.getTime()) ? '' : d.toLocaleTimeString();
}
```

**Lesson**: Timestamp formats vary across the Hedera ecosystem:
- **SDK transaction results** → ISO strings (`"2024-02-19T..."`)
- **Mirror Node REST API** → `"seconds.nanoseconds"` strings
- **gRPC messages** → `Timestamp` objects (`.seconds`, `.nanos` fields)

Clients need defensive parsing that handles all formats.

**File**: `public/index.html` (fmtTime function), `public/monitor.html` (timestamp parsing)

---

## 5. HCS Chunk Reassembly: gRPC vs REST API (Medium)

**Problem**: Agent deliverables exceeding 1024 bytes are automatically chunked by HCS.
Reading via REST API returns individual chunks, causing JSON parse failures.

**gRPC Subscription (TopicMessageQuery)**:
The SDK automatically reassembles chunks and delivers the complete message to the callback. No additional handling needed.

**Mirror Node REST API**:
Individual chunks are returned as separate messages. Manual reassembly is required by grouping on `initial_transaction_id`.

```typescript
// REST API chunk reassembly (hcs-poller.ts)
const grouped = messages.reduce((acc, msg) => {
  const key = msg.initial_transaction_id || msg.consensus_timestamp;
  (acc[key] = acc[key] || []).push(msg);
  return acc;
}, {});

for (const chunks of Object.values(grouped)) {
  const full = chunks.sort((a, b) => a.sequence_number - b.sequence_number)
    .map(c => Buffer.from(c.message, 'base64').toString())
    .join('');
  // full is the complete JSON
}
```

**Lesson**: gRPC subscriptions (with automatic reassembly) are far superior for real-time event processing.
REST API polling requires additional chunk reassembly logic and risks receiving incomplete chunks between polling intervals.

**File**: `src/embedded-watcher.ts` (gRPC), `src/openclaw/hcs-poller.ts` (REST API)

---

## 6. Embedded Watcher vs Standalone Process (Architecture)

**Decision**: Switched from standalone process (`hcs-watcher.ts`) to server-embedded (`embedded-watcher.ts`).

**Standalone process issues**:
- Race condition between topic creation and watcher start (misses first `course_request`)
- Topic ID must be passed as CLI argument, making automation difficult
- Requires managing a separate process alongside the server

**Embedded watcher benefits**:
- Call `startEmbeddedWatcher()` immediately after topic creation → no race condition
- Watcher logs can be integrated into SSE feed
- Per-session state isolation (dedup, cooldown are independent per session)
- Single process simplifies management

**Trade-off**: Server process becomes heavier, but operational simplicity matters more at the demo/prototype stage.
In production, the watcher should be separated into its own microservice.

**File**: `src/embedded-watcher.ts`, `src/server.ts` (called from SSE handler)

---

## 7. Agent Dispatch Safety Layers (Engineering)

To prevent duplicate agent triggers and excessive LLM calls during demos, a 4-layer protection system was implemented:

| Layer | Mechanism | Purpose |
|-------|-----------|---------|
| Dedup | `Set<number>` (sequence number) | Prevents duplicate processing from gRPC redelivery |
| Cooldown | 30s per agent | Prevents excessive LLM calls from rapid messages |
| In-flight | 1 concurrent per agent | Prevents conflicts from parallel execution |
| Queue | 1 per agent (keeps latest only) | Prevents message loss while agent is in-flight |

**Lesson**: gRPC subscriptions provide at-least-once delivery, so duplicate messages are possible.
Application-level idempotency is required, and especially for expensive operations like LLM calls,
multiple layers of protection are necessary.

---

## Summary

| # | Lesson | Severity | Discovered |
|---|--------|----------|------------|
| 1 | Client instance isolation (consensus vs mirror node) | Critical | Demo Run 4 |
| 2 | TopicMessageQuery.setStartTime() is required | High | Before Demo Run 5 |
| 3 | Blocking CLI → spawn + timer pattern | High | Demo Run 3 |
| 4 | Hedera timestamp format diversity | Medium | Demo Run 5 |
| 5 | gRPC auto chunk reassembly vs REST API manual reassembly | Medium | Demo Run 2 |
| 6 | Embedded watcher resolves race condition | Architecture | Demo Run 4 |
| 7 | 4-layer dispatch safety system | Engineering | Throughout |
