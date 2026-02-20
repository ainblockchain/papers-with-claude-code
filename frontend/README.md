# Frontend

A Next.js-based web application for paper exploration and knowledge graph learning platform.

## Tech Stack

- **Framework**: Next.js (App Router)
- **Authentication**: GitHub OAuth

## Core Features

| Feature | Route | Description |
|---------|-------|-------------|
| **GitHub Login** | `/login` | Social login via GitHub OAuth |
| **My Dashboard** | `/dashboard` | User personal dashboard. Learning statistics, papers in progress, activity history |
| **Explore** | `/explore` | Paper search and exploration (HuggingFace Papers style). Start learning with the "Learn (Claude Code)" button |
| **Learn** | `/learn/[paperId]` | 60/40 split learning view — left dungeon canvas + right Claude Code web terminal |
| **Village** | `/village` | 2D tilemap village. Subject-specific dungeon entrances, friend locations, leaderboard, world map |
| **Publish** | `/publish` | _To be continued_ |

---

## User Flow

> Full user experience flow. See `TODO.md` for detailed implementation specs.

```
[Explore Page]                    [Learning View]                     [Village]
┌─────────────┐   "Learn" click  ┌──────────┬──────────┐            ┌──────────┐
│ Paper Cards │ ──────────────→  │ Course  │ Claude   │  Exit       │ 2D       │
│ (HF style)  │                  │ Canvas   │ Code     │  dungeon   │ Village  │
│             │                  │ (60%)    │ Terminal │ ─────────→ │ Dungeon  │
│ [Learn ▶]  │                  │          │ (40%)    │            │ Entrance │
│ [GitHub ★] │                  │ Stage 1  │Learn+Quiz│            │ Friends  │
│ [arXiv]    │                  │   ↓      │          │            │Leaderboard│
│             │                  │ Stage 2  │          │            │ Alerts   │
│             │                  │   ↓ ...  │          │            │          │
└─────────────┘                  └──────────┴──────────┘            └──────────┘
                                       │                                  │
                                       │  Unlock next stage               │
                                       │  via x402 payment                │
                                       │                                  │
                                  [Save to Checkpoint DB]         [Receive friend alerts]
```

### Flow Detail

1. **Explore** — Users browse papers in a UI similar to HuggingFace Papers Trending
2. **Learn Button** — Clicking the "Learn (Claude Code)" button on a paper card navigates to `/learn/[paperId]`
3. **60/40 Split View** — Left 60% is a 2D dungeon canvas, right 40% is a Claude Code web terminal
4. **Stage Learning** — Users learn concepts by interacting with chalkboard objects in the dungeon, and deepen learning by chatting with AI in the Claude Code terminal
5. **Quiz Gate** — Must pass a quiz to move to the next room upon stage completion
6. **x402 Payment** — Unlock the locked door to the next stage via x402 protocol payment
7. **Checkpoint** — Checkpoint saved to DB each time a stage is cleared. Progress persists even after leaving and returning
8. **Exit to Village** — Exiting the dungeon moves to the 2D village view. Dungeon buildings for various paper topics are placed on the map
9. **Social** — Friend character locations visible in village/dungeon. Alert popup when a friend clears a stage
10. **Dynamic Map** — Village map is dynamically generated using outpainting via the Gemini API

---

## UI Layout & Design Reference

