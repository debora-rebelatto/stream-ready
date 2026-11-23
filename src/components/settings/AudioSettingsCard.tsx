import React from 'react';
import { Volume2 } from 'lucide-react';
import type { AudioPreference } from '../../models';
import { PreferenceSelectorCard, type PreferenceOption } from './PreferenceSelectorCard';

export interface AudioSettingsCardProps {
  globalMinAudio: AudioPreference;
  onSelectAudio: (audio: AudioPreference) => void;
}

const AUDIO_OPTIONS: PreferenceOption<AudioPreference>[] = [
  {
    value: 'any',
    badgeLabel: 'Default',
    badgeVariant: 'blue',
    title: 'Any Audio',
    activeCardClass: 'bg-blue-600/15 border-blue-500 text-white shadow-lg shadow-blue-900/20',
    activeLabelClass: 'text-blue-400',
    description: (
      <>
        Uses your video quality threshold only. Detected audio badges (like{' '}
        <strong>Dolby Atmos</strong>) are still shown on cards.
      </>
    ),
  },
  {
    value: 'surround',
    badgeLabel: 'Surround',
    badgeVariant: 'purple',
    title: '5.1+ Surround',
    activeCardClass: 'bg-purple-600/15 border-purple-500 text-white shadow-lg shadow-purple-900/20',
    activeLabelClass: 'text-purple-400',
    description: (
      <>
        Requires multi-channel audio such as <strong>DDP 5.1</strong>, <strong>DTS</strong>,{' '}
        <strong>TrueHD</strong>, or <strong>Dolby Atmos</strong>.
      </>
    ),
  },
  {
    value: 'atmos',
    badgeLabel: 'Spatial',
    badgeVariant: 'cyan',
    title: 'Dolby Atmos',
    activeCardClass: 'bg-cyan-600/15 border-cyan-500 text-white shadow-lg shadow-cyan-900/20',
    activeLabelClass: 'text-cyan-400',
    description: (
      <>
        For home theater setups. Movies stay in Waiting until a confirmed{' '}
        <strong>Dolby Atmos</strong> track is detected.
      </>
    ),
  },
];

export const AudioSettingsCard: React.FC<AudioSettingsCardProps> = ({
  globalMinAudio,
  onSelectAudio,
}) => (
  <PreferenceSelectorCard
    icon={<Volume2 size={18} />}
    iconContainerClass="bg-cyan-500/10 text-cyan-400"
    title="Audio Quality Preferences"
    subtitle='Choose the minimum audio track standard required before flagging movies as "Ready".'
    options={AUDIO_OPTIONS}
    value={globalMinAudio}
    onChange={onSelectAudio}
    columns={3}
  />
);
