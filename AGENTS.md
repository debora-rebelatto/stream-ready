# 🤖 AGENTS.md — Contributor & AI Agent Guidelines

Welcome to **Stremio Watchlist (Good Quality Tracker)**. This document serves as the single source of truth and operating handbook for developers and AI agents working on this codebase.

---

## 🎯 Project Overview & Mission

**Stremio Watchlist (Good Quality Tracker)** is a full-stack open-source Stremio addon and web dashboard that monitors personal movie watchlists and automatically flags movies as soon as a confirmed good quality digital release (**HD 720p**, **Full HD 1080p**, or **4K UHD**) is detected across streaming services and torrent networks (via Torrentio & Cinemeta).

- **Web Dashboard:** [https://stremiowatchlist.vercel.app/](https://stremiowatchlist.vercel.app/)
- **Addon Manifest:** `https://stremiowatchlist.vercel.app/manifest.json`
- **GitHub Repository:** [https://github.com/debora-rebelatto/stremiowatchlist](https://github.com/debora-rebelatto/stremiowatchlist)

---

## 🌐 Language & Code Standard

> [!IMPORTANT]
> **ALL CODE, USER-FACING TEXT, COMMITS, AND DOCUMENTATION MUST BE IN ENGLISH.**
>
> - All UI labels, toasts, placeholder texts, and modals must be in English.
> - All Stremio catalog names, card titles, badges, and status descriptions must be in English.
> - All comments, variable names, documentation, and commit messages must be in English.

---

## 🛡️ Lauren Tan Constraint Engineering & "Pit of Success" Manifesto

> [!IMPORTANT]
> **"ALL CODE IS SLOP, EXCEPT WHEN PHYSICALLY CONSTRAINED."**
>
> This project follows the **Lauren Tan (SpaceX / xAI GrokBot)** methodology for autonomous agent collaboration:
>
> 1. **The Codebase is the Strict Boundary:** Rules in natural prose are fragile. Whenever a boundary, import hierarchy, or architectural restriction exists, it MUST be enforced by compiler checks and static analysis (`eslint.config.mjs`, TypeScript strict mode), making incorrect paths physically impossible to compile.
> 2. **Mistakes Become Static Checks (Never Just Text):** When an agent or human makes a mistake or architectural deviation, the solution is **never** to just write a text reminder. It must immediately be codified into a deterministic ESLint rule (`no-restricted-imports`, custom rules) or an architecture unit test (`tests/architecture.test.ts`).
> 3. **Mandatory "Proof of Innocence" (`npm run verify`):** An agent must **never** conclude a task by merely claiming "it is fixed". Every delivery requires running the full verification harness and providing the deterministic console output as proof.
> 4. **Confidence Pyramid:**
>    - Level 1: Strict TypeScript types & compiler invariants.
>    - Level 2: ESLint architectural boundaries & static analysis.
>    - Level 3: Automated Jest test suite (298+ unit and integration tests).
>    - Level 4: Production build verification (`vite build` + `build:server`).
>    - Level 5: Human review focusing solely on business logic and architecture.

---

## 🏛️ Clean Architecture & Clean Code Standards

> [!IMPORTANT]
> **ALWAYS FOLLOW CLEAN CODE AND CLEAN ARCHITECTURE PRINCIPLES. KEEP ALL COMPONENTS MINIMAL AND CONTINUOUSLY REFACTOR.**

### 1. Strict Layered Architecture (Separation of Concerns)

Every feature in the application must respect strict layer boundaries. Dependencies must point **inward** (Views/Components → Controllers → Services → Models/Utils):

1. **`models/` (Domain Models & Entities):**
   - Pure TypeScript interfaces, types, and domain data structures (e.g., `MovieModel.ts`, `UserModel.ts`, `CustomListModel.ts`, `SettingsModel.ts`).
   - Zero dependencies on UI frameworks or external HTTP libraries.
2. **`services/` (Business Logic & External Gateways):**
   - Encapsulates all API requests, external integrations (Stremio, Cinemeta, TMDB, Torrentio), and domain operations (e.g., `authService.ts`, `watchlistService.ts`, `customListService.ts`, `systemService.ts`, `pollService.ts`).
   - UI components and views **must never** call `fetch` or low-level HTTP clients (`api.ts`) directly.
3. **`controllers/` (UI State & Interaction Controllers):**
   - Custom React hooks (`use*Controller.ts`) that manage local/shared state, side effects (`useEffect`), form handling, filtering, pagination, and user action handlers (e.g., `useAppController.ts`, `useDashboardController.ts`, `useSearchController.ts`, `useSettingsController.ts`).
   - Controllers consume `services/` and expose clean state and callback props to `views/` and `components/`.
4. **`views/` (Presentational Page Views):**
   - High-level screen layouts and page views (`LandingPageView.tsx`, `UserDashboardView.tsx`, `SettingsPageView.tsx`).
   - Views focus strictly on layout composition and rendering data provided by `controllers/`.
5. **`components/` (Minimal, Reusable UI Components):**
   - Atomic and molecular UI widgets (`Button.tsx`, `Badge.tsx`, `MovieCard.tsx`, `Pagination.tsx`, modals, etc.).
   - **Keep all components minimal:** A component should do one thing well, receive data and callbacks via props, and avoid embedded business logic or direct API calls.
6. **`utils/` (Pure Functions & Adapters):**
   - Stateless helper functions, data transformers, validators, and adapters (e.g., `qualityAdapter.ts`, `movieValidator.ts`, `analyticsUtils.ts`).

### 2. Clean Code & Minimal Component Rules

- **Single Responsibility Principle (SRP):** Each file, component, hook, and function must have a single, well-defined responsibility.
- **Minimal Components:**
  - Keep UI components small, declarative, and focused on presentation (target **< 150–200 lines** per component).
  - If a component grows large or manages multiple state variables/effects, immediately extract its logic into a dedicated hook in `src/controllers/` and split sub-sections into smaller child components.
- **No Duplication (DRY):** Extract repeated UI patterns (buttons, badges, form controls, card headers, modal shells) into shared components in `src/components/`.
- **Continuous Refactoring Effort:**
  - Every task, bugfix, or feature addition must leave the codebase cleaner than it was found (Boy Scout Rule).
  - Proactively break down legacy monolithic files (`UserDashboard.tsx`, `AppContext.tsx`, `SettingsPage.tsx`, `server.js`, `lib/db.js`) into their respective Clean Architecture layers.

---

## 🏗️ Target Architecture & Codebase Layout

```
.
├── src/                          # Frontend Application (React 19 + TypeScript + Vite)
│   ├── assets/                   # Static images, icons, and SVGs
│   ├── components/               # Minimal, reusable UI components (Button, Badge, MovieCard, Modals)
│   ├── controllers/              # Custom React hook controllers (useAppController, useDashboardController, etc.)
│   ├── models/                   # Domain models & TypeScript interfaces (MovieModel, UserModel, ListModel, etc.)
│   ├── services/                 # Domain & API services (authService, watchlistService, customListService, etc.)
│   ├── utils/                    # Pure helper functions, formatters, HTTP client, and adapters
│   ├── views/                    # Presentational page views (LandingPageView, UserDashboardView, SettingsView)
│   ├── context/                  # Lightweight React context providers bridging controllers
│   ├── App.tsx                   # Root application router/switcher
│   ├── index.css                 # Global styles & Tailwind imports
│   └── main.tsx                  # React DOM entry point
├── server/                       # Backend Application (Node.js / TypeScript)
│   ├── controllers/              # Express route controllers (auth, watchlist, lists, addon, system)
│   ├── models/                   # Backend domain models and DTOs
│   ├── repositories/             # Database access layer (Supabase & in-memory cache repositories)
│   ├── services/                 # Core business logic (QualityChecker, StremioAddon, StremioAuth, Cinemeta, TMDB)
│   └── utils/                    # Backend helpers, crypto utilities, and validators
├── lib/                          # Compiled CommonJS server modules & database bridge
├── tests/                        # Automated Test Suites (Jest + SWC)
│   ├── controllers/              # Controller & hook unit tests
│   ├── services/                 # Frontend service tests
│   ├── server/                   # Backend service & repository tests
│   └── *.test.ts                 # UI component, utility, and protocol tests
├── server.js                     # Express HTTP server entry point
├── jest.config.js                # Jest test runner configuration
├── vite.config.ts                # Vite frontend bundler configuration
└── package.json                  # Dependencies & scripts
```

---

## 🗺️ Achievable Refactoring Roadmap

To transition the entire codebase to 100% compliance with the Clean Architecture structure above without breaking existing functionality or tests, refactoring is organized into the following achievable phases:

### Phase 1: Domain Models & Pure Utilities (`src/models/` & `src/utils/`)

- [x] **1.1. Create `src/models/`:** Split `src/types.ts` into domain-specific model files (`MovieModel.ts`, `UserModel.ts`, `CustomListModel.ts`, `SettingsModel.ts`) with a barrel export `src/models/index.ts` (keeping `src/types.ts` as a re-export bridge for backward compatibility).
- [x] **1.2. Consolidate `src/utils/`:** Move pure helper functions (`utils.ts`, `recommendations.ts`, `analytics.ts`, `api.ts`) into `src/utils/` with clear adapter/helper naming (`qualityAdapter.ts`, `recommendationEngine.ts`, `analyticsClient.ts`, `httpClient.ts`, `watchlistFilter.ts`).

### Phase 2: Frontend Controllers & Context Decomposition (`src/controllers/`)

- [x] **2.1. Decompose `AppContext.tsx` (816 lines):** Extract domain state and actions into dedicated controller hooks in `src/controllers/`:
  - [x] `useAuthController.ts` (session check, login, logout, account deletion)
  - [x] `useWatchlistController.ts` (watchlist CRUD, quality rechecks, watched sync, backup import/export)
  - [x] `useCustomListsController.ts` (custom list CRUD, curated list adoption, item list assignment)
  - [x] `useSettingsController.ts` (global quality preferences, watched sync toggles)
- [x] **2.2. Extract Page & Modal Controllers:**
  - [x] `useAppController.ts` (root application session switcher)
  - [x] `useDashboardController.ts` (tab filtering, search query, pagination, active modal state, URL query handling)
  - [x] `useLandingController.ts` (manifest info, Stremio deep-link handling, copy/install actions)
  - [x] `useManageListsController.ts` (list creation form, inline rename, emoji picker, delete confirmation)
  - [x] `useSearchController.ts` (debounced Cinemeta/server search, adding state per item)

### Phase 3: Presentational Views & Minimal Components (`src/views/` & `src/components/`)

- [x] **3.1. Create `src/views/`:** Move page-level screens into `src/views/` as pure presentational views:
  - [x] `LandingPageView.tsx` (consuming `useLandingController`)
  - [x] `UserDashboardView.tsx` (consuming `useDashboardController`)
  - [x] `SettingsPageView.tsx` (consuming `useSettingsController`)
- [x] **3.2. Break Down Oversized Components (< 200 lines each):**
  - [x] Split `UserDashboard.tsx` (864 lines) into `DashboardFilterToolbar.tsx`, `CustomListPills.tsx`, `WatchlistGrid.tsx`, and `UserDashboardView.tsx`.
  - [x] Simplify `ManageListsModal.tsx` (515 lines) into `CustomListsTab.tsx` and `CuratedListsTab.tsx`.
  - [x] Simplify `SearchSection.tsx` (160 lines) using `useSearchController.ts`.
  - [x] Unify duplicated settings UI between `SettingsPageView.tsx` and `SettingsModal.tsx` into shared minimal components (`QualitySettingsCard.tsx`, `SyncSettingsCard.tsx`, `BackupSettingsCard.tsx`, `AccountDangerCard.tsx`).
  - [x] Split `LandingPageView.tsx` into `LandingHeroSection.tsx`, `QualityComparisonSection.tsx`, `HowItWorksSection.tsx`, `FeaturesGridSection.tsx`, and `LandingFaqSection.tsx`.
  - [x] Create a reusable base `<ModalShell />` wrapper component to eliminate duplicated backdrop/header/close boilerplate.

### Phase 4: Backend Clean Architecture (`server/` & `lib/db.js`)

- [x] **4.1. Create `server/repositories/`:**
  - [x] `userRepository.js` (user resolution, settings, account deletion)
  - [x] `watchlistRepository.js` (movie items CRUD, watched sync persistence, stats calculation)
  - [x] `customListRepository.js` (custom lists CRUD and item-list associations)
  - [x] `pollRepository.js` & `analyticsRepository.js` (feature poll votes and event logging)
- [x] **4.2. Extract Express Route Controllers from `server.js` (1,552 lines) into `server/controllers/`:**
  - [x] `addonController.js` (`/manifest.json`, `/catalog/...`, `/meta/...`, `/r/qr`, `/api/qr/poster`)
  - [x] `authController.js` (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/account`)
  - [x] `watchlistController.js` (`/api/items`, `/api/check-all`, `/api/sync-watched`, `/api/export`, `/api/import`)
  - [x] `customListController.js` (`/api/lists`, `/api/curated-lists`)
  - [x] `systemController.js` (`/api/info`, `/api/settings`, `/api/poll`, `/api/events`, `/api/cron`)
  - [x] Keep `server.js` as a clean, minimal bootstrap file (< 150 lines) that registers middleware and mounts routes.

---

## 🛠️ Essential Commands

### Development

```bash
# Start both backend server and Vite client concurrently
npm run dev

# Start only the backend server (with auto-reload on file change)
npm run dev:server

# Start only the Vite frontend dev server
npm run dev:client
```

### Verification & Proof of Innocence

```bash
# Run the complete verification harness (Typecheck + Lint + Test + Build)
npm run verify

# Individual checks if needed:
npm run typecheck    # Runs both client and server TypeScript typecheck
npm run lint         # Runs ESLint with Clean Architecture import boundaries
npm test             # Runs all Jest unit/integration test suites
npm run build        # Compiles server and client production bundles
```

### Production Build

```bash
# Build the production frontend bundle into dist/
npm run build

# Preview the built production client
npm preview

# Start the production Node server
npm start
```

---

## 📐 Key Rules for Agents & Contributors

### 1. Verification Before Completion ("Proof of Innocence")

Always run the full verification pipeline before completing any task:

1. `npm run verify` — Must pass without errors. This runs:
   - `typecheck:client` & `typecheck:server`
   - `lint` (Clean Architecture import restrictions)
   - `test` (all Jest unit & integration tests)
   - `build` (compiles server and Vite production bundle)
2. Present the deterministic output of `npm run verify` in the response as proof of innocence. Never mark a task as completed without this evidence.

### 2. Resource Cleanup & Asynchronous Timers

Whenever using `setTimeout`, `setInterval`, or `AbortController`:

- Always wrap execution in `try ... finally` and clear active timers (`clearTimeout(timeout)` in `finally`).
- Never leave dangling timer handles in the Node.js event loop, as this causes Jest to hang and leak memory.

### 3. Stremio Addon Protocol Specifics

- **Manifest (`manifest.json`):**
  - Uses `idPrefixes: ['tt', 'guide_']`.
  - Sets `behaviorHints.configurationRequired: !userId`. When an unauthenticated user accesses the public addon, Stremio shows a **Configure** button instead of installing blindly, routing the user to the web dashboard.
- **Catalogs (`handleCatalog`):**
  - If a user opens Stremio without having configured their account, or if their watchlist is empty, return an informative guide card (`guide_configure` or `guide_empty_watchlist`) directing them to add movies on the website.
- **Movies must be added via the website:** The Stremio player interface cannot directly write to third-party databases; all movie additions and watchlist searches occur on the web dashboard.

### 4. Testing & Mocking Standards

- Never perform real external network calls during tests (mock calls to Torrentio, Cinemeta, and Stremio API using `jest.fn()`).
- Maintain test coverage for newly added controllers, services, repositories, and utilities.
- Keep tests fast and isolated.

---

## 🔒 Security Best Practices

- Sensitive keys (`SUPABASE_KEY`, `ENCRYPTION_KEY`) must never be hardcoded; load them through environment variables or `.env`.
- Private data backups and local cache files are excluded in `.gitignore`.
- Authentication tokens stored in URLs or headers must be properly validated and sanitized.
