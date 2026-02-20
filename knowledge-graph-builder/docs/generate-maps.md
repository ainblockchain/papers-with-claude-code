# generate-maps.ts — 프론트엔드 개발자 안내

> **목적**: 프론트엔드 동료에게 `generate-maps.ts`로 생성되는 맵 파일들의 구조와 사용 방법을 안내합니다.

---

## 이 스크립트가 하는 일

`generate-maps.ts`는 코스 지식 데이터(JSON)를 프론트엔드가 렌더링할 수 있는 **TMJ 맵 파일로 변환**합니다.

```
[courses.json]             ┐
[course-metadata.json]  ───┤─▶  generate-maps.ts  ─▶  [village.tmj]
[correct-answers.json]     ┘                           [stages/1.json ~ N.json]
                                                       [course-info.json]
```

---

## 파일 구조 및 위치

### 프로젝트 내 관련 파일

```
knowledge-graph-builder/
├── generate-maps.ts         ← 변환 스크립트 (본 문서 주제)
├── tsconfig.json            ← TypeScript 컴파일 설정
├── map/                     ← 생성된 맵 파일들 (git 추적됨)
│   ├── village.tmj          ← 마을 맵 (Tiled JSON 포맷)
│   ├── course-metadata.json ← 스크립트 입력값 (직접 작성 필요)
│   ├── correct-answers.json ← 스크립트 입력값 (직접 작성 필요)
│   ├── course-info.json     ← 스크립트가 생성하는 코스 요약
│   └── stages/
│       ├── 1.json           ← 스테이지 1 맵 + 콘텐츠
│       ├── 2.json
│       └── ...
└── courseGenerator/
    └── awesome-papers-with-claude-code/   ← 별도 git 저장소
        └── {paper-slug}/{course-slug}/knowledge/
            └── courses.json               ← 스크립트 입력값 원본
```

---

## 실행 방법

### 사전 요구사항

```bash
# knowledge-graph-builder/ 에서 실행
npx tsx generate-maps.ts <knowledge-dir>
# 또는
npx tsx generate-maps.ts <knowledge-dir> <map-dir>
```

| 인수 | 설명 | 기본값 |
|------|------|--------|
| `<knowledge-dir>` | `courses.json`이 있는 디렉토리 | `courseGenerator/awesome-papers-with-claude-code/attention-is-all-you-need/bible/knowledge` |
| `<map-dir>` | `village.tmj` 등 출력 디렉토리 | `knowledge-graph-builder/map/` |

