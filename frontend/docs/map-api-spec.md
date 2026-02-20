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

## Plot Grid System

The village map is dynamically generated using a **plot grid system**. Instead of a fixed-size map, the map expands automatically as courses are added.

### Plot Dimensions

Each course occupies one "plot" — a fixed-size area approximately equal to one viewport.

| Parameter | Value | Description |
|-----------|-------|-------------|
| `PLOT_INNER_WIDTH` | 16 tiles | Walkable area width (= viewport width) |
| `PLOT_INNER_HEIGHT` | 12 tiles | Walkable area height (= viewport height) |
| `PLOT_BORDER` | 1 tile | Path-tile border on each edge |
| `PLOT_WIDTH` | 18 tiles | Total plot width including borders |
| `PLOT_HEIGHT` | 14 tiles | Total plot height including borders |
| `BUILDING_WIDTH` | 4 tiles | Course entrance building width |
| `BUILDING_HEIGHT` | 3 tiles | Course entrance building height |

Adjacent plots share borders, creating 2-tile-wide path roads between them.

### Grid Calculation

Given N courses:
```
cols = ceil(sqrt(N))
rows = ceil(N / cols)
mapWidth = cols * PLOT_WIDTH
mapHeight = rows * PLOT_HEIGHT
```

Minimum grid: 1×1 (one empty plot for zero courses).

Examples: 1→18×14, 4→36×28, 6→54×28, 9→54×42

### TMJ Generation

The village TMJ is generated at runtime by `generateVillageTmj()` in `src/lib/tmj/village-generator.ts`.
The generated TMJ uses the same format as the static `village.tmj`:
- **ground** layer: checkerboard grass with path borders at plot edges
- **collision** layer: all zeros (collision handled in JavaScript)
- **objects** layer: spawn point + `course_entrance` objects
- **tileset**: same 3-tile village-tiles (grass-light `#5B8C5A`, grass-dark `#4A7C59`, path `#D2B48C`)

### Course Placement Within Plot

Course at index `i` in grid with `cols` columns:
```
plotCol = i % cols
plotRow = floor(i / cols)
buildingX = plotCol * PLOT_WIDTH + PLOT_BORDER + floor((PLOT_INNER_WIDTH - BUILDING_WIDTH) / 2)
buildingY = plotRow * PLOT_HEIGHT + PLOT_BORDER + floor((PLOT_INNER_HEIGHT - BUILDING_HEIGHT) / 2) - 1
```

### Map Image Generation (Future)

When image-based tiles replace color-based rendering, a two-phase pipeline is planned:

1. **Outpainting for terrain expansion**: When the grid grows (e.g., 3×2 → 3×3), new plot areas are outpainted from existing map edges via the Gemini API to generate seamless terrain.

2. **Inpainting for building placement**: Within each new plot, the course building is inpainted into the generated terrain. The mask defines the building footprint; the API fills it with a building matching the surrounding style.

The `GeminiMapAdapter` interface supports both modes via the `mode: 'outpaint' | 'inpaint'` parameter.

---

## API Endpoints

### 1. Get Village Map (with Grid Layout)

Fetch the current village map with all registered courses and grid layout metadata.

```
GET /api/maps/village
```

**Response** `200 OK`
```jsonc
{
  "ok": true,
  "data": {
    "map": { /* TmjMap — full Tiled JSON, dimensions based on plot grid */ },
    "grid": {
      "cols": 3,           // number of plot columns
      "rows": 2,           // number of plot rows
      "plotWidth": 18,     // tiles per plot (width)
      "plotHeight": 14,    // tiles per plot (height)
      "mapWidth": 54,      // total map width in tiles (cols * plotWidth)
      "mapHeight": 28      // total map height in tiles (rows * plotHeight)
    },
    "courses": [
      {
        "paperId": "bitdance-2602",
        "label": "BitDance",
        "entrance": { "x": 7, "y": 4, "width": 4, "height": 3 },
        "plotPosition": { "col": 0, "row": 0 },
        "color": "#8B4513",
        "status": "ready"     // "ready" | "building" | "failed"
      }
    ]
  }
}
```

