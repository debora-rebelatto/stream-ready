import React, { useState } from 'react';
import { useWatchlist, useToast, useAuth } from '../context/useAppContext';
import { watchlistService } from '../services';

export type SettingsTab = 'quality' | 'sync' | 'backup' | 'account';

export interface UseSettingsControllerProps {
  manifestUrl?: string;
  onBack?: () => void;
}

export function useSettingsController({
  manifestUrl = 'https://stremiowatchlist.vercel.app/manifest.json',
  onBack,
}: UseSettingsControllerProps = {}) {
  const {
    globalMinQuality,
    setGlobalMinQuality,
    globalMinAudio,
    setGlobalMinAudio,
    stats,
    autoSyncWatched,
    setAutoSyncWatched,
    trackWatchlistWatched,
    setTrackWatchlistWatched,
    syncPreviouslyWatched,
    setSyncPreviouslyWatched,
    syncWatchedFromStremio,
    isSyncingWatched,
    refreshWatchlist,
  } = useWatchlist();

  const { user, logout } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<SettingsTab>('quality');
  const [isExporting, setIsExporting] = useState(false);
  const [copiedManifest, setCopiedManifest] = useState(false);

  const handleCopyManifest = () => {
    navigator.clipboard
      .writeText(manifestUrl)
      .then(() => {
        setCopiedManifest(true);
        setTimeout(() => setCopiedManifest(false), 2000);
        showToast('Manifest link copied to clipboard!', 'success');
      })
      .catch(() => {
        window.prompt('Copy addon link:', manifestUrl);
      });
  };

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

      showToast(
        `Exported ${items.length} movie${items.length === 1 ? '' : 's'} successfully!`,
        'success'
      );
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
        const items = Array.isArray(raw) ? raw : raw.items || raw.movies || [];
        if (!Array.isArray(items) || items.length === 0) {
          showToast('No valid movies found in this JSON backup file.', 'error');
          return;
        }

        const res = await watchlistService.importBackup(items);
        if (res.success) {
          showToast(
            `Imported ${res.addedCount ?? items.length} movies into your watchlist!`,
            'success'
          );
          await refreshWatchlist();
        } else {
          showToast('Failed to import backup.', 'error');
        }
      } catch (err: any) {
        console.error('[Import Backup Error]', err);
        showToast('Invalid JSON file format.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to log out of your Stremio session?')) {
      await logout();
      if (onBack) onBack();
    }
  };

  return {
    user,
    logout,
    globalMinQuality,
    setGlobalMinQuality,
    globalMinAudio,
    setGlobalMinAudio,
    stats,
    autoSyncWatched,
    setAutoSyncWatched,
    trackWatchlistWatched,
    setTrackWatchlistWatched,
    syncPreviouslyWatched,
    setSyncPreviouslyWatched,
    syncWatchedFromStremio,
    isSyncingWatched,
    activeTab,
    setActiveTab,
    isExporting,
    copiedManifest,
    handleCopyManifest,
    handleExport,
    handleImport,
    handleLogout,
  };
}
