# Fix Intent 5min — 인터랙티브 코스 변환 스펙

## 목적

`curious-nyang-intent-guide--fix-intent-5min` 코스를 "본문 + 객관식" 구조에서 **실제 인텐트 수정 업무 환경을 재현한 시뮬레이션 체험형**으로 변환한다.

## 범위 / 원칙

- 대상 코스: `curious-nyang-intent-guide--fix-intent-5min` 한정
- 레이아웃: 기존 Claude Code 터미널(사이드) 유지
- 플랫폼: 데스크톱 전용 (모바일 미지원)
- 구조적 재사용: 이 코스 전용 컴포넌트로 분기하되, 다른 인터랙티브 코스 확장이 가능하도록 디렉토리/스키마 분리
- 대시보드에서 유저 작성 내용(노션 블록) 열람: 미구현

## 렌더러 분기

`src/app/learn/[...paperId]/page.tsx`에서 `paperId === 'curious-nyang-intent-guide/fix-intent-5min'`일 때 전용 컴포넌트로 분기. 기본 경로(Canvas + ConceptOverlay + QuizOverlay 등)와 병존.

## 스테이지별 사양

### Stage 1 — Metabase 대시보드 클론 + 노션 Task 생성

1. **세트 N개 순차 테스트** — 목데이터로 주어진 세트를 1→N 순서로 진행. 각 세트는 대시보드 테이블 형태(Session ID / Created At / Intent / User:Message / Assistant:Contents).
2. **행 클릭 검증** — 정답 행 클릭 시 "맞습니다" 모달, 오답 행 클릭 시 "틀렸습니다" 모달.
3. **대표 인텐트 선택** — 전 세트 통과 후 N개 중 노션 Task로 기록할 대표 인텐트 1개 선택.
4. **노션 Agent&Intent 페이지 → 새로 만들기** — 실제 노션 레이아웃 클론. "새로 만들기" 클릭 시 신규 Task 페이지 오버레이.
5. **노션 필드 입력(엔터 검증)**
   - Agent: 드롭다운, 정답 일치
   - 제목: 자유 입력, LLM 판정
   - Assignee: 드롭다운, 정답 일치
   - Status: 드롭다운, `In progress` 선택
   - Season: 드롭다운, 정답 일치
   - 문제 상황 분석: 자유 입력, LLM 판정

### Stage 2 — 노션 이어 쓰기: 해결방향 정리

- Stage 1에서 만든 Task 페이지 오버레이 재진입
- "해결방향 정리" 블록 추가 (자유 입력, LLM 판정)

### Stage 3 — Google Sheet 클론(간소화) + 노션: 작업내용

- tab1~5 탭 구조 재현
- 셀 인터랙션은 간소화: 클릭 시 바로 input 전환, 엔터로 확정
- 대표 인텐트별로 정답 셀 위치/값 매핑 (목데이터)
- Custom Scripts → Update 스크립트 실행 시뮬레이션 (버튼 클릭 → 완료 애니메이션)
- 노션 오버레이로 돌아와 "작업내용" 블록 추가 (LLM 판정)

### Stage 4 — Dev 챗봇 클론 + 노션: 결과 + Status Done

- Dev 챗봇 UI 클론
- 입력창에 Stage 1 대표 세트의 `User:Message`가 **미리 채워짐(prefill)**. 엔터 시 고정 응답 표시.
- 응답 확인 후 노션 오버레이 → "결과" 블록 추가 (LLM 판정) + Status를 `Done`으로 변경

## 데이터 저장

### 경로
```
/apps/knowledge/explorations/{address}/{topicKey}/courseState
```
- `topicKey = courses|curious-nyang-intent-guide--fix-intent-5min`
- 기존 write rule `auth.addr === $user_addr` 재활용 (룰 변경 불필요)
- 기존 이벤트 entry(push ID)와 `courseState` 고정 키 공존 — 기존 iteration 코드가 `e.depth` 필터로 blob을 자연 제외

### JSON 스키마
```json
{
  "selectedIntents": [/* 세트별 유저 선택 */],
  "representativeIntent": { /* 대표 인텐트 세트 객체 */ },
  "notion": {
    "agent": null,
    "title": null,
    "assignee": null,
    "status": null,
    "season": null,
    "problemAnalysis": null,
    "solutionDirection": null,
    "workContent": null,
    "result": null
  },
  "sheetEdit": {
    "tab": null,
    "cell": null,
    "value": null
  },
  "chatbotInteraction": {
    "question": null,
    "answer": null
  },
  "updatedAt": 0
}
```

### 쓰기 정책
- 필드 검증 pass 시마다 전체 blob 덮어쓰기
- 쓰기 실패 시 서버 API가 `{ ok: false, error }` 반환 → 클라이언트는 실패 표시 + 재시도 유도
- 드래프트(미검증 타이핑 값)는 localStorage에 저장, 필드 통과 후 제거
- 재진입 시 blob 로드 → 마지막 완료 지점 이후부터 이어서 진행

