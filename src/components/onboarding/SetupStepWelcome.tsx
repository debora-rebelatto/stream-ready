import React from 'react';
import { Globe, Tv, ArrowRightLeft, CheckCircle2, List, Hourglass } from 'lucide-react';

const CATALOG_PREVIEWS = [
  {
    name: 'Watchlist: Ready (Good Quality)',
    description: 'Confirmed 1080p / 4K digital releases, ready to stream right now.',
    accent: 'border-emerald-500/30 bg-emerald-500/5',
    iconColor: 'text-emerald-400',
    Icon: CheckCircle2,
  },
  {
    name: 'Watchlist: All Movies',
    description: 'Your complete tracked movie queue, in one row.',
    accent: 'border-purple-500/30 bg-purple-500/5',
    iconColor: 'text-purple-400',
    Icon: List,
  },
  {
    name: 'Watchlist: Waiting for Quality',
    description: 'Theater-only, CAM, or unreleased titles monitored in the background.',
    accent: 'border-amber-500/30 bg-amber-500/5',
    iconColor: 'text-amber-400',
    Icon: Hourglass,
  },
];

export const SetupStepWelcome: React.FC = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
      <div className="p-5 rounded-2xl bg-[#151824] border border-white/10 space-y-2">
        <div className="flex items-center gap-2 text-purple-300">
          <Globe size={18} />
          <h3 className="text-sm font-bold text-white">Web Dashboard — Add & Manage</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Search movies, paste IMDb IDs, organize custom lists, and set your minimum quality
          target. This website is where your watchlist lives.
        </p>
      </div>
      <div className="p-5 rounded-2xl bg-[#151824] border border-white/10 space-y-2">
        <div className="flex items-center gap-2 text-indigo-300">
          <Tv size={18} />
          <h3 className="text-sm font-bold text-white">Stremio App — Read-Only Playback</h3>
        </div>
        <p className="text-xs text-gray-400 leading-relaxed">
          Stremio players and TVs cannot write to third-party databases. Every movie you add here
          automatically appears in your Stremio catalogs.
        </p>
      </div>
      <span
        aria-hidden="true"
        className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#0c0d14] border border-white/10 items-center justify-center text-purple-300"
      >
        <ArrowRightLeft size={15} />
      </span>
    </div>

    <section className="space-y-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
        Your 3 automatic Stremio catalogs
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {CATALOG_PREVIEWS.map((catalog) => {
          const CatalogIcon = catalog.Icon;
          return (
            <div key={catalog.name} className={`p-4 rounded-xl border ${catalog.accent}`}>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <CatalogIcon size={14} className={`${catalog.iconColor} shrink-0`} />
                <span>{catalog.name}</span>
              </p>
            <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">
              {catalog.description}
            </p>
            </div>
          );
        })}
      </div>
    </section>
  </div>
);
