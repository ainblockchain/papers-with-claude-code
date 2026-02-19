# Map & Course Building API Specification

> Backend API requirements from the frontend perspective.
> The frontend is a **pure renderer** — it does not generate maps or build courses.

---

## Overview

The frontend renders a tile-based village map using the **TMJ (Tiled Map JSON)** format. Maps are fetched from the backend via API. When a user submits a GitHub repository URL, the backend analyzes the repository, builds a learning course from it, and returns an updated village map that includes a new dungeon (course entrance) for that course.

### Data Flow

```
User enters GitHub URL on frontend
        |
        v
Frontend  ---POST /api/maps/courses--->  Backend
        (githubUrl)                       |
                                          | 1. Clone & analyze repo
                                          | 2. Build course (stages, concepts, quiz)
                                          | 3. Generate dungeon for the course
                                          | 4. Place dungeon on the village map
                                          | 5. Return updated TMJ map + course metadata
                                          |
Frontend  <--- { tmjMap, course } --------+
        |
        v
Re-render village with new dungeon
```

---

## TMJ Map Format

The backend MUST return maps in **Tiled JSON (.tmj)** format. The frontend parses this into an internal `ParsedMap` structure for rendering.

### Required TMJ Structure

```jsonc
{
  "type": "map",
  "version": "1.10",
  "orientation": "orthogonal",
  "renderorder": "right-down",
  "width": 60,          // map width in tiles
  "height": 40,         // map height in tiles
  "tilewidth": 16,      // pixel width of one tile
  "tileheight": 16,     // pixel height of one tile
  "infinite": false,
  "tilesets": [ /* tileset references */ ],
  "layers": [ /* tile layers + object groups */ ]
}
```

### Required Layers

| Layer Name | Type | Purpose |
|---|---|---|
| `ground` | `tilelayer` | Base terrain tiles (grass, paths, water) |
| `buildings` | `tilelayer` | Building and structure tiles (rendered above ground) |
| `collision` | `tilelayer` | Non-walkable tiles (GID > 0 = blocked). Not rendered. |
| `objects` | `objectgroup` | Interactive objects: spawn points, course entrances, NPCs |

### Required Object Types (in `objects` layer)

| Object Type | Properties | Description |
|---|---|---|
| `spawn` | `x`, `y` | Player spawn point (one per map) |
| `course_entrance` | `x`, `y`, `width`, `height`, `paperId`, `label`, `color` | Dungeon entrance that the player can walk into |

### Tileset Requirements

Each tileset entry must include:
- `firstgid`: First global tile ID
- `name`: Tileset identifier
- `tilewidth`, `tileheight`: Tile dimensions
- `tilecount`, `columns`: Grid dimensions
- `tiles[]`: Tile definitions with at minimum a `color` property (hex string) per tile for the current color-based renderer

```jsonc
{
  "firstgid": 1,
  "name": "village-terrain",
  "tilewidth": 16,
  "tileheight": 16,
  "tilecount": 32,
  "columns": 8,
  "tiles": [
    { "id": 0, "properties": [{ "name": "color", "type": "string", "value": "#5B8C5A" }] },
    { "id": 1, "properties": [{ "name": "color", "type": "string", "value": "#D2B48C" }] }
  ]
}
```

> **Future**: When image-based tileset rendering is implemented, the backend may provide `image` URLs in tileset definitions. The current renderer uses tile color properties only.

---

## API Endpoints

### 1. Get Village Map

Fetch the current village map for rendering.

```
GET /api/maps/village
```

**Response** `200 OK`
```jsonc
{
  "ok": true,
  "data": {
    "map": { /* TmjMap — full Tiled JSON */ },
    "courses": [
      {
        "paperId": "bitdance-2602",
        "label": "BitDance",
        "entrance": { "x": 10, "y": 6, "width": 4, "height": 3 },
        "color": "#8B4513",
        "status": "ready"     // "ready" | "building" | "failed"
      }
    ]
  }
}
```

**Frontend Behavior**:
- Calls this on village page load
- Parses the TMJ map via `parseTmjMap()` and renders it on canvas
- Uses `courses[]` to render dungeon entrance buildings and enable player interaction

---

### 2. Build Course from GitHub Repository

Submit a GitHub URL. The backend clones the repo, analyzes it, builds a course (knowledge graph, stages, concepts, quizzes), generates a dungeon, places it on the village map, and returns the result.

```
POST /api/maps/courses
Content-Type: application/json
```