**Frontend Behavior**:
- Calls this on village page load (or uses local `generateVillageTmj()` when backend unavailable)
- Parses the TMJ map via `parseTmjMap()` and renders it on canvas
- Map dimensions are dynamic — NEVER assume a fixed width/height
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
    "plotPosition": { "col": 2, "row": 0 }  // optional — preferred plot grid position
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
    "description": "BitDance is a scalable autoregressive image generator...",
    "totalStages": 5,
    "githubUrl": "https://github.com/shallowdream204/BitDance",
    "entrance": { "x": 7, "y": 4, "width": 4, "height": 3 },
    "plotPosition": { "col": 0, "row": 0 },
    "stages": [
      { "stageNumber": 1, "title": "Introduction & Motivation", "conceptCount": 2 },
      { "stageNumber": 2, "title": "Binary Visual Tokens", "conceptCount": 3 },
      { "stageNumber": 3, "title": "Architecture Deep Dive", "conceptCount": 2 },
      { "stageNumber": 4, "title": "Training Pipeline", "conceptCount": 2 },
      { "stageNumber": 5, "title": "Evaluation & Results", "conceptCount": 2 }
    ],
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

### 6. Get Course Detail (Full Course Info)

Fetch full course information including all stages summary. Used when entering a course or viewing course detail.

```
GET /api/maps/courses/:courseId/info
```

**Response** `200 OK`
```jsonc
{
  "ok": true,
  "data": {
    "courseId": "bitdance-2602",
    "paperId": "bitdance-2602",
    "title": "BitDance: Scaling Autoregressive Generative Models with Binary Tokens",
    "description": "BitDance is a scalable autoregressive image generator...",
    "authors": [
      { "id": "1", "name": "Xuefeng Hu", "avatarUrl": null }
    ],
    "publishedAt": "2026-02-15",
    "arxivUrl": "https://arxiv.org/abs/2602.14041",
    "githubUrl": "https://github.com/shallowdream204/BitDance",
    "githubStars": 109,
    "organization": { "name": "ByteDance", "logoUrl": "/orgs/bytedance.png" },
    "totalStages": 5,
    "plotPosition": { "col": 0, "row": 0 },
    "entrance": { "x": 7, "y": 4, "width": 4, "height": 3 },
    "color": "#8B4513",
    "stages": [
      {
        "stageNumber": 1,
        "title": "Introduction & Motivation",
        "conceptCount": 2,
        "hasQuiz": true,
        "roomWidth": 20,
        "roomHeight": 15
      },
      {
        "stageNumber": 2,
        "title": "Binary Visual Tokens",
        "conceptCount": 3,
        "hasQuiz": true,
        "roomWidth": 20,
        "roomHeight": 15
      }
      // ... remaining stages
    ],
    "progress": {                          // null if user not enrolled
      "isEnrolled": true,
      "currentStage": 2,
      "completedStages": [1],
      "totalPaid": "0.002",
      "enrolledAt": "2026-02-18T10:30:00Z"
    }
  }
}
```

**Error Responses**

| Status | Condition |
|--------|-----------|
| `404` | Course not found |

---

### 7. Get Stage Detail (Dungeon Interior + Content)

