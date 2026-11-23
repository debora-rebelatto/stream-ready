import React from 'react';
import { Tv, RefreshCw, BookOpen, Check, Copy, Play, QrCode, Sparkles, AlertTriangle } from 'lucide-react';
import type { StremioUser } from '../../models';
import { Button, Switch, Badge } from '../common';

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
  onOpenSetupWizard?: () => void;
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
  onOpenSetupWizard,
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
          <Switch
            checked={trackWatchlistWatched}
            onChange={setTrackWatchlistWatched}
            disabled={!user}
            title="Toggle watchlist watched tracking"
            label="Track Watchlist Movies"
            badge={
              <Badge variant="emerald" size="xs" uppercase>
                Recommended
              </Badge>
            }
            description={
              <>
                Monitors your watchlist movies. When you finish playing a movie on Stremio, it
                automatically archives to your <strong className="text-purple-300">Watched</strong>{' '}
                tab to keep your active list clean.
              </>
            }
          />

          <Switch
            checked={syncPreviouslyWatched}
            onChange={setSyncPreviouslyWatched}
            disabled={!user}
            title="Toggle previously watched sync"
            label="Sync Previously Watched Movies"
            description="Synchronizes movies you watched in the past in Stremio before adding them here into your Watched tab. Keep disabled to maintain items on your active watchlist."
          />

          <Switch
            checked={autoSyncWatched}
            onChange={setAutoSyncWatched}
            disabled={!user}
            title="Toggle automatic background verification"
            label="Automatic Background Verification"
            description="Periodically checks your Stremio cloud account every 30 minutes to update watched states without requiring manual triggers."
          />
        </div>

        <div className="pt-2">
          <Button
            variant="primary"
            onClick={onSyncWatchedNow}
            isLoading={isSyncingWatched}
            disabled={!user}
            icon={<RefreshCw size={14} />}
            className="w-full sm:w-auto"
          >
            {isSyncingWatched ? 'Syncing with Stremio...' : 'Run Watched Verification Now'}
          </Button>
          {!user && (
            <p className="text-xs text-amber-400 mt-2 flex items-center gap-1.5">
              <AlertTriangle size={13} className="shrink-0" />
              <span>Please sign in with your Stremio credentials to activate watched synchronization.</span>
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

        {(onOpenQrModal || onOpenSetupWizard) && (
          <div className="pt-1 flex flex-wrap gap-2">
            {onOpenQrModal && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenQrModal}
                icon={<QrCode size={13} className="text-purple-400" />}
              >
                Scan QR Code for Mobile &amp; TV
              </Button>
            )}
            {onOpenSetupWizard && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOpenSetupWizard}
                icon={<Sparkles size={13} className="text-purple-400" />}
              >
                Re-run Setup Guide
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