**Request Body**
```jsonc
{
  "githubUrl": "https://github.com/shallowdream204/BitDance",
  "options": {
    "title": "BitDance",               // optional — override auto-detected title
    "maxStages": 7,                     // optional — limit stage count (default: 5-7)
    "placement": { "x": 24, "y": 6 }   // optional — preferred entrance position on map
  }
}
```

**Response** `202 Accepted` (course building is async)
```jsonc
{
  "ok": true,
  "data": {
    "courseId": "bitdance-2602",
    "status": "building",
    "message": "Course generation started. Poll GET /api/maps/courses/:courseId for status."
  }
}
```

**Error Responses**

| Status | Condition |
|---|---|
| `400` | Invalid or missing `githubUrl` |
| `409` | Course for this repository already exists |
| `429` | Too many concurrent builds |
| `500` | Internal error during repo clone/analysis |

---

### 3. Get Course Build Status

Poll the status of an in-progress course build.

```
GET /api/maps/courses/:courseId
```

**Response** `200 OK`
```jsonc
{
  "ok": true,
  "data": {
    "courseId": "bitdance-2602",
    "status": "ready",                   // "building" | "ready" | "failed"
    "progress": 100,                     // 0-100 build progress percentage
    "paperId": "bitdance-2602",
    "title": "BitDance: Scaling Autoregressive Generative Models",
    "totalStages": 5,
    "githubUrl": "https://github.com/shallowdream204/BitDance",
    "entrance": { "x": 10, "y": 6, "width": 4, "height": 3 },
    "map": { /* updated TmjMap including the new dungeon — only present when status=ready */ }
  }
}
```

When `status` transitions to `"ready"`:
- `map` contains the full updated village TMJ with the new dungeon placed
- Frontend replaces the current map with this new version and re-renders

When `status` is `"building"`:
- `progress` indicates completion percentage
- Frontend shows a loading indicator and continues polling (recommended interval: 3s)

When `status` is `"failed"`:
- `error` field contains the failure reason
- Frontend shows an error message to the user

---

### 4. Delete Course from Map

Remove a course dungeon from the village map.

```
DELETE /api/maps/courses/:courseId
```

**Response** `200 OK`
```jsonc
{
  "ok": true,
  "data": {
    "map": { /* updated TmjMap without the deleted course dungeon */ }
  }
}
```

---

### 5. Get Course Stage Map (Dungeon Interior)

When a player enters a course dungeon, fetch the interior map for that specific stage.

```
GET /api/maps/courses/:courseId/stages/:stageNumber
```

**Response** `200 OK`
```jsonc
{
  "ok": true,
  "data": {
    "map": { /* TmjMap for the stage room (typically 20x15 tiles) */ },
    "stage": {
      "stageNumber": 1,
      "title": "Introduction & Motivation",
      "concepts": [
        {
          "id": "concept-1",
          "title": "Binary Visual Tokens",
          "content": "Detailed explanation...",
          "position": { "x": 5, "y": 3 }
        }
      ],
      "quiz": {
        "id": "quiz-1",
        "question": "What is the main advantage of binary tokens?",
        "type": "multiple-choice",
        "options": ["Speed", "Quality", "Both", "Neither"],
        "correctAnswer": "Both"
      },
      "doorPosition": { "x": 18, "y": 7 }
    }
  }
}
```

---

## Frontend Architecture Reference

For context on how the frontend consumes this API:

### Map Loader Adapter (`src/lib/adapters/map-loader.ts`)

```typescript
export interface MapLoaderAdapter {
  loadMap(mapId: string): Promise<TmjMap | null>;
}
```

Currently uses `LocalMapLoader` (fetches from `/maps/*.tmj`). The backend integration will replace this with a `BackendMapLoader` that calls the API endpoints above.

### TMJ Type Definitions (`src/types/tmj.ts`)

Full TypeScript types for the raw TMJ format and parsed output. The backend's TMJ output MUST conform to the `TmjMap` interface.

### Renderer (`src/lib/tmj/renderer.ts`)

Color-based tile renderer. Reads `color` property from tileset tile definitions and fills rectangles. No image/sprite rendering yet.

### useMapLoader Hook (`src/hooks/useMapLoader.ts`)

React hook that loads and parses a map by ID. Returns `ParsedMap` with indexed layer access (`layersByName`, `objectsByType`).

### VillageCanvas (`src/components/village/VillageCanvas.tsx`)

