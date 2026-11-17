import React from 'react';
import { Sliders, Check, Sparkles } from 'lucide-react';
import type { WatchlistStats } from '../models';
import { Badge } from './Badge';

export interface QualitySettingsCardProps {
  globalMinQuality: '1080p' | '4k';
  stats: WatchlistStats;
  onSelectQuality: (quality: '1080p' | '4k') => void;
}

export const QualitySettingsCard: React.FC<QualitySettingsCardProps> = ({
  globalMinQuality,
  stats,
  onSelectQuality,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Sliders size={18} />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Quality Threshold Preferences
            </h2>
            <p className="text-xs text-gray-400">
              Choose the minimum digital release quality required before flagging movies as "Ready".
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <button
            type="button"
            onClick={() => onSelectQuality('1080p')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              globalMinQuality === '1080p'
                ? 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-900/20'
                : 'bg-[#1a1e2e] border-white/5 text-gray-400 hover:text-white hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Badge variant="blue" size="xs">
                  Standard
                </Badge>
                <span className="font-bold text-sm text-white">1080p Full HD</span>
              </div>
              {globalMinQuality === '1080p' && (
                <span className="text-blue-400 text-xs font-semibold flex items-center gap-1">
                  <Check size={14} /> Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Flags movies as ready whenever high-quality <strong>1080p</strong>,{' '}
              <strong>WEB-DL</strong>, <strong>BluRay</strong>, or <strong>4K UHD</strong> releases
              become available across stream providers.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onSelectQuality('4k')}
            className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-3 ${
              globalMinQuality === '4k'
                ? 'bg-purple-600/15 border-purple-500 text-white shadow-lg shadow-purple-900/20'
                : 'bg-[#1a1e2e] border-white/5 text-gray-400 hover:text-white hover:border-white/15'
            }`}
          >
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Badge variant="purple" size="xs">
                  Pristine
                </Badge>
                <span className="font-bold text-sm text-white">4K UHD Only</span>
              </div>
              {globalMinQuality === '4k' && (
                <span className="text-purple-400 text-xs font-semibold flex items-center gap-1">
                  <Check size={14} /> Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              For cinema enthusiasts with 4K displays. Movies stay in the Waiting catalog until a
              genuine <strong>4K UHD (2160p)</strong> release is confirmed.
            </p>
          </button>
        </div>

        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400 leading-relaxed flex items-center gap-2 mt-2">
          <Sparkles size={15} className="text-purple-400 shrink-0" />
          <span>
            <strong>Per-movie override:</strong> You can also customize the quality threshold for
            individual movies directly on each movie card in your watchlist.
          </span>
        </div>
      </div>

      <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
          Current Watchlist Status
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5">
            <span className="text-gray-400 text-xs block">Total Movies</span>
            <strong className="text-xl font-black text-white">{stats.total}</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <span className="text-emerald-400 text-xs block">Ready (Quality Confirmed)</span>
            <strong className="text-xl font-black text-emerald-300">{stats.ready}</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <span className="text-amber-400 text-xs block">Waiting for Quality</span>
            <strong className="text-xl font-black text-amber-300">{stats.pending}</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
            <span className="text-purple-400 text-xs block">Watched</span>
            <strong className="text-xl font-black text-purple-300">{stats.watched}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
