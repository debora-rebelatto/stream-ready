import React from 'react';
import { Sliders } from 'lucide-react';
import { useToast } from '../../context/useAppContext';
import { useSettingsController } from '../../controllers/useSettingsController';
import { ModalShell, GitHubSponsorButton } from '../common';
import { QualitySettingsCard } from './QualitySettingsCard';
import { SyncSettingsCard } from './SyncSettingsCard';
import { BackupSettingsCard } from './BackupSettingsCard';
import { AccountDangerCard } from './AccountDangerCard';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDeleteAccount?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenDeleteAccount,
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
    isExporting,
    copiedManifest,
    handleCopyManifest,
    handleExport,
    handleImport,
    handleLogout,
  } = useSettingsController({ onBack: onClose });

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Settings &amp; Preferences"
      subtitle="Manage release quality thresholds, Stremio sync, and backups"
      icon={<Sliders size={18} />}
      maxWidth="max-w-2xl"
      footer={
        <>
          <GitHubSponsorButton size="sm" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </>
      }
    >
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
        manifestUrl="https://stremiowatchlist.vercel.app/manifest.json"
        copiedManifest={copiedManifest}
        onCopyManifest={handleCopyManifest}
      />

      <BackupSettingsCard
        isExporting={isExporting}
        onExport={handleExport}
        onImport={handleImport}
      />

      <AccountDangerCard
        user={user}
        onLogout={handleLogout}
        onOpenDeleteAccount={() => {
          onClose();
          if (onOpenDeleteAccount) onOpenDeleteAccount();
        }}
      />
    </ModalShell>
  );
};
