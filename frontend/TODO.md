# Papers LMS Frontend — Development TODO

> Comprehensive step-by-step implementation plan for the Papers LMS platform.
> All work is conducted in English.

---

## Legend

- `[ ]` — Not started
- `[x]` — Completed
- `🔌 ADAPTER` — Backend/external dependency. Build an adaptable interface only. Do NOT implement the actual backend logic. Spec will be provided later.
- `⚠️ NEEDS_INPUT` — Requires additional information or assets from the team.
- `🔗 CROSS-TEAM` — Requires coordination with other team members (backend, infra, blockchain).

---

## Phase 0: Project Initialization

- [ ] Initialize Next.js 15 project with App Router and TypeScript
  - `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir`
- [ ] Install core dependencies
  - `zustand` — State management
  - `@shadcn/ui` setup — UI component library
  - `lucide-react` — Icons
  - `class-variance-authority`, `clsx`, `tailwind-merge` — Styling utilities
- [ ] Configure project structure
  ```
  src/
  ├── app/
  │   ├── layout.tsx
  │   ├── page.tsx              → redirect to /explore
  │   ├── login/page.tsx
  │   ├── explore/page.tsx
  │   ├── dashboard/page.tsx
  │   ├── publish/page.tsx
  │   ├── learn/[paperId]/page.tsx   → 60/40 split learning view
  │   └── village/page.tsx           → 2D village map
  │   └── api/                       → API route adapters
  ├── components/
  │   ├── ui/                   → shadcn base components
  │   ├── layout/               → Header, Sidebar, Footer
  │   ├── explore/              → Paper cards, search, filters
  │   ├── learn/                → Dungeon view, terminal, stages
  │   ├── village/              → Tilemap, characters, minimap
  │   └── shared/               → Notifications, modals, loaders
  ├── stores/                   → Zustand stores
  ├── hooks/                    → Custom React hooks
  ├── lib/                      → Utilities, API clients, adapters
  ├── types/                    → TypeScript type definitions
  ├── constants/                → Game constants, config values
  └── providers/                → React context providers
  ```
- [ ] Configure Tailwind CSS with design tokens from README
  - Primary: `#FF9D00`, Text: `#111827`, Secondary: `#6B7280`, Border: `#E5E7EB`
- [ ] Set up path aliases in `tsconfig.json` (`@/` → `src/`)
- [ ] Create `.env.local` template with all required environment variables
- [ ] Set up `lib/utils.ts` with `cn()` helper (clsx + tailwind-merge)

---

## Phase 1: Global Layout & Authentication

### 1.1 Header Component
- [ ] Build `Header` component matching the design spec
  - Logo (left) — links to `/explore`
  - Navigation menu — Explore, Dashboard, Village, Publish
  - Auth area (right) — GitHub login button or user avatar dropdown
- [ ] Implement responsive hamburger menu for mobile

### 1.2 GitHub OAuth Authentication
- [ ] `🔌 ADAPTER` Set up NextAuth.js with GitHub provider
  - Create `app/api/auth/[...nextauth]/route.ts`
  - Configure GitHub OAuth credentials (env vars)
  - Create `lib/auth.ts` adapter with session interface
- [ ] Build `/login` page with GitHub sign-in button
- [ ] Create `AuthProvider` wrapper in providers
- [ ] Build `useAuth` hook for session access
- [ ] Implement `AuthGuard` component for protected routes
  - `/dashboard`, `/learn/*`, `/village` require authentication
  - `/explore` accessible without login (but "Learn" button requires auth)

---

## Phase 2: Explore Page (Paper Discovery)

### 2.1 Page Layout
- [ ] Build `/explore` page with Hero Section
  - `h1` "Explore Papers" + subtitle
  - AI search bar (placeholder UI — actual search is `🔌 ADAPTER`)
  - Period filter tabs: Daily | Weekly | Monthly

