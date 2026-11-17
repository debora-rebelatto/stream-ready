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

## 🏗️ Architecture & Codebase Layout

```
.
├── src/                          # Frontend Application (React 19 + TypeScript + Vite)
│   ├── components/               # React UI components (Navbar, LandingPage, MovieCard, Modals, etc.)
│   ├── context/                  # App state management (AppContext.tsx, useAppContext.ts)
│   ├── services/                 # Client-side services (authService, watchlistService, cinemetaService)
│   ├── lib/                      # Client API client (api.ts) and utility functions (utils.ts)
│   └── types.ts                  # Shared TypeScript interfaces & types
├── server/                       # Backend Business Logic (Node.js / TypeScript)
│   ├── services/                 # Stremio Addon, Quality Checker, Cinemeta, Auth, Crypto, UserData
│   └── types.ts                  # Backend TypeScript definitions
├── lib/                          # Database layer and backward-compatibility bridge
│   ├── db.js                     # Supabase & in-memory cache database layer
│   └── *.js                      # Compatibility proxies pointing to server/services
├── tests/                        # Automated Test Suites (Jest + SWC)
│   ├── services/                 # Frontend client service tests
│   ├── server/                   # Backend service tests
│   └── *.test.js / *.test.ts     # Core utility, crypto, and addon protocol tests
├── server.js                     # Express HTTP server & Stremio Addon routes
├── jest.config.js                # Jest test runner configuration
├── vite.config.ts                # Vite frontend bundler configuration
└── package.json                  # Dependencies & scripts
```

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
- Maintain test coverage for newly added services and utilities.
- Keep tests fast and isolated.

---

## 🔒 Security Best Practices

- Sensitive keys (`SUPABASE_KEY`, `ENCRYPTION_KEY`) must never be hardcoded; load them through environment variables or `.env`.
- Private data backups and local cache files are excluded in `.gitignore`.
- Authentication tokens stored in URLs or headers must be properly validated and sanitized.
