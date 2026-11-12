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
  Heart
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

  const faqs = [
    {
      q: 'What is Good Quality Tracker?',
      a: 'It is a smart Stremio addon that monitors movie releases in the background. It continuously scans stream sources and filters out theater recordings (CAM / Telesync). When a true 1080p FHD or 4K UHD release drops, it immediately promotes the movie to Ready status and syncs it straight to your Stremio library.'
    },
    {
      q: 'Does it work on my Smart TV (Samsung, LG, Android TV, Fire TV)?',
      a: 'Yes, 100%! When you connect your Stremio account, the addon installs into your official account collection in the cloud. It automatically appears on your TV, phone, tablet, and PC without any extra configuration.'
    },
    {
      q: 'Do I need Real-Debrid or Torrentio?',
      a: 'Good Quality Tracker works natively with community scrapers like Torrentio and detects streams regardless of whether you use Real-Debrid, AllDebrid, Torbox, or standard torrent streams.'
    },
    {
      q: 'What counts as "Good Quality"?',
      a: 'True high-definition releases: 1080p FHD, 1440p QHD, or 4K UHD sourced from WEB-DL, WEBRip, or BluRay with clean multichannel audio (Dolby Digital, Atmos, AAC). Low-quality CAMs, HDCAMs, and Telesyncs are strictly ignored.'
    },
    {
      q: 'Can I add upcoming / unreleased movies?',
      a: 'Absolutely! Search for any announced movie or upcoming cinema release. It will sit in your "Waiting" list until real HD streams appear online, at which point you will be notified.'
    },
    {
      q: 'Is this free and open source?',
      a: 'Yes! Good Quality Tracker is 100% free and open source. Your Stremio session keys are stored securely using AES-256-GCM encryption in our minimal cloud database.'
    }
  ];

  return (
    <div className="space-y-24 sm:space-y-32 py-4">
      {/* 1. HERO SECTION */}
      <section className="relative text-center max-w-4xl mx-auto pt-6 sm:pt-12 px-2">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-gradient-to-tr from-purple-600/20 via-indigo-600/10 to-transparent blur-[120px] rounded-full pointer-events-none -z-10" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-semibold mb-6 shadow-sm">
          <Sparkles size={14} className="text-purple-400 animate-pulse" />
          <span>Automated Release Intelligence for Stremio</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
          Never watch a blurry <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-amber-300 line-through decoration-red-500/70 mr-3">
            CAM recording
          </span>
          again.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-8 font-normal">
          Track upcoming cinema releases and let our background engine monitor sources every 30 minutes. 
          When clean <strong className="text-white font-semibold">1080p FHD & 4K UHD</strong> drops, it lands automatically on your TV home screen.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-8">
          <button
            onClick={onOpenLogin}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-gradient-to-r from-[#7b42f6] to-indigo-600 hover:from-[#6a34e0] hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(123,66,246,0.5)] hover:shadow-[0_0_35px_rgba(123,66,246,0.7)] transition-all cursor-pointer transform hover:-translate-y-0.5"
          >
            <Sparkles size={16} />
            <span>Connect Stremio & Start Tracking</span>
            <ArrowRight size={15} />
          </button>

          <a
            href={installUrl || '#'}
            onClick={handleInstallClick}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition-all cursor-pointer"
          >
            <Play size={15} fill="currentColor" />
            <span>1-Click Install to Stremio</span>
          </a>

          <button
            onClick={handleCopy}
            className="p-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
            title="Copy Addon Manifest Link"
            aria-label="Copy Addon Manifest Link"
          >
            <Copy size={16} />
          </button>
        </div>

        {/* Micro Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Check size={14} className="text-emerald-400" />
            <span>100% Free & Open Source</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check size={14} className="text-emerald-400" />
            <span>No Ads or Tracking</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Check size={14} className="text-emerald-400" />
            <span>Smart TV & Debrid Ready</span>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE DEMO PREVIEW (BEFORE & AFTER) */}
      <section className="max-w-5xl mx-auto px-4">
        <div className="relative rounded-3xl bg-gradient-to-b from-[#181a27] to-[#10121d] border border-white/10 p-6 sm:p-10 shadow-2xl overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 blur-[100px] pointer-events-none" />

          <div className="text-center max-w-xl mx-auto mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
              The Quality Problem, Solved.
            </h2>
            <p className="text-sm text-gray-400">
              See the difference between browsing blindly and using Good Quality Tracker.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
            {/* The Old Way */}
            <div className="rounded-2xl bg-red-950/15 border border-red-500/20 p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider mb-4">
                  <XCircle size={16} />
                  <span>The Usual Stremio Experience</span>
                </div>
                <div className="space-y-3 text-xs text-gray-300">
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                    <span className="text-red-400 font-bold text-base mt-0.5">❌</span>
                    <div>
                      <p className="font-semibold text-white">45 streams found for new cinema title</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">You click play, only to discover every single link is a shaky Telesync filmed from someone's phone.</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                    <span className="text-red-400 font-bold text-base mt-0.5">❌</span>
                    <div>
                      <p className="font-semibold text-white">Endless manual checking</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">Searching every single weekend: "Has Dune: Part Two leaked in WEB-DL yet?"</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-start gap-3">
                    <span className="text-red-400 font-bold text-base mt-0.5">❌</span>
                    <div>
                      <p className="font-semibold text-white">Ruined movie nights</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">Sitting on the couch with popcorn only to suffer muffled audio and dark, blurry visuals.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-red-500/10 text-[11px] text-red-300/80 font-medium">
                Frustrating, repetitive, and unpredictable.
              </div>
            </div>

            {/* The Good Quality Tracker Way */}
            <div className="rounded-2xl bg-purple-950/20 border border-purple-500/30 p-6 flex flex-col justify-between relative shadow-lg">
              <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                AUTOMATED
              </div>
              <div>
                <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider mb-4">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span>With Good Quality Tracker</span>
                </div>
                <div className="space-y-3 text-xs text-gray-300">
                  <div className="p-3 rounded-xl bg-black/40 border border-purple-500/20 flex items-start gap-3">
                    <span className="text-emerald-400 font-bold text-base mt-0.5">✅</span>
                    <div>
                      <p className="font-semibold text-white">Intelligent Anti-CAM Gatekeeper</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">We detect release patterns and tag theater rips. You will never accidentally launch a CAM.</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-purple-500/20 flex items-start gap-3">
                    <span className="text-emerald-400 font-bold text-base mt-0.5">✅</span>
                    <div>
                      <p className="font-semibold text-white">Zero Effort Background Checks</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">Our server tests stream availability every 30 minutes in the cloud with zero device battery drain.</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/40 border border-purple-500/20 flex items-start gap-3">
                    <span className="text-emerald-400 font-bold text-base mt-0.5">✅</span>
                    <div>
                      <p className="font-semibold text-white">Direct Smart TV Home Sync</p>
                      <p className="text-gray-400 text-[11px] mt-0.5">As soon as clean 1080p or 4K arrives, the movie pops up on your TV's Stremio home screen Ready to Watch!</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-purple-500/20 text-[11px] text-emerald-300 font-semibold flex items-center justify-between">
                <span>Enjoy pristine cinema quality every single time.</span>
                <span className="text-purple-300">🍿 Relax</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. CORE FEATURES GRID */}
      <section className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-xl mx-auto mb-12 sm:mb-16">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-3">
            Built for Cinephiles & Casual Streamers
          </h2>
          <p className="text-sm text-gray-400">
            Everything you need to turn your Stremio library into an automated high-definition entertainment center.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-[#141622] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Anti-CAM Filter</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Detects Telesync, HDCAM, and Telecine releases via smart regex parsing. Only clean digital copies pass through.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-[#141622] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Tv size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Smart TV Cloud Sync</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Works across all official Stremio platforms: Android TV, Fire TV, LG webOS, Samsung Tizen, Mac, Windows, and iOS.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-[#141622] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Zap size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Automated Checks</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Scheduled background checkers query Cinemeta and stream providers continuously without using your device resources.
            </p>
          </div>

          {/* Card 4 */}
          <div className="p-6 rounded-2xl bg-[#141622] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Lock size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Encrypted & Private</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Tokens are encrypted with AES-256-GCM. We never store passwords or sell telemetry data. Your watchlist is strictly yours.
            </p>
          </div>

          {/* Card 5 */}
          <div className="p-6 rounded-2xl bg-[#141622] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Sliders size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Smart Release Categories</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Organize seamlessly between Ready, Pending, and Unreleased upcoming films with dedicated tabs and badges.
            </p>
          </div>

          {/* Card 6 */}
          <div className="p-6 rounded-2xl bg-[#141622] border border-white/10 hover:border-purple-500/40 transition-all hover:-translate-y-1 group">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 group-hover:scale-110 transition-transform">
              <Film size={24} />
            </div>
            <h3 className="text-base font-bold text-white mb-2">Instant IMDb Search</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Find any title instantly by name, paste full IMDb URLs, or type IDs (tt1234567) to queue releases with one click.
            </p>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS (3 SIMPLE STEPS) */}
      <section className="max-w-4xl mx-auto px-4">
        <div className="text-center max-w-lg mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Get Started in 60 Seconds
          </h2>
          <p className="text-xs sm:text-sm text-gray-400">
            No complicated server setup or command line required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-[#141622] border border-white/10 relative">
            <div className="w-8 h-8 rounded-full bg-[#7b42f6] text-white font-bold text-xs flex items-center justify-center mb-4 shadow-md">
              1
            </div>
            <h4 className="text-sm font-bold text-white mb-1.5">Sign In with Stremio</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Connect via your email or Stremio AuthKey so the tracker can sync catalog items directly to your account.
            </p>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-[#141622] border border-white/10 relative">
            <div className="w-8 h-8 rounded-full bg-[#7b42f6] text-white font-bold text-xs flex items-center justify-center mb-4 shadow-md">
              2
            </div>
            <h4 className="text-sm font-bold text-white mb-1.5">Add Upcoming Movies</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Search for any movie hitting cinemas or streaming soon. Add it to your tracker list in a single click.
            </p>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-[#141622] border border-white/10 relative">
            <div className="w-8 h-8 rounded-full bg-emerald-500 text-white font-bold text-xs flex items-center justify-center mb-4 shadow-md">
              3
            </div>
            <h4 className="text-sm font-bold text-white mb-1.5">Watch in True 1080p/4K</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              When quality releases drop, the movie automatically pops up in your TV Stremio Home Catalog ready to stream.
            </p>
          </div>
        </div>
      </section>

      {/* 5. FAQ SECTION */}
      <section className="max-w-3xl mx-auto px-4">
        <div className="text-center max-w-md mx-auto mb-10">
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-gray-400">
            Got questions? We've got answers.
          </p>
        </div>

        <div className="divide-y divide-white/10 rounded-2xl bg-[#141622] border border-white/10 overflow-hidden shadow-xl">
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

      {/* 6. BOTTOM CONVERSION CTA */}
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
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-[#7b42f6] to-indigo-600 hover:from-[#6a34e0] hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_25px_rgba(123,66,246,0.6)] transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <Sparkles size={16} />
              <span>Get Started Now — It's Free</span>
            </button>
            <a
              href={installUrl || '#'}
              onClick={handleInstallClick}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold text-sm transition-all cursor-pointer"
            >
              <Play size={14} fill="currentColor" />
              <span>Install Addon</span>
            </a>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
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
