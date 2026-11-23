import React from 'react';
import { formatCompactAudioLabel, formatCompactQualityLabel } from '../../utils';

export interface MovieCardSpecsOverlayProps {
  isWatched: boolean;
  isReady: boolean;
  isUnreleased: boolean;
  qualityLabel: string;
  streamsLabel: string;
  streamCount: number;
  hasAtmos: boolean;
  isLosslessAudio: boolean;
  audioFormat: string;
}

export const MovieCardSpecsOverlay: React.FC<MovieCardSpecsOverlayProps> = ({
  isWatched,
  isReady,
  isUnreleased,
  qualityLabel,
  streamsLabel,
  streamCount,
  hasAtmos,
  isLosslessAudio,
  audioFormat,
}) => {
  const compactQuality = formatCompactQualityLabel(qualityLabel, isUnreleased);
  const compactAudio = formatCompactAudioLabel(hasAtmos, audioFormat);
  const isRedundantStatusLabel = /^(unreleased|pending)$/i.test(compactQuality);
  const showQualityChip = !isWatched && !isUnreleased && !isRedundantStatusLabel;
  const showAudio = !isWatched && isReady && Boolean(compactAudio);
  const showStreamCount = !isWatched && streamCount > 0;

  if (!showQualityChip && !showAudio && !showStreamCount) {
    return null;
  }

  const qualityChipClass = isReady
    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-400/35'
    : 'bg-amber-950/80 text-amber-300 border-amber-400/35';

  const audioChipClass = hasAtmos
    ? 'bg-cyan-950/80 text-cyan-200 border-cyan-400/35'
    : isLosslessAudio
      ? 'bg-purple-950/80 text-purple-200 border-purple-400/35'
      : 'bg-black/70 text-gray-200 border-white/15';

  const tooltipParts = [
    showQualityChip ? qualityLabel : null,
    showStreamCount ? streamsLabel : null,
    showAudio ? (hasAtmos ? 'Dolby Atmos' : audioFormat) : null,
  ].filter(Boolean);

  return (
    <div
      className="absolute inset-x-0 bottom-0 z-10 pointer-events-none bg-gradient-to-t from-[#131622] via-black/65 to-transparent pt-10 pb-2 px-2.5 flex items-end justify-between gap-1.5"
      title={tooltipParts.join(' · ')}
    >
      <div className="flex items-center gap-1 min-w-0">
        {showQualityChip && (
          <span
            className={`inline-flex items-center text-[10px] font-bold tracking-wide px-1.5 py-0.5 rounded border backdrop-blur-md leading-none whitespace-nowrap ${qualityChipClass}`}
          >
            {compactQuality}
          </span>
        )}

        {showAudio && (
          <span
            className={`inline-flex items-center text-[9px] font-semibold tracking-wider px-1.5 py-0.5 rounded border backdrop-blur-md leading-none whitespace-nowrap uppercase ${audioChipClass}`}
          >
            {compactAudio}
          </span>
        )}
      </div>

      {showStreamCount && (
        <span className="text-[10px] font-medium text-gray-300/90 opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap shrink-0 drop-shadow-sm">
          {streamCount} src
        </span>
      )}
    </div>
  );
};
