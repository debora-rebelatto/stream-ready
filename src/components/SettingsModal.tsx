import React from 'react';
import { useWatchlist, useToast, useAuth } from '../context/useAppContext';
import { watchlistService } from '../services/watchlistService';
import { X, BookOpen, Download, Upload, Sliders, Tv, Eye, RefreshCw, Info, Heart } from 'lucide-react';
import { GitHubSponsorButton } from './GitHubSponsorButton';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    refreshWatchlist,
    globalMinQuality,
    setGlobalMinQuality,
    stats,
    autoSyncWatched,
    setAutoSyncWatched,
    trackWatchlistWatched,
    setTrackWatchlistWatched,
    syncPreviouslyWatched,
    setSyncPreviouslyWatched,
    syncWatchedFromStremio,
    isSyncingWatched,
  } = useWatchlist();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [isExporting, setIsExporting] = React.useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const items = await watchlistService.exportBackup();
      if (!Array.isArray(items) || items.length === 0) {
        showToast('Your watchlist is empty. There are no movies to export.', 'info');
        return;
      }

      const jsonStr = JSON.stringify(items, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      link.href = url;
      link.download = `stremio-watchlist-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`🎉 Exported ${items.length} movie${items.length === 1 ? '' : 's'} successfully!`, 'success');
    } catch (err: any) {
      console.error('[Export Backup Error]', err);
      showToast(err.message || 'Failed to export backup.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const items = Array.isArray(raw) ? raw : (raw.items || raw.movies || []);
        if (!Array.isArray(items) || items.length === 0) {
          showToast('No valid movies found in this JSON backup file.', 'error');
          return;
        }
        const res = await watchlistService.importBackup(items);
        if (res.success) {
          showToast(`🎉 ${res.addedCount} items imported successfully!`, 'success');
          await refreshWatchlist();
          onClose();
        } else {
          showToast('Failed to import backup.', 'error');
        }
      } catch {
        showToast('Invalid JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-[#151824] border border-white/10 rounded-2xl shadow-2xl z-10 my-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/10 bg-[#151824] shrink-0">
          <div className="flex items-center gap-2">
            <Sliders size={18} className="text-purple-400" />
            <h3 className="text-sm sm:text-base font-bold text-white">Settings & Guide</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer touch-manipulation min-w-[32px] min-h-[32px] flex items-center justify-center"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain flex-1 space-y-5 text-xs text-gray-300">
          {/* Minimum Desired Quality Setting */}
          <div className="p-4 rounded-xl bg-[#1f2438] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Tv size={16} className="text-purple-400" />
                Global Minimum Quality Target
              </span>
              <span className="text-[11px] font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">
                {globalMinQuality.toUpperCase()}
              </span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Choose when a movie is considered "Ready" in good quality. You can also override this per-movie directly on each card.
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setGlobalMinQuality('1080p')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  globalMinQuality === '1080p'
                    ? 'bg-blue-600/20 border-blue-500 text-white shadow-md'
                    : 'bg-[#151824] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">1080p Full HD</span>
                  {globalMinQuality === '1080p' && <span className="text-blue-400 text-xs">✓ Active</span>}
                </div>
                <span className="text-[10px] text-gray-400 leading-normal">
                  Standard releases. Alerts when 1080p, BluRay, WEB-DL, or 4K arrives.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setGlobalMinQuality('4k')}
                className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                  globalMinQuality === '4k'
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                    : 'bg-[#151824] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">4K UHD Only</span>
                  {globalMinQuality === '4k' && <span className="text-purple-400 text-xs">✓ Active</span>}
                </div>
                <span className="text-[10px] text-gray-400 leading-normal">
                  Pristine quality. Alerts only when 4K UHD or 2160p is detected.
                </span>
              </button>
            </div>
          </div>

          {/* Stremio Watched Tracking & Synchronization */}
          <div className="p-4 rounded-xl bg-[#1f2438] border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Eye size={16} className="text-purple-400" />
                Watched Tracking & Sync (Stremio)
              </span>
              {stats.watched > 0 && (
                <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded">
                  {stats.watched} watched
                </span>
              )}
            </div>

            {/* Verification Toggles Area */}
            <div className="space-y-2 pt-1">
              {/* Toggle 1: Track Watchlist Movies (Watched after adding) */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#151824] border border-white/5 transition-colors hover:border-white/10">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-200">Track Watchlist Movies</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[10.5px] text-gray-400 leading-relaxed mt-1">
                    Tracks movies already in your watchlist. Automatically moves them to <strong className="text-purple-300">Watched</strong> only if you play them on Stremio <strong className="text-gray-200">after</strong> adding them to your list.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={trackWatchlistWatched}
                  disabled={!user}
                  onClick={() => setTrackWatchlistWatched(!trackWatchlistWatched)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-40 disabled:cursor-not-allowed mt-0.5 ${
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

              {/* Toggle 2: Sync Previously Watched Movies */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#151824] border border-white/5 transition-colors hover:border-white/10">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-200">Sync Previously Watched Movies</span>
                  </div>
                  <p className="text-[10.5px] text-gray-400 leading-relaxed mt-1">
                    Syncs movies you watched in the past (before adding them, or from your general Stremio library) into your Watched tab. Keeps movies in active watchlist when turned off.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={syncPreviouslyWatched}
                  disabled={!user}
                  onClick={() => setSyncPreviouslyWatched(!syncPreviouslyWatched)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-40 disabled:cursor-not-allowed mt-0.5 ${
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

              {/* Toggle 3: Automatic Background Verification */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-xl bg-[#151824] border border-white/5 transition-colors hover:border-white/10">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-200">Automatic Background Verification</span>
                  </div>
                  <p className="text-[10.5px] text-gray-400 leading-relaxed mt-1">
                    Runs periodic verification in the background every 30 minutes without needing to open the app or click manually.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoSyncWatched}
                  disabled={!user}
                  onClick={() => setAutoSyncWatched(!autoSyncWatched)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-40 disabled:cursor-not-allowed mt-0.5 ${
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

            {/* Manual Sync Button */}
            <div className="pt-1">
              <button
                type="button"
                onClick={async () => {
                  await syncWatchedFromStremio();
                }}
                disabled={isSyncingWatched || !user}
                className="w-full inline-flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw size={13} className={isSyncingWatched ? 'animate-spin' : ''} />
                {isSyncingWatched ? 'Syncing with Stremio...' : 'Run Watched Verification Now'}
              </button>
              {!user && (
                <p className="text-[10px] text-amber-400/90 mt-1.5 flex items-center gap-1">
                  ⚠️ Connect your Stremio account (via the Sign In button) to enable watched verification.
                </p>
              )}
            </div>
          </div>

          {/* Guide */}
          <div className="p-4 rounded-xl bg-[#1f2438] border border-white/10 space-y-2.5">
            <h4 className="text-sm font-bold text-purple-300 flex items-center gap-2">
              <BookOpen size={15} />
              How to add to Stremio:
            </h4>
            <ol className="list-decimal list-inside space-y-1.5 leading-relaxed text-gray-300">
              <li>Click <strong>"Install in App"</strong> in the top navigation bar.</li>
              <li>If the Stremio app does not open automatically, click <strong>"Copy Link"</strong>.</li>
              <li>In Stremio, open the <strong>Addons (Puzzle icon)</strong> tab, paste the link in the search bar and press <strong>Enter</strong>.</li>
              <li>Click <strong>Install</strong>.</li>
              <li>Done! Your custom rows will appear on your Stremio Home Screen / Discover:
                <ul className="list-disc list-inside ml-3 mt-1.5 space-y-0.5 text-gray-400">
                  <li><span className="text-emerald-400 font-semibold">🟢 Watchlist: Ready (Good Quality)</span></li>
                  <li><span>📋 Watchlist: All Movies</span></li>
                  <li><span className="text-amber-400 font-semibold">⏳ Watchlist: Waiting for Quality</span></li>
                  <li><span className="text-purple-400 font-semibold">👁️ Watchlist: Watched History</span></li>
                </ul>
              </li>
            </ol>
          </div>

          {/* Backup & Restore */}
          <div className="p-4 rounded-xl bg-[#1f2438] border border-white/10 space-y-3">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Download size={16} className="text-purple-400" />
              Backup & Restore
            </span>
            <p className="text-[10.5px] text-gray-400 leading-relaxed">
              Export your watchlist to a JSON file to keep a personal backup, or import movies from an existing backup file.
            </p>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#151824] hover:bg-[#1a1e2e] border border-white/10 text-gray-200 font-medium text-xs cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={13} className={isExporting ? 'animate-spin' : ''} />
                {isExporting ? 'Exporting...' : 'Export Backup (.json)'}
              </button>

              <label className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#151824] hover:bg-[#1a1e2e] border border-white/10 text-gray-200 font-medium text-xs cursor-pointer transition-colors">
                <Upload size={13} /> Import Backup (.json)
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Support / GitHub Sponsors */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/30 to-[#1f2438] border border-purple-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Heart size={16} className="text-pink-400 fill-pink-400" />
                Support the Project
              </span>
              <p className="text-[10.5px] text-gray-400 leading-relaxed mt-1">
                Help keep the background servers and trackers running 24/7 by sponsoring on GitHub.
              </p>
            </div>
            <div className="shrink-0">
              <GitHubSponsorButton size="md" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-t border-white/10 bg-[#151824] flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-[#7b42f6] hover:bg-[#6a34e0] text-white text-xs font-bold transition-all shadow cursor-pointer"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};