Main rendering component. Uses `useMapLoader('village')` for the TMJ map and reads `courseLocations` from `useVillageStore` for dungeon entrances. Supports both TMJ-based rendering and procedural fallback.

---

## Sequence Diagrams

### Initial Village Load

```
Frontend                           Backend
   |                                  |
   |  GET /api/maps/village           |
   |--------------------------------->|
   |                                  |
   |  { map: TmjMap, courses: [...] } |
   |<---------------------------------|
   |                                  |
   |  Parse TMJ, render canvas        |
   |  Place course entrances          |
```

### Adding a New Course

```
Frontend                           Backend
   |                                  |
   |  POST /api/maps/courses          |
   |  { githubUrl: "https://..." }    |
   |--------------------------------->|
   |                                  |
   |  202 { courseId, status:building }|
   |<---------------------------------|
   |                                  |
   |  Show "Building course..." UI    |
   |                                  |
   |  GET /api/maps/courses/:id       |  (poll every 3s)
   |--------------------------------->|
   |  { status:building, progress:45 }|
   |<---------------------------------|
   |                                  |
   |  GET /api/maps/courses/:id       |
   |--------------------------------->|
   |  { status:ready, map: TmjMap }   |
   |<---------------------------------|
   |                                  |
   |  Replace map, re-render canvas   |
   |  New dungeon entrance visible    |
```

### Entering a Course Dungeon

```
Frontend                           Backend
   |                                  |
   |  Player walks to entrance,       |
   |  presses E                       |
   |                                  |
   |  GET /api/maps/courses/:id/      |
   |      stages/1                    |
   |--------------------------------->|
   |                                  |
   |  { map: TmjMap, stage: {...} }   |
   |<---------------------------------|
   |                                  |
   |  Navigate to /learn/:paperId     |
   |  Render stage room from TMJ      |
```

---

## Papers Catalog API

> 현재 프론트엔드는 `MockPapersAdapter`로 하드코딩된 6개의 논문 데이터를 사용합니다.
> 아래 API가 구현되면 `src/lib/adapters/papers.ts`의 mock을 실제 API 호출로 교체합니다.

### 6. 트렌딩 논문 목록 조회

Explore 페이지에서 호출. 기간별 트렌딩 논문 목록을 반환합니다.

```
GET /api/papers?period=daily&limit=20&offset=0
```

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `period` | `daily` \| `weekly` \| `monthly` | `daily` | 트렌딩 기간 |
| `limit` | number | `20` | 한 번에 반환할 개수 |
| `offset` | number | `0` | 페이지네이션 오프셋 |

**Response** `200 OK`
```jsonc
{
  "ok": true,
  "data": {
    "papers": [
      {
        "id": "bitdance-2602",
        "title": "BitDance: Scaling Autoregressive Generative Models with Binary Tokens",
        "description": "BitDance is a scalable autoregressive image generator...",
        "authors": [
          { "id": "1", "name": "Xuefeng Hu", "avatarUrl": null },
          { "id": "2", "name": "Weijia Mao", "avatarUrl": null },
          { "id": "3", "name": "Shaobin Zhuang", "avatarUrl": null }
        ],
        "publishedAt": "2026-02-15",           // ISO date string
        "thumbnailUrl": "/thumbnails/bitdance-2602.png",
        "arxivUrl": "https://arxiv.org/abs/2602.14041",
        "githubUrl": "https://github.com/shallowdream204/BitDance",
        "githubStars": 109,                     // nullable
        "organization": {                       // nullable
          "name": "ByteDance",
          "logoUrl": "/orgs/bytedance.png"
        },
        "submittedBy": "taesiri",               // 제출자 username
        "totalStages": 5                        // 코스 스테이지 수
      }
      // ...
    ],
    "total": 142,                               // 전체 논문 수
    "hasMore": true
  }
}
```

**Frontend Adapter Interface** (`src/lib/adapters/papers.ts`)
```typescript
fetchTrendingPapers(period: 'daily' | 'weekly' | 'monthly'): Promise<Paper[]>
```

---

### 7. 논문 검색

검색어로 논문을 검색합니다. 제목, 설명, 저자명을 대상으로 합니다.

```
GET /api/papers/search?q=transformer&limit=20&offset=0
```

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | (required) | 검색 쿼리 |
| `limit` | number | `20` | 반환 개수 |
| `offset` | number | `0` | 페이지네이션 오프셋 |

**Response** `200 OK`
```jsonc
{
  "ok": true,
  "data": {
    "papers": [ /* Paper[] — 위와 동일한 형식 */ ],
    "total": 8,
    "hasMore": false
  }
}
```

