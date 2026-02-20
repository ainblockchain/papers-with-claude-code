# 프론트엔드 통합 가이드

## 개요
Papers with Claude Code 플랫폼의 웹 터미널 백엔드와 연동하기 위한 API 명세서입니다.

## 베이스 URL

현재 데모 서버 (포트포워딩 활성):
```
NEXT_PUBLIC_TERMINAL_API_URL=http://<PUBLIC_IP>:31000
```

> **참고**: 공개 배포 시 도메인/Cloudflare 터널 등으로 교체 필요.
> HTTPS 환경이라면 WebSocket 연결도 `wss://`를 사용해야 합니다 (아래 WS 연결 예시 참고).

## REST API

### 세션 생성
POST /api/sessions

Request body:
```json
{
  "claudeMdUrl": "https://raw.githubusercontent.com/.../attention-is-all-you-need/beginner/CLAUDE.md",
  "userId": "0xABC...",       // optional: Kite AA 지갑 주소 권장
  "resumeStage": 3            // optional: 이전 진행 스테이지부터 재개
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

> **courseId**: `claudeMdUrl`에서 백엔드가 자동 파생합니다. 프론트엔드가 별도로 보낼 필요 없습니다.
> GitHub raw URL의 경우 `{owner}/{repo}/{branch}/` 이후의 경로를 하이픈으로 연결합니다.
> 진행도 조회 등에서 이 값을 사용합니다.

> **podReused**: `true`이면 기존 Pod을 재사용한 것이므로 응답이 즉시 옵니다.
> `false`(첫 접속)일 때만 Pod 생성 + CLAUDE.md fetch에 **5~15초** 소요됩니다.

### 세션 조회
GET /api/sessions/:id

### 세션 삭제
DELETE /api/sessions/:id  (204 No Content)

> **중요**: 세션 삭제는 세션 레코드만 제거합니다. **Pod은 유지**됩니다.
> 같은 유저가 다시 접속하면 기존 Pod을 재사용하여 즉시 연결됩니다.
> 페이지 언마운트 시 호출 권장 (`useEffect` cleanup).

### 스테이지 정의 조회
GET /api/sessions/:id/stages

레포의 CLAUDE.md에서 JSON 블록을 파싱하여 StageConfig[] 반환.
claudeMdUrl 없이 생성된 세션은 빈 배열 반환.

Response: StageConfig[] (frontend/src/types/learning.ts의 타입과 동일)

### 진행도 조회
GET /api/progress/:userId/:courseId

**courseId**: 세션 생성 응답의 `courseId` 값을 사용합니다 (claudeMdUrl에서 자동 추출됨).

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

> **txHash**: 블록체인 기록이 완료된 스테이지는 트랜잭션 해시가 포함됩니다.
> `null`인 경우 블록체인 기록이 대기 중이거나 비활성화(`KITE_ENABLED=false`)된 상태입니다.

> **unlockedStages**: Kite 결제가 완료된 스테이지 목록입니다. 새로고침 시 이 데이터로 해금 상태를 복원합니다.

GET /api/progress/:userId
모든 논문의 진행도 배열 반환

## WebSocket 프로토콜

연결:
- HTTP 환경: `ws://[BASE_URL]/ws?sessionId=[SESSION_ID]`
- HTTPS 환경: `wss://[BASE_URL]/ws?sessionId=[SESSION_ID]`

### 클라이언트 → 서버 메시지
```typescript
// 터미널 입력
{ type: 'input', data: string }

// 터미널 리사이즈
{ type: 'resize', cols: number, rows: number }

// 하트비트
{ type: 'ping' }
```

### 서버 → 클라이언트 메시지
```typescript
// 터미널 출력 (raw text, not JSON)
"Claude Code output..."

// 하트비트 응답
{ type: 'pong' }

// 자율 학습 시작 알림 (claudeMdUrl 세션에서 자동 발생)
{ type: 'auto_start' }

// 스테이지 결제 확인 (자물쇠 해제)
{ type: 'stage_unlocked', stageNumber: number, txHash: string }

// 스테이지 완료 이벤트 (SQLite 저장 완료 즉시 전송)
{ type: 'stage_complete', stageNumber: number }

// 코스(논문) 전체 완료 이벤트
{ type: 'course_complete' }
```

#### 2-Phase 이벤트 흐름

스테이지 진행 시 두 단계로 이벤트가 전송됩니다:

1. **`stage_unlocked`** — x402 결제 완료, 자물쇠 해제. Claude Code가 Kite Passport MCP를 통해 x402 결제를 수행하면 `[PAYMENT_CONFIRMED:N:txHash]` 마커를 감지하여 전송합니다. 프론트엔드는 이 이벤트로 스테이지를 활성화합니다. `txHash`로 Kite 블록 익스플로러 링크를 표시할 수 있습니다.
2. **`stage_complete`** — 학습 완료. 백엔드가 `[STAGE_COMPLETE:N]` 마커를 감지하고 SQLite에 저장한 직후 발생합니다. 프론트엔드는 이 이벤트로 UI를 즉시 업데이트합니다 (던전 맵에서 스테이지 완료 표시 등).

