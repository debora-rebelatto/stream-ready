import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { MovieComputedStatus, WatchlistItem } from '../models';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatQualityLabel(raw?: string): string {
  if (!raw) return 'Pending';
  const q = String(raw).trim();
  if (/ainda não lançado|não lançado|indisponível|unreleased|not released/i.test(q)) {
    return 'Unreleased';
  }
  if (/^pendente$|^aguardando verificação$/i.test(q)) {
    return 'Pending';
  }
  if (/gravação de cinema/i.test(q)) {
    return 'CAM / Theater Rip';
  }
  if (/erro na verificação/i.test(q)) {
    return 'Check Error';
  }
  return q;
}

export function formatCompactQualityLabel(raw?: string, isUnreleased?: boolean): string {
  if (isUnreleased) return 'Unreleased';
  const normalized = formatQualityLabel(raw);
  if (/4k|2160p|uhd/i.test(normalized)) return '4K';
  if (/1080p|fhd/i.test(normalized)) return '1080p';
  if (/720p|\bhd\b/i.test(normalized)) return '720p';
  if (/cam|ts|theater/i.test(normalized)) return 'CAM';
  if (/unreleased/i.test(normalized)) return 'Unreleased';
  if (/pending/i.test(normalized)) return 'Pending';
  if (/check error/i.test(normalized)) return 'Error';
  return normalized;
}

export function formatCompactAudioLabel(hasAtmos?: boolean, audioFormat?: string): string {
  if (hasAtmos) return 'ATMOS';
  if (!audioFormat) return '';
  const cleaned = audioFormat.trim();
  if (!cleaned) return '';
  if (/atmos/i.test(cleaned)) return 'ATMOS';
  if (/truehd/i.test(cleaned)) return 'TrueHD';
  if (/dts[- ]?hd|dts[- ]?ma|dts:x/i.test(cleaned)) return 'DTS-HD';
  if (/dts/i.test(cleaned)) return 'DTS';
  if (/ddp\s*5\.1|eac3|dd\+/i.test(cleaned)) return 'DDP 5.1';
  if (/5\.1/i.test(cleaned)) return '5.1';
  if (/7\.1/i.test(cleaned)) return '7.1';
  return cleaned;
}

const DEFAULT_COMPUTED_STATUS: MovieComputedStatus = {
  status: 'waiting',
  isWatched: false,
  isReady: false,
  isNewRelease: false,
  isUnreleased: false,
  qualityTier: 'pending',
  qualityLabel: 'Pending',
  streamsLabel: '0 sources',
  hasAtmos: false,
  hasSurround: false,
  isLosslessAudio: false,
  audioFormat: '',
  activeTargetQuality: '1080p',
  activeTargetAudio: 'any',
};

/**
 * Pure read-only accessor for backend-computed quality & status metadata.
 * All quality rules are evaluated on the backend; this helper never calculates quality checks.
 */
export function getMovieComputedStatus(item?: WatchlistItem | null): MovieComputedStatus {
  if (item?.computed) {
    return item.computed;
  }
  if (!item) {
    return DEFAULT_COMPUTED_STATUS;
  }
  const isWatched = Boolean(item.isWatched);
  const isReady = Boolean(item.has1080pPlus);
  return {
    ...DEFAULT_COMPUTED_STATUS,
    status: isWatched ? 'watched' : isReady ? 'ready' : 'waiting',
    isWatched,
    isReady,
    qualityLabel: formatQualityLabel(item.bestQuality),
    streamsLabel: item.streamCount > 0 ? `${item.streamCount} sources` : '0 sources',
    hasAtmos: Boolean(item.hasAtmos),
    hasSurround: Boolean(item.hasSurround),
    isLosslessAudio: Boolean(item.isLosslessAudio),
    audioFormat: item.audioFormat || '',
  };
}