**Frontend Adapter Interface**
```typescript
searchPapers(query: string): Promise<Paper[]>
```

---

### 8. 논문 상세 조회

단일 논문의 상세 정보를 반환합니다. Learn 페이지 진입 시 호출됩니다.

```
GET /api/papers/:paperId
```

**Response** `200 OK`
```jsonc
{
  "ok": true,
  "data": {
    "id": "bitdance-2602",
    "title": "BitDance: Scaling Autoregressive Generative Models with Binary Tokens",
    "description": "BitDance is a scalable autoregressive image generator...",
    "authors": [
      { "id": "1", "name": "Xuefeng Hu", "avatarUrl": null }
    ],
    "publishedAt": "2026-02-15",
    "thumbnailUrl": "/thumbnails/bitdance-2602.png",
    "arxivUrl": "https://arxiv.org/abs/2602.14041",
    "githubUrl": "https://github.com/shallowdream204/BitDance",
    "githubStars": 109,
    "organization": { "name": "ByteDance", "logoUrl": "/orgs/bytedance.png" },
    "submittedBy": "taesiri",
    "totalStages": 5
  }
}
```

**Error Responses**

| Status | Condition |
|--------|-----------|
| `404` | 해당 paperId의 논문이 존재하지 않음 |

**Frontend Adapter Interface**
```typescript
getPaperById(id: string): Promise<Paper | null>
```

---

### Paper 타입 정의 (참조)

프론트엔드 `src/types/paper.ts`:

```typescript
interface Author {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface Paper {
  id: string;                              // unique identifier (e.g. "bitdance-2602")
  title: string;
  description: string;
  authors: Author[];
  publishedAt: string;                     // ISO date "YYYY-MM-DD"
  thumbnailUrl: string;                    // 논문 썸네일 이미지 경로
  arxivUrl: string;                        // arXiv 링크
  githubUrl?: string;                      // GitHub 레포 URL (nullable)
  githubStars?: number;                    // GitHub 스타 수 (nullable)
  organization?: { name: string; logoUrl: string };  // 소속 기관 (nullable)
  submittedBy: string;                     // 제출자 username
  totalStages: number;                     // 코스의 총 스테이지 수
}
```

---

### 논문 데이터 소스 논의사항

현재 프론트엔드에 하드코딩된 6개 논문은 Papers with Code / arXiv 기반 mock 데이터입니다. 백엔드에서 논문 카탈로그를 제공하려면 다음 결정이 필요합니다:

1. **데이터 소스**: arXiv API 크롤링, Hugging Face Daily Papers API, 직접 DB 관리 중 어느 방식?
2. **코스 연동**: 논문(`Paper`)과 생성된 코스(`Course`)의 관계 — 1:1인지, 하나의 논문에 여러 코스가 가능한지?
3. **트렌딩 기준**: daily/weekly/monthly 트렌딩 순위를 어떻게 산정하는지? (GitHub stars, arXiv citations, 플랫폼 내 학습 수 등)
4. **썸네일**: 논문 썸네일 이미지를 어디서 호스팅하는지? (arXiv figure 자동 추출, 수동 업로드, 또는 placeholder)
5. **제출**: 유저가 새 논문을 제출하는 플로우가 있는지? (있다면 `POST /api/papers` 엔드포인트 추가 필요)

---

## Constraints & Assumptions

1. **Map size**: Village map is currently 60x40 tiles. The backend MAY expand this when placing new dungeons, but should communicate the new dimensions in the TMJ `width`/`height` fields.

2. **Tile size**: Fixed at 16x16 pixels in the TMJ. The frontend renders at a configurable display tile size (currently 40px).

3. **Coordinate system**: Origin (0,0) is top-left. X increases rightward, Y increases downward.

4. **Course placement**: The backend is responsible for finding a non-overlapping position on the village map for new dungeon entrances. If the frontend provides a `placement` hint, the backend should use it if possible.

5. **Async building**: Course generation may take 30-120 seconds (repo clone + analysis + map generation). The API uses a polling pattern, not WebSocket.

6. **AIN blockchain**: Course locations are also written to the AIN blockchain at `/apps/knowledge/courses/{paperId}`. The backend should call `ain.db.ref().setValue()` after placing a dungeon. The frontend reads these on load for cached positions.

7. **Backward compatibility**: If the backend map API is unavailable, the frontend falls back to procedural rendering (hardcoded paths and checkerboard grass).