### TypeScript 설정 (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": false,
    "skipLibCheck": true,
    "typeRoots": [
      "../frontend/node_modules/@types",  // 프론트엔드 타입 공유
      "./node_modules/@types"
    ]
  },
  "include": ["*.ts"]  // knowledge-graph-builder/ 루트의 .ts 파일만 포함
}
```

> `typeRoots`에 `../frontend/node_modules/@types`가 포함되어 있어 프론트엔드와 타입을 공유합니다.

---

## 입력 파일 상세

### 1. `courses.json`

코스 목록과 레슨, 퀴즈 원본 데이터입니다.

**위치**: `courseGenerator/awesome-papers-with-claude-code/{paper-slug}/{course-slug}/knowledge/courses.json`

**Git 추적 여부**: ✅ 항상 git에 있음 (해당 경로는 별도 원격 저장소 `ainblockchain/awesome-papers-with-claude-code`이며, 코스 생성 파이프라인이 자동 커밋/푸시)

```jsonc
[
  {
    "id": "introduction_and_motivation",  // CourseEntry.id → stages/1.json의 stage.id
    "title": "Introduction & Motivation",
    "description": "...",
    "concepts": ["sequence_to_sequence", "recurrent_limitations"],
    "lessons": [
      {
        "concept_id": "sequence_to_sequence",  // NPC id, stage의 concept.id
        "title": "Sequence-to-Sequence Models",
        "key_ideas": ["...", "..."],            // concept content에 포함됨
        "exercise": "True or False: ...",       // 퀴즈 문제 원본 텍스트
        "explanation": "...",                  // concept content에 포함됨
        "prerequisites": []
      }
    ]
  }
]
```

### 2. `course-metadata.json`

저자, 색상, 플롯 위치 등 메타 정보입니다.

**위치**: `map/course-metadata.json`

**Git 추적 여부**: ✅ git에 있음 (`map/` 폴더는 `.gitignore`에서 예외 처리됨)

```jsonc
{
  "courseId": "attention-is-all-you-need",
  "paperId": "attention-is-all-you-need",    // village.tmj의 course_entrance.name에 사용됨
  "title": "Attention Is All You Need",
  "description": "...",
  "authors": [{ "id": "1", "name": "Ashish Vaswani", "avatarUrl": null }],
  "publishedAt": "2017-06-12",
  "arxivUrl": "https://arxiv.org/abs/1706.03762",
  "githubUrl": null,
  "githubStars": null,
  "organization": { "name": "Google Brain", "logoUrl": null },
  "color": "#4A90D9",                        // course_entrance 색상 → 건물 색상
  "plotPosition": { "col": 0, "row": 0 },   // 마을 그리드에서의 위치
  "entrance": { "x": 7, "y": 4, "width": 4, "height": 3 },  // 건물 좌표
  "stages": [
    // 선택적: roomWidth/roomHeight 오버라이드 가능. 없으면 기본값 20×15 사용
    { "stageNumber": 1, "title": "...", "conceptCount": 2, "hasQuiz": true, "roomWidth": 20, "roomHeight": 15 }
  ]
}
```

### 3. `correct-answers.json`

퀴즈 정답 매핑입니다.

**위치**: `map/correct-answers.json`

**Git 추적 여부**: ✅ git에 있음

```jsonc
{
  "sequence_to_sequence": "2",       // 숫자 문자열 = 1-indexed 옵션 번호
  "recurrent_limitations": "False",  // "True" / "False" = True/False 퀴즈 정답
  "attention_mechanism": "1"
}
```

> 값이 숫자 문자열인 경우, `parseExercise()`가 `exercise` 텍스트에서 파싱된 옵션 배열의 `[n-1]`번 항목을 실제 정답으로 변환합니다.

---

## 출력 파일 상세

### 1. `village.tmj` — 마을 맵

**Git 추적 여부**: ✅ 항상 git에 있음 (`.gitignore`에 `.tmj` 제외 규칙 없음)

Tiled JSON 포맷의 마을 맵입니다. 현재 `generate-maps.ts`는 단일 코스를 위한 18×14 타일 맵을 생성합니다.

```
맵 크기: 18(PLOT_WIDTH) × 14(PLOT_HEIGHT) 타일
타일 크기: 40px (tilewidth: 40, tileheight: 40)
```

**레이어 구조**:

| 레이어 | 타입 | 내용 |
|--------|------|------|
| `ground` | `tilelayer` | 체커보드 잔디 (GID 1,2) + plot 경계 path 타일 (GID 3) |
| `collision` | `tilelayer` | 전체 0 (충돌은 JS에서 처리) |
| `objects` | `objectgroup` | `spawn` 포인트 + `course_entrance` 객체 |

**objects 레이어의 오브젝트**:

```jsonc
// spawn
{ "id": 1, "name": "spawn", "type": "spawn", "x": 360, "y": 360, "point": true }

