# Stage 1 구현 계획 — 고칠 인텐트 찾기 + 노션 Task 생성

> 전체 스펙은 `./fix-intent-5min-plan.md` 참조. 이 문서는 Stage 1 한정 실행 계획.

## 서브스텝

Stage 1 내부는 아래 순서로 상태 전이:

1. `dashboard-set` — 현재 세트의 테이블 표시, 행 클릭 대기
2. `dashboard-feedback` — 맞/틀 모달 표시 (정답 시 다음 세트 or 다음 스텝)
3. `representative-select` — N세트 완료 후 대표 인텐트 선택 화면
4. `notion-landing` — 노션 Agent&Intent 페이지 (새로 만들기 버튼 대기)
5. `notion-task-page` — 새 Task 페이지, 필드 순차 입력 (Agent → 제목 → Assignee → Status → Season → 문제 상황 분석)
6. `stage-complete` — Stage 1 완료 → stage_complete 이벤트 기록 + Stage 2 진입

상단 `StageProgressBar`에서는 Stage 1을 한 단위로만 표시. 서브스텝은 내부 상태로만 관리.

## 파일 작업 계획

### 신규

| 파일 | 역할 |
|---|---|
| `src/components/learn/interactive/fix-intent-5min/IntentFixCourse.tsx` | 이 코스 최상위 컴포넌트. 서브스텝 state machine |
| `src/components/learn/interactive/fix-intent-5min/DashboardView.tsx` | Metabase 테이블 클론 |
| `src/components/learn/interactive/fix-intent-5min/FeedbackModal.tsx` | 맞/틀 모달 |
| `src/components/learn/interactive/fix-intent-5min/RepresentativeSelect.tsx` | 대표 인텐트 선택 |
| `src/components/learn/interactive/fix-intent-5min/NotionLanding.tsx` | Agent&Intent 페이지 목업 |
| `src/components/learn/interactive/fix-intent-5min/NotionTaskPage.tsx` | 새 Task 페이지 + 필드 입력 |
| `src/components/learn/interactive/fix-intent-5min/fields/` | Agent/Title/Assignee/Status/Season/ProblemAnalysis 각 필드 컴포넌트 |
| `src/components/learn/interactive/shared/InteractiveLayout.tsx` | 좌: 인터랙션 영역, 우: 기존 터미널 유지하는 레이아웃 |
| `src/data/courses/fix-intent-5min/chat-log-sets.ts` | Stage 1 세트 목데이터 |
| `src/data/courses/fix-intent-5min/notion-options.ts` | 드롭다운 선택지 + 정답 |
| `src/lib/courses/fix-intent-5min/course-state.ts` | `courseState` 타입/초기값/업데이트 헬퍼 |
| `src/lib/courses/fix-intent-5min/storage.ts` | 블록체인 GET/SET, localStorage 드래프트 |
| `src/app/api/courses/fix-intent-5min/state/route.ts` | `courseState` GET/POST (서버 프록시) |
| `src/app/api/courses/fix-intent-5min/validate/route.ts` | LLM 검증 스텁 (하드코딩 pass) |

### 수정

| 파일 | 변경 |
|---|---|
| `src/app/learn/[...paperId]/page.tsx` | paperId 매칭 시 `IntentFixCourse`로 분기, Canvas 대체 |

## 목데이터 최소 스키마

### `chat-log-sets.ts`
```ts
export type ChatLogRow = {
  sessionId: string;
  createdAt: string;
  intent: string;
  userMessage: string;
  assistantContent: string;
  isBroken: boolean; // 정답 플래그
};

export type ChatLogSet = {
  setId: string;
  title: string;         // 세트 설명
  rows: ChatLogRow[];    // 1 isBroken + N
};

export const chatLogSets: ChatLogSet[] = [/* 유저 제공 전 플레이스홀더 N=1 */];
```

### `notion-options.ts`
```ts
export const agentOptions = ['궁금하냥', /* 오답 */];
export const agentAnswer = '궁금하냥';
export const assigneeOptions = [/* 유저 플레이스홀더 */];
export const assigneeAnswer = /* 플레이스홀더 */;
export const seasonOptions = [/* 시즌 N */];
export const seasonAnswer = /* 현재 시즌 */;
export const statusOptions = ['Todo', 'In progress', 'Done'];
export const statusAnswer = 'In progress';
```

## 상태/저장 흐름

1. 컴포넌트 mount 시 `storage.loadCourseState()` → 블록체인에서 기존 blob 조회
2. 없으면 초기 blob(`initialCourseState`)로 시작, 있으면 이어서
3. 서브스텝 전이 / 필드 pass 시:
   - `courseState` 업데이트
   - `storage.saveCourseState()` 호출 (서버 API → 블록체인 쓰기)
   - 실패 시 에러 표시 + 재시도
4. 타이핑 중인 드래프트는 localStorage (`courseState:draft:{fieldId}`) → pass 후 제거

## LLM 검증 호출 흐름

- 자유 입력 필드(제목, 문제 상황 분석) 엔터 시 `/api/courses/fix-intent-5min/validate` POST
- Request body:
  ```json
  { "fieldId": "title", "value": "...", "context": { "representativeIntent": {...} } }
  ```
- 1차: 무조건 `{ pass: true }`
- 2차: 실제 LLM 호출

## 완료 기준

- Stage 1의 서브스텝 6단계를 끝까지 통과 가능
- 통과 시 기존 stage_complete 이벤트 기록 (기존 `record-exploration` 또는 동등 로직 재사용)
- 재진입 시 마지막 pass 지점 이후부터 이어서 시작
- 목데이터 N=1 기준으로 end-to-end 동작 확인

## 구현 순서 (이 Stage 내)

1. 레이아웃 + 렌더러 분기 뼈대 (빈 `IntentFixCourse`)
2. 목데이터 플레이스홀더 + 타입
3. `DashboardView` 테이블 + 행 클릭 이벤트
4. `FeedbackModal` + 세트 진행 로직
5. `RepresentativeSelect`
6. `NotionLanding` + `NotionTaskPage` 구조
7. 필드 컴포넌트 6종 + 엔터 검증
8. LLM 엔드포인트 스텁
9. `courseState` 저장/복원 연동 + stage_complete 기록

각 스텝마다 빌드/타입 체크 후 유저에게 동작 확인 요청.
