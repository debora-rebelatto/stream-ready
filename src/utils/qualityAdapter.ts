import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type {
  MovieCardStatus,
  MovieComputedStatus,
  MovieReleaseMetadata,
  WatchlistItem,
  WatchlistStats,
} from '../models';

export interface MovieStatusFlags {
  isWatched: boolean;
  isNew: boolean;
  ready: boolean;
  unreleased: boolean;
}

export function resolveMovieStatus({
  isWatched,
  isNew,
  ready,
  unreleased,
}: MovieStatusFlags): MovieCardStatus {
  if (isWatched) return 'watched';
  if (isNew) return 'new';
  if (ready) return 'ready';
  if (unreleased) return 'unreleased';
  return 'waiting';
}

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

export function isItemReady(
  item: { has1080pPlus?: boolean; bestQuality?: string; minQuality?: string | null },
  globalMinQuality: string = '1080p'
): boolean {
  if (!item) return false;
  const target = item.minQuality || globalMinQuality || '1080p';
  const rawQuality = String(item.bestQuality || '').toLowerCase();

  if (target === '4k') {
    return rawQuality.includes('4k') || rawQuality.includes('2160p') || rawQuality.includes('uhd');
  }

  return Boolean(item.has1080pPlus);
}

export const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

export function parseTimestampMs(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  try {
    const time = new Date(dateStr).getTime();
    return Number.isNaN(time) ? null : time;
  } catch {
    return null;
  }
}

export function isTimestampWithinWindow(
  timestampMs: number | null,
  nowMs: number = Date.now(),
  windowMs: number = THREE_MONTHS_MS
): boolean {
  if (timestampMs === null) return false;
  const diffMs = nowMs - timestampMs;
  return diffMs >= 0 && diffMs <= windowMs;
}

export function extractReleaseYear(year?: string | number): number | null {
  if (year === undefined || year === null) return null;
  const yearMatch = String(year).match(/\d{4}/);
  if (!yearMatch) return null;
  const parsed = parseInt(yearMatch[0], 10);
  return parsed > 0 ? parsed : null;
}

export function isCatalogTitleTooOld(
  year?: string | number,
  currentYear: number = new Date().getFullYear()
): boolean {
  const releaseYear = extractReleaseYear(year);
  if (releaseYear === null) return false;
  return releaseYear < currentYear - 1;
}

export function evaluateExplicitReleaseDate(
  item: MovieReleaseMetadata,
  nowMs: number = Date.now()
): boolean | null {
  const explicitDateStr = item.released || item.releaseDate;
  const releaseTimeMs = parseTimestampMs(explicitDateStr);
  if (releaseTimeMs === null) return null;

  if (isTimestampWithinWindow(releaseTimeMs, nowMs)) {
    return item.has1080pPlus !== false;
  }
  return false;
}

export function evaluateReadyTimestampRelease(
  item: MovieReleaseMetadata,
  nowMs: number = Date.now()
): boolean {
  if (!item.has1080pPlus || !item.readyAt) return false;
  if (isCatalogTitleTooOld(item.year)) return false;

  const readyTimeMs = parseTimestampMs(item.readyAt);
  return isTimestampWithinWindow(readyTimeMs, nowMs);
}

export function isItemNewRelease(
  item: MovieReleaseMetadata | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!item) return false;

  const explicitResult = evaluateExplicitReleaseDate(item, nowMs);
  if (explicitResult !== null) {
    return explicitResult;
  }

  return evaluateReadyTimestampRelease(item, nowMs);
}

export function isItemUnreleased(item: {
  has1080pPlus?: boolean;
  bestQuality?: string;
  streamCount?: number;
  isWatched?: boolean;
}): boolean {
  if (item.has1080pPlus || item.isWatched) return false;
  const rawQuality = formatQualityLabel(item.bestQuality);
  return (
    /unreleased|not released|unavailable|não lançado|indisponível/i.test(rawQuality) ||
    ((!item.streamCount || item.streamCount === 0) && !/cam/i.test(rawQuality))
  );
}

export function computeMovieStatus(
  item: WatchlistItem,
  globalMinQuality: '1080p' | '4k' = '1080p'
): MovieComputedStatus {
  const isWatched = Boolean(item.isWatched);
  const isReady = isItemReady(item, globalMinQuality);
  const isNewRelease = isItemNewRelease(item) && !isWatched;
  const isUnreleased = isItemUnreleased(item);
  const status = resolveMovieStatus({
    isWatched,
    isNew: isNewRelease,
    ready: isReady,
    unreleased: isUnreleased,
  });
  const rawQuality = formatQualityLabel(item.bestQuality);
  const qualityLabel = isUnreleased ? 'Unreleased' : rawQuality;
  const streamsLabel = item.streamCount > 0 ? `${item.streamCount} sources` : '0 sources';
  const activeTargetQuality: '1080p' | '4k' = item.minQuality || globalMinQuality || '1080p';

  return {
    status,
    isWatched,
    isReady,
    isNewRelease,
    isUnreleased,
    qualityLabel,
    streamsLabel,
    activeTargetQuality,
  };
}

export function enrichWatchlistItem(
  item: WatchlistItem,
  globalMinQuality: '1080p' | '4k' = '1080p'
): WatchlistItem {
  return {
    ...item,
    computed: computeMovieStatus(item, globalMinQuality),
  };
}

export function computeWatchlistStats(
  items: WatchlistItem[],
  globalMinQuality: '1080p' | '4k' = '1080p'
): WatchlistStats {
  let ready = 0;
  let pending = 0;
  let unreleased = 0;
  let watched = 0;

  for (const item of items) {
    const computed =
      item.computed && item.computed.activeTargetQuality === globalMinQuality
        ? item.computed
        : computeMovieStatus(item, globalMinQuality);
    if (computed.isWatched) {
      watched++;
    } else if (computed.isReady) {
      ready++;
    } else if (computed.isUnreleased) {
      unreleased++;
    } else {
      pending++;
    }
  }

  return {
    total: items.length,
    ready,
    pending,
    unreleased,
    watched,
  };
}