// course_entrance (건물)
{
  "id": 2,
  "name": "course-attention-is-all-you-need",  // "course-{paperId}"
  "type": "course_entrance",
  "x": 280, "y": 160,                          // buildingX * 40, buildingY * 40
  "width": 160, "height": 120,                 // 4 * 40, 3 * 40
  "properties": [
    { "name": "paperId", "type": "string", "value": "attention-is-all-you-need" },
    { "name": "label",   "type": "string", "value": "Attention Is All You Need" },
    { "name": "color",   "type": "string", "value": "#4A90D9" }
  ]
}
```

**타일셋**:

```jsonc
{
  "name": "village-tiles",
  "tilecount": 3, "columns": 3,
  "tiles": [
    { "id": 0, "type": "grass-light", "properties": [{ "name": "color", "value": "#5B8C5A" }] },
    { "id": 1, "type": "grass-dark",  "properties": [{ "name": "color", "value": "#4A7C59" }] },
    { "id": 2, "type": "path",        "properties": [{ "name": "color", "value": "#D2B48C" }] }
  ]
}
```

> **주의**: tilelayer의 data 배열은 **1-indexed GID**를 사용합니다 (Tiled 표준).
> grass-light = GID 1, grass-dark = GID 2, path = GID 3.
> 0은 "빈 타일"을 의미합니다.

---

### 2. `stages/N.json` — 스테이지 룸 맵 + 콘텐츠

**Git 추적 여부**: ✅ git에 있음 (`map/` 예외 처리)

프론트엔드 API 명세 (`GET /api/maps/courses/:courseId/stages/:stageNumber`)와 동일한 구조입니다.

```typescript
{
  map: TmjMap,   // 스테이지 룸 TMJ
  stage: StageData
}
```

**`map` 구조** (기본 20×15 타일):

| 레이어 | 타입 | 내용 |
|--------|------|------|
| `floor` | `tilelayer` | 체커보드 바닥 (GID 1,2) + 테두리 벽 (GID 3) |
| `collision` | `tilelayer` | 테두리 = 1 (blocked), 내부 = 0 |
| `objects` | `objectgroup` | spawn + door + NPC 목록 |

**objects 레이어**:
- `spawn` (id:1): 플레이어 시작 위치 — `{ x: 40, y: 280 }` (tile 1,7)
- `door` (id:2): 다음 스테이지로 이동 — `{ x: 720, y: 280 }` (tile 18,7)
- NPC (id:3~): concept 당 1개, `type: "npc"`, properties에 `conceptId`, `title` 포함

**`stage` 구조**:

```typescript
{
  id: string,              // courses.json의 CourseEntry.id
  stageNumber: number,
  title: string,
  roomWidth: 20,           // 기본값, course-metadata.json으로 오버라이드 가능
  roomHeight: 15,
  concepts: [
    {
      id: string,          // lesson.concept_id
      title: string,
      content: string,     // "Key ideas:\n- ...\n\n{explanation}" 형식으로 결합
      position: { x, y }, // 타일 좌표 (px 아님)
      type: 'text'
    }
  ],
  quiz: {
    id: string,            // "quiz-stage-{N}"
    question: string,
    type: 'multiple-choice',
    options: string[],
    correctAnswer: string, // 실제 옵션 텍스트 (correct-answers.json에서 변환됨)
    position: { x: 18, y: 7 }  // 항상 doorPosition
  },
  doorPosition: { x: 18, y: 7 },
  spawnPosition: { x: 1, y: 7 },
  nextStage: number | null,
  previousStage: number | null
}
```

**Concept 위치 배치 규칙**:

| concept 수 | 행 수 | y 위치 | x 위치 |
|-----------|------|--------|--------|
| 1-4개 | 1행 | y=6 | x=3, 6, 9, 12 |
| 5-8개 | 2행 | y=4 (상), y=10 (하) | 각 행 x=3, 6, 9, 12 |

**퀴즈 선택 로직**: 각 스테이지에서 `correct-answers.json`에 등록된 레슨 중 **가장 마지막 레슨**의 exercise가 퀴즈로 사용됩니다.

---

### 3. `course-info.json` — 코스 요약

**Git 추적 여부**: ✅ git에 있음

```typescript
{
  courseId: string,
  paperId: string,
  title: string,
  description: string,
  authors: Author[],
  publishedAt: string,
  arxivUrl: string,
  githubUrl: string | null,
  githubStars: number | null,
  organization: { name, logoUrl } | null,
  color: string,
  plotPosition: { col, row },
  entrance: { x, y, width, height },
  status: 'ready',          // 항상 'ready' (생성된 파일이므로)
  totalStages: number,
  stages: [
    {
      stageNumber: number,
      title: string,
      conceptCount: number,
      hasQuiz: boolean,
      roomWidth: number,
      roomHeight: number
    }
  ],
  progress: null            // 항상 null (진행 상황은 블록체인에 저장)
}
```

---

## Plot Grid System

마을 맵은 코스 수에 따라 동적으로 확장됩니다:

```
코스 N개 시:
  cols = ceil(sqrt(N))
  rows = ceil(N / cols)
  mapWidth  = cols × 18 타일
  mapHeight = rows × 14 타일
