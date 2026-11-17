import React from 'react';
import { Tv, QrCode, Play, Copy, RefreshCw } from 'lucide-react';
import type { ServiceAdoptionMetrics } from '../../models';

interface ServiceAdoptionCardProps {
  adoption: ServiceAdoptionMetrics;
}

export const ServiceAdoptionCard: React.FC<ServiceAdoptionCardProps> = ({ adoption }) => {
  const { addon, watchedSync, quality } = adoption;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Stremio Addon Conversion Funnel */}
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Tv size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Stremio Addon Integration Funnel
            </h3>
            <p className="text-xs text-gray-400">
              User journey from viewing addon details to installing on Stremio.
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          <div className="p-3 rounded-xl bg-[#1c2032] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Copy size={16} />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">Manifest URL Copied</span>
                <span className="text-[11px] text-gray-400">Users who copied addon manifest</span>
              </div>
            </div>
            <strong className="text-base font-bold text-blue-300">
              {addon.manifestCopiedCount}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-[#1c2032] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                <Play size={16} />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">Direct Install Clicked</span>
                <span className="text-[11px] text-gray-400">Clicked "Install in Stremio"</span>
              </div>
            </div>
            <strong className="text-base font-bold text-purple-300">
              {addon.installClickedCount}
            </strong>
          </div>

          <div className="p-3 rounded-xl bg-[#1c2032] border border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <QrCode size={16} />
              </div>
              <div>
                <span className="text-xs font-semibold text-white block">Mobile & TV QR Scanned</span>
                <span className="text-[11px] text-gray-400">Connected through mobile/TV QR</span>
              </div>
            </div>
            <strong className="text-base font-bold text-emerald-300">{addon.qrScannedCount}</strong>
          </div>
        </div>
      </div>

      {/* Stremio Watched Sync & Settings Adoption */}
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
            <RefreshCw size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Feature Adoption &amp; Preferences
            </h3>
            <p className="text-xs text-gray-400">
              Adoption rates of automated synchronization and quality settings.
            </p>
          </div>
        </div>

        <div className="space-y-3.5 pt-1">
          {/* Track Watchlist Movies */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-white mb-1.5">
              <span>Track Watchlist Movies (Watched Sync)</span>
              <span className="text-purple-400">
                {watchedSync.trackWatchlistPercent}% ({watchedSync.trackWatchlistUsers})
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <div
                className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${watchedSync.trackWatchlistPercent}%` }}
              />
            </div>
          </div>

          {/* Automatic Background Verification */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-white mb-1.5">
              <span>Automatic Background Verification (30m)</span>
              <span className="text-emerald-400">
                {watchedSync.autoSyncPercent}% ({watchedSync.autoSyncUsers})
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${watchedSync.autoSyncPercent}%` }}
              />
            </div>
          </div>

          {/* Quality Target Ratio */}
          <div className="pt-2 border-t border-white/10">
            <div className="flex justify-between text-xs font-semibold text-white mb-1.5">
              <span>Quality Target: 1080p Standard vs 4K Pristine</span>
              <span className="text-gray-300">
                {quality.quality1080pPercent}% / {quality.quality4kPercent}%
              </span>
            </div>
            <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden flex">
              <div
                className="bg-blue-500 h-2 transition-all duration-500"
                style={{ width: `${quality.quality1080pPercent}%` }}
                title={`1080p: ${quality.quality1080pUsers} users`}
              />
              <div
                className="bg-purple-500 h-2 transition-all duration-500"
                style={{ width: `${quality.quality4kPercent}%` }}
                title={`4K: ${quality.quality4kUsers} users`}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 mt-1">
              <span>1080p ({quality.quality1080pUsers} users)</span>
              <span>4K UHD ({quality.quality4kUsers} users)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