### 2.2 Paper Card Component
- [ ] Create `PaperCard` component (3-column layout)
  - **Thumbnail** (left, ~160x200px): Paper preview image with border-radius 8px
    - Bottom overlay: submitter info
    - Top-right: organization badge (optional)
  - **Content** (center, flex-grow):
    - Title (h3, bold, 18-20px, links to paper detail)
    - Description (gray, 14px, max 2 lines, truncated)
    - Author avatars (circular, ~20px) + "N authors"
    - Published date
    - Organization badge (optional)
  - **Action Buttons** (right, ~140px):
    - `Learn (Claude Code)` button — **PRIMARY ACTION**, replaces Upvote
      - Orange/accent colored, prominent
      - Click → navigate to `/learn/[paperId]`
      - Requires auth (redirect to login if not authenticated)
    - `GitHub ★ [N]` — outline button, links to repo
    - `arXiv Page` — outline button, links to arXiv

### 2.3 Paper Data
- [ ] `🔌 ADAPTER` Create `lib/api/papers.ts` — Paper data fetching adapter
  - Interface: `fetchTrendingPapers(period: 'daily'|'weekly'|'monthly'): Promise<Paper[]>`
  - Interface: `searchPapers(query: string): Promise<Paper[]>`
  - Interface: `getPaperById(id: string): Promise<Paper>`
  - Use mock data for development (hardcoded array of ~10 papers)
  - Type definition: `types/paper.ts`
    ```typescript
    interface Paper {
      id: string;
      title: string;
      description: string;
      authors: Author[];
      publishedAt: string;
      thumbnailUrl: string;
      arxivUrl: string;
      githubUrl?: string;
      githubStars?: number;
      organization?: { name: string; logoUrl: string };
      submittedBy: string;
      stages?: StageConfig[];  // dungeon stage definitions
    }
    ```

### 2.4 Paper List with Infinite Scroll
- [ ] Implement paper list with vertical card stacking
- [ ] Add loading skeleton for cards
- [ ] `🔌 ADAPTER` Pagination/infinite scroll adapter

---

## Phase 3: Learning View (60/40 Split — Core Feature)

### 3.1 Split Layout
- [ ] Build `/learn/[paperId]` page with 60/40 horizontal split
  - **Left panel (60%)**: Dungeon/Stage canvas view
  - **Right panel (40%)**: Claude Code web terminal
  - Resizable divider (optional enhancement)
- [ ] Top bar within learning view:
  - Paper title / dungeon name
  - Current stage indicator: "Stage 1/7"
  - Progress bar: "16% complete"
  - Exit button → navigate back to `/explore` or `/village`

### 3.2 Dungeon Canvas (Left 60%)
- [ ] Create `DungeonCanvas` component using HTML5 Canvas
  - Render tilemap for current stage room
  - Render player character (blue sprite)
  - Render interactive objects (blackboards with concepts)
  - Render door/gate to next stage (locked/unlocked state)
  - Render friend characters in same dungeon (if any)
- [ ] Stage room layout system
  - Each stage = a room with defined tile layout
  - Blackboard objects placed at specific positions with learning content
  - Door object at room exit with lock icon
  - Stage title displayed at top: "Stage 1: Basic Concepts Room"
- [ ] Player character
  - Keyboard movement (WASD / Arrow keys)
  - Collision detection with walls and objects
  - Interaction trigger when near objects (press E or click)
- [ ] Object interaction
  - Walk near blackboard → highlight interaction prompt
  - Interact → display concept content in overlay/modal
  - Concepts are derived from the paper content for that stage

### 3.3 Claude Code Web Terminal (Right 40%)
- [ ] `🔌 ADAPTER` Create `ClaudeTerminal` component
  - Terminal-like UI with dark background, monospace font
  - Input area at bottom for user messages
  - Scrollable message history area
  - Support markdown rendering in responses
  - Interface for sending/receiving messages:
    ```typescript
    interface TerminalAdapter {
      sendMessage(message: string, context: StageContext): Promise<void>;
      onResponse(callback: (chunk: string) => void): void;
      disconnect(): void;
    }
    ```
  - `⚠️ NEEDS_INPUT` Claude Code API integration spec needed
  - For development: mock responses with stage-relevant content
- [ ] Stage context integration
  - Terminal knows which paper and stage the user is on
  - Provides contextual hints and learning guidance
  - Can present quiz questions when stage learning is complete