> **자율 학습 모드**: `claudeMdUrl`을 포함하여 세션을 생성하면, Claude가 자동으로 논문 탐구를 시작합니다.
> 유저가 2분간 입력이 없으면 Claude가 자율적으로 다음 내용을 탐구합니다.
> 프론트엔드에서 `auto_start` 이벤트를 수신하면 로딩 UI를 닫고 "AI가 탐구 중" 상태로 전환할 수 있습니다.

메시지 파싱 전략: JSON.parse() 시도 → 성공하면 이벤트 처리, 실패하면 터미널 출력

## xterm.js 연동 예시

> Next.js에서 사용 시 `'use client'` 디렉티브가 필요합니다.

```typescript
'use client';

import 'xterm/css/xterm.css'; // xterm.js CSS 필수 import

// session.ts adapter 예시
const baseUrl = process.env.NEXT_PUBLIC_TERMINAL_API_URL || 'http://localhost:31000';

// 1. 세션 생성
const res = await fetch(`${baseUrl}/api/sessions`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ claudeMdUrl, userId }),
});
const { sessionId, podReused } = await res.json();

// podReused에 따라 로딩 UX 분기 가능
// podReused === true  → 기존 Pod 재사용, 즉시 연결
// podReused === false → 새 Pod 생성 + CLAUDE.md fetch, 5~15초 대기

// 2. 스테이지 조회
const stages = await fetch(`${baseUrl}/api/sessions/${sessionId}/stages`).then(r => r.json());

// 3. xterm.js + WebSocket 연결 (XtermTerminal 컴포넌트 예시)
const { Terminal } = await import('xterm');
const { FitAddon } = await import('@xterm/addon-fit');

const term = new Terminal({ cursorBlink: true, fontFamily: 'monospace' });
const fitAddon = new FitAddon();
term.loadAddon(fitAddon);
term.open(containerElement);
fitAddon.fit();

// http → ws, https → wss 자동 변환
const wsUrl = baseUrl.replace(/^https/, 'wss').replace(/^http/, 'ws');
const ws = new WebSocket(`${wsUrl}/ws?sessionId=${sessionId}`);

// 터미널 출력 + 이벤트 처리
ws.onmessage = (event) => {
  const data = event.data;
  try {
    const msg = JSON.parse(data);
    if (msg.type === 'auto_start') {
      // → 로딩 UI 닫기 + "AI가 논문을 탐구하고 있습니다..." 표시
      // → Claude가 자동으로 파일을 읽고 분석하기 시작함
    }
    if (msg.type === 'stage_unlocked') {
      // → 자물쇠 해제 애니메이션
      // → msg.txHash로 Kite 블록 익스플로러 링크 표시
      //   e.g., `https://testnet.kitescan.ai/tx/${msg.txHash}`
      // → msg.stageNumber 스테이지 활성화
    }
    if (msg.type === 'stage_complete') {
      // → 즉시 UI 업데이트 (던전 맵에서 스테이지 완료 표시)
    }
    if (msg.type === 'course_complete') {
      // → 축하 화면 표시 (모든 스테이지의 txHash 수집하여 증명서 생성 가능)
    }
    // pong은 무시
  } catch {
    term.write(data); // raw 터미널 출력
  }
};

// 터미널 입력 → 서버
term.onData((data) => {
  ws.send(JSON.stringify({ type: 'input', data }));
});

// 리사이즈
window.addEventListener('resize', () => {
  fitAddon.fit();
  ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }));
});
```

## 세션 라이프사이클

```
1. 페이지 진입 → POST /api/sessions { claudeMdUrl, userId }
   - 첫 접속: Pod 생성 + CLAUDE.md fetch ≈ 5-15초 (podReused: false)
   - 재접속: 기존 Pod 재사용 ≈ 1-2초 (podReused: true)
