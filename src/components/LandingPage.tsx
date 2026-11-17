import React, { useState, useEffect } from 'react';
import { GitHubSponsorButton } from './GitHubSponsorButton';
import {
  Sparkles,
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
  Check,
  Eye,
  Flame,
  Search,
  SlidersHorizontal,
  Info,
  QrCode
} from 'lucide-react';
import { api } from '../lib/api';
import { trackEvent } from '../lib/analytics';
import { useToast } from '../context/useAppContext';
import { RecommendedBanner } from './RecommendedBanner';
import { Navbar } from './Navbar';
import { LoginModal } from './LoginModal';
import { InstallGuideModal } from './InstallGuideModal';
import { QrCodeModal } from './QrCodeModal';

export interface LandingPageProps {
  onOpenLogin?: () => void;
  onOpenInstallGuide?: () => void;
  onOpenQrModal?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin: propsOnOpenLogin,
  onOpenInstallGuide: propsOnOpenInstallGuide,
  onOpenQrModal: propsOnOpenQrModal,
}) => {
  const { showToast } = useToast();
  const [manifestUrl, setManifestUrl] = useState('');
  const [installUrl, setInstallUrl] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Internal modal states for self-contained landing page experience
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isInstallGuideOpen, setIsInstallGuideOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  const handleOpenLogin = propsOnOpenLogin || (() => setIsLoginOpen(true));
  const handleOpenInstallGuide = propsOnOpenInstallGuide || (() => setIsInstallGuideOpen(true));
  const handleOpenQrModal = propsOnOpenQrModal || (() => setIsQrModalOpen(true));

  useEffect(() => {
    // Detect redirect from Stremio Configure button
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('source') === 'stremio_configure') {
      setIsLoginOpen(true);
      showToast('👋 Welcome from Stremio! Connect your Stremio account to configure the addon.', 'info');
    }
  }, [showToast]);

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
    trackEvent('addon_manifest_copied', { location: 'landing_page' });
    navigator.clipboard
      .writeText(manifestUrl)
      .then(() => showToast('Manifest link copied! Paste into Stremio Addons search bar.', 'success'))
      .catch(() => window.prompt('Copy addon link:', manifestUrl));
  };

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (handleOpenInstallGuide) {
      handleOpenInstallGuide();
      return;
    }
    if (installUrl) {
      trackEvent('addon_install_clicked', { location: 'landing_page' });
      showToast('🎬 Reminder: After installing in Stremio, use the search bar on this site to add movies!', 'info');
      window.location.href = installUrl;
    }
  };

  const faqs = [
    {
      q: 'Do I need to create an account or sign in to use this?',
      a: 'Yes, connecting your Stremio account is required. Stremio addons are strictly read-only inside the player app and cannot display search bars or "add to watchlist" buttons inside Stremio. By connecting your Stremio account on this website, you can search and add cinema movies here, and our 24/7 cloud engine will automatically synchronize 1080p FHD & 4K UHD releases directly to your Stremio home screen across all your devices.'
    },
    {
      q: 'Why can\'t I just install the addon in Stremio and add movies there?',
      a: 'Stremio\'s addon protocol does not allow addons to create new database records or provide interactive search forms inside the video player. This website serves as your watchlist control center: you add movies here, and our background engine tracks stream sources continuously and pushes ready releases straight to your TV.'
    },
    {
      q: 'What happens if I install the addon without connecting my account?',
      a: 'If you install the generic addon directly in Stremio without connecting your account on this website, your Stremio catalog will display a setup notice card. The addon cannot know what movies you want to track until your account is linked.'
    },
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
    <div className="min-h-screen flex flex-col bg-[#0c0d14]">
      <Navbar
        onOpenLogin={handleOpenLogin}
        onOpenInstallGuide={handleOpenInstallGuide}
        onOpenQrModal={handleOpenQrModal}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="space-y-24 sm:space-y-32 py-4">
      {/* 1. HERO SECTION */}
      <section className="relative text-center max-w-4xl mx-auto pt-4 sm:pt-10 px-4">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-87.5 bg-gradient-to-tr from-purple-600/25 via-indigo-600/15 to-transparent blur-[140px] rounded-full pointer-events-none -z-10" />

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
        <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-6 font-normal">
          Track upcoming cinema releases and let our cloud engine scan stream sources 24/7. 
          When pristine <strong className="text-white font-semibold">1080p FHD & 4K UHD</strong> arrives, 
          it lands straight on your Smart TV home screen.
        </p>

        {/* Important Account Requirement Notice Banner */}
        <div className="mx-auto max-w-2xl mb-8 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs sm:text-sm text-left flex items-start gap-3 shadow-lg">
          <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <strong className="text-white block font-semibold mb-0.5">
              ⚠️ Account Connection Required to Track Movies
            </strong>
            <span className="text-xs text-amber-200/90 leading-relaxed block">
              Stremio addons are read-only inside the media player. To track movies, you must <strong>connect your Stremio account</strong> below so you can search and add movies on this website. Our system automatically installs the addon to your cloud account and syncs across all your devices!
            </span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
          <button
            onClick={handleOpenLogin}
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

          <button
            onClick={handleOpenQrModal}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-200 hover:text-white font-semibold text-sm transition-all cursor-pointer"
            title="Scan QR Code to open on Phone or TV"
          >
            <QrCode size={16} className="text-purple-400" />
            <span>Scan QR Code</span>
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

      {/* RECOMMENDED TO WATCH BANNER */}
      <section className="max-w-5xl mx-auto px-4 -mt-10 sm:-mt-14">
        <RecommendedBanner onOpenLogin={onOpenLogin} />
      </section>

      {/* 2. THE PROBLEM & SOLUTION (BEFORE VS AFTER) */}
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

      {/* 3. NEW FEATURES SHOWCASE */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-12 sm:mb-16">
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
              Spot fresh arrivals instantly. Any movie released or available in good quality within the last 3 months gets highlighted with a flaming badge in Stremio and web.
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

          {/* Card 4: Debrid & Scraper compatibility */}
          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
              <Zap size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Debrid & P2P Compatible</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Works seamlessly with Torrentio, Real-Debrid, AllDebrid, Premiumize, Torbox, and standard community scrapers without extra plugins.
            </p>
          </div>

          {/* Card 5: Instant IMDb & Cinemeta search */}
          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-4 group-hover:scale-110 transition-transform">
              <Film size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Direct IMDb & URL Search</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Search by title with instant Cinemeta auto-complete, or paste full IMDb links (e.g. imdb.com/title/tt1234567) to track with 1 click.
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
            <h4 className="text-sm font-bold text-white mb-1.5">Connect Stremio (Required)</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Connect your Stremio account with 1-click. Since player addons are read-only, linking your account enables cloud synchronization across all your TV and mobile devices.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-[#141624] border border-white/10 relative">
            <div className="w-8 h-8 rounded-full bg-[#7b42f6] text-white font-bold text-xs flex items-center justify-center mb-4 shadow-md">
              2
            </div>
            <h4 className="text-sm font-bold text-white mb-1.5">Add Movies on Website</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Search for any cinema or upcoming movie directly on this dashboard. Adding movies happens here on the site because Stremio does not permit adding movies inside the player.
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

      {/* 6. FAQ SECTION */}
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
              onClick={handleOpenLogin}
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
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-base">🎬</span>
            <span className="font-bold text-gray-300">Stremio Watchlist • Good Quality Tracker</span>
          </div>

          {/* GitHub Sponsors Button */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-gray-400 text-[11px] hidden sm:inline">Support the project:</span>
            <GitHubSponsorButton size="sm" />
          </div>

          <p className="text-gray-500 text-[11px]">
            Community Stremio Addon. Not officially affiliated with Stremio or IMDb.
          </p>

          <div className="flex items-center gap-4 text-gray-400 shrink-0">
            <button
              onClick={handleCopy}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Copy Addon URL
            </button>
            <button
              onClick={handleOpenLogin}
              className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer"
            >
              Sign In
            </button>
          </div>
        </div>
      </footer>
        </div>
      </main>

      {/* Modals */}
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      <InstallGuideModal
        isOpen={isInstallGuideOpen}
        onClose={() => setIsInstallGuideOpen(false)}
        onOpenLogin={handleOpenLogin}
        onOpenQrModal={handleOpenQrModal}
        installUrl={installUrl}
        manifestUrl={manifestUrl}
      />
      <QrCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        installUrl={installUrl}
        manifestUrl={manifestUrl}
      />
    </div>
  );
};
