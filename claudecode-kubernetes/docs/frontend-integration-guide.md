# 프론트엔드 통합 가이드

## 개요
Papers with Claude Code 플랫폼의 웹 터미널 백엔드와 연동하기 위한 API 명세서입니다.

## 베이스 URL

현재 데모 서버 (포트포워딩 활성):
```
NEXT_PUBLIC_TERMINAL_API_URL=http://101.202.37.120:31000
```

> **참고**: 공개 배포 시 도메인/Cloudflare 터널 등으로 교체 필요.
> HTTPS 환경이라면 WebSocket 연결도 `wss://`를 사용해야 합니다 (아래 WS 연결 예시 참고).

## REST API

### 세션 생성
POST /api/sessions

Request body:
```json
{
  "repoUrl": "https://github.com/org/paper-repo",  // optional: git clone할 레포
  "userId": "0xABC...",                              // optional: 블록체인 지갑 주소 권장
  "resumeStage": 3                                   // optional: 이전 진행 스테이지부터 재개
}
```

Response:
```json
{
  "sessionId": "uuid",
  "podName": "claude-session-abc12345",
  "status": "running",
  "repoUrl": "https://github.com/...",
  "userId": "0xABC..."
}
```

> **주의**: Pod 생성 + git clone에 **10~30초** 소요됩니다. 로딩 UI를 보여주세요.

### 세션 조회
GET /api/sessions/:id

### 세션 삭제
DELETE /api/sessions/:id  (204 No Content)

페이지 언마운트 시 반드시 호출하여 Pod 정리 (`useEffect` cleanup에서 호출 권장)

### 스테이지 정의 조회
GET /api/sessions/:id/stages

레포의 CLAUDE.md에서 JSON 블록을 파싱하여 StageConfig[] 반환.
repoUrl 없이 생성된 세션은 빈 배열 반환.

Response: StageConfig[] (frontend/src/types/learning.ts의 타입과 동일)

### 진행도 조회
GET /api/progress/:userId/:paperId

**paperId = repoUrl**: 진행도는 `repoUrl` 값을 paperId 키로 저장합니다.
세션 생성 시 사용한 `repoUrl`을 그대로 URL 인코딩하여 사용하세요.

```
GET /api/progress/0xABC.../https%3A%2F%2Fgithub.com%2Forg%2Fpaper-repo
```

Response:
```json
{
  "completedStages": [1, 2, 3],
  "isCourseComplete": false
}
```

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

// 자율 학습 시작 알림 (repoUrl 세션에서 자동 발생)
{ type: 'auto_start' }

// 스테이지 완료 이벤트
{ type: 'stage_complete', stageNumber: number }

// 코스(논문) 전체 완료 이벤트
{ type: 'course_complete' }
```

> **자율 학습 모드**: `repoUrl`을 포함하여 세션을 생성하면, 4초 후 Claude가 자동으로 논문 탐구를 시작합니다.
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
  body: JSON.stringify({ repoUrl, userId }),
});
const { sessionId } = await res.json();

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
    if (msg.type === 'stage_complete') {
      // → Zustand store의 completeStage(msg.stageNumber) 호출
      // → 던전 UI 업데이트 (문 열림)
      // → 블록체인에 업적 저장
    }
    if (msg.type === 'course_complete') {
      // → 축하 화면 표시
      // → 블록체인에 코스 클리어 저장
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
1. 페이지 진입 → POST /api/sessions { repoUrl, userId }
   (Pod 생성 + git clone ≈ 10-30초)
2. sessionId 받으면 → GET /api/sessions/:id/stages
3. WebSocket 연결
4. 사용자 학습 (Claude Code와 대화)
5. stage_complete 이벤트 수신 → 코스 UI 업데이트 + 블록체인 저장
6. course_complete 이벤트 수신 → 클리어 처리
7. 페이지 이탈 → DELETE /api/sessions/:id (반드시 호출)
```

## 진행도 및 블록체인 연동

백엔드는 해커톤 데모용으로 **SQLite에 진행도를 저장**합니다 (폴백).
최종 목표는 블록체인(AIN) 저장이며, 백엔드 DB는 이중 저장 용도로 유지됩니다.

권장 userId: 블록체인 지갑 주소 (0xABC...)
- userId로 지갑 주소를 사용하면 백엔드 DB와 블록체인이 동일한 키로 조회 가능
- 블록체인 전환 시 백엔드 DB는 폴백으로 유지

이전 진행 복원:
```typescript
// 블록체인에서 진행도 로드 후 새 세션 생성 시 resumeStage 전달
const progress = await loadFromBlockchain(userId, repoUrl); // paperId = repoUrl
const { sessionId } = await createSession({ repoUrl, userId, resumeStage: progress.lastStage });
```

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

## 필요한 npm 패키지 (프론트엔드)
```bash
npm install xterm @xterm/addon-fit @xterm/addon-web-links
```