Fetch complete stage information including room map, concepts, and quiz. Called when the player enters a stage within a course.

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
      "roomWidth": 20,
      "roomHeight": 15,
      "concepts": [
        {
          "id": "concept-1",
          "title": "Binary Visual Tokens",
          "content": "Detailed explanation of the concept...",
          "position": { "x": 5, "y": 3 },
          "type": "text"                  // "text" | "code" | "diagram" | "interactive"
        },
        {
          "id": "concept-2",
          "title": "Autoregressive Generation",
          "content": "How the model generates images token by token...",
          "position": { "x": 12, "y": 8 },
          "type": "text"
        }
      ],
      "quiz": {
        "id": "quiz-1",
        "question": "What is the main advantage of binary tokens?",
        "type": "multiple-choice",        // "multiple-choice" | "code-challenge" | "free-response"
        "options": ["Speed", "Quality", "Both", "Neither"],
        "correctAnswer": "Both",
        "position": { "x": 18, "y": 7 }  // quiz gate position in stage room
      },
      "doorPosition": { "x": 18, "y": 7 },
      "spawnPosition": { "x": 1, "y": 7 },
      "nextStage": 2,                    // null if last stage
      "previousStage": null              // null if first stage
    },
    "completion": {                       // null if stage not completed yet
      "completedAt": "2026-02-18T11:15:00Z",
      "score": 85,
      "attestationHash": "0xabc...",
      "txHash": "0xdef..."
    }
  }
}
```

**Error Responses**

| Status | Condition |
|--------|-----------|
| `404` | Course or stage not found |
| `403` | Stage locked (previous stage not completed) |

---

### 8. List All Courses (Catalog)

Fetch all published courses available on the village map. Used for the explore/catalog page.

```
GET /api/maps/courses?status=ready&limit=20&offset=0
```

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `status` | `ready` \| `building` \| `all` | `ready` | Filter by course status |
| `limit` | number | `20` | Pagination limit |
| `offset` | number | `0` | Pagination offset |

**Response** `200 OK`
```jsonc
{
  "ok": true,
  "data": {
    "courses": [
      {
        "courseId": "bitdance-2602",
        "paperId": "bitdance-2602",
        "title": "BitDance: Scaling Autoregressive Generative Models",
        "description": "BitDance is a scalable autoregressive image generator...",
        "totalStages": 5,
        "plotPosition": { "col": 0, "row": 0 },
        "entrance": { "x": 7, "y": 4, "width": 4, "height": 3 },
        "color": "#8B4513",
        "status": "ready",
        "githubUrl": "https://github.com/shallowdream204/BitDance",
        "createdAt": "2026-02-15T08:00:00Z"
      }
    ],
    "grid": {
      "cols": 3,
      "rows": 2,
      "plotWidth": 18,
      "plotHeight": 14,
      "mapWidth": 54,
      "mapHeight": 28
    },
    "total": 6,
    "hasMore": false
  }
}
```

---

### 9. Get Course Progress (User-specific)

Fetch the current user's progress across all enrolled courses.

```
GET /api/maps/courses/progress
Authorization: Bearer <token>
```

**Response** `200 OK`
```jsonc
{
  "ok": true,
  "data": {
    "enrollments": [
      {
        "courseId": "bitdance-2602",
        "enrolledAt": "2026-02-18T10:30:00Z",
        "currentStage": 2,
        "totalStages": 5,
        "completedStages": [
          {
            "stageNumber": 1,
            "score": 85,
            "completedAt": "2026-02-18T11:15:00Z",
            "attestationHash": "0xabc...",
            "txHash": "0xdef..."
          }
        ],
        "totalPaid": "0.002 KITE"
      }
    ]
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

### Village Map Generator (`src/lib/tmj/village-generator.ts`)

Generates village TMJ maps dynamically from the course list using the plot grid system. When the backend API is unavailable, the frontend uses this generator locally. Key exports:

```typescript
computeGridLayout(courseCount: number): GridLayout
assignCoursesToGrid(courses: CourseInput[]): { layout, assignments }
generateVillageTmj(layout, assignments): TmjMap
generateCourseLocations(courses, assignments): CourseLocation[]
```

### useVillageMap Hook (`src/hooks/useVillageMap.ts`)

React hook that generates `ParsedMap` from `courseLocations` using the village generator. Returns `{ mapData, mapDimensions, gridLayout }`. Memoized — only regenerates when courses change.

### TMJ Type Definitions (`src/types/tmj.ts`)

Full TypeScript types for the raw TMJ format and parsed output. The backend's TMJ output MUST conform to the `TmjMap` interface.

### Renderer (`src/lib/tmj/renderer.ts`)

Color-based tile renderer. Reads `color` property from tileset tile definitions and fills rectangles. No image/sprite rendering yet.

### VillageCanvas (`src/components/village/VillageCanvas.tsx`)

Main rendering component. Uses `useVillageMap(courseLocations)` for dynamically generated TMJ map. Map dimensions are always dynamic (never hardcoded). Supports both TMJ-based rendering and procedural fallback.

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

> Currently the frontend uses 6 hardcoded paper data entries via `MockPapersAdapter`.
> Once the API below is implemented, the mock in `src/lib/adapters/papers.ts` will be replaced with actual API calls.

### 6. Retrieve Trending Papers List

Called from the Explore page. Returns a list of trending papers by time period.

```
GET /api/papers?period=daily&limit=20&offset=0
```

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `period` | `daily` \| `weekly` \| `monthly` | `daily` | Trending period |
| `limit` | number | `20` | Number of items to return per request |
| `offset` | number | `0` | Pagination offset |

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
        "submittedBy": "taesiri",               // Submitter username
        "totalStages": 5                        // Number of course stages
      }
      // ...
    ],
    "total": 142,                               // Total number of papers
    "hasMore": true
  }
}
```

**Frontend Adapter Interface** (`src/lib/adapters/papers.ts`)
```typescript
fetchTrendingPapers(period: 'daily' | 'weekly' | 'monthly'): Promise<Paper[]>
```

---

### 7. Search Papers

Searches papers by query. Searches against title, description, and author names.

```
GET /api/papers/search?q=transformer&limit=20&offset=0
```

**Query Parameters**

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | (required) | Search query |
| `limit` | number | `20` | Number of results |
| `offset` | number | `0` | Pagination offset |

**Response** `200 OK`
```jsonc
{
  "ok": true,
  "data": {
    "papers": [ /* Paper[] — same format as above */ ],
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

### 8. Retrieve Paper Details

Returns detailed information for a single paper. Called when entering the Learn page.

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
| `404` | Paper with the given paperId does not exist |

**Frontend Adapter Interface**
```typescript
getPaperById(id: string): Promise<Paper | null>
```

---

### Paper Type Definition (Reference)

Frontend `src/types/paper.ts`:

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
  thumbnailUrl: string;                    // Paper thumbnail image path
  arxivUrl: string;                        // arXiv link
  githubUrl?: string;                      // GitHub repo URL (nullable)
  githubStars?: number;                    // GitHub star count (nullable)
  organization?: { name: string; logoUrl: string };  // Affiliated organization (nullable)
  submittedBy: string;                     // Submitter username
  totalStages: number;                     // Total number of course stages
}
```

---

### Discussion Items for Paper Data Sources

The 6 papers currently hardcoded in the frontend are mock data based on Papers with Code / arXiv. To provide a paper catalog from the backend, the following decisions are needed:

1. **Data Source**: Which approach — arXiv API crawling, Hugging Face Daily Papers API, or direct DB management?
2. **Course Linking**: The relationship between papers (`Paper`) and generated courses (`Course`) — is it 1:1, or can one paper have multiple courses?
3. **Trending Criteria**: How are daily/weekly/monthly trending rankings calculated? (GitHub stars, arXiv citations, in-platform learning count, etc.)
4. **Thumbnails**: Where are paper thumbnail images hosted? (Automatic extraction from arXiv figures, manual upload, or placeholder)
5. **Submission**: Is there a flow for users to submit new papers? (If so, a `POST /api/papers` endpoint needs to be added)

---

## Constraints & Assumptions

1. **Map size**: Village map size is dynamic, computed as cols × 18 by rows × 14 tiles based on course count. The frontend generates the TMJ at runtime. The backend, when returning maps, MUST set TMJ width/height fields to match.

2. **Tile size**: Fixed at 16x16 pixels in the TMJ. The frontend renders at a configurable display tile size (currently 40px).

3. **Coordinate system**: Origin (0,0) is top-left. X increases rightward, Y increases downward.

4. **Course placement**: The backend is responsible for finding a non-overlapping position on the village map for new dungeon entrances. If the frontend provides a `placement` hint, the backend should use it if possible.

5. **Async building**: Course generation may take 30-120 seconds (repo clone + analysis + map generation). The API uses a polling pattern, not WebSocket.

6. **AIN blockchain**: Course locations are also written to the AIN blockchain at `/apps/knowledge/courses/{paperId}`. The backend should call `ain.db.ref().setValue()` after placing a dungeon. The frontend reads these on load for cached positions.

7. **Backward compatibility**: If the backend map API is unavailable, the frontend falls back to procedural rendering (hardcoded paths and checkerboard grass).
