import React from 'react';
import { Sparkles, ArrowRight, Play, Copy, Check, Info, QrCode } from 'lucide-react';

export interface LandingHeroSectionProps {
  installUrl: string;
  onOpenLogin: () => void;
  onInstallClick: (e: React.MouseEvent) => void;
  onCopy: () => void;
  onOpenQrModal: () => void;
}

export const LandingHeroSection: React.FC<LandingHeroSectionProps> = ({
  installUrl,
  onOpenLogin,
  onInstallClick,
  onCopy,
  onOpenQrModal,
}) => {
  return (
    <section className="relative text-center max-w-4xl mx-auto pt-4 sm:pt-10 px-4">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-150 h-87.5 bg-linear-to-tr from-purple-600/25 via-indigo-600/15 to-transparent blur-[140px] rounded-full pointer-events-none -z-10" />

      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/25 text-purple-300 text-xs font-semibold mb-6 shadow-sm">
        <Sparkles size={14} className="text-purple-400 animate-pulse" />
        <span>Automated Release Intelligence for Stremio</span>
      </div>

      <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.08] mb-6">
        Never watch a blurry <br className="hidden sm:inline" />
        <span className="text-transparent bg-clip-text bg-linear-to-r from-red-400 via-rose-300 to-amber-300 line-through decoration-red-500/80 mr-3">
          CAM recording
        </span>
        again.
      </h1>

      <p className="text-base sm:text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed mb-6 font-normal">
        Track upcoming cinema releases and let our cloud engine scan stream sources 24/7. When
        pristine <strong className="text-white font-semibold">1080p FHD &amp; 4K UHD</strong>{' '}
        arrives, it lands straight on your Smart TV home screen.
      </p>

      <div className="mx-auto max-w-2xl mb-8 p-3.5 sm:p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs sm:text-sm text-left flex items-start gap-3 shadow-lg">
        <Info size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block font-semibold mb-0.5">
            ⚠️ Account Connection Required to Track Movies
          </strong>
          <span className="text-xs text-amber-200/90 leading-relaxed block">
            Stremio addons are read-only inside the media player. To track movies, you must{' '}
            <strong>connect your Stremio account</strong> below so you can search and add movies on
            this website. Our system automatically installs the addon to your cloud account and
            syncs across all your devices!
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-10">
        <button
          onClick={onOpenLogin}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-linear-to-r from-[#7b42f6] to-indigo-600 hover:from-[#6a34e0] hover:to-indigo-500 text-white font-bold text-sm shadow-[0_0_30px_rgba(123,66,246,0.55)] hover:shadow-[0_0_40px_rgba(123,66,246,0.75)] transition-all cursor-pointer transform hover:-translate-y-0.5"
        >
          <Sparkles size={17} />
          <span>Connect Stremio &amp; Start Tracking</span>
          <ArrowRight size={16} />
        </button>

        <a
          href={installUrl || '#'}
          onClick={onInstallClick}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white font-semibold text-sm transition-all cursor-pointer"
        >
          <Play size={15} fill="currentColor" />
          <span>1-Click Install to Stremio</span>
        </a>

        <button
          onClick={onCopy}
          className="p-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer"
          title="Copy Addon Manifest Link"
          aria-label="Copy Addon Manifest Link"
        >
          <Copy size={17} />
        </button>

        <button
          onClick={onOpenQrModal}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-200 hover:text-white font-semibold text-sm transition-all cursor-pointer"
          title="Scan QR Code to open on Phone or TV"
        >
          <QrCode size={16} className="text-purple-400" />
          <span>Scan QR Code</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-xs text-gray-400">
        <div className="flex items-center gap-1.5">
          <Check size={15} className="text-emerald-400" />
          <span>100% Free &amp; Open Source</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check size={15} className="text-emerald-400" />
          <span>No Ads or Data Collection</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Check size={15} className="text-emerald-400" />
          <span>Smart TV &amp; Debrid Synced</span>
        </div>
      </div>
    </section>
  );
};