```

| 코스 수 | 그리드 | 맵 크기 |
|--------|-------|---------|
| 1 | 1×1 | 18×14 |
| 4 | 2×2 | 36×28 |
| 6 | 3×2 | 54×28 |
| 9 | 3×3 | 54×42 |

각 plot 내 건물 위치:
```
buildingX = plotCol × 18 + 7   (PLOT_BORDER + floor((16-4)/2) = 1+6 = 7)
buildingY = plotRow × 14 + 4   (PLOT_BORDER + floor((12-3)/2) - 1 = 1+4-1 = 4)
```

> `generate-maps.ts`는 현재 **단일 코스 전용**으로 1×1 그리드(18×14)를 생성합니다.
> **다중 코스 마을**은 프론트엔드의 `village-generator.ts`가 런타임에 코스 목록을 받아 동적으로 생성합니다.

---

## 상수 참조표

`generate-maps.ts`의 상수는 `frontend/src/lib/tmj/village-generator.ts`와 동기화되어 있습니다.

| 상수 | 값 | 설명 |
|------|----|------|
| `PLOT_INNER_WIDTH` | 16 | plot 내 걷기 가능 영역 너비 (타일) |
| `PLOT_INNER_HEIGHT` | 12 | plot 내 걷기 가능 영역 높이 (타일) |
| `PLOT_BORDER` | 1 | plot 경계 path 두께 (타일) |
| `PLOT_WIDTH` | 18 | plot 총 너비 = 16+1+1 |
| `PLOT_HEIGHT` | 14 | plot 총 높이 = 12+1+1 |
| `BUILDING_WIDTH` | 4 | 건물 너비 (타일) |
| `BUILDING_HEIGHT` | 3 | 건물 높이 (타일) |
| `TILE_PX` | 40 | TMJ tilewidth/tileheight 값 |
| `ROOM_WIDTH` | 20 | 스테이지 룸 기본 너비 (타일) |
| `ROOM_HEIGHT` | 15 | 스테이지 룸 기본 높이 (타일) |
| `SPAWN_X` / `SPAWN_Y` | 1 / 7 | 스테이지 룸 스폰 위치 (타일) |
| `DOOR_X` / `DOOR_Y` | 18 / 7 | 스테이지 룸 도어 위치 (타일) |

---

## 프론트엔드 연동 현황

### 현재 상태 (정적 파일 기반)

```
generate-maps.ts 실행
        ↓
knowledge-graph-builder/map/ 에 파일 생성
        ↓ (수동으로 복사)
frontend/public/maps/village.tmj
frontend/public/courses/{paperId}/...

프론트엔드 → LocalMapLoader → fetch('/maps/village.tmj')
```

### 목표 상태 (API 기반, map-api-spec.md 참조)

```
프론트엔드 → BackendMapLoader → GET /api/maps/village
                                        ↓
                              백엔드가 TMJ 동적 생성 후 반환
```

> 현재 `frontend/src/lib/adapters/map-loader.ts`는 `LocalMapLoader`를 사용 중이며,
> `BackendMapLoader`로의 전환은 미구현 상태입니다 (코드 내 주석 처리됨).
> API 명세는 `frontend/docs/map-api-spec.md`를 참조하세요.
