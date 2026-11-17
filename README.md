# 🎬 Stremio Watchlist (Good Quality Tracker)

<div align="center">

[![Sponsor](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?style=for-the-badge&logo=github-sponsors)](https://github.com/sponsors/debora-rebelatto)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg?style=for-the-badge)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-Passing-emerald.svg?style=for-the-badge)](tests)
[![Stremio Addon](https://img.shields.io/badge/Stremio-Official%20Protocol-00d1b2?style=for-the-badge&logo=stremio)](https://web.stremio.com/)

**Automatically track when pending movies in your watchlist become available in confirmed good quality (1080p Full HD or 4K UHD).**

Works 24/7 across **Smart TV (Android TV, Fire TV, LG webOS, Samsung Tizen)**, **Mobile (iOS & Android)**, and **Desktop**.

[🌐 Web Dashboard](https://stremiowatchlist.vercel.app/) • [📦 Addon Manifest](https://stremiowatchlist.vercel.app/manifest.json) • [💖 Sponsor on GitHub](https://github.com/sponsors/debora-rebelatto)

</div>

---

## 🌟 Why Stremio Watchlist?

When browsing upcoming or recently released films in Stremio, movies often only have low-quality theater recordings (CAM / TS / Telesync).

**Stremio Watchlist** eliminates the need to constantly check if a real digital release is out:
1. You save movies to your watchlist via the web dashboard.
2. The tracker continuously inspects real torrent networks and streaming sources (via Torrentio & Cinemeta).
3. The moment a confirmed **1080p**, **4K UHD**, or **BluRay / WEB-DL** stream is detected, the movie instantly moves to your **🟢 Ready (Good Quality)** catalog inside your Stremio player!

---

## ✨ Key Features

- **⚡ 1-Click Stremio Install:** Authenticate your Stremio account on the web dashboard to install the addon directly to your profile across all connected devices—no manual link copying required.
- **🟢 Real-Time Quality Detection:** Identifies 4K UHD, 1080p FHD, 720p HD, and BluRay/WEB-DL releases while ignoring CAM and low-bitrate rips.
- **📺 Dedicated Stremio Catalogs:**
  - `🟢 Watchlist: Ready (Good Quality)` — Movies ready to stream right now in high quality.
  - `⏳ Watchlist: Waiting for Quality` — Upcoming and in-theater titles being actively tracked.
  - `📋 Watchlist: All Movies` — Complete collection of all tracked movies.
- **📱 Smart TV & Mobile QR Code:** Scan a QR code on your TV screen or mobile device to open the dashboard with instant authentication.
- **📁 Custom Lists & Curated Collections:** Organize movies into custom folders (e.g. *Horror Night*, *Sci-Fi Favorites*) or 1-click import curated lists (e.g. *Letterboxd 2026 Most Anticipated*).
- **🔄 Watched Movies Synchronization:** Automatically detect movies you already watched inside Stremio and keep your watchlist clutter-free.
- **🎯 Quality Target Preferences:** Configure whether your threshold is 1080p Full HD or 4K Ultra HD.
- **💾 Backup & Restore:** Export your entire watchlist as a portable JSON file and restore it anytime.
- **🔒 Privacy First:** Stremio auth tokens are encrypted end-to-end. Your password is never stored or visible to the server.

---

## 🚀 Getting Started

1. Open the [Web Dashboard](https://stremiowatchlist.vercel.app/).
2. Click **"🔐 Sign in with Stremio"** and authenticate your account.
3. Click **"✨ Install Addon (1-Click)"** to activate the addon on your Stremio profile.
4. Search for upcoming movies or import recommendations to start tracking!

---

## 💻 Tech Stack & Architecture

- **Frontend:** React 19, TypeScript, Tailwind CSS, Vite, Lucide Icons.
- **Backend Services:** Node.js, Express, TypeScript, Supabase (PostgreSQL).
- **Addon Integration:** Official Stremio Addon SDK protocol (`manifest.json`, `catalog`, `meta`).
- **Testing:** Jest + SWC, 30+ automated unit & integration test suites.

```
.
├── src/                          # React 19 Frontend Application
│   ├── components/               # Reusable UI Components & Modals
│   ├── context/                  # App state (useAuth, useWatchlist, useToast)
│   ├── services/                 # Client API services (watchlist, auth, system)
│   └── lib/                      # Utilities, recommendations, and analytics
├── server/                       # Backend Business Logic
│   ├── services/                 # Quality checker, addon routes, TMDB, auth
│   └── types.ts                  # Shared server type definitions
├── tests/                        # Automated Test Suites (Jest)
└── server.js                     # Express HTTP server & Stremio Addon routes
```

---

## 🛠️ Local Development

### Prerequisites
- Node.js 18+
- npm 9+

```bash
# Clone the repository
git clone https://github.com/debora-rebelatto/stremiolist.git
cd stremiolist

# Install dependencies
npm install

# Start both backend and frontend development servers concurrently
npm run dev

# Run all automated tests
npm test

# Build for production
npm run build
```

---

## 💖 Supporting & Sponsoring

This project is open-source and free for everyone. Background quality checks and database storage run continuously in the cloud.

If **Stremio Watchlist** saves you time and enhances your movie nights, consider sponsoring the project on GitHub:

[![Sponsor on GitHub](https://img.shields.io/badge/Sponsor%20me%20on-GitHub%20Sponsors-ea4aaa?style=for-the-badge&logo=github)](https://github.com/sponsors/debora-rebelatto)

### Sponsorship Goals
- ☁️ **Server & Supabase Hosting:** Keeps background checking tasks running 24/7 with zero rate limits.
- 🔔 **Automated Notifications:** Funding development for Discord, Telegram, and Email alerts when a movie is released in 1080p/4K.
- 📺 **TV Series & Shows Support:** Expanding tracker capabilities beyond movies to series episodes and seasons.

---

## 📄 License

This project is open-source software licensed under the [MIT License](LICENSE).
