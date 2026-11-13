import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  Tv,
  Film,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Play,
  Copy,
  Lock,
  ChevronDown,
  ChevronUp,
  Zap,
  Sliders,
  Star,
  Check,
  Eye,
  Clock,
  Layers,
  Heart,
  Flame,
  Search,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../context/useAppContext';

interface LandingPageProps {
  onOpenLogin: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenLogin }) => {
  const { showToast } = useToast();
  const [manifestUrl, setManifestUrl] = useState('');
  const [installUrl, setInstallUrl] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoFilter, setDemoFilter] = useState<'all' | 'ready' | 'pending' | 'watched'>('ready');

  useEffect(() => {
    api.getInfo()
      .then((info) => {
        setManifestUrl(info.manifestUrl);
        setInstallUrl(info.stremioInstallUrl);
      })
      .catch(() => {
        const origin = window.location.origin;
        setManifestUrl(`${origin}/manifest.json`);
        setInstallUrl(`stremio://${window.location.host}/manifest.json`);
      });
  }, []);

  const handleCopy = () => {
    if (!manifestUrl) return;
    navigator.clipboard
      .writeText(manifestUrl)
      .then(() => showToast('Manifest link copied! Paste into Stremio Addons search bar.', 'success'))
      .catch(() => window.prompt('Copy addon link:', manifestUrl));
  };

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (installUrl) {
      window.location.href = installUrl;
    }
  };

  // Mock demo items for the Stremio TV simulation
  const mockTvItems = [
    {
      id: '1',
      name: 'Gladiator II',
      year: '2024',
      badge: 'NEW RELEASE',
      quality: '4K UHD • WEB-DL',
      sources: 26,
      ready: true,
      isNew: true,
      isWatched: false,
      poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: '2',
      name: 'Dune: Part Two',
      year: '2024',
      badge: 'GOOD QUALITY',
      quality: '4K UHD • BluRay',
      sources: 34,
      ready: true,
      isNew: false,
      isWatched: false,
      poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: '3',
      name: 'Deadpool & Wolverine',
      year: '2024',
      badge: 'GOOD QUALITY',
      quality: '1080p FHD • WEB-DL',
      sources: 19,
      ready: true,
      isNew: false,
      isWatched: false,
      poster: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: '4',
      name: 'Avatar 3: Fire and Ash',
      year: '2025',
      badge: 'WAITING',
      quality: 'Unreleased',
      sources: 0,
      ready: false,
      isNew: false,
      isWatched: false,
      poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&auto=format&fit=crop&q=80'
    },
    {
      id: '5',
      name: 'Oppenheimer',
      year: '2023',
      badge: 'WATCHED',
      quality: '4K UHD • BluRay',
      sources: 42,
      ready: true,
      isNew: false,
      isWatched: true,
      poster: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=500&auto=format&fit=crop&q=80'
    }
  ];

  const displayedDemoItems = mockTvItems.filter((item) => {
    if (demoFilter === 'ready') return item.ready && !item.isWatched;
    if (demoFilter === 'pending') return !item.ready && !item.isWatched;
    if (demoFilter === 'watched') return item.isWatched;
    return !item.isWatched;
  });

  const faqs = [
    {
      q: 'What is Good Quality Tracker?',
      a: 'It is an automated Stremio release companion. You add movies you want to see, and our cloud engine continuously monitors stream providers every 30 minutes. It filters out fuzzy cinema phone recordings (CAM / Telesync). The moment a clean 1080p FHD or 4K UHD copy drops, it automatically promotes the film to your Stremio library with direct TV home row integration.'
    },
    {
      q: 'Does it work on my Smart TV (Samsung, LG, Android TV, Fire TV)?',
      a: 'Yes, 100%! When you connect your Stremio account, the addon is installed directly onto your official Stremio account in the cloud. It syncs automatically across all your devices: Samsung Tizen, LG webOS, Android TV, Google TV, Fire TV Stick, Apple Mac, Windows PC, iOS, and Android mobile.'
    },
    {
      q: 'Can I set it to only notify me when 4K UHD is available?',
      a: 'Yes! You can choose your global preference (1080p Full HD vs 4K Ultra HD) in settings, and you can also override the quality threshold per movie. If you only want to watch a big visual spectacle in 4K UHD on your OLED screen, just set that specific movie to 4K.'
    },
    {
      q: 'What happens when I finish watching a movie?',
      a: 'You can click the "Mark as Watched" eye button on any card to automatically archive it into your Watched History. This instantly declutters your active Stremio rows and active web dashboard, keeping your watchlist focused only on movies waiting to be watched.'
    },
    {
      q: 'Do I need Real-Debrid or Torrentio?',
      a: 'Good Quality Tracker works natively with community scrapers like Torrentio and detects streams regardless of whether you use Real-Debrid, AllDebrid, Premiumize, Torbox, or standard P2P torrent streams.'
    },
    {
      q: 'Is this free and safe for my account?',
      a: 'Yes! Good Quality Tracker is 100% free and open source. We never see or store your Stremio password. Your authentication tokens are encrypted using military-grade AES-256-GCM encryption in our database.'
    }
  ];

  return (
    <div className="space-y-24 sm:space-y-32 py-4">
      {/* 1. HERO SECTION */}
      <section className="relative text-center max-w-4xl mx-auto pt-4 sm:pt-10 px-4">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-purple-600/25 via-indigo-600/15 to-transparent blur-[140px] rounded-full pointer-events-none -z-10" />

        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-semibold mb-6 shadow-sm">
          <Sparkles size={14} className="text-purple-400 animate-pulse" />
          <span>Automated Release Intelligence for Stremio</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.08] mb-6">
          Never watch a blurry <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-amber-300 line-through decoration-red-500/80 mr-3">
            CAM recording
          </span>
          again.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-8 font-normal">
          Track upcoming cinema releases and let our cloud engine scan stream sources 24/7. 
          When pristine <strong className="text-white font-semibold">1080p FHD & 4K UHD</strong> arrives, 
          it lands straight on your Smart TV home screen.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
          <button
            onClick={onOpenLogin}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-[#7b42f6] to-indigo-600 hover:from-[#6a34e0] hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_30px_rgba(123,66,246,0.55)] hover:shadow-[0_0_40px_rgba(123,66,246,0.75)] transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <Sparkles size={17} />
            <span>Connect Stremio & Start Tracking</span>
            <ArrowRight size={16} />
          </button>

          <a
            href={installUrl || '#'}
            onClick={handleInstallClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition-all cursor-pointer"
          >
            <Play size={15} fill="currentColor" />
            <span>1-Click Install to Stremio</span>
          </a>

          <button
            onClick={handleCopy}
            className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Copy Addon Manifest Link"
            aria-label="Copy Addon Manifest Link"
          >
            <Copy size={17} />
          </button>
        </div>

        {/* Trust Badges */}
        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Check size={15} className="text-emerald-400" />
            <span>100% Free & Open Source</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check size={15} className="text-emerald-400" />
            <span>No Ads or Data Collection</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check size={15} className="text-emerald-400" />
            <span>Smart TV & Debrid Synced</span>
          </div>
        </div>
      </section>

      {/* 2. STREMIO TV SIMULATION / INTERACTIVE PREVIEW */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="relative rounded-3xl bg-gradient-to-b from-[#181a28] to-[#0f111a] border border-white/15 p-5 sm:p-8 shadow-2xl overflow-hidden">
          {/* Header of the Stremio Mockup */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-yellow-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-green-500/80 inline-block" />
                <span className="text-xs font-mono text-gray-400 ml-2">Stremio • Discover / Catalog Preview</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mt-3 flex items-center gap-2">
                <span>🟢 Watchlist: Ready (Good Quality)</span>
                <span className="text-xs font-normal text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                  Live Account Sync
                </span>
              </h3>
            </div>

            {/* Filter Tabs Preview */}
            <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/10 self-start sm:self-auto">
              <button
                onClick={() => setDemoFilter('ready')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  demoFilter === 'ready'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                🟢 Ready ({mockTvItems.filter(i => i.ready && !i.isWatched).length})
              </button>
              <button
                onClick={() => setDemoFilter('pending')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  demoFilter === 'pending'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                ⏳ Waiting ({mockTvItems.filter(i => !i.ready && !i.isWatched).length})
              </button>
              <button
                onClick={() => setDemoFilter('watched')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  demoFilter === 'watched'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                👁️ Watched ({mockTvItems.filter(i => i.isWatched).length})
              </button>
            </div>
          </div>

          {/* Catalog Row Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 pt-6">
            {displayedDemoItems.map((movie) => (
              <div
                key={movie.id}
                className="group relative flex flex-col bg-[#141624] border border-white/10 hover:border-purple-500/40 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 shadow-lg"
              >
                {/* Poster Image */}
                <div className="relative aspect-[2/3] w-full bg-[#1b1f30] overflow-hidden">
                  <img
                    src={movie.poster}
                    alt={movie.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Badge */}
                  <div className="absolute top-2.5 left-2.5">
                    {movie.isNew ? (
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md shadow-md flex items-center gap-1 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-white border border-amber-300 animate-pulse">
                        <Flame size={10} className="fill-current text-yellow-200" /> NEW RELEASE
                      </span>
                    ) : movie.isWatched ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md shadow-md flex items-center gap-1 bg-purple-900/90 text-purple-200 border border-purple-500/40">
                        <Eye size={10} /> Watched
                      </span>
                    ) : movie.ready ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md shadow-md flex items-center gap-1 bg-emerald-500/90 text-white border border-emerald-400/40">
                        <CheckCircle2 size={10} /> Good Quality
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md shadow-md flex items-center gap-1 bg-amber-500/90 text-black border border-amber-300/40">
                        <Clock size={10} /> Waiting
                      </span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col justify-between flex-1 gap-1.5">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-white truncate group-hover:text-purple-300 transition-colors">
                      {movie.name}
                    </h4>
                    <p className="text-[11px] text-gray-400">{movie.year}</p>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-1 border-t border-white/5">
                    <span className={movie.ready ? 'text-emerald-400 font-semibold' : 'text-amber-400 font-semibold'}>
                      {movie.quality}
                    </span>
                    <span className="text-gray-500">{movie.sources > 0 ? `${movie.sources} streams` : '0 sources'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Hint */}
          <div className="mt-6 pt-4 border-t border-white/10 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
            <Tv size={14} className="text-purple-400" />
            <span>These rows appear directly on your Samsung, LG, Android TV or PC Stremio discover screen.</span>
          </div>
        </div>
      </section>

      {/* 3. THE PROBLEM & SOLUTION (BEFORE VS AFTER) */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-2">
            The Quality Dilemma, Solved.
          </h2>
          <p className="text-sm text-gray-400">
            Compare the frustrating manual search with automated release tracking.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
          {/* The Old Way */}
          <div className="rounded-2xl bg-red-950/15 border border-red-500/20 p-6 sm:p-7 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider mb-4">
                <XCircle size={16} />
                <span>The Usual Stremio Experience</span>
              </div>
              <div className="space-y-3.5 text-xs text-gray-300">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                  <span className="text-red-400 font-bold text-base mt-0.5">❌</span>
                  <div>
                    <p className="font-semibold text-white">45 streams found for new cinema title</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">You click play with excitement, only to find every link is a shaky Telesync recorded on a phone in a cinema.</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                  <span className="text-red-400 font-bold text-base mt-0.5">❌</span>
                  <div>
                    <p className="font-semibold text-white">Manual weekly checking</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">Constantly checking forums, Reddit, or Stremio searches: "Has Dune 2 or Gladiator dropped in digital yet?"</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                  <span className="text-red-400 font-bold text-base mt-0.5">❌</span>
                  <div>
                    <p className="font-semibold text-white">Ruined movie nights</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">Couch ready, popcorn in hand, only to suffer terrible audio, washed-out colors, and people coughing in the theater.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-red-500/10 text-[11px] text-red-300/80 font-medium">
              Frustrating, repetitive, and wastes your leisure time.
            </div>
          </div>

          {/* The Good Quality Tracker Way */}
          <div className="rounded-2xl bg-purple-950/20 border border-purple-500/30 p-6 sm:p-7 flex flex-col justify-between relative shadow-lg">
            <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
              AUTOMATED
            </div>
            <div>
              <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider mb-4">
                <CheckCircle2 size={16} className="text-emerald-400" />
                <span>With Good Quality Tracker</span>
              </div>
              <div className="space-y-3.5 text-xs text-gray-300">
                <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/20 flex items-start gap-3">
                  <span className="text-emerald-400 font-bold text-base mt-0.5">✅</span>
                  <div>
                    <p className="font-semibold text-white">Anti-CAM Release Intelligence</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">Our regex filters isolate Telesync, HDCAM, and TC tags. You will never accidentally launch a bad recording.</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/20 flex items-start gap-3">
                  <span className="text-emerald-400 font-bold text-base mt-0.5">✅</span>
                  <div>
                    <p className="font-semibold text-white">Automated 24/7 Cloud Monitoring</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">Our server checks providers every 30 minutes in the background with zero battery or data consumption on your devices.</p>
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-black/40 border border-purple-500/20 flex items-start gap-3">
                  <span className="text-emerald-400 font-bold text-base mt-0.5">✅</span>
                  <div>
                    <p className="font-semibold text-white">Instant Smart TV Home Sync</p>
                    <p className="text-gray-400 text-[11px] mt-0.5">As soon as clean 1080p or 4K drops, it appears on your Smart TV home row with the 🔥 NEW RELEASE badge!</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-purple-500/20 text-[11px] text-emerald-300 font-semibold flex items-center justify-between">
              <span>Sit back, relax, and enjoy pristine cinema quality.</span>
              <span className="text-purple-300">🍿 Popcorn ready</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. NEW FEATURES SHOWCASE */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/25 text-indigo-300 text-xs font-semibold mb-3">
            <Sparkles size={13} />
            <span>Version 2.0 Features</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
            Engineered for Serious Movie Lovers
          </h2>
          <p className="text-sm text-gray-400">
            More than a simple list — an intelligent assistant that watches stream releases so you don't have to.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: 4K vs 1080p target */}
          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <SlidersHorizontal size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">1080p & 4K Quality Filters</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Have an OLED TV or Dolby Atmos setup? Choose "4K Ultra HD Only" globally or toggle per-movie. You won't be alerted until real 2160p arrives.
            </p>
          </div>

          {/* Card 2: New release badge */}
          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-110 transition-transform">
              <Flame size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">🔥 NEW RELEASE Badges</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Spot fresh arrivals instantly. Any movie that hit good quality within the last 48 hours gets highlighted with a flaming badge in Stremio and web.
            </p>
          </div>

          {/* Card 3: One-click Watched Archive */}
          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4 group-hover:scale-110 transition-transform">
              <Eye size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Auto-Archive upon Watching</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Finished a film? Click the quick eye button to move it to your Watched History tab, automatically keeping your active catalog clean and organized.
            </p>
          </div>

          {/* Card 4: Anti-CAM Gatekeeper */}
          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Anti-CAM Protection</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Filters out Telesync, HDCAM, and Telecine releases. Only verified clean digital copies (WEB-DL, WEBRip, BluRay) trigger the "Ready" state.
            </p>
          </div>

          {/* Card 5: Smart TV cloud sync */}
          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
              <Tv size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Universal Stremio Sync</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Syncs with your official Stremio cloud account. Your custom rows appear on Samsung, LG, Android TV, Fire TV, Mac, Windows, and mobile.
            </p>
          </div>

          {/* Card 6: Encrypted & Private */}
          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Lock size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">AES-256-GCM Encrypted</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your Stremio session is encrypted end-to-end. We never see or store your password, and we never collect or share personal telemetry.
            </p>
          </div>
        </div>
      </section>

      {/* 5. HOW IT WORKS (3 SIMPLE STEPS) */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="text-center max-w-lg mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Get Started in 60 Seconds
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            No complicated terminal setups or manual port forwarding.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 relative">
            <div className="w-8 h-8 rounded-full bg-[#7b42f6] text-white font-bold text-xs flex items-center justify-center mb-4 shadow-md">
              1
            </div>
            <h4 className="text-sm font-bold text-white mb-1.5">Sign In with Stremio</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Connect your account with 1-click so the tracker can automatically sync catalog rows directly to your Stremio library.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 relative">
            <div className="w-8 h-8 rounded-full bg-[#7b42f6] text-white font-bold text-xs flex items-center justify-center mb-4 shadow-md">
              2
            </div>
            <h4 className="text-sm font-bold text-white mb-1.5">Add Movies to Watch</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Search for any movie currently in cinemas or upcoming. Add it to your watchlist in one click, and optionally set 4K target quality.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 relative">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center mb-4 shadow-md">
              3
            </div>
            <h4 className="text-sm font-bold text-white mb-1.5">Watch in True 1080p/4K</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              When quality releases drop, the movie automatically pops up in your TV Stremio Home Catalog ready to stream with high bitrate audio.
            </p>
          </div>
        </div>
      </section>

      {/* 6. COMMUNITY TESTIMONIALS */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="text-center max-w-md mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Loved by Stremio Users
          </h2>
          <p className="text-xs text-gray-400">
            Real feedback from community streamers and home theater enthusiasts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} fill="currentColor" />
                ))}
              </div>
              <p className="text-xs text-gray-300 italic leading-relaxed">
                "I used to click 5 different streams every Friday night just to find out every single one was a shaky phone recording. This completely solved my Friday nights."
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-white/5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs flex items-center justify-center">
                M
              </div>
              <div>
                <p className="text-xs font-bold text-white">Mateo R.</p>
                <p className="text-[10px] text-gray-400">Samsung Tizen User</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} fill="currentColor" />
                ))}
              </div>
              <p className="text-xs text-gray-300 italic leading-relaxed">
                "The 4K OLED filter is incredible. I only watch films when genuine 2160p releases drop, and having it pop up automatically on my LG TV is pure luxury."
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-white/5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-300 font-bold text-xs flex items-center justify-center">
                L
              </div>
              <div>
                <p className="text-xs font-bold text-white">Lucas B.</p>
                <p className="text-[10px] text-gray-400">LG OLED C3 Streamer</p>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={13} fill="currentColor" />
                ))}
              </div>
              <p className="text-xs text-gray-300 italic leading-relaxed">
                "Super lightweight and works seamlessly with Torrentio & Real-Debrid. The 'Mark as Watched' button keeps my Stremio rows super clean."
              </p>
            </div>
            <div className="mt-5 pt-3 border-t border-white/5 flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs flex items-center justify-center">
                A
              </div>
              <div>
                <p className="text-xs font-bold text-white">Alexandre T.</p>
                <p className="text-[10px] text-gray-400">Fire TV Stick 4K</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION */}
      <section className="max-w-3xl mx-auto px-4">
        <div className="text-center max-w-md mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-gray-400">
            Everything you need to know about Good Quality Tracker.
          </p>
        </div>

        <div className="divide-y divide-white/10 rounded-2xl bg-[#141624] border border-white/10 overflow-hidden shadow-xl">
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="transition-colors">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="w-full p-4 sm:p-5 flex items-center justify-between gap-4 text-left hover:bg-white/[0.02] cursor-pointer"
                >
                  <span className="text-sm font-semibold text-white">{faq.q}</span>
                  <span className="text-gray-400 shrink-0">
                    {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 sm:px-5 pb-5 text-xs text-gray-300 leading-relaxed animate-fadeIn">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. BOTTOM CONVERSION CTA */}
      <section className="max-w-4xl mx-auto px-4 pb-12">
        <div className="relative rounded-3xl bg-gradient-to-r from-purple-900/60 via-[#181a28] to-indigo-900/60 border border-purple-500/30 p-8 sm:p-12 text-center shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-radial-gradient from-purple-500/10 via-transparent to-transparent pointer-events-none" />

          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Ready for pristine movie nights?
          </h2>
          <p className="text-sm text-gray-300 max-w-lg mx-auto mb-8 leading-relaxed">
            Stop gambling on stream qualities. Connect your Stremio account today and enjoy automated release tracking for free.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-[#7b42f6] to-indigo-600 hover:from-[#6a34e0] hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(123,66,246,0.6)] transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <Sparkles size={16} />
              <span>Get Started Now — It's Free</span>
            </button>
            <a
              href={installUrl || '#'}
              onClick={handleInstallClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm transition-all cursor-pointer"
            >
              <Play size={14} fill="currentColor" />
              <span>Install Addon</span>
            </a>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="border-t border-white/10 pt-8 pb-12 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">🎬</span>
            <span className="font-bold text-gray-300">Stremio Watchlist • Good Quality Tracker</span>
          </div>

          <p className="text-gray-500 text-[11px]">
            Community Stremio Addon. Not officially affiliated with Stremio or IMDb.
          </p>

          <div className="flex items-center gap-4 text-gray-400">
            <button
              onClick={handleCopy}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Copy Addon URL
            </button>
            <button
              onClick={onOpenLogin}
              className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
};