### 3.4 Stage Progression System
- [ ] Define `StageConfig` type
  ```typescript
  interface StageConfig {
    id: string;
    stageNumber: number;
    title: string;           // "Basic Concepts Room"
    concepts: Concept[];     // blackboard content
    quiz: Quiz;              // gate quiz
    tileLayout: TileLayout;  // room layout data
  }
  interface Concept {
    id: string;
    title: string;           // displayed on blackboard
    content: string;         // detailed explanation
  }
  interface Quiz {
    question: string;
    type: 'multiple-choice' | 'code-challenge' | 'free-response';
    options?: string[];
    correctAnswer?: string;
    validationFn?: string;   // for code challenges
  }
  ```
- [ ] `🔌 ADAPTER` Stage data fetching
  - `getStagesForPaper(paperId: string): Promise<StageConfig[]>`
  - Mock: generate 3-7 stages per paper
- [ ] Quiz gate interaction
  - Player approaches locked door → quiz prompt appears
  - Quiz presented via Claude Code terminal (right panel)
  - On correct answer → door unlocks with animation
  - On incorrect → hint provided, allow retry
- [ ] Stage transition
  - Player walks through unlocked door → load next stage room
  - Camera/viewport transitions to new room
  - Update progress bar and stage indicator

### 3.5 x402 Payment for Stage Unlock
- [ ] `🔌 ADAPTER` `🔗 CROSS-TEAM` Create `lib/adapters/x402.ts`
  - Interface for x402 protocol payment:
    ```typescript
    interface X402PaymentAdapter {
      requestPayment(params: {
        stageId: string;
        paperId: string;
        amount: number;
        currency: string;
      }): Promise<PaymentResult>;
      verifyPayment(receiptId: string): Promise<boolean>;
    }
    ```
  - Mock implementation: auto-approve for development
  - Payment triggered when user attempts to unlock next stage door
  - Show payment confirmation modal before proceeding
- [ ] Payment UI modal
  - Display cost for next stage
  - "Unlock Stage N" button
  - Processing state with spinner
  - Success/failure feedback

### 3.6 Checkpoint & Progress Persistence
- [ ] `🔌 ADAPTER` `🔗 CROSS-TEAM` Create `lib/adapters/progress.ts`
  - Interface for checkpoint save/load:
    ```typescript
    interface ProgressAdapter {
      saveCheckpoint(data: {
        userId: string;
        paperId: string;
        stageId: string;
        stageNumber: number;
        completedAt: string;
        quizScore?: number;
      }): Promise<void>;
      loadProgress(userId: string, paperId: string): Promise<UserProgress>;
      loadAllProgress(userId: string): Promise<UserProgress[]>;
    }
    interface UserProgress {
      paperId: string;
      currentStage: number;
      totalStages: number;
      completedStages: CompletedStage[];
      lastAccessedAt: string;
    }
    ```
  - `⚠️ NEEDS_INPUT` DB schema and API spec will be provided later
  - Mock: use localStorage for development
- [ ] Auto-save on stage clear
- [ ] Load progress on `/learn/[paperId]` mount → resume from last checkpoint
- [ ] Show progress on Explore page cards (if user has started a paper)

---

## Phase 4: Village View (2D Tilemap World)

### 4.1 Village Tilemap
- [ ] Build `/village` page with full-screen 2D tilemap
  - Canvas-based rendering (reuse AINSpace pattern)
  - Village layout with buildings representing paper dungeons
  - Player character navigation (WASD / Arrow keys)
  - Collision detection with buildings and terrain
- [ ] Top bar:
  - "LMS Logo | My Classroom | Currently studying: [Paper] Dungeon | Progress: N%"
- [ ] Left sidebar (icon menu):
  - Dashboard, Course Enrollment, Customization, Community

### 4.2 Dungeon Entrances
- [ ] Each paper = a dungeon building on the map
  - Building with label: "[Paper Topic] Dungeon Entrance"
  - Visual distinction per topic (different building styles/colors)
  - Interaction: walk to entrance → prompt to enter → navigate to `/learn/[paperId]`
- [ ] `🔌 ADAPTER` Fetch available dungeons (= papers the user has enrolled in or all trending papers)

### 4.3 Dynamic Map Generation with Gemini API
- [ ] `🔌 ADAPTER` Create `lib/adapters/gemini-map.ts`
  - Interface for dynamic map tile generation:
    ```typescript
    interface GeminiMapAdapter {
      generateMapTile(params: {
        baseImage: string;     // reference image path
        maskImage: string;     // mask for outpainting region
        prompt: string;        // generation prompt (e.g., "medieval village tile")
        position: { x: number; y: number };
      }): Promise<string>;     // returns generated tile image URL
    }
    ```
  - `⚠️ NEEDS_INPUT` Reference mask images in `reference/` directory
  - Outpainting approach: use existing reference images as base, mask edges for Gemini to extend
  - Mock: use static pre-made tiles for development
