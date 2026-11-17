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
- [ ] **1.1. Create `src/models/`:** Split `src/types.ts` into domain-specific model files (`MovieModel.ts`, `UserModel.ts`, `CustomListModel.ts`, `SettingsModel.ts`, `ServerInfoModel.ts`) with a barrel export `src/models/index.ts` (keeping `src/types.ts` as a re-export bridge for backward compatibility).
- [ ] **1.2. Consolidate `src/utils/`:** Move pure helper functions (`utils.ts`, `recommendations.ts`, `analytics.ts`, `api.ts`) into `src/utils/` with clear adapter/helper naming (`movieAdapter.ts`, `recommendationEngine.ts`, `analyticsClient.ts`, `httpClient.ts`).

### Phase 2: Frontend Controllers & Context Decomposition (`src/controllers/`)
- [ ] **2.1. Decompose `AppContext.tsx` (816 lines):** Extract domain state and actions into dedicated controller hooks in `src/controllers/`:
  - `useAuthController.ts` (session check, login, logout, account deletion)
  - `useWatchlistController.ts` (watchlist CRUD, quality rechecks, watched sync, backup import/export)
  - `useCustomListsController.ts` (custom list CRUD, curated list adoption, item list assignment)
  - `useSettingsController.ts` (global quality preferences, watched sync toggles)
- [ ] **2.2. Extract Page & Modal Controllers:**
  - `useDashboardController.ts` (tab filtering, search query, pagination, active modal state, URL query handling)
  - `useLandingController.ts` (manifest info, Stremio deep-link handling, copy/install actions)
  - `useManageListsController.ts` (list creation form, inline rename, emoji picker, delete confirmation)
  - `useSearchController.ts` (debounced Cinemeta/server search, adding state per item)

### Phase 3: Presentational Views & Minimal Components (`src/views/` & `src/components/`)
- [ ] **3.1. Create `src/views/`:** Move page-level screens into `src/views/` as pure presentational views:
  - `LandingPageView.tsx` (consuming `useLandingController`)
  - `UserDashboardView.tsx` (consuming `useDashboardController`)
  - `SettingsPageView.tsx` (consuming `useSettingsController`)
- [ ] **3.2. Break Down Oversized Components (< 200 lines each):**
  - Split `UserDashboard.tsx` (864 lines) into `DashboardToolbar.tsx`, `WatchlistTabs.tsx`, `CustomListPills.tsx`, and `WatchlistGrid.tsx`.
  - Unify duplicated settings UI between `SettingsPage.tsx` (784 lines) and `SettingsModal.tsx` (469 lines) into shared minimal components (`QualitySettingsCard.tsx`, `SyncSettingsCard.tsx`, `BackupSettingsCard.tsx`, `AccountDangerCard.tsx`).
  - Split `LandingPage.tsx` (654 lines) into `LandingHeroSection.tsx`, `HowItWorksSection.tsx`, and `FeaturesGridSection.tsx`.
  - Simplify `ManageListsModal.tsx` (515 lines) into `CustomListsTab.tsx` and `CuratedListsTab.tsx`.
  - Create a reusable base `<Modal />` wrapper component to eliminate duplicated backdrop/header/close boilerplate across all 6 modal components.

### Phase 4: Backend Clean Architecture (`server/` & `lib/db.js`)
- [ ] **4.1. Split Monolithic `lib/db.js` (1,344 lines) into `server/repositories/`:**
  - `supabaseClient.ts` (shared Supabase headers, REST helpers, and retry logic)
  - `userRepository.ts` (user resolution, settings, account deletion)
  - `watchlistRepository.ts` (movie items CRUD, watched sync persistence, stats calculation)
  - `customListRepository.ts` (custom lists CRUD and item-list associations)
  - `pollRepository.ts` & `analyticsRepository.ts` (feature poll votes and event logging)
- [ ] **4.2. Extract Express Route Controllers from `server.js` (1,552 lines) into `server/controllers/`:**
  - `addonController.ts` (`/manifest.json`, `/catalog/...`, `/meta/...`, `/r/qr`, `/api/qr/poster`)
  - `authController.ts` (`/api/auth/login`, `/api/auth/me`, `/api/auth/logout`, `/api/auth/account`)
  - `watchlistController.ts` (`/api/items`, `/api/check-all`, `/api/sync-watched`, `/api/export`, `/api/import`)
  - `customListController.ts` (`/api/lists`, `/api/curated-lists`)
  - `systemController.ts` (`/api/info`, `/api/settings`, `/api/poll`, `/api/recommendations`, `/api/cron/check-releases`)
  - Keep `server.js` as a clean, minimal bootstrap file (< 150 lines) that registers middleware and mounts routes.

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

### Testing

```bash
# Run all automated tests
npm test

# Run tests in interactive watch mode
npm run test:watch

# Run tests with code coverage report
npm run test:coverage
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

### 1. Verification Before Completion

Always run the following commands before completing any task:

1. `npm test` — Ensure all unit and integration tests pass without errors or open handle warnings.
2. `npm run build` — Verify that Vite builds the frontend bundle into `dist/` cleanly.

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
