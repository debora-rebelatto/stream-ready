import React from 'react';
import { Sliders } from 'lucide-react';
import { PreferenceSelectorCard, type PreferenceOption } from './PreferenceSelectorCard';

export interface VideoQualitySettingsCardProps {
  globalMinQuality: '1080p' | '4k';
  onSelectQuality: (quality: '1080p' | '4k') => void;
}

const VIDEO_QUALITY_OPTIONS: PreferenceOption<'1080p' | '4k'>[] = [
  {
    value: '1080p',
    badgeLabel: 'Standard',
    badgeVariant: 'blue',
    title: '1080p Full HD',
    activeCardClass: 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-900/20',
    activeLabelClass: 'text-blue-400',
    description: (
      <>
        Flags movies as ready whenever high-quality <strong>1080p</strong>,{' '}
        <strong>WEB-DL</strong>, <strong>BluRay</strong>, or <strong>4K UHD</strong> releases
        become available across stream providers.
      </>
    ),
  },
  {
    value: '4k',
    badgeLabel: 'Pristine',
    badgeVariant: 'purple',
    title: '4K UHD Only',
    activeCardClass: 'bg-purple-600/15 border-purple-500 text-white shadow-lg shadow-purple-900/20',
    activeLabelClass: 'text-purple-400',
    description: (
      <>
        For cinema enthusiasts with 4K displays. Movies stay in the Waiting catalog until a
        genuine <strong>4K UHD (2160p)</strong> release is confirmed.
      </>
    ),
  },
];

export const VideoQualitySettingsCard: React.FC<VideoQualitySettingsCardProps> = ({
  globalMinQuality,
  onSelectQuality,
}) => (
  <PreferenceSelectorCard
    icon={<Sliders size={18} />}
    iconContainerClass="bg-purple-500/10 text-purple-400"
    title="Quality Threshold Preferences"
    subtitle='Choose the minimum digital release quality required before flagging movies as "Ready".'
    options={VIDEO_QUALITY_OPTIONS}
    value={globalMinQuality}
    onChange={onSelectQuality}
    columns={2}
  />
);
