import React, { useState } from 'react';
import {
  ArrowLeft,
  Sliders,
  Tv,
  Download,
  Upload,
  Play,
  AlertTriangle,
  Trash2,
  Heart,
  RefreshCw,
  Check,
  Copy,
  Sparkles,
  LogOut,
  QrCode,
  BookOpen,
} from 'lucide-react';
import { useWatchlist, useToast, useAuth } from '../context/useAppContext';
import { watchlistService } from '../services/watchlistService';
import { Button } from './Button';
import { Badge } from './Badge';
import { GitHubSponsorButton } from './GitHubSponsorButton';

interface SettingsPageProps {
  onBack: () => void;
  onOpenDeleteAccount?: () => void;
  onOpenInstallGuide?: () => void;
  onOpenQrModal?: () => void;
  manifestUrl?: string;
  installUrl?: string;
}

type SettingsTab = 'quality' | 'sync' | 'backup' | 'account';

export const SettingsPage: React.FC<SettingsPageProps> = ({
  onBack,
  onOpenDeleteAccount,
  onOpenInstallGuide,
  onOpenQrModal,
  manifestUrl = 'https://stremiowatchlist.vercel.app/manifest.json',
  installUrl,
}) => {
  const {
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
        `🎉 Exported ${items.length} movie${items.length === 1 ? '' : 's'} successfully!`,
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
            `🎉 Imported ${res.addedCount ?? items.length} movies into your watchlist!`,
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
      onBack();
    }
  };

  const navItems: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: 'quality', label: 'Quality & Detection', icon: <Sliders size={16} /> },
    {
      id: 'sync',
      label: 'Stremio Sync',
      icon: <Tv size={16} />,
    },
    { id: 'backup', label: 'Backup & Restore', icon: <Download size={16} /> },
    { id: 'account', label: 'Account & Danger Zone', icon: <AlertTriangle size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0c0d14] text-gray-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#0c0d14]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              isIconOnly
              onClick={onBack}
              icon={<ArrowLeft size={16} />}
              className="text-gray-300 hover:text-white"
              aria-label="Back to Watchlist"
              title="Back to Watchlist"
            />
            <div className="h-5 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <span className="text-lg">⚙️</span>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white">Settings</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {user && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-lg bg-white/5 border border-white/5 text-xs text-gray-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="truncate max-w-[200px]" title={user.email}>
                  {user.email}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <aside className="w-full lg:w-64 shrink-0">
            <div className="bg-[#151824] border border-white/5 rounded-2xl p-2.5 sm:p-3 shadow-sm lg:sticky lg:top-20">
              <div className="px-3 py-2 mb-1 hidden lg:block">
                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  Categories
                </h2>
              </div>
              <nav className="grid grid-cols-2 lg:flex lg:flex-col gap-2">
                {navItems.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer text-left ${
                        isActive
                          ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 shadow-sm'
                          : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <span className={`shrink-0 ${isActive ? 'text-purple-400' : 'text-gray-500'}`}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>

              {/* Support Project Card */}
              <div className="hidden lg:block mt-6 pt-4 border-t border-white/10 px-2">
                <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-white">
                  <Heart size={14} className="text-pink-400 fill-pink-400" />
                  <span>Support Tracker</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
                  Help keep cloud quality scanners running 24/7.
                </p>
                <GitHubSponsorButton size="sm" />
              </div>
            </div>
          </aside>

          {/* Tab Content Panel */}
          <section className="flex-1 min-w-0">
            {/* 1. Quality & Detection Tab */}
            {activeTab === 'quality' && (
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
                        Choose the minimum digital release quality required before flagging movies
                        as "Ready".
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    {/* 1080p FHD Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setGlobalMinQuality('1080p');
                        showToast('Default quality set to 1080p Full HD.', 'success');
                      }}
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
                        <strong>WEB-DL</strong>, <strong>BluRay</strong>, or <strong>4K UHD</strong>{' '}
                        releases become available across stream providers.
                      </p>
                    </button>

                    {/* 4K UHD Option */}
                    <button
                      type="button"
                      onClick={() => {
                        setGlobalMinQuality('4k');
                        showToast('Default quality set to 4K UHD Only.', 'success');
                      }}
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
                        For cinema enthusiasts with 4K displays. Movies stay in the Waiting catalog
                        until a genuine <strong>4K UHD (2160p)</strong> release is confirmed.
                      </p>
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400 leading-relaxed flex items-center gap-2 mt-2">
                    <Sparkles size={15} className="text-purple-400 shrink-0" />
                    <span>
                      <strong>Per-movie override:</strong> You can also customize the quality
                      threshold for individual movies directly on each movie card in your watchlist.
                    </span>
                  </div>
                </div>

                {/* Status & Stats Overview Card */}
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
                      <span className="text-emerald-400 text-xs block">
                        Ready (Quality Confirmed)
                      </span>
                      <strong className="text-xl font-black text-emerald-300">{stats.ready}</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <span className="text-amber-400 text-xs block">Waiting for Quality</span>
                      <strong className="text-xl font-black text-amber-300">{stats.pending}</strong>
                    </div>
                    <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                      <span className="text-purple-400 text-xs block">Watched</span>
                      <strong className="text-xl font-black text-purple-300">
                        {stats.watched}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Stremio Synchronization Tab */}
            {activeTab === 'sync' && (
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
                          Automate moving movies to Watched when played inside your official Stremio
                          player.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Sync Toggles */}
                  <div className="space-y-3">
                    {/* Toggle 1: Track Watchlist Movies */}
                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#1c2032] border border-white/5 transition-colors hover:border-white/10">
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">
                            Track Watchlist Movies
                          </span>
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Recommended
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed mt-1">
                          Monitors your watchlist movies. When you finish playing a movie on
                          Stremio, it automatically archives to your{' '}
                          <strong className="text-purple-300">Watched</strong> tab to keep your
                          active list clean.
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

                    {/* Toggle 2: Sync Previously Watched */}
                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#1c2032] border border-white/5 transition-colors hover:border-white/10">
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="text-sm font-semibold text-white">
                          Sync Previously Watched Movies
                        </span>
                        <p className="text-xs text-gray-400 leading-relaxed mt-1">
                          Synchronizes movies you watched in the past in Stremio before adding them
                          here into your Watched tab. Keep disabled to maintain items on your active
                          watchlist.
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

                    {/* Toggle 3: Automatic Background Verification */}
                    <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-[#1c2032] border border-white/5 transition-colors hover:border-white/10">
                      <div className="flex-1 min-w-0 pr-2">
                        <span className="text-sm font-semibold text-white">
                          Automatic Background Verification
                        </span>
                        <p className="text-xs text-gray-400 leading-relaxed mt-1">
                          Periodically checks your Stremio cloud account every 30 minutes to update
                          watched states without requiring manual triggers.
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

                  {/* Manual Sync Trigger */}
                  <div className="pt-2">
                    <Button
                      variant="primary"
                      onClick={async () => {
                        await syncWatchedFromStremio();
                      }}
                      isLoading={isSyncingWatched}
                      disabled={!user}
                      icon={
                        <RefreshCw size={14} className={isSyncingWatched ? 'animate-spin' : ''} />
                      }
                      className="w-full sm:w-auto"
                    >
                      {isSyncingWatched
                        ? 'Syncing with Stremio...'
                        : 'Run Watched Verification Now'}
                    </Button>
                    {!user && (
                      <p className="text-xs text-amber-400 mt-2 flex items-center gap-1">
                        ⚠️ Please sign in with your Stremio credentials to activate watched
                        synchronization.
                      </p>
                    )}
                  </div>
                </div>

                {/* Stremio Addon Connection Details */}
                <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-white">Stremio Addon Manifest</h3>
                      <p className="text-xs text-gray-400">
                        Use this personalized URL to connect your catalog rows into any Stremio
                        player.
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
                        onClick={handleCopyManifest}
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
            )}

            {/* 3. Backup & Restore Tab */}
            {activeTab === 'backup' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
                  <div className="flex items-center gap-2.5 pb-3 border-b border-white/10">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                      <Download size={18} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white tracking-tight">
                        Backup &amp; Restore Watchlist
                      </h2>
                      <p className="text-xs text-gray-400">
                        Export your movies and custom lists to JSON, or restore from a previous
                        backup file.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Export Action Card */}
                    <div className="p-5 rounded-xl bg-[#1c2032] border border-white/5 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                          <Download size={16} className="text-purple-400" />
                          <span>Export Watchlist</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Download a complete <code>.json</code> backup containing all movies,
                          quality statuses, custom lists, and notes.
                        </p>
                      </div>

                      <Button
                        variant="primary"
                        onClick={handleExport}
                        isLoading={isExporting}
                        icon={<Download size={14} />}
                        className="w-full justify-center"
                      >
                        {isExporting ? 'Exporting Backup...' : 'Export Backup (.json)'}
                      </Button>
                    </div>

                    {/* Import Action Card */}
                    <div className="p-5 rounded-xl bg-[#1c2032] border border-white/5 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                          <Upload size={16} className="text-blue-400" />
                          <span>Import Watchlist</span>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Restore movies from a JSON backup file. Movies will be added to your
                          account and immediately tracked for quality.
                        </p>
                      </div>

                      <label className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-semibold text-xs border border-white/10 transition-all cursor-pointer">
                        <Upload size={14} />
                        <span>Select .json Backup File</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImport}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-gray-400 leading-relaxed space-y-1">
                    <strong className="text-gray-200 block">💡 Portable &amp; Safe</strong>
                    <p>
                      Backups use a clean, standardized JSON format that preserves IMDb IDs, movie
                      names, release years, quality overrides, and custom list assignments.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 4. Account & Danger Zone Tab */}
            {activeTab === 'account' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Account Details Card */}
                <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div>
                      <h2 className="text-base font-bold text-white tracking-tight">
                        Account Overview
                      </h2>
                      <p className="text-xs text-gray-400">
                        Information about your linked Stremio profile and session.
                      </p>
                    </div>
                    {user && (
                      <Badge variant="emerald" size="sm" dot>
                        Connected
                      </Badge>
                    )}
                  </div>

                  {user ? (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-[#1c2032] border border-white/5">
                        <div>
                          <span className="text-[11px] text-gray-400 block">
                            Stremio Account Email
                          </span>
                          <span className="text-sm font-semibold text-white">{user.email}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleLogout}
                          icon={<LogOut size={13} className="text-red-400" />}
                          className="text-red-300 hover:text-red-200 hover:bg-red-500/10 border-red-500/25"
                        >
                          Log Out
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">
                      No active Stremio account session found.
                    </p>
                  )}
                </div>

                {/* Danger Zone: Permanent Account Deletion */}
                {user && (
                  <div className="bg-red-950/20 border border-red-500/25 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-red-500/20 border-b">
                      <div className="p-2 rounded-xl bg-red-500/10 text-red-400">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-red-400 tracking-tight">
                          Danger Zone
                        </h2>
                        <p className="text-xs text-gray-400">
                          Irreversible actions that permanently delete your data.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs text-gray-300 leading-relaxed">
                        Deleting your account will permanently wipe all your saved watchlist movies,
                        custom lists, watched history records, and synchronization tokens from the
                        cloud database.
                      </p>

                      <Button
                        variant="danger"
                        onClick={() => {
                          if (onOpenDeleteAccount) {
                            onOpenDeleteAccount();
                          }
                        }}
                        icon={<Trash2 size={14} />}
                      >
                        Delete Account &amp; Wipe Data
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