- [ ] Tile caching system
  - Cache generated tiles in memory and/or `🔌 ADAPTER` blob storage
  - Only regenerate when new dungeon area is needed

### 4.4 Right Sidebar — Social & Leaderboard
- [ ] Friends online panel
  - List of friends currently in the village
  - Each friend: avatar + name + current dungeon/stage status
  - Online indicator (green dot / red busy)
- [ ] Leaderboard
  - Ranked by learning progress (stages cleared)
  - Format: "1. FriendB (RL St.3) / 2. FriendA (DL St.2) / 3. Me (RL St.1)"
- [ ] World map / minimap (bottom-right)
  - Small overview of entire village
  - Colored regions per topic area
  - Player position indicator

### 4.5 Friend Characters on Map
- [ ] `🔌 ADAPTER` `🔗 CROSS-TEAM` Real-time friend positions
  - Interface:
    ```typescript
    interface FriendPresenceAdapter {
      subscribeToFriendPositions(callback: (friends: FriendPosition[]) => void): void;
      updateMyPosition(position: { x: number; y: number; scene: string }): void;
      unsubscribe(): void;
    }
    interface FriendPosition {
      userId: string;
      username: string;
      avatarUrl: string;
      position: { x: number; y: number };
      currentScene: 'village' | 'dungeon';
      currentPaperId?: string;
      currentStage?: number;
    }
    ```
  - Mock: spawn 2-3 fake friends at static positions
- [ ] Render friend sprites on the village map
- [ ] Speech bubbles showing friend activity ("Stage 3 cleared! 🏆")

---

## Phase 5: Social Features & Notifications

### 5.1 Friend Stage Clear Notifications
- [ ] `🔌 ADAPTER` `🔗 CROSS-TEAM` Notification system
  - Interface:
    ```typescript
    interface NotificationAdapter {
      subscribeToNotifications(callback: (notif: Notification) => void): void;
      unsubscribe(): void;
    }
    interface Notification {
      type: 'stage_clear' | 'friend_join' | 'achievement';
      userId: string;
      username: string;
      message: string;          // "cleared Stage 3 of RL Dungeon!"
      paperId?: string;
      stageNumber?: number;
      timestamp: string;
    }
    ```
  - Mock: trigger fake notifications on timer for development
- [ ] Toast notification component
  - Appears at top-right of screen
  - Animated slide-in, auto-dismiss after 5 seconds
  - Shows friend avatar + message
  - Clickable → navigate to friend's dungeon/location

### 5.2 Friends List & Status
- [ ] `🔌 ADAPTER` Friends data adapter
  - `getFriends(userId: string): Promise<Friend[]>`
  - `getFriendStatus(friendId: string): Promise<FriendStatus>`
- [ ] Display friends in right sidebar (village) and top bar (dungeon)

---

## Phase 6: Dashboard Page

### 6.1 User Dashboard
- [ ] Build `/dashboard` page
  - User profile summary (avatar, name, GitHub link)
  - Learning statistics:
    - Total papers started
    - Total stages cleared
    - Current streaks
  - Active courses list (papers in progress)
    - Paper title + progress bar + "Continue" button
  - Completed courses list
  - Recent activity feed

### 6.2 Dashboard Data
- [ ] `🔌 ADAPTER` Dashboard data aggregation
  - Uses `ProgressAdapter.loadAllProgress()` for learning data
  - Uses `FriendPresenceAdapter` for social data

---

## Phase 7: Zustand State Management

- [ ] Create `stores/useAuthStore.ts` — User session state
- [ ] Create `stores/useExploreStore.ts` — Paper list, filters, search
- [ ] Create `stores/useLearningStore.ts` — Current paper, stage, progress, quiz state
- [ ] Create `stores/useVillageStore.ts` — Player position, viewport, scene
- [ ] Create `stores/useSocialStore.ts` — Friends, notifications, leaderboard
- [ ] Create `stores/useUIStore.ts` — Modals, sidebars, active tab, toast queue