## LLM 검증 엔드포인트

- 신규 route (예: `/api/courses/fix-intent-5min/validate`)
- Request: `{ fieldId, value, context: { representativeIntent } }`
- Response: `{ pass: boolean, hint?: string }`
- **1차 구현**: 하드코딩 `{ pass: true }` (항상 통과)
- **2차 확장**: 실제 LLM 호출(프롬프트는 `fieldId`별로 분기)

## 목데이터 위치

```
frontend/src/data/courses/fix-intent-5min/
├── chat-log-sets.ts           ← Stage 1 세트 N개
├── notion-options.ts          ← Agent/Assignee/Season 드롭다운 선택지 + 정답
├── sheet-targets.ts           ← Stage 3 대표 인텐트별 정답 셀 매핑
└── chatbot-responses.ts       ← Stage 4 대표 인텐트별 고정 응답
```

세트 개수 N은 유저가 정의한 데이터 기준으로 가변. 타입은 향후 실제 데이터로 교체될 때 변경이 적도록 설계.

## 확장성 고려

- 코스별 전용 컴포넌트 폴더: `frontend/src/components/learn/interactive/fix-intent-5min/`
- 재사용 가능한 프리미티브(모달/노션 페이지 껍데기 등)는 `interactive/shared/`에 둠
- `courseState` JSON 스키마는 코스별로 자유 — 이 코스 외 다른 인터랙티브 코스는 각자 스키마 정의

## 구현 순서 (Stage 1부터 순차)

1. 전용 렌더러 분기 뼈대 + 레이아웃 (터미널 사이드 유지)
2. 목데이터 구조 + 샘플 1세트
3. Metabase 대시보드 클론 UI (테이블)
4. 세트 진행 로직 + 맞/틀 모달
5. 대표 인텐트 선택 UI
6. 노션 페이지 클론 UI + 새 Task 생성 플로우
7. 필드별 입력 + 엔터 검증
8. LLM 엔드포인트 스텁 + 하드코딩 pass
9. `courseState` 저장/복원 연동

Stage 1 완료 후 Stage 2 계획을 추가한다.

## 커밋/푸시 규칙

- 이 프로젝트(frontend): 유저가 커밋/푸시 명시적으로 승인할 때만 진행
- awesome 레포 변경분이 생기면 바로 커밋+푸시

## Open Items

- 각 목데이터의 실제 내용(세트, 드롭다운 선택지, 셀 정답, 챗봇 응답)은 유저가 제공 → 교체 시점까지 플레이스홀더로 진행
- LLM 프롬프트 설계는 2차 확장 시 별도 문서화

## Stage 1 감사 이관 항목 (Stage 2 착수 전 처리)

Stage 1 구현 완료 후 에이전트 검증에서 도출된 항목 중 Stage 1 동작에는 영향 없지만 Stage 2 전에 정리가 필요한 것들.

### HIGH

1. **드래프트 localStorage 미구현** — plan에 명시된 `courseState:draft:{fieldId}` 저장 로직이 없음. 필드 컴포넌트(`TitleField`, `DropdownField`, `BlockField`)가 `useState('')`만 사용. 새로고침 or 검증 실패 머무를 때 타이핑 손실.
2. **Service wallet fallback** — `state/route.ts`, `stage-complete/route.ts`에서 passkey 없으면 서비스 월렛으로 폴백. 비인증 유저가 공유 경로에 write. 정책: 401 거절 or userId 기반 deterministic 주소.
3. **topicKey 경로 plan과 다름** — plan은 `courses|{courseId-double-dash}`, 실제는 `courses|{slug}|{course}` (pipe 2개). 내부 일관성은 있음. paperId를 double-dash로 정규화 후 경로 구성하도록 수정.

### MEDIUM

4. **다음 스테이지 unlock 미기록** — 현재 `stage_complete`만 기록. `StageProgressBar`는 `unlockedStages` 필요. Stage 2 도입 시 `stage_unlock` 이벤트도 기록하거나 door-mode 감지 로직 추가.
5. **`shared/InteractiveLayout.tsx` 미생성** — plan 명시된 공유 레이아웃 컴포넌트 없음. page.tsx에 60/40 분할 하드코딩. Stage 2~4 + 다른 인터랙티브 코스 확장 시 추출.
6. **`NotionTaskPage` filled 판정이 인덱스 기반** — `idx < currentIdx`로 filled 결정. `value != null`로 일원화하면 데이터/UI 불일치 방지.

### LOW

7. **`recordStageComplete` 응답 바디 미체크** — `storage.ts`에서 fetch만 하고 `success` 플래그 확인 없음. 서버 500이어도 클라 "OK"로 간주.
8. **필드 drafts가 `value` prop에서 안 읽힘** — 현재 UX(filled 시 read-only)에서는 영향 없음. 수정 시 useEffect로 prop 싱크.
