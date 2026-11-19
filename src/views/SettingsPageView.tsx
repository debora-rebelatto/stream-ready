import React from 'react';
import {
  ArrowLeft,
  Sliders,
  Tv,
  Download,
  AlertTriangle,
  Heart,
} from 'lucide-react';
import { useToast } from '../context/useAppContext';
import { useSettingsController, type SettingsTab } from '../controllers/useSettingsController';
import {
  Button,
  GitHubSponsorButton,
  QualitySettingsCard,
  SyncSettingsCard,
  BackupSettingsCard,
  AccountDangerCard,
} from '../components';

export interface SettingsPageProps {
  onBack: () => void;
  onOpenDeleteAccount?: () => void;
  onOpenInstallGuide?: () => void;
  onOpenQrModal?: () => void;
  manifestUrl?: string;
  installUrl?: string;
}

export const SettingsPageView: React.FC<SettingsPageProps> = ({
  onBack,
  onOpenDeleteAccount,
  onOpenInstallGuide,
  onOpenQrModal,
  manifestUrl = 'https://stremiowatchlist.vercel.app/manifest.json',
  installUrl,
}) => {
  const { showToast } = useToast();
  const {
    user,
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
    activeTab,
    setActiveTab,
    isExporting,
    copiedManifest,
    handleCopyManifest,
    handleExport,
    handleImport,
    handleLogout,
  } = useSettingsController({ manifestUrl, onBack });

  const navItems: Array<{ id: SettingsTab; label: string; icon: React.ReactNode }> = [
    { id: 'quality', label: 'Quality & Detection', icon: <Sliders size={16} /> },
    { id: 'sync', label: 'Stremio Sync', icon: <Tv size={16} /> },
    { id: 'backup', label: 'Backup & Restore', icon: <Download size={16} /> },
    { id: 'account', label: 'Account & Danger Zone', icon: <AlertTriangle size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0c0d14] text-gray-100 flex flex-col">
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
                <span className="truncate max-w-50" title={user.email}>
                  {user.email}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="flex flex-col lg:flex-row gap-6">
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

          <section className="flex-1 min-w-0">
            {activeTab === 'quality' && (
              <QualitySettingsCard
                globalMinQuality={globalMinQuality}
                stats={stats}
                onSelectQuality={(quality) => {
                  setGlobalMinQuality(quality);
                  showToast(
                    quality === '4k'
                      ? 'Default quality set to 4K UHD Only.'
                      : 'Default quality set to 1080p Full HD.',
                    'success'
                  );
                }}
              />
            )}

            {activeTab === 'sync' && (
              <SyncSettingsCard
                user={user}
                trackWatchlistWatched={trackWatchlistWatched}
                setTrackWatchlistWatched={setTrackWatchlistWatched}
                syncPreviouslyWatched={syncPreviouslyWatched}
                setSyncPreviouslyWatched={setSyncPreviouslyWatched}
                autoSyncWatched={autoSyncWatched}
                setAutoSyncWatched={setAutoSyncWatched}
                isSyncingWatched={isSyncingWatched}
                onSyncWatchedNow={() => syncWatchedFromStremio()}
                manifestUrl={manifestUrl}
                installUrl={installUrl}
                copiedManifest={copiedManifest}
                onCopyManifest={handleCopyManifest}
                onOpenInstallGuide={onOpenInstallGuide}
                onOpenQrModal={onOpenQrModal}
              />
            )}

            {activeTab === 'backup' && (
              <BackupSettingsCard
                isExporting={isExporting}
                onExport={handleExport}
                onImport={handleImport}
              />
            )}

            {activeTab === 'account' && (
              <AccountDangerCard
                user={user}
                onLogout={handleLogout}
                onOpenDeleteAccount={onOpenDeleteAccount}
              />
            )}
          </section>
        </div>
      </main>
    </div>
  );
};