---

## Phase 8: Publish Page (Placeholder)

- [ ] Build `/publish` page with "Coming Soon" / "To be continued" message
- [ ] Basic layout matching global header/footer style

---

## Phase 9: Integration & Polish

### 9.1 Route Guards & Navigation
- [ ] Implement middleware for auth-protected routes
- [ ] Add loading states for all page transitions
- [ ] Add error boundaries for each major section

### 9.2 Responsive Design
- [ ] Mobile layout for Explore page (1-column card stack)
- [ ] Mobile layout for Learning view (stacked: dungeon on top, terminal below)
- [ ] Mobile layout for Village (full-screen map, collapsible sidebar)
- [ ] Hamburger menu for mobile header

### 9.3 Animations & Transitions
- [ ] Page transition animations
- [ ] Stage door unlock animation
- [ ] Notification toast slide-in/out
- [ ] Character movement smoothing
- [ ] Progress bar animations

### 9.4 Performance
- [ ] Canvas rendering optimization (requestAnimationFrame, dirty rect)
- [ ] Image lazy loading for paper thumbnails
- [ ] Code splitting per route
- [ ] Preload adjacent stage data

---

## Phase 10: Playwright E2E Testing

### 10.1 Test Scenarios
- [ ] **Flow 1**: Navigate to `/explore` → verify paper cards render
- [ ] **Flow 2**: Click "Learn (Claude Code)" on a paper card → verify redirect to `/learn/[paperId]`
- [ ] **Flow 3**: Verify 60/40 split layout renders (dungeon left, terminal right)
- [ ] **Flow 4**: Verify stage title and progress bar display correctly
- [ ] **Flow 5**: Test keyboard movement in dungeon canvas
- [ ] **Flow 6**: Test object interaction (blackboard click → concept overlay)
- [ ] **Flow 7**: Test quiz gate interaction → unlock → stage transition
- [ ] **Flow 8**: Test exit from dungeon → navigate to village
- [ ] **Flow 9**: Verify village tilemap renders with dungeon entrances
- [ ] **Flow 10**: Verify friend positions and notifications display
- [ ] **Flow 11**: Test navigation between all pages (Explore, Dashboard, Village, Publish)
- [ ] **Flow 12**: Test auth guard — unauthenticated user redirected to login

### 10.2 Error Recovery
- [ ] Run each test, capture errors
- [ ] Fix errors and re-run until all tests pass
- [ ] Document any remaining issues that require backend integration

---

## Adapter Summary (Do NOT Implement Backend)

| Adapter | File | Purpose | Dependency |
|---------|------|---------|------------|
| Papers API | `lib/adapters/papers.ts` | Fetch/search papers | Backend API |
| Auth | `lib/adapters/auth.ts` | GitHub OAuth | NextAuth + GitHub |
| Progress/Checkpoint | `lib/adapters/progress.ts` | Save/load learning progress | Database |
| x402 Payment | `lib/adapters/x402.ts` | Stage unlock payment | x402 Protocol |
| Claude Terminal | `lib/adapters/claude-terminal.ts` | AI chat for learning | Claude Code API |
| Friend Presence | `lib/adapters/friends.ts` | Real-time friend positions | WebSocket/SSE server |
| Notifications | `lib/adapters/notifications.ts` | Stage clear alerts | Push/SSE server |
| Gemini Map | `lib/adapters/gemini-map.ts` | Dynamic map tile generation | Gemini API |
| Stage Data | `lib/adapters/stages.ts` | Paper → stage/quiz content | Backend API / AI generation |

> All adapters export a TypeScript interface + a mock implementation for local development.
> Replace mock implementations with real API calls when backend specs are provided.

---

## Items Needing Input (⚠️ NEEDS_INPUT)

1. **Claude Code API spec** — How to connect the web terminal to Claude Code backend
2. **DB schema for progress** — Checkpoint storage format and API endpoints
3. **x402 protocol details** — Payment flow, amounts, currency
4. **Gemini API mask images** — Reference images for outpainting (partially in `reference/`)
5. **Paper stage content** — How stages are generated from papers (AI-generated or manual?)
6. **Friend system backend** — WebSocket vs SSE, presence protocol
7. **Paper data source** — HuggingFace API, custom backend, or static data?
