import React from 'react';
import type { AudioPreference, WatchlistStats } from '../../models';
import { useWatchlist } from '../../context/useAppContext';
import { VideoQualitySettingsCard } from './VideoQualitySettingsCard';
import { AudioSettingsCard } from './AudioSettingsCard';

export interface QualitySettingsCardProps {
  globalMinQuality?: '1080p' | '4k';
  globalMinAudio?: AudioPreference;
  stats?: WatchlistStats;
  onSelectQuality?: (quality: '1080p' | '4k') => void;
  onSelectAudio?: (audio: AudioPreference) => void;
}

export const QualitySettingsCard: React.FC<QualitySettingsCardProps> = ({
  globalMinQuality: propMinQuality,
  globalMinAudio: propMinAudio,
  onSelectQuality: propOnSelectQuality,
  onSelectAudio: propOnSelectAudio,
}) => {
  const ctx = useWatchlist();
  const globalMinQuality = propMinQuality ?? ctx.globalMinQuality;
  const globalMinAudio = propMinAudio ?? ctx.globalMinAudio;
  const onSelectQuality = propOnSelectQuality ?? ctx.setGlobalMinQuality;
  const onSelectAudio = propOnSelectAudio ?? ctx.setGlobalMinAudio;

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <VideoQualitySettingsCard
        globalMinQuality={globalMinQuality}
        onSelectQuality={onSelectQuality}
      />

      <AudioSettingsCard globalMinAudio={globalMinAudio} onSelectAudio={onSelectAudio} />

    </div>
  );
};