> UI layout and design specification analyzed using the Hugging Face Papers Trending page (https://huggingface.co/papers/trending) as reference.

### Overall Page Structure (Based on Explore Page)

The page consists of **Header (navigation bar)**, **Hero Section (page header)**, and **Paper List**. Background is `#FFFFFF` white, and max content width is approximately 1280px, center-aligned.

```
┌──────────────────────────────────────────────────────────────────────┐
│  [Logo]                    [Nav Items]          [GitHub Login/Avatar]│  ← Header
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  Explore Papers             [AI Search Bar]    Daily|Weekly|Monthly  │  ← Hero Section
│  Discover the latest research                                        │
│                                                                      │
├──────────────────────────────────────────────────────────────────────┤
│  ┌─────────┐                                     ┌────────────────┐ │
│  │Thumbnail│  Title (h3, bold, link)             │ [★ GitHub   N] │ │
│  │         │  Description (gray, 1-2 lines)      │ [arXiv Page]   │ │  ← Paper Card
│  │         │  Authors · Published on Date         └────────────────┘ │
│  └─────────┘                                                         │
│  ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  │
│  ┌─────────┐                                     ┌────────────────┐ │
│  │Thumbnail│  Title                              │ [★ GitHub   N] │ │
│  │         │  Description                        │ [arXiv Page]   │ │  ← Paper Card
│  │         │  Authors · Published on Date         └────────────────┘ │
│  └─────────┘                                                         │
│  ...                                                                 │
└──────────────────────────────────────────────────────────────────────┘
```

---

### 1. Header (Global Navigation Bar)

| Element | Description |
|---------|-------------|
| **Logo** | Top left. Icon + service name. Links to home (`/`) |
| **Navigation Menu** | Horizontal alignment: Explore, Dashboard, Publish |
| **Auth Area** | When not logged in: "Login with GitHub" button. When logged in: User avatar + dropdown menu |

- Height: approx. 48~56px
- Background: `#FFFFFF`, subtle border/shadow at the bottom
- Font: 14~15px, medium weight

---

### 2. Hero Section (Explore Page Header)

Left-right 2-column layout:

**Left:**
- `h1` "Explore Papers" — bold, approx. 28~32px, black
- Subtitle — gray, approx. 14px

**Right:**
- **AI Search Bar**: Icon + placeholder "Search any paper with AI". Rounded border, approx. 400px width
- **Period Filter Tabs**: `Daily` | `Weekly` | `Monthly` — text buttons, bold/underline when selected

---

### 3. Paper Card (Core Repeated Component)

Each card is an `<article>` element arranged vertically. Cards are separated by a thin border-top (`1px solid #E5E7EB`).

#### Layout: 3-Column Structure

```
[Thumbnail]  [Content Area]                              [Action Buttons]
  ~160px         flex-grow                                  ~120px
```

#### 3-1. Thumbnail (Left)

- Paper first page preview image
- Size: approx. 160x200px
- border-radius: 8px
- Bottom overlay: Submitter info ("Submitted by @username") — semi-transparent background
- Top right: Organization badge (e.g., "Google", "IBM Granite") — rounded pill

#### 3-2. Content Area (Center)

| Element | Style |
|---------|-------|
| **Title** | `h3`, bold, approx. 18~20px, black. Navigates to paper detail on click |
| **Description** | Gray (`#6B7280`), 14px, max 2 lines. Paper summary |
| **Author List** | Avatar icons (circular, ~20px) listed + "N authors" text |
| **Published Date** | "· Published on Feb 15, 2026" — gray, 14px |
| **Organization Badge** | (Some cards) Organization logo + name pill |

#### 3-3. Action Buttons (Right)

2 buttons vertically aligned:

| Button | Style |
|--------|-------|
| **GitHub** | `★ GitHub [N]` — outline button, showing star count. Links to GitHub repository |
| **arXiv Page** | `arXiv Page` — outline button, arXiv paper link |

- Button width: approx. 120~140px
- Spacing: 4~8px between buttons
- Style: light gray border, white background, background color change on hover

---

### 4. Design Token Summary

| Token | Value |
|-------|-------|
| **Primary Color** | `#FF9D00` (orange — main accent) |
| **Text Primary** | `#111827` (near black) |
| **Text Secondary** | `#6B7280` (gray — descriptions, dates, authors) |
| **Border Color** | `#E5E7EB` (card separator) |
| **Background** | `#FFFFFF` |
| **Border Radius** | 8px (cards, buttons), 9999px (pill/badge) |
| **Font Family** | Source Sans Pro / system sans-serif |
| **Card Padding** | approx. 16~24px |
| **Content Max Width** | ~1280px, center-aligned |

---

### 5. Responsive Considerations

- Analyzed based on desktop (1920px); on mobile, 3-column transitions to 1-column stack layout
- Thumbnail at top, Content in middle, Action buttons at bottom
- Navigation collapses to hamburger menu

---

### 6. Reference Screenshots

- `huggingface-papers-trending.png` — Top of page (Header + Title + first 4 cards)
- `huggingface-papers-trending-scrolled.png` — Additional cards after scrolling

---

## AINSpace — LMS Restructuring Specification

> Restructuring the existing AINSpace (2D tilemap virtual village) infrastructure as an LMS (Learning Management System) concept while maintaining the existing infrastructure.

### Reference Images

- `reference/ainspace-lms-village.png` — Full village view (dungeon entrances, friends, leaderboard, world map)
- `reference/ainspace-lms-course.png` — Dungeon interior (stages, learning content, quiz gates)

### Overall Screen Structure

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ [LMS Logo]  My Classes | Currently Learning: XX Dungeon | Progress: 16% (Stage 1/7) [Profile]│ ← Top Bar
├────┬─────────────────────────────────────────────────────┬───────────────┤
│    │                                                         │ Friends Online│
│ Da │                                                         │  Friend A  St.2│
│ sh │              2D Tilemap Main View                       │  Friend B  St.3│
│ bo │         (Village / Dungeon Interior Switch)             │               │
│ ar │                                                         │ Leaderboard   │
│ d  │                                                         │  1. FriendB St.3│
│    │                                                         │  2. FriendA St.2│
│ En │                                                         │  3. Me    St.1 │
│ ro │                                                         │               │
│ ll │                                                         │               │
│    │                                                         │               │
│ Ou │                                                         │               │
│ tf │                                                         ├───────────────┤
│ it │                                                         │ [World Map/   │
│    │                                                         │  Stage Map]   │
│ Co │                                                         │               │
│ mm │                                                         │               │
│ un │                                                         │               │
│ ity│                                                         │               │
├────┴─────────────────────────────────────────────────────┴───────────────┤
```

### 1. Top Bar (Top Navigation)

| Element | Description |
|---------|-------------|
| **LMS Logo** | Left side. Navigates to home |
| **My Classes** | Navigates to enrolled courses list page |
| **Current Learning Status** | "Currently Learning: Reinforcement Learning Dungeon" — shows current activity context |
| **Progress** | "Progress: 16% (Stage 1/7)" — progress indicator |
| **Profile** | Right end. User avatar |

### 2. Left Sidebar

Icon + text vertical menu:

| Menu | Description |
|------|-------------|
| **Dashboard** | Learning status summary, statistics |
| **Enrollment** | Browse and enroll in new courses (dungeons) |
| **Outfits** | Character customization |
| **Community** | Social features, chat |

### 3. Main View — Village

Restructuring the existing AINSpace 2D tilemap as a learning village:

| Element | Description |
|---------|-------------|
| **Dungeon Entrances** | Each course is represented as a dungeon. e.g., "Deep Learning (DL) Dungeon Entrance", "Reinforcement Learning (RL) Dungeon Entrance", "A2A Dungeon Entrance". Placed on the map as buildings |
| **Player Character** | User avatar (blue character) walks around the village |
| **Friend Characters** | Friends connected to the same village visible in real-time. Share progress status via speech bubbles ("Stage 3 cleared!") |
| **NPC / Guide** | Learning guide character (optional) |

### 4. Main View — Dungeon Interior (Course Stage)

Entering a dungeon entrance transitions to that course's learning space:

| Element | Description |
|---------|-------------|
| **Stage Rooms** | "Stage 1: Room of Basic Concepts" — each room is one learning step |
| **Learning Content** | Key concepts displayed on chalkboard objects (e.g., "Agent", "Reward"). Detailed learning materials accessible on interaction |
| **Quiz Gate** | Locked before the door to the next stage. "Move to Stage 2 (quiz required)" — must pass quiz to proceed |
| **Inter-stage Movement** | Connected to next stage via doors. Linear progression (St.1 -> St.2 -> St.3 -> ...) |
| **Friends in Same Dungeon** | Friends in the same dungeon are visible. Real-time location sharing |

### 5. Right Sidebar

Content switches depending on context:

**Village View:**

| Element | Description |
|---------|-------------|
| **Friends Online** | List of currently connected friends + each one's current stage (online / busy) |
| **Leaderboard** | Learning progress ranking. "1. FriendB (RL St.3) / 2. FriendA (DL St.2) / 3. Me (RL St.1)" |
| **World Map** | Bottom right. Shows dungeon locations by subject on a minimap. RL, DL, A2A areas distinguished by color |

**Dungeon Interior:**

| Element | Description |
|---------|-------------|
| **Friends in Same Dungeon** | List of friends in the same dungeon + each one's stage |
| **Stage Map** | Bottom right. Stage progression flowchart of the current dungeon (St.1 -> St.2 -> St.3). Shows current position, friend positions |

### 6. Core LMS Learning Flow

```
Enrollment -> Move to dungeon entrance in village -> Enter dungeon
  -> Stage 1 (basic concept learning, chalkboard interaction)
  -> Pass quiz -> Enter Stage 2
  -> ... repeat ...
  -> Clear final stage -> Course completed
```

### 7. Features Retained from Existing AINSpace

| Feature | Description |
|---------|-------------|
| **2D Tilemap Rendering** | Canvas-based tilemap, 3-layer system |
| **Character Movement** | Keyboard/touch-based movement, collision handling |
| **Wallet Authentication** | Coinbase Wallet integration, Base chain based |
| **Real-time Chat** | SSE-based streaming, speech bubbles |
| **Map Exploration** | Scene transitions between village/dungeon, minimap |
| **Character Customization** | Outfit/appearance changes |

---

# AINSpace Frontend - Complete Development Documentation (Handoff Document)

> **Project**: AINSpace — A Web3 Metaverse MiniApp where AI agents autonomously interact in a 2D virtual village
> **Version**: 1.0.3
> **Original Path**: `ain-space/ainspace`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Environment Setup and Running](#4-environment-setup-and-running)
5. [Architecture Overview](#5-architecture-overview)
6. [Routing Structure](#6-routing-structure)
7. [State Management (Zustand Stores)](#7-state-management-zustand-stores)
8. [Core Data Types](#8-core-data-types)
9. [Provider Hierarchy](#9-provider-hierarchy)
10. [Authentication System (AuthGuard)](#10-authentication-system-authguard)
11. [Page-by-Page Implementation Details](#11-page-by-page-implementation-details)
12. [Component Architecture](#12-component-architecture)
13. [Game System Details](#13-game-system-details)
14. [Agent System](#14-agent-system)
15. [Map Building System](#15-map-building-system)
16. [Chat and Threading System](#16-chat-and-threading-system)
17. [Custom Hooks Details](#17-custom-hooks-details)
18. [Utility Library](#18-utility-library)
19. [API Route Details](#19-api-route-details)
20. [External Service Integration](#20-external-service-integration)
21. [Styling System](#21-styling-system)
22. [Build and Deployment](#22-build-and-deployment)
23. [Core Behavior Flows](#23-core-behavior-flows)
24. [Configuration File Details](#24-configuration-file-details)
25. [Caveats and Known Issues](#25-caveats-and-known-issues)

---

## 1. Project Overview

AINSpace is a Web3 MiniApp where AI agents autonomously operate in a **2D tilemap-based virtual village**. Users connect their wallets, explore the village, import AI agents via the A2A (Agent-to-Agent) protocol, and chat with agents.

### Core Features

| Feature | Description |
|---------|-------------|
| **Wallet Authentication** | Coinbase Wallet integration, Base chain-based login |
| **2D Tilemap** | 105x105 tile map, Canvas rendering, 3-layer system |
| **AI Agents** | A2A protocol-based agent import/placement/conversation |
| **Map Building** | Item placement, collision map, custom tile publishing |
| **Real-time Chat** | SSE-based streaming, threaded conversations, broadcast |
| **Farcaster MiniApp** | Farcaster Frame SDK integration |

---

## 2. Tech Stack

### Core

| Category | Technology | Version |
|----------|------------|---------|
| **Framework** | Next.js (App Router) | 15.5.9 |
| **UI Library** | React | 19.1.0 |
| **Language** | TypeScript (strict mode) | ^5 |
| **State Management** | Zustand | 5.0.8 |
| **Styling** | Tailwind CSS v4 + PostCSS | ^4 |

### Web3 / Blockchain

| Technology | Purpose |
|------------|---------|
| **wagmi** (2.18.2) | React hooks for Ethereum |
| **viem** (2.38.3) | Ethereum utilities |
| **@coinbase/onchainkit** (latest) | Base chain integration, MiniKit |
| **@farcaster/miniapp-sdk** (0.2.1) | Farcaster frame integration |

### AI / Agent

| Technology | Purpose |
|------------|---------|
| **@a2a-js/sdk** (0.3.4) | Agent-to-Agent protocol |
| **@google/generative-ai** (0.24.1) | Gemini API |
| **openai** (6.2.0) | ChatGPT API |

### Backend / Storage

| Technology | Purpose |
|------------|---------|
| **redis** (5.8.2) | Data persistence (positions, tiles, agents, threads) |
| **@vercel/blob** (2.0.0) | File storage |
| **firebase-admin** (13.6.0) | Firebase backend services |

### UI Components

| Technology | Purpose |
|------------|---------|
| **lucide-react** | Icons |
| **react-joystick-component** | Mobile joystick |
| **react-sprite-animator** | Sprite animation |
| **react-markdown** | Markdown rendering |
| **vaul** | Drawer component |
| **@radix-ui/react-dialog** | Dialog |
| **class-variance-authority** | Component variants |

### DevTools

| Technology | Purpose |
|------------|---------|
| **@sentry/nextjs** (10.22.0) | Error tracking |
| **@vercel/analytics** (1.5.0) | Analytics |
| **eruda** (3.4.3) | Mobile debugging (dev environment only) |
| **sharp** (0.34.4) | Image processing |
| **prettier** + **prettier-plugin-tailwindcss** | Code formatting |

### Package Manager

```
yarn@1.22.19
```

---

## 3. Project Structure

```
ainspace/
├── public/
│   ├── map/                        # Tilemap image resources
│   │   ├── tiles/                  # 5x5 split tile images
│   │   │   └── land_layer_1/       # tile_0_0.webp ~ tile_4_4.webp
│   │   ├── land_layer_0.webp       # Base terrain layer
│   │   └── land_layer_1.webp       # Collision detection layer
│   ├── footer/bottomTab/           # Bottom tab icon SVGs
│   ├── login/                      # Login page images
│   └── items/                      # Item images
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout (Providers + AuthGuard)
│   │   ├── page.tsx                # Main game page (/)
│   │   ├── globals.css             # Global styles + Tailwind config
│   │   ├── login/
│   │   │   └── page.tsx            # Wallet login page
│   │   └── api/                    # Server-side API routes (19)
│   │       ├── agents/
│   │       │   ├── route.ts        # GET/POST/PUT/DELETE agent CRUD
│   │       │   └── upload-image/
│   │       │       └── route.ts    # Sprite image upload
│   │       ├── agent-chat/
│   │       │   └── route.ts        # A2A agent chat
│   │       ├── agent-proxy/
│   │       │   └── route.ts        # A2A card proxy
│   │       ├── agent-response/
│   │       │   └── route.ts        # Gemini AI response generation
│   │       ├── create-agent/
│   │       │   └── route.ts        # Create agent via AI prompt
│   │       ├── threads/
│   │       │   ├── route.ts        # GET/POST thread management
│   │       │   └── [id]/
│   │       │       └── route.ts    # GET/DELETE individual thread
│   │       ├── thread-message/
│   │       │   └── route.ts        # Thread message sending
│   │       ├── thread-stream/
│   │       │   └── [threadId]/
│   │       │       └── route.ts    # SSE streaming proxy
│   │       ├── custom-tiles/
│   │       │   └── route.ts        # GET/POST custom tiles
│   │       ├── position/
│   │       │   └── route.ts        # GET/POST player position
│   │       ├── commentary/
│   │       │   └── route.ts        # Gemini commentary generation
│   │       ├── clear-layer1/
│   │       │   └── route.ts        # Collision layer reset
│   │       ├── convert-image/
│   │       │   └── route.ts        # Image format conversion
│   │       ├── convert-status/
│   │       │   └── route.ts        # Status data conversion
│   │       └── upload-tile/
│   │           └── route.ts        # Tile image upload
│   ├── components/
│   │   ├── tabs/                   # Tab view components
│   │   │   ├── MapTab.tsx          # Game map + joystick + chat
│   │   │   ├── AgentTab.tsx        # Agent management UI
│   │   │   └── TempBuildTab.tsx    # Map building UI
│   │   ├── agent-builder/          # Agent builder UI
│   │   │   ├── ImportAgentSection.tsx
│   │   │   ├── CreateAgentSection.tsx
│   │   │   ├── ImportedAgentList.tsx
│   │   │   └── ImportedAgentCard.tsx
│   │   ├── overlays/               # Overlays/modals
│   │   │   ├── ChatBoxOverlay.tsx
│   │   │   ├── ChatBottomDrawer.tsx
│   │   │   ├── HolderModal.tsx
│   │   │   └── LoadingModal.tsx
│   │   ├── ui/                     # Shared UI components (Shadcn-based)
│   │   │   ├── Button.tsx
│   │   │   ├── Dialog.tsx
│   │   │   ├── Drawer.tsx
│   │   │   ├── Spinner.tsx
│   │   │   └── context-menu.tsx
│   │   ├── canvas/                 # Canvas-related
│   │   ├── controls/               # Game controls (joystick, etc.)
│   │   ├── TileMap.tsx             # Core: Canvas-based map renderer
│   │   ├── ChatBox.tsx             # Core: Main chat interface
│   │   ├── Footer.tsx              # Bottom tab navigation
│   │   └── AuthGuard.tsx           # Authentication guard
│   ├── stores/                     # Zustand state stores (7)
│   │   ├── index.ts                # Unified store export
│   │   ├── useUIStore.ts
│   │   ├── useGameStateStore.ts
│   │   ├── useAgentStore.ts
│   │   ├── useThreadStore.ts
│   │   ├── useBuildStore.ts
│   │   ├── useChatStore.ts
│   │   └── useMapStore.ts
│   ├── hooks/                      # Custom React Hooks (10)
│   │   ├── useGameState.tsx        # Game state + movement + collision
│   │   ├── useAgents.ts            # Agent AI behavior
│   │   ├── useSession.ts           # Firebase authentication
│   │   ├── useTiledMap.ts          # TMJ map load + rendering
│   │   ├── useThreadStream.ts      # SSE real-time stream
│   │   ├── useProgressiveImage.ts  # Image lazy loading
│   │   ├── useSpritePreload.ts     # Sprite preloading
│   │   ├── useKeyboardOpen.ts      # Mobile keyboard detection
│   │   ├── useSearchHolders.ts     # Token holder verification
│   │   └── useWorld.ts             # World state
│   ├── lib/                        # Utility library
│   │   ├── a2aOrchestration.ts     # A2A orchestration API client
│   │   ├── agent.ts                # Agent class hierarchy
│   │   ├── redis.ts                # Redis client + CRUD
│   │   ├── wagmi-config.ts         # Wagmi configuration
│   │   ├── utils.ts                # Utility functions (cn, createSession, shortAddress)
│   │   ├── hash.ts                 # SHA-256 hash generation
│   │   ├── firebase.ts             # Firebase initialization
│   │   ├── gemini.ts               # Gemini API client
│   │   ├── initializeAgents.ts     # Default agent initialization
│   │   ├── world.ts                # World state logic
│   │   ├── jobManager.ts           # Async job management
│   │   └── messageDAG.ts           # Message DAG structure
│   ├── providers/
│   │   ├── Providers.tsx           # Root provider (Wagmi + QueryClient + OnchainKit)
│   │   └── MapDataProvider.tsx     # Map data Context
│   ├── constants/
│   │   ├── game.ts                 # Game constants
│   │   ├── common.ts               # Common constants (Z_INDEX)
│   │   └── agentContract.ts        # Smart contract ABI
│   └── types/
│       └── thread.ts               # Thread type definitions
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── components.json                  # Shadcn UI configuration
├── sentry.server.config.ts
├── sentry.edge.config.ts
├── instrumentation.ts
└── .prettierrc
```

---

## 4. Environment Setup and Running

### Environment Variables (.env)

```env
# AI API Keys
GEMINI_API_KEY=                          # Google Gemini API key
OPENAI_API_KEY=                          # OpenAI API key

# A2A Orchestration
NEXT_PUBLIC_A2A_ORCHESTRATION_BASE_URL=  # A2A orchestration server URL
                                         # e.g.: https://a2a-orchestration-dev.ainetwork.ai/api

# Storage
AINSPACE_STORAGE_REDIS_URL=              # Redis connection URL (e.g.: redis://localhost:6379)
AINSPACE_BLOB_READ_WRITE_TOKEN=          # Vercel Blob token

# Blockchain
NEXT_PUBLIC_AGENT_CONTRACT_ADDRESS=      # Agent smart contract address
NEXT_PUBLIC_ONCHAINKIT_API_KEY=          # OnchainKit API key
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=     # Project name (e.g.: AINSPACE)
NEXT_PUBLIC_ONCHAINKIT_PROJECT_DESCRIPTION= # Project description

# App URLs & Meta
NEXT_PUBLIC_URL=                         # App deployment URL
NEXT_PUBLIC_API_BASE_URL=                # API base URL
NEXT_PUBLIC_APP_OG_IMAGE=                # OG image URL
NEXT_PUBLIC_APP_ICON=                    # App icon URL
NEXT_PUBLIC_SPLASH_IMAGE=                # Splash image
NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR=     # Splash background color
NEXT_PUBLIC_ENV=                         # Environment (production/development)
NEXT_PUBLIC_NODE_ENV=                    # Node environment

# Sentry
SENTRY_DSN=                              # Sentry DSN
SENTRY_AUTH_TOKEN=                       # Sentry auth token
```

### Installation and Running

```bash
# Install dependencies
yarn install

# Start development server
yarn dev

# Production build
yarn build

# Start production server
yarn start

# Lint
yarn lint
```

---

## 5. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    RootLayout                             │  │
│  │  ┌──────────────────────────────────────────────────┐    │  │
│  │  │  Providers (Wagmi → QueryClient → MapData → OCK) │    │  │
│  │  │  ┌──────────────────────────────────────────┐    │    │  │
│  │  │  │  AuthGuard (wallet connection check)      │    │    │  │
│  │  │  │  ┌─────────────────────────────────┐     │    │    │  │
│  │  │  │  │  Page (/ or /login)              │     │    │    │  │
│  │  │  │  │  ┌──────────┬──────┬──────┐     │     │    │    │  │
│  │  │  │  │  │ MapTab   │Agent │Build │     │     │    │    │  │
│  │  │  │  │  │ ┌──────┐ │ Tab  │ Tab  │     │     │    │    │  │
│  │  │  │  │  │ │Tile  │ │      │      │     │     │    │    │  │
│  │  │  │  │  │ │Map   │ │      │      │     │     │    │    │  │
│  │  │  │  │  │ │Canvas│ │      │      │     │     │    │    │  │
│  │  │  │  │  │ └──────┘ │      │      │     │     │    │    │  │
│  │  │  │  │  │ ChatBox  │      │      │     │     │    │    │  │
│  │  │  │  │  └──────────┴──────┴──────┘     │     │    │    │  │
│  │  │  │  │  Footer (tab navigation)         │     │    │    │  │
│  │  │  │  └─────────────────────────────────┘     │    │    │  │
│  │  │  └──────────────────────────────────────────┘    │    │  │
│  │  └──────────────────────────────────────────────────┘    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Zustand Stores ──→ useUIStore, useGameStateStore, useAgentStore│
│                     useThreadStore, useBuildStore, useChatStore  │
│                     useMapStore                                  │
└───────────────────────┬─────────────────────────────────────────┘
                        │ fetch / SSE
                        ▼
┌───────────────────────────────────────────────────────────────┐
│                   Next.js API Routes                           │
│  /api/agents, /api/agent-chat, /api/threads,                  │
│  /api/thread-message, /api/thread-stream, /api/custom-tiles   │
│  /api/position, /api/commentary, ...                          │
└───────────────────────┬───────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌────────────┐ ┌──────────────────┐
│    Redis     │ │ A2A Orch.  │ │  External APIs   │
│ (data store) │ │  Server    │ │ Gemini / OpenAI  │
│              │ │ (agent     │ │ Firebase         │
│              │ │  orchest-  │ │ Vercel Blob      │
│              │ │  ration)   │ │                  │
└──────────────┘ └────────────┘ └──────────────────┘
```

### Data Flow Summary

1. **User -> AuthGuard**: Wallet connection check, then redirect to main page or login
2. **Main Page -> Zustand Stores**: Components subscribe to stores and update state
3. **Components -> API Routes**: Communicate with server via fetch calls
4. **API Routes -> Redis**: Persist agent, tile, position, and thread data
5. **API Routes -> A2A Orchestration**: Thread creation, message sending, agent management
6. **SSE Stream**: Receive real-time messages via thread-stream API

---

## 6. Routing Structure

### Page Routes

| Path | File | Auth | Description |
|------|------|------|-------------|
| `/` | `app/page.tsx` | Required | Main game interface |
| `/login` | `app/login/page.tsx` | Not required | Wallet connection page |

### API Routes (19)

| Path | Method | Description |
|------|--------|-------------|
| `/api/agents` | GET, POST, PUT, DELETE | Agent CRUD |
| `/api/agents/upload-image` | POST | Sprite image upload (Firebase Storage) |
| `/api/agent-chat` | POST | Chat with agent via A2A SDK |
| `/api/agent-proxy` | POST | A2A card URL proxy |
| `/api/agent-response` | POST | Gemini AI response generation |
| `/api/create-agent` | POST | Create agent via AI prompt |
| `/api/threads` | GET, POST | Thread list/creation |
| `/api/threads/[id]` | GET, DELETE | Individual thread query/deletion |
| `/api/thread-message` | POST | Send message to thread (radius-based agent search) |
| `/api/thread-stream/[threadId]` | GET | SSE real-time streaming proxy |
| `/api/custom-tiles` | GET, POST | Custom tile CRUD |
| `/api/position` | GET, POST | Player position save/query |
| `/api/commentary` | POST | Gemini game commentary generation |
| `/api/clear-layer1` | POST | Collision layer reset |
| `/api/convert-image` | POST | Image format conversion |
| `/api/convert-status` | POST | Status data conversion |
| `/api/upload-tile` | POST | Tile image upload |
| `/api/test-agent` | - | Agent test |
| `/api/sentry-example-api` | - | Sentry test |

---

## 7. State Management (Zustand Stores)

All stores use Zustand v5 and are located in the `src/stores/` directory. Unified export from `index.ts`.

### 7.1 useUIStore

**Role**: Tab navigation UI state

```typescript
// src/stores/useUIStore.ts
export const FOOTER_HEIGHT = 73; // 72px + 1px border

interface UIState {
    activeTab: 'map' | 'thread' | 'build' | 'agent';
    setActiveTab: (tab: 'map' | 'thread' | 'build' | 'agent') => void;
}
```

- Default: `activeTab = 'map'`
- Footer height constant also exported from here

### 7.2 useGameStateStore

**Role**: Player position, direction, movement state

```typescript
interface GameState {
    worldPosition: { x: number; y: number };
    playerDirection: DIRECTION;
    isLoading: boolean;
    isAutonomous: boolean;
    recentMovements: string[];
    lastCommentary: string;
    lastMoveTime: number;
    isPlayerMoving: boolean;
}
```

### 7.3 useAgentStore

**Role**: A2A agent list management

```typescript
// src/stores/useAgentStore.ts
interface AgentStore {
    agents: AgentState[];
    getAgentByName: (name: string) => AgentState | undefined;
    spawnAgent: (agent: AgentState) => void;      // Add after duplicate check
    removeAgent: (agentUrl: string) => void;
    updateAgentPosition: (agentUrl: string, x: number, y: number) => void;
    updateAgentCharacterImage: (agentUrl: string, imageUrl: string) => void;
    setAgents: (agents: AgentState[]) => void;
    updateAgent: (agentUrl: string, updates: Partial<AgentState>) => void;
}
```

- Agent identifier: `agentUrl` (unique)
- `spawnAgent`: Ignores if an agent with the same `agentUrl` already exists

### 7.4 useThreadStore

**Role**: Conversation threads and broadcast state

```typescript
// src/stores/useThreadStore.ts
interface BroadcastStatus {
    range: number;
    agentsReached: number;
    agentNames: string[];
}

interface ThreadState {
    threads: Thread[];
    currentThreadId: string | undefined;  // Default: '0'
    broadcastMessage: string;
    broadcastStatus: BroadcastStatus | null;

    setThreads, addThread, findThreadByName, findThreadById,
    updateThread, removeThread, setCurrentThreadId,
    setBroadcastMessage, setBroadcastStatus,
    clearBroadcastMessage, clearBroadcastStatusAfterDelay
}
```

### 7.5 useBuildStore

**Role**: Map building, tile management, collision map

```typescript
// src/stores/useBuildStore.ts
export interface ItemTileData {
    image: string;
    width: number;        // In tile units
    height: number;       // In tile units
    topLeftX: number;     // Placement start X coordinate
    topLeftY: number;     // Placement start Y coordinate
    isSecondaryTile?: boolean;  // Secondary tile (not the top-left anchor)
}

export type TileLayers = {
    layer0: { [key: string]: string };                    // Ground layer
    layer1: { [key: string]: string | ItemTileData };     // Object layer (collision)
    layer2: { [key: string]: string };                    // Upper layer
};

interface BuildState {
    customTiles: TileLayers;           // Currently editing tiles (draft)
    publishedTiles: TileLayers;        // Tiles loaded/published from server
    selectedImage: string | null;
    buildMode: 'select' | 'paint';
    isPublishing: boolean;
    publishStatus: { type: 'success'|'error', message: string } | null;
    showCollisionMap: boolean;
    collisionMap: { [key: string]: boolean };  // "x,y" → true

    // Core methods
    updateCollisionMapFromImage: (imageSrc: string) => Promise<void>;
    isBlocked: (worldX: number, worldY: number) => boolean;
}
```

**Collision Map Generation Logic** (`updateCollisionMapFromImage`):
1. Load `/map/tiles/land_layer_1/tile_{row}_{col}.webp` images in a 5x5 grid
2. Each image tile is 840x840px, containing 21x21 game tiles
3. Draw to Canvas and calculate opaque pixel ratio for each game tile area
4. **Opaque ratio >= 50%** marks that coordinate as a collision tile

### 7.6 useChatStore

**Role**: Per-thread chat messages, agent loading state

```typescript
// src/stores/useChatStore.ts
export interface ChatMessage {
    id: string;
    text: string;
    timestamp: Date;
    sender: 'user' | 'system' | 'ai';
    senderId?: string;
    threadId?: string;
}

export interface ThreadMessages {
    [threadId: string]: ChatMessage[];
}

interface ChatState {
    messages: ThreadMessages;
    loadingAgents: Set<string>;

    setMessages: (msgs: ChatMessage[] | updater, threadId?: string) => void;
    addMessage: (threadId: string, message: ChatMessage) => void;
    clearMessages: () => void;
    getMessagesByThreadId: (threadId: string) => ChatMessage[];
    setAgentLoading: (agentId: string, isLoading: boolean) => void;
    isAgentLoading: (agentId: string) => boolean;
}
```

### 7.7 useMapStore

**Role**: Tiled map data, tileset resources, collision tiles

```typescript
// src/stores/useMapStore.ts
type TiledMap = {
    tilewidth: number;
    tileheight: number;
    width: number;
    height: number;
    layers: TiledLayer[];
    tilesets: TiledTileset[];
};

type TilesetResource = {
    firstgid: number;
    image: HTMLImageElement;
    columns: number;
    tilecount: number;
    tilewidth: number;
    tileheight: number;
    imageScale?: number;
};

interface MapState {
    mapData: TiledMap | null;
    tilesets: TilesetResource[];
    collisionTiles: Array<{ x: number; y: number }>;
    mapStartPosition: { x: number; y: number };
    mapEndPosition: { x: number; y: number };
    isLoaded: boolean;

    isCollisionTile: (x: number, y: number) => boolean;  // collisionTiles.some()
}
```

### Store Unified Export

```typescript
// src/stores/index.ts
export { useUIStore, FOOTER_HEIGHT } from './useUIStore';
export { useThreadStore } from './useThreadStore';
export { useBuildStore } from './useBuildStore';
export { useAgentStore } from './useAgentStore';
export { useGameStateStore } from './useGameStateStore';
export { useChatStore } from './useChatStore';

export type { Thread } from '@/types/thread';
export type { TileLayers } from './useBuildStore';
export type { ChatMessage } from './useChatStore';
```

---

## 8. Core Data Types

### Thread

```typescript
// src/types/thread.ts
export interface Thread {
    id: string;
    threadName: string;
    agentNames: string[];
    agentComboId: string;        // SHA-256 hash (agent combination identifier)
    createdAt: string;
    lastMessageAt: string;
    hasUnplacedAgents?: boolean;   // Whether it contains agents not placed on the map
    unplacedAgentNames?: string[];
}

export interface ThreadInOrchestration extends Omit<Thread, 'hasUnplacedAgents' | 'unplacedAgentNames'> {
    userId: string;
}
```

### Agent-Related Types

```typescript
// src/lib/agent.ts
export interface AgentInfo {
    id: string;
    name: string;
    agentUrl: string;
    skills: AgentSkill[];      // @a2a-js/sdk
}

export interface AgentWorldState {
    x: number;
    y: number;
    behavior: string;
    color: string;
    direction?: DIRECTION;
    lastMoved?: number;
    moveInterval?: number;
    isMoving?: boolean;
}

export interface AgentVisualState {
    spriteUrl?: string;
    spriteHeight?: number;
    spriteWidth?: number;
}

export interface AgentState extends AgentInfo, AgentWorldState, AgentVisualState {}

// For DB storage (excluding direction, movement state)
export interface AgentStateForDB extends Omit<AgentWorldState, 'direction' | 'lastMoved' | 'isMoving'> {}
```

### Redis Storage Types

```typescript
// src/lib/redis.ts
export interface StoredAgent {
    url: string;
    card: AgentCard;           // @a2a-js/sdk
    state: AgentStateForDB;
    spriteUrl?: string;
    spriteHeight?: number;
    isPlaced: boolean;
    creator: string;
    timestamp: number;
}

export interface PlayerPosition {
    x: number;
    y: number;
    lastUpdated: string;       // ISO date
}

export interface CustomTilesData {
    tiles: TileLayers;
    lastUpdated: string;
}
```

### SSE Stream Events

```typescript
// src/lib/a2aOrchestration.ts
export interface StreamEvent {
    type: 'connected' | 'message' | 'block' | 'error';
    data: {
        data?: {
            id?: string;
            speaker?: string;
            content?: string;
            timestamp?: number;
            replyTo?: string;
            status?: 'accepted' | 'dropped';
        };
        next?: { id: string; name: string };
        content?: string;
        message?: string;
        sender?: string;
        agentName?: string;
        speaker?: string;
        summary?: string;
        error?: string;
        clientId?: string;
    };
}
```

---

## 9. Provider Hierarchy

```typescript
// src/providers/Providers.tsx
// Nesting order:
WagmiProvider           // 1. Blockchain wallet connection
  → QueryClientProvider // 2. TanStack Query (staleTime: 60s, retry: 1)
    → MapDataProvider   // 3. Map data Context
      → OnchainKitProvider  // 4. Base chain + MiniKit
        → children
```

### Key Behaviors

1. **On mount**: Set `mounted` state to true (hydration protection)
2. **Auto chain switching**: Switch to Base chain (`0x2105`) via `wallet_switchEthereumChain`
3. **Default agent initialization**: Calls `initializeDefaultAgents()` (currently disabled)

### OnchainKit Configuration

```typescript
{
    apiKey: NEXT_PUBLIC_ONCHAINKIT_API_KEY,
    chain: base,
    miniKit: { enabled: true, autoConnect: true },
    config: {
        appearance: {
            mode: 'auto',
            theme: 'mini-app-theme'
        },
        wallet: { display: 'classic' }
    }
}
```

### Wagmi Configuration

```typescript
// src/lib/wagmi-config.ts
createConfig({
    chains: [base, baseSepolia, mainnet],
    connectors: [
        coinbaseWallet({
            appName: NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Base MiniApp',
            preference: 'all'
        })
    ],
    transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
        [mainnet.id]: http(),
    },
    ssr: true
});
```

---

## 10. Authentication System (AuthGuard)

### How It Works

```
[User Access]
      │
      ▼
 AuthGuard (wraps children in layout.tsx)
      │
      ├── pathname === '/' → Auth required
      │     │
      │     ├── isConnecting || !isHydrated → Show loading spinner
      │     │
      │     ├── !isConnected → Redirect to /login
      │     │   └── Prevent infinite redirect with redirectAttemptedRef
      │     │
      │     └── isConnected → Render children
      │
      └── pathname !== '/' → Render children directly
```

### Hydration Handling

1. `isMounted` → Confirm client mount via useEffect
2. `isHydrated` → Set to true 100ms after wagmi's `isConnecting` finishes
3. Auth check starts only when both conditions are met

### Sentry Tracking

- All state changes recorded as breadcrumbs
- `captureMessage` on redirect
- Warning level report on infinite redirect detection

---

## 11. Page-by-Page Implementation Details

### 11.1 Login Page (`/login`)

```
┌──────────────────────────┐
│      #B1E1FF background   │
│                           │
│     [AINSpace Logo]       │
│                           │
│   [Wallet Login Button]   │ ← Coinbase OnchainKit Signature
│                           │
│     [AI Network Logo]     │
│                           │
│   [Login Background Image]│ ← fixed, bottom
└──────────────────────────┘
```

**Core Logic**:
1. Request message signing via `Signature` component: `"Welcome to the AINSpace MiniApp!\n\nNonce: {timestamp}"`
2. After successful signing, useEffect detects `isConnected` -> `router.push('/')` redirect
3. If already connected, redirect to home immediately
4. Button has 100ms fade-in animation

### 11.2 Main Game Page (`/`)

Tab-based SPA. All tab components are mounted simultaneously but visibility is controlled via the `isActive` prop.

```
┌──────────────────────────────┐
│                               │
│  ┌─────────────────────────┐ │
│  │  MapTab / AgentTab /    │ │  ← Tab content (absolute, inset-0)
│  │  TempBuildTab           │ │     padding-bottom: 73px
│  │                         │ │
│  │  (Canvas + Joystick +   │ │
│  │   ChatOverlay)          │ │
│  └─────────────────────────┘ │
│                               │
│  ┌─────────────────────────┐ │
│  │ [Agent] [Map] [Build]   │ │  ← Footer (fixed bottom, 72px)
│  └─────────────────────────┘ │
└──────────────────────────────┘
```

**Initialization Sequence** (useEffects in `page.tsx`):

1. **Farcaster frame ready**: `setFrameReady()` + `sdk.actions.ready()`
2. **Eruda debugger**: Dynamic import in dev environment only
3. **Collision map initialization**: Generate collision map by analyzing `/map/land_layer_1.webp` image
4. **Custom tiles load**: Fetch published tiles from server by userId
5. **Deployed agents load**: Restore agents with `isPlaced: true` from Redis
6. **Agent movement system**: 100ms interval setInterval (currently disabled with `ENABLE_AGENT_MOVEMENT = false`)

**Deploy Zone**:
```typescript
const ALLOWED_DEPLOY_ZONE = [{
    startX: -10, startY: -19,
    endX: 9, endY: 1
}];
```

---

## 12. Component Architecture

### 12.1 MapTab

**Role**: Game map display, player movement, chat overlay

**Key Features**:
- TileMap rendering (Canvas-based)
- Keyboard movement: WASD / arrow keys
- Mobile joystick: `react-joystick-component`
- Chat overlay: ChatBoxOverlay
- HUD toggle: `Ctrl+H` to hide/show all UI
- Position reset: `Ctrl+R` to return to origin

### 12.2 TileMap (Core Renderer)

**Role**: Canvas-based 2D tilemap rendering

**Rendering Order**:
1. **Layer 0**: Ground tiles (Canvas drawImage)
2. **Published Tiles (layer0)**: Custom ground tiles loaded from server
3. **Custom Tiles (layer0)**: Locally editing ground tiles
4. **Layer 1**: Object tiles (collision targets)
5. **Published/Custom Tiles (layer1)**: Including multi-tile items
6. **Layer 2**: Upper layer
7. **Agents**: Sprite animation (SpriteAnimator) or colored circles
8. **Player**: Sprite animation or blue circle
9. **Collision Map Overlay**: Semi-transparent red display during debug
10. **Agent Name Labels**: HTML div overlay on top of Canvas

**Zoom Control**: 0.5x ~ 2.0x (button UI)

**Touch/Mouse Events**: Tile painting support in build mode

### 12.3 AgentTab

**Role**: A2A agent import/management

**Structure**:
```
AgentTab
├── ImportAgentSection     # URL input → A2A card import
├── CreateAgentSection     # A2A Builder link (external navigation)
└── ImportedAgentList      # Imported agent list
    └── ImportedAgentCard  # Individual agent card
        ├── Agent profile (sprite)
        ├── Place/Unplace button
        ├── Image upload button
        └── Delete button
```

**Agent Import Flow**:
1. Enter A2A card URL -> call `/api/agent-proxy` -> obtain card info
2. Register agent in Redis (`/api/agents` POST)
3. Click "Place" -> search for empty position in deploy zone -> spawn agent

**Token Holder Verification** (AgentTab):
- Check AIN, sAIN, Mini Egg NFT balances
- Only holders can access certain features

### 12.4 TempBuildTab

**Role**: Place items on the map

**Features**:
- Select from 6 item types (index 0~5)
- Multi-tile item placement (collision auto-configured)
- Item deletion
- Collision map visualization
- Publish -> save to server

### 12.5 ChatBox (Core Chat)

**Role**: Chat interface with agents

**Core Features**:
- **Thread-based conversations**: Auto-create/manage threads per agent combination
- **@mentions**: Show agent suggestion list when typing `@`
- **Broadcast**: Propagate messages to agents within radius
- **SSE Streaming**: Real-time agent response reception
- **A2A Orchestration**: Thread creation -> add agents -> send message -> receive stream

**Admin Commands**:
- `"show me grid"`: Show grid
- `"exit"`: Exit
- `"clear items"`: Reset items

**Message Sending Flow**:
1. Enter message -> search for agents within broadcast radius
2. Search for existing thread by agent combination (SHA-256 hash)
3. If none, create new thread (A2A Orchestration)
4. Add agents to thread -> send message
5. Receive agent responses in real-time via SSE

### 12.6 ChatBoxOverlay

**Role**: Chat UI overlay on top of MapTab

**Structure**:
```
ChatBoxOverlay
├── ThreadListLeftDrawer   # Left thread list drawer
└── ChatBottomDrawer       # Bottom chat drawer
    └── ChatBox            # Chat interface
```

- Joystick visibility controlled based on sheet open state

### 12.7 Footer

**Role**: Bottom tab navigation (72px + 1px border = 73px)

| Tab | Icon | Label |
|-----|------|-------|
| Agent | `tab_icon_agent.svg` | Agent |
| Map | `tab_icon_map.svg` | Map |
| Build | `tab_icon_build.svg` | Build |

- Background: black (#000) / inactive tab: `#424049`
- `Z_INDEX_OFFSETS.UI = 1000` for topmost layer
- Hidden when HUD is off

---

## 13. Game System Details

### 13.1 Game Constants

```typescript
// src/constants/game.ts
TILE_SIZE = 40              // Tile size (px)
MAP_SIZE_PIXELS = 4200      // Total map size (px)
MAP_TILES = 105             // Number of map tiles (105x105)
MAP_WIDTH = 16              // Viewport horizontal tile count
MAP_HEIGHT = 12             // Viewport vertical tile count
VIEW_RADIUS = 6             // Visibility radius (tiles)
BROADCAST_RADIUS = 5        // Broadcast radius (tiles)
AGENT_RESPONSE_DISTANCE = 2 // Agent response distance (tiles)
MIN_MOVE_INTERVAL = 150     // Minimum move interval (ms)
INITIAL_PLAYER_POSITION = { x: 0, y: 0 }
ENABLE_AGENT_MOVEMENT = false  // Agent auto-movement disabled

enum DIRECTION { UP, DOWN, LEFT, RIGHT, STOP }
```

### 13.2 Z-Index System

```typescript
// src/constants/common.ts
Z_INDEX_OFFSETS = {
    DEFAULT: 0,    // Default
    GAME: 500,     // Game canvas
    UI: 1000       // UI elements (Footer, Overlay, etc.)
}
```

### 13.3 Collision Detection System

**3-Stage Collision Check**:

1. **Map boundary check**: Within `mapStartPosition` ~ `mapEndPosition` range
2. **Tile collision check**:
   - `useMapStore.isCollisionTile(x, y)`: Tiled map collision layer
   - `useBuildStore.isBlocked(x, y)`: Image analysis-based collision map
3. **Agent/Player collision**: Check if another agent or player occupies that coordinate

### 13.4 Agent Movement System

Implemented with 100ms interval `setInterval` in `page.tsx` (currently disabled):

```
Every 100ms:
  For each agent:
    1. Check if moveInterval has elapsed (600~1000ms random)
    2. Shuffle 4 directions -> try valid movement in order
    3. Movement possible if:
       - Within map boundaries
       - No collision with player/other agents
       - Not blocked by layer1 collision map
    4. On successful move:
       - Update position + set direction + isMoving = true
       - After 500ms, isMoving = false (animation end)
    5. On failed move: Only update lastMoved (prevent stuck)
```

### 13.5 Agent Spawn Position Search

**Zone-based Search** (`findAvailableSpawnPositionByZone`):
- Shuffle all coordinates within allowed zone
- Iterate until a valid position is found

**Radius-based Search** (`findAvailableSpawnPositionByRadius`):
- Expand from center point, radius 1 to `BROADCAST_RADIUS`
- Shuffle perimeter coordinates at each radius and search for valid position

---

## 14. Agent System

### 14.1 Agent Class Hierarchy

```
BaseAgent (abstract)
├── ExplorerAgent      # type: 'random' - always responds
├── PatrolAgent        # type: 'patrol' - always responds
├── WandererAgent      # type: 'explorer' - always responds
└── A2AAgent           # type: 'A2A Agent' - A2A protocol based
```

### 14.2 BaseAgent Core Logic

**Message Response Decision**:
1. **Chebyshev distance calculation**: `max(|dx|, |dy|)` (diagonal movement allowed)
2. Not mentioned and distance > `AGENT_RESPONSE_DISTANCE(2)` -> ignore
3. Thread participation check:
   - Thread message: Must be a thread member or mentioned to respond
   - Auto-join thread via mention
4. Response generation: `/api/agent-response` (Gemini API)

**Loading State Management**:
- Before API call: `useChatStore.setAgentLoading(id, true)`
- After response/error: `useChatStore.setAgentLoading(id, false)`

### 14.3 A2AAgent Special Behavior

- Communicates with external agents via A2A SDK through `/api/agent-chat`
- Message format: `[From player at (x, y)]: {content}`
- Response distance limit: 10 tiles
- Response delay: 0.5~1.5s random

### 14.4 Agent Factory

```typescript
function createAgent(type: string, initialState: AgentState): BaseAgent {
    switch (type) {
        case 'random':      return new ExplorerAgent(initialState);
        case 'patrol':      return new PatrolAgent(initialState);
        case 'explorer':    return new WandererAgent(initialState);
        case 'A2A Agent':   return new A2AAgent(initialState);
    }
}
```

---

## 15. Map Building System

### 15.1 Tile Layer Structure

```
Layer 2 (layer2)  ← Topmost (decoration)
Layer 1 (layer1)  ← Objects (collision targets, ItemTileData supported)
Layer 0 (layer0)  ← Ground (floor textures)
```

### 15.2 Multi-Tile Items

Items placed on `layer1` can occupy multiple tiles:

```typescript
interface ItemTileData {
    image: string;           // Image URL
    width: number;           // Horizontal tile count
    height: number;          // Vertical tile count
    topLeftX: number;        // Anchor tile X
    topLeftY: number;        // Anchor tile Y
    isSecondaryTile?: boolean;  // Whether it's a secondary tile
}
```

- Anchor tile: `isSecondaryTile = false` (handles image rendering)
- Secondary tile: `isSecondaryTile = true` (only occupies collision area)

### 15.3 Publish Flow

```
1. Place items (saved in customTiles)
      ↓
2. Click "Publish"
      ↓
3. POST /api/custom-tiles { userId, customTiles }
      ↓
4. Merge and save to Redis 'global-tiles'
      ↓
5. Move customTiles → publishedTiles
      ↓
6. Add layer1 item positions to collisionMap
      ↓
7. Reset customTiles (clear draft)
```

---

## 16. Chat and Threading System

### 16.1 Thread Management

**Thread Identification**: SHA-256 hash of agent combination (`agentComboId`)

```typescript
// src/lib/hash.ts
async function generateAgentComboId(agentNames: string[]): Promise<string> {
    const sorted = [...agentNames].map(n => n.trim().toLowerCase()).sort();
    const combined = sorted.join('|');
    // Browser: Web Crypto API / Node: crypto module
    return sha256(combined);
}
```

Same agent combination reuses the same thread.

### 16.2 Message Sending Flow

```
User message input
      ↓
POST /api/thread-message
  ├── Search for agents within radius using playerPosition (Euclidean distance)
  ├── Include @mentioned agents
  ├── Generate agentComboId
  ├── Search for existing thread (Redis) → create in A2A Orchestration if none
  ├── Add agents to thread
  └── Send message
      ↓
SSE Stream (GET /api/thread-stream/[threadId])
  ├── Proxy SSE from A2A Orchestration server
  ├── Deliver agent responses to client in real-time
  └── 5-minute timeout
```

### 16.3 SSE Connection Management (useThreadStream)

```typescript
// Connection states: disconnected → connecting → connected → error/reconnecting
// Reconnection: Exponential backoff (1s → 2s → 4s → 8s → 16s), max 5 attempts
// Report errors to Sentry
```

### 16.4 Redis Thread Storage Structure

```
user:{userId}:threads         → Hash { threadId: JSON(Thread) }
user:{userId}:agent_combos    → Hash { agentComboId: threadId }
```

- Expiration: 30 days

---

## 17. Custom Hooks Details

### useGameState (`hooks/useGameState.tsx`)

**Largest hook** — handles core game logic

| Feature | Description |
|---------|-------------|
| Player movement | Keyboard/joystick input handling, collision detection |
| Position management | worldPosition updates, server sync |
| Visible area | Map data + agent visibility calculation |
| AI commentary | Gemini-based commentary generation during autonomous movement |
| Terrain detection | Current position biome/terrain determination |

### useThreadStream (`hooks/useThreadStream.ts`)

SSE stream management hook

```typescript
interface Return {
    reconnect: () => void;          // Manual reconnection
    disconnect: () => void;          // Manual disconnect
    isConnected: boolean;
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';
    lastError: string | null;
    reconnectAttempts: number;
}
```

### useAgents (`hooks/useAgents.ts`)

Agent AI behavior, pathfinding, collision logic

### useTiledMap (`hooks/useTiledMap.ts`)

Tiled (.tmj) map file loading, Canvas rendering

### useSession (`hooks/useSession.ts`)

Firebase auth, user management

### useKeyboardOpen (`hooks/useKeyboardOpen.ts`)

Mobile virtual keyboard detection (based on screen height changes)

### useProgressiveImage (`hooks/useProgressiveImage.ts`)

Image lazy loading strategy

### useSpritePreload (`hooks/useSpritePreload.ts`)

Sprite image preloading

### useSearchHolders (`hooks/useSearchHolders.ts`)

Token holder verification (AIN, sAIN, Mini Egg NFT)

### useWorld (`hooks/useWorld.ts`)

World state management

---

## 18. Utility Library

### lib/utils.ts

```typescript
// Tailwind class merging
function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// UUID session creation
function createSession(): string {
    return uuidv4();
}

// Wallet address abbreviation (0x1234...5678)
function shortAddress(address: string, startIndex = 3): string
```

### lib/a2aOrchestration.ts

A2A orchestration API client:

| Function | Description |
|----------|-------------|
| `createThread(userId, name)` | Create thread |
| `importAgent(a2aUrl)` | Import agent |
| `addAgentToThread(threadId, agent)` | Add agent to thread |
| `sendMessage(threadId, message)` | Send message |
| `getAllThreads()` | List threads |
| `getThread(threadId)` | Get individual thread |
| `deleteThread(threadId)` | Delete thread |
| `removeAgentFromThread(threadId, agentName)` | Remove agent |
| `connectToThreadStream(threadId, onMessage)` | SSE connection (EventSource) |

### lib/redis.ts

Redis client + data CRUD:

| Function | Redis Key | Expiration |
|----------|-----------|------------|
| `savePlayerPosition` | `player:{userId}` (Hash) | 24 hours |
| `getPlayerPosition` | `player:{userId}` | - |
| `saveCustomTiles` | `global-tiles` (Hash) | None (permanent) |
| `getCustomTiles` | `global-tiles` | - |
| `getAgents` | `agents:*` (String) | - |
| `saveThread` | `user:{userId}:threads` + `user:{userId}:agent_combos` | 30 days |
| `getThreads` | `user:{userId}:threads` | - |
| `findThreadByAgentCombo` | `user:{userId}:agent_combos` → thread lookup | - |
| `deleteThread` | Delete both keys | - |

**Note**: `saveCustomTiles` merges into a global key. userId is accepted for backward compatibility but is actually ignored.

### lib/hash.ts

```typescript
// Agent combination hash (Browser: Web Crypto / Node: crypto)
async function generateAgentComboId(agentNames: string[]): Promise<string>
```

---

## 19. API Route Details

### 19.1 `/api/agents` (CRUD)

**GET**: Query all agents
```
Query: ?address={creatorAddress}  (optional)
Response: { success: true, agents: StoredAgent[], count: number }
```

**POST**: Register agent
```json
{
    "url": "https://agent-a2a-url",
    "card": { /* AgentCard */ },
    "state": { "x": 0, "y": 0, "behavior": "random", "color": "#FF6B6B" },
    "isPlaced": false,
    "spriteUrl": "...",
    "spriteHeight": 50
}
```
- Redis key: `agents:{base64(url)}`
- 409 Conflict on duplicate registration

**PUT**: Update agent (partial update)
```json
{
    "url": "https://agent-url",
    "state": { "x": 5, "y": 10 },
    "isPlaced": true
}
```

**DELETE**: Delete agent
```json
{ "url": "https://agent-url" }
```

### 19.2 `/api/agents/upload-image`

**POST** (FormData):
```
image: File      # Image file
agentUrl: string # Agent URL
```

**Processing**:
1. Extract image dimensions with sharp
2. Upload to Firebase Storage (production/develop bucket separation)
3. Delete existing sprite file
4. Update Redis agent data with `spriteUrl`, `spriteHeight`

### 19.3 `/api/agent-chat`

**POST**: Send message to agent via A2A SDK
```json
{
    "agentUrl": "https://agent-url",
    "message": "Hello agent",
    "contextId": "optional-context-id"
}
```
- Parses various response formats: JSON-RPC, direct, nested, etc.

### 19.4 `/api/thread-message`

**POST**: Send thread message + agent search
```json
{
    "message": "Hello everyone",
    "playerPosition": { "x": 10, "y": 20 },
    "broadcastRadius": 5,
    "threadId": "optional",
    "agentNames": ["Agent1"],
    "mentionedAgents": ["Agent2"],
    "userId": "user-id"
}
```

**Agent Search Logic**:
- Euclidean distance: `sqrt((ax-px)^2 + (ay-py)^2) <= broadcastRadius`
- Merge explicitly specified agents + agents within radius

### 19.5 `/api/thread-stream/[threadId]`

**GET**: SSE proxy
```
Headers:
  Content-Type: text/event-stream
  Cache-Control: no-cache, no-transform
  Connection: keep-alive
  X-Accel-Buffering: no
```
- Proxies A2A Orchestration's SSE to client
- Max 5-minute duration
- Connection cleanup via AbortController

### 19.6 `/api/custom-tiles`

**GET**: `?userId={id}` -> Query global tiles
**POST**: Save custom tiles (merge with existing global tiles)

### 19.7 `/api/position`

**GET**: `?userId={id}` -> Query player position (default: 0,0)
**POST**: `{ userId, x, y }` -> Save position (24-hour expiration)

### 19.8 `/api/create-agent`

**POST**: Create agent via AI prompt
```json
{ "prompt": "Create a helpful weather agent" }
```

**Processing**:
1. Generate agent config via builder API
2. Add required fields (id, url, protocolVersion, etc.)
3. Deploy to builder service
4. Return A2A endpoint URL

---

## 20. External Service Integration

### 20.1 A2A Orchestration

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/threads` | POST | Create thread |
| `/threads` | GET | List threads |
| `/threads/{id}` | GET/DELETE | Query/delete thread |
| `/threads/{id}/agents` | POST | Add agent |
| `/threads/{id}/agents/{name}` | DELETE | Remove agent |
| `/threads/{id}/messages` | POST | Send message |
| `/threads/{id}/stream` | GET (SSE) | Real-time stream |
| `/agents/import` | POST | Import agent |

Base URL: `NEXT_PUBLIC_A2A_ORCHESTRATION_BASE_URL`

### 20.2 Redis Data Structure

```
player:{userId}                  → Hash { x, y, lastUpdated }           # 24h TTL
global-tiles                     → Hash { tiles: JSON, lastUpdated }    # Permanent
agents:{base64(url)}             → String (JSON StoredAgent)            # Permanent
user:{userId}:threads            → Hash { threadId: JSON(Thread) }      # 30-day TTL
user:{userId}:agent_combos       → Hash { agentComboId: threadId }      # 30-day TTL
```

### 20.3 Firebase Storage

- Agent sprite image storage
- Buckets: production/develop separation
- Filename: `agent_sprite_{base64(agentUrl)}_{timestamp}.{ext}`

### 20.4 Sentry

- Server: `sentry.server.config.ts`
- Edge: `sentry.edge.config.ts`
- Client: Next.js auto-configuration
- Org: `comcom-xr`, Project: `ainspace`

### 20.5 Farcaster

- **MiniApp SDK**: `sdk.actions.ready({ disableNativeGestures: true })`
- **Manifest**: `/.well-known/farcaster.json` -> Farcaster hosted manifest redirect
- **Frame Metadata**: `fc:frame` JSON metadata (layout.tsx)

---

## 21. Styling System

### Tailwind CSS v4

```css
/* globals.css */
@import 'tailwindcss';
@import 'tw-animate-css';      /* Animation library */
@custom-variant dark (&:is(.dark *));  /* Dark mode custom variant */
```

### Fonts

```typescript
// layout.tsx
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'] });
```

### Mobile Optimization CSS

```css
/* Remove touch highlight */
* { -webkit-tap-highlight-color: transparent; }

/* Prevent canvas/image selection */
canvas, img { -webkit-user-select: none; user-select: none; }

/* Allow input selection */
input, textarea { -webkit-user-select: text !important; }

/* Prevent double-tap zoom */
button, a { touch-action: manipulation; }

/* Prevent pull-to-refresh */
body { overscroll-behavior-y: contain; }
```

### Design Tokens (CSS Variables)

```css
:root {
    --radius: 0.625rem;
    --background: oklch(1 0 0);          /* White */
    --foreground: oklch(0.145 0 0);      /* Near black */
    --primary: oklch(0.205 0 0);
    --destructive: oklch(0.577 0.245 27.325);  /* Red */
    /* ... full Shadcn theme variables */
}
```

### Component Variants (CVA)

```typescript
// Conditional class application with cn() utility
cn(
    'flex flex-1 cursor-pointer flex-col items-center justify-center',
    activeTab === 'map' ? 'text-gray-100' : 'bg-[#424049] text-white'
)
```

---

## 22. Build and Deployment

### Next.js Configuration (`next.config.ts`)

```typescript
{
    images: {
        remotePatterns: [{ hostname: '**.public.blob.vercel-storage.com' }]
    },
    redirects: [
        // Farcaster manifest redirect
        { source: '/.well-known/farcaster.json', destination: 'https://api.farcaster.xyz/...' }
    ],
    webpack: (config) => {
        // Remove console.log in production (terser pure_funcs)
        // Browser unnecessary module fallback: false
    }
}

// Sentry wrapping
export default withSentryConfig(nextConfig, {
    org: 'comcom-xr',
    project: 'ainspace',
    widenClientFileUpload: true,
    disableLogger: true,
    automaticVercelMonitors: true
});
```

### TypeScript Configuration

```json
{
    "target": "ES2017",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "paths": { "@/*": ["./src/*"] }
}
```

### Deployment (Vercel)

- Vercel auto-deployment
- Source map upload to Sentry
- Vercel Analytics integration
- File storage via Blob Storage

### Metadata (SEO/OG)

Generated from `generateMetadata()` in `layout.tsx`:
- OpenGraph, Twitter Card
- Farcaster Frame metadata
- Keywords: Web3, blockchain, Base, Farcaster, AI Network
- Environment-specific title: production -> "AINSPACE", dev -> "AINSPACE - DEV"

---

## 23. Core Behavior Flows

### 23.1 App Start -> Game Entry

```
1. Browser access
2. RootLayout renders
3. Providers initialization:
   a. WagmiProvider → Load wallet state
   b. QueryClientProvider → React Query setup
   c. MapDataProvider → Load map data
   d. OnchainKitProvider → Base chain connection
4. AuthGuard:
   a. isMounted = false → render null
   b. isConnecting → loading spinner
   c. wagmi hydration complete (100ms)
   d. !isConnected → redirect to /login
   e. isConnected → render children
5. page.tsx mount:
   a. Farcaster frame ready
   b. Eruda debugger (dev only)
   c. Collision map initialization (land_layer_1 image analysis)
   d. Custom tiles load (Redis)
   e. Deployed agents load (Redis)
   f. Auto-switch to Base chain
```

### 23.2 Agent Import -> Placement

```
1. Enter A2A URL in AgentTab
2. POST /api/agent-proxy → Obtain agent card info
3. POST /api/agents → Register in Redis (isPlaced: false)
4. Click "Place":
   a. Search for empty coordinates within ALLOWED_DEPLOY_ZONE
   b. PUT /api/agents → isPlaced: true, save coordinates
   c. useAgentStore.spawnAgent() → Display on map
   d. activeTab → switch to 'map'
```

### 23.3 Chat with Agent

```
1. Enter message in ChatBox (optionally @mention)
2. Search for agents within radius (BROADCAST_RADIUS)
3. Generate agent combination hash
4. Search for existing thread (Redis agentComboId)
5. If none:
   a. Create thread in A2A Orchestration
   b. Save thread in Redis
   c. Add each agent to thread
6. Send message (A2A Orchestration)
7. Connect SSE stream (useThreadStream)
8. Receive agent responses in real-time → display in ChatBox
```

### 23.4 Map Building

```
1. Select Build tab
2. Select item (1 of 6 types)
3. Click position on map → add to customTiles.layer1
4. Multi-tile: Automatically generate anchor + secondary tiles
5. Click "Publish":
   a. POST /api/custom-tiles → Merge into Redis 'global-tiles'
   b. Move customTiles → publishedTiles
   c. Add layer1 item positions to collisionMap
   d. Reset draft
```

---

## 24. Configuration File Details

### package.json Scripts

```json
{
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint"
}
```

### PostCSS Configuration

```javascript
// postcss.config.mjs
export default {
    plugins: {
        '@tailwindcss/postcss': {}
    }
};
```

### Prettier Configuration

```json
// .prettierrc
{
    "plugins": ["prettier-plugin-tailwindcss"]
}
```

### Shadcn UI Configuration

```json
// components.json
// Shadcn UI component metadata
```

### Sentry Configuration

```typescript
// sentry.server.config.ts - Server error tracking
// sentry.edge.config.ts  - Edge Function monitoring
// instrumentation.ts     - Lifecycle hooks
```

---

## 25. Caveats and Known Issues

### Currently Disabled Features

1. **Agent auto-movement**: `ENABLE_AGENT_MOVEMENT = false` — Enabling causes agents to move randomly at 100ms intervals
2. **Default agents**: `initializeDefaultAgents()` is called but actual agent registration is commented out
3. **Smart contract**: `addAgent` transaction code is commented out (NOTE: yoojin)
4. **Thread tab**: Thread tab removed from Footer, chat is handled in ChatBoxOverlay

### Development Notes

1. **Redis required**: Agent, tile, and thread data all stored in Redis. Some APIs have in-memory fallback without Redis
2. **A2A Orchestration server**: Thread/message features require a separate server
3. **Farcaster environment**: Operating as MiniApp requires native gesture disable settings
4. **Collision map**: Initial load analyzes 25 tile images on Canvas, causing initial loading time
5. **Mobile optimization**: viewport `user-scalable=no`, touch event optimization CSS applied
6. **Eruda debugger**: Auto-enabled when `NEXT_PUBLIC_NODE_ENV !== 'production'`

### Performance Considerations

1. **Canvas rendering**: Map rendered via Canvas instead of DOM -> performance optimization
2. **Zustand**: Lightweight state management for minimal re-renders
3. **Image preloading**: Sprite images pre-loaded
4. **SSE proxy**: Server proxy to avoid CORS
5. **Production**: console.log removed (terser pure_funcs)

### Reference External URLs

| Service | URL Pattern |
|---------|-------------|
| Vercel Deployment | `https://ainspace-4g3e.vercel.app` |
| API Server | `https://base-backend-dev.ainetwork.xyz` |
| A2A Orchestration | `https://a2a-orchestration-dev.ainetwork.ai/api` |
| Farcaster Manifest | `https://api.farcaster.xyz/miniapps/hosted-manifest/...` |

---

## Appendix: Reimplementation Checklist

Order for reimplementing the project from scratch using only this document:

### Phase 1: Project Setup
- [ ] Create Next.js 15 (App Router) + TypeScript strict project
- [ ] Install packages (refer to package.json)
- [ ] Configure Tailwind CSS v4 + PostCSS
- [ ] tsconfig.json (including `@/*` path alias)
- [ ] next.config.ts (images, Farcaster redirect, webpack, Sentry)

### Phase 2: Infrastructure Layer
- [ ] Redis client (lib/redis.ts)
- [ ] Wagmi configuration (lib/wagmi-config.ts)
- [ ] Utilities (lib/utils.ts, lib/hash.ts)
- [ ] Environment variables (.env)

### Phase 3: State Management
- [ ] Implement 7 Zustand stores (stores/)
- [ ] Type definitions (types/thread.ts)
- [ ] Game constants (constants/game.ts, common.ts)

### Phase 4: Provider & Auth
- [ ] Providers.tsx (Wagmi -> Query -> MapData -> OnchainKit)
- [ ] AuthGuard.tsx (wallet auth guard)
- [ ] layout.tsx (fonts, metadata, Provider wrapping)

### Phase 5: Agent System
- [ ] Agent class hierarchy (lib/agent.ts)
- [ ] A2A Orchestration client (lib/a2aOrchestration.ts)
- [ ] Agent API routes (/api/agents, agent-chat, agent-proxy, agent-response, create-agent)

### Phase 6: Map System
- [ ] TileMap Canvas renderer (components/TileMap.tsx)
- [ ] useTiledMap, useGameState hooks
- [ ] Collision map generation (useBuildStore.updateCollisionMapFromImage)
- [ ] Map resources (public/map/)

### Phase 7: UI Components
- [ ] Footer (tab navigation)
- [ ] MapTab (game display + joystick)
- [ ] AgentTab (agent management)
- [ ] TempBuildTab (map building)

### Phase 8: Chat System
- [ ] ChatBox (message UI + @mentions)
- [ ] ChatBoxOverlay + ChatBottomDrawer
- [ ] useThreadStream (SSE)
- [ ] Thread API routes (/api/threads, thread-message, thread-stream)

### Phase 9: Login & Additional Features
- [ ] Login page (Signature + wallet)
- [ ] Farcaster MiniApp integration
- [ ] Sentry error tracking
- [ ] Vercel Analytics

### Phase 10: Deployment
- [ ] Vercel deployment configuration
- [ ] Redis provisioning
- [ ] Environment variable registration
- [ ] Sentry project connection
