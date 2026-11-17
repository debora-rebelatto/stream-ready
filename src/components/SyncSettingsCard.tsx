import React from 'react';
import { Tv, RefreshCw, BookOpen, Check, Copy, Play, QrCode } from 'lucide-react';
import type { StremioUser } from '../models';
import { Button } from './Button';

export interface SyncSettingsCardProps {
  user: StremioUser | null;
  trackWatchlistWatched: boolean;
  setTrackWatchlistWatched: (enabled: boolean) => void;
  syncPreviouslyWatched: boolean;
  setSyncPreviouslyWatched: (enabled: boolean) => void;
  autoSyncWatched: boolean;
  setAutoSyncWatched: (enabled: boolean) => void;
  isSyncingWatched: boolean;
  onSyncWatchedNow: () => void;
  manifestUrl: string;
  installUrl?: string;
  copiedManifest: boolean;
  onCopyManifest: () => void;
  onOpenInstallGuide?: () => void;
  onOpenQrModal?: () => void;
}

export const SyncSettingsCard: React.FC<SyncSettingsCardProps> = ({
  user,
  trackWatchlistWatched,
  setTrackWatchlistWatched,
  syncPreviouslyWatched,
  setSyncPreviouslyWatched,
  autoSyncWatched,
  setAutoSyncWatched,
  isSyncingWatched,
  onSyncWatchedNow,
  manifestUrl,
  installUrl,
  copiedManifest,
  onCopyManifest,
  onOpenInstallGuide,
  onOpenQrModal,
}) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <Tv size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Stremio Library &amp; Watched Sync
              </h2>
              <p className="text-xs text-gray-400">
                Automate moving movies to Watched when played inside your official Stremio player.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#1c2032] border border-white/5 transition-colors hover:border-white/10">
            <div className="flex-1 min-w-0 pr-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-white">Track Watchlist Movies</span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                Monitors your watchlist movies. When you finish playing a movie on Stremio, it
                automatically archives to your <strong className="text-purple-300">Watched</strong>{' '}
                tab to keep your active list clean.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={trackWatchlistWatched}
              disabled={!user}
              onClick={() => setTrackWatchlistWatched(!trackWatchlistWatched)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-40 disabled:cursor-not-allowed mt-1 ${
                trackWatchlistWatched ? 'bg-purple-600' : 'bg-white/10'
              }`}
              title="Toggle watchlist watched tracking"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  trackWatchlistWatched ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#1c2032] border border-white/5 transition-colors hover:border-white/10">
            <div className="flex-1 min-w-0 pr-2">
              <span className="text-sm font-semibold text-white">
                Sync Previously Watched Movies
              </span>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                Synchronizes movies you watched in the past in Stremio before adding them here into
                your Watched tab. Keep disabled to maintain items on your active watchlist.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={syncPreviouslyWatched}
              disabled={!user}
              onClick={() => setSyncPreviouslyWatched(!syncPreviouslyWatched)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-40 disabled:cursor-not-allowed mt-1 ${
                syncPreviouslyWatched ? 'bg-purple-600' : 'bg-white/10'
              }`}
              title="Toggle previously watched sync"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  syncPreviouslyWatched ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#1c2032] border border-white/5 transition-colors hover:border-white/10">
            <div className="flex-1 min-w-0 pr-2">
              <span className="text-sm font-semibold text-white">
                Automatic Background Verification
              </span>
              <p className="text-xs text-gray-400 leading-relaxed mt-1">
                Periodically checks your Stremio cloud account every 30 minutes to update watched
                states without requiring manual triggers.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoSyncWatched}
              disabled={!user}
              onClick={() => setAutoSyncWatched(!autoSyncWatched)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-40 disabled:cursor-not-allowed mt-1 ${
                autoSyncWatched ? 'bg-purple-600' : 'bg-white/10'
              }`}
              title="Toggle automatic background verification"
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  autoSyncWatched ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="pt-2">
          <Button
            variant="primary"
            onClick={onSyncWatchedNow}
            isLoading={isSyncingWatched}
            disabled={!user}
            icon={<RefreshCw size={14} className={isSyncingWatched ? 'animate-spin' : ''} />}
            className="w-full sm:w-auto"
          >
            {isSyncingWatched ? 'Syncing with Stremio...' : 'Run Watched Verification Now'}
          </Button>
          {!user && (
            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
              ⚠️ Please sign in with your Stremio credentials to activate watched synchronization.
            </p>
          )}
        </div>
      </div>

      <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Stremio Addon Manifest</h3>
            <p className="text-xs text-gray-400">
              Use this personalized URL to connect your catalog rows into any Stremio player.
            </p>
          </div>
          {onOpenInstallGuide && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenInstallGuide}
              icon={<BookOpen size={13} className="text-purple-400" />}
            >
              How to Add to Stremio
            </Button>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2.5 rounded-xl bg-black/40 border border-white/5">
          <span className="font-mono text-xs text-gray-300 truncate flex-1 select-all px-1 py-1 sm:py-0">
            {manifestUrl}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCopyManifest}
              icon={
                copiedManifest ? (
                  <Check size={13} className="text-emerald-400" />
                ) : (
                  <Copy size={13} />
                )
              }
            >
              {copiedManifest ? 'Copied' : 'Copy'}
            </Button>
            {installUrl && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  window.location.href = installUrl;
                }}
                icon={<Play size={13} fill="currentColor" />}
              >
                Install
              </Button>
            )}
          </div>
        </div>

        {onOpenQrModal && (
          <div className="pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenQrModal}
              icon={<QrCode size={13} className="text-purple-400" />}
            >
              Scan QR Code for Mobile &amp; TV
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};