2. sessionId, courseId 받으면 → GET /api/sessions/:id/stages
3. GET /api/progress/:userId/:courseId → unlockedStages로 기존 결제 상태 복원
4. WebSocket 연결
5. stage_unlocked 이벤트 수신 → 스테이지 자물쇠 해제 (x402 결제 완료, txHash 포함)
6. 사용자 학습 (Claude Code와 대화)
7. stage_complete 이벤트 수신 → UI 즉시 업데이트 (학습 완료 표시)
8. course_complete 이벤트 수신 → 클리어 처리
10. 페이지 이탈 → DELETE /api/sessions/:id (세션 정리, Pod은 유지)
11. 다른 논문 입장 → 1번부터 반복 (같은 Pod, 다른 claudeMdUrl + courseId)
```

## 진행도 저장

백엔드가 Claude 출력에서 마커를 감지하면 자동으로 다음을 수행합니다:

- `[PAYMENT_CONFIRMED:N:txHash]` → SQLite `stage_payments`에 결제 기록 → `stage_unlocked` 이벤트 전송
- `[STAGE_COMPLETE:N]` → SQLite `stage_completions`에 학습 완료 기록 → `stage_complete` 이벤트 전송
- `[DUNGEON_COMPLETE]` → SQLite `course_completions`에 코스 완료 기록 → `course_complete` 이벤트 전송

**프론트엔드는 결제/블록체인을 직접 호출하지 않습니다.** Claude Code가 Kite Passport MCP를 통해 x402 결제를 자율 수행하고, 백엔드가 마커를 감지하여 상태를 관리합니다.

권장 userId: Kite AA 지갑 주소 (0xABC...)
- userId로 지갑 주소를 사용하면 결제 기록과 진행도가 동일한 키로 조회 가능

이전 진행 복원:
```typescript
// 진행도 API로 이전 상태 로드 후 새 세션 생성 시 resumeStage 전달
const progress = await fetch(`${baseUrl}/api/progress/${userId}/${courseId}`).then(r => r.json());
const lastStage = progress.completedStages.at(-1)?.stageNumber ?? 0;
const { sessionId, courseId } = await createSession({ claudeMdUrl, userId, resumeStage: lastStage });
```

## 진행도 API 상세

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

- `completedStages`: 학습이 완료된 스테이지 목록. `txHash`는 x402 결제 시 facilitator가 반환한 온체인 트랜잭션.
- `unlockedStages`: x402 결제로 해금된 스테이지 목록. 새로고침 시 자물쇠 해제 상태 복원에 사용.
- 블록 익스플로러: `https://testnet.kitescan.ai/tx/${txHash}`

## x402 결제 흐름

Claude Code가 Kite Passport MCP를 통해 x402 프로토콜로 자율 결제를 수행합니다. **프론트엔드는 결제를 직접 처리하지 않습니다.**

```
Claude Code (Pod 내부)
  → curl로 백엔드 /api/x402/unlock-stage 호출
  → HTTP 402 응답 수신 (결제 요구사항 포함)
  → Kite Passport MCP: get_payer_addr → approve_payment
  → X-PAYMENT 헤더와 함께 재요청
  → 백엔드: facilitator verify/settle → 온체인 정산
  → 백엔드: stage_payments DB에 기록 → txHash 반환
  → Claude Code: stdout에 [PAYMENT_CONFIRMED:N:txHash] 마커 출력
  → terminal-bridge: 마커 감지 → stage_unlocked 이벤트 전송
  → 프론트엔드: UI 업데이트 (자물쇠 해제)
```

- 결제 수단: Kite 테스트넷 Test USDT (AA 지갑, Privy 기반)
- 프론트엔드는 `stage_unlocked` 이벤트를 수신하여 UI만 업데이트합니다.
- 새로고침 시 `GET /api/progress/:userId/:courseId`의 `unlockedStages`로 해금 상태를 복원합니다.
- 결제 txHash는 `https://testnet.kitescan.ai/tx/${txHash}`에서 검증 가능합니다.

## 백엔드 환경변수 참고

프론트엔드에서 직접 사용하지 않지만, 배포/디버깅 시 참고할 백엔드 환경변수:

| 변수 | 기본값 | 설명 |
|------|--------|------|
| `PORT` | `3000` | 백엔드 서비스 포트 |
| `SESSION_TIMEOUT_SECONDS` | `7200` | 세션 타임아웃 (초) |
| `MAX_SESSIONS` | `4` | 동시 세션 최대 수 |
| `DB_PATH` | `/data/progress.db` | SQLite 진행도 DB 경로 |
| `SANDBOX_IMAGE` | `claudecode-sandbox:latest` | 샌드박스 컨테이너 이미지 |
| `SANDBOX_NAMESPACE` | `claudecode-terminal` | K8s 네임스페이스 |
| `POD_CPU_REQUEST` / `POD_CPU_LIMIT` | `250m` / `2` | Pod CPU 리소스 |
| `POD_MEMORY_REQUEST` / `POD_MEMORY_LIMIT` | `512Mi` / `4Gi` | Pod 메모리 리소스 |
| `X402_MERCHANT_WALLET` | - | 결제 수신 지갑 주소 (미설정 시 x402 비활성) |
| `X402_STAGE_PRICE` | `100000` | 스테이지당 가격 (Test USDT, 6 decimals) |
| `X402_FACILITATOR_URL` | `https://facilitator.pieverse.io` | x402 facilitator URL |
| `KITE_MERCHANT_WALLET` | - | Pod 환경변수: Claude Code가 결제할 머천트 주소 |

## 필요한 npm 패키지 (프론트엔드)
```bash
npm install xterm @xterm/addon-fit @xterm/addon-web-links
```
