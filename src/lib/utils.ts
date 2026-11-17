import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

export function isItemNewRelease(item: {
  readyAt?: string | null;
  released?: string | null;
  releaseDate?: string | null;
  has1080pPlus?: boolean;
  year?: string | number;
}): boolean {
  if (!item) return false;

  const now = Date.now();

  // If item has a specific release date (from Cinemeta meta.released or releaseDate)
  const dateStr = item.released || item.releaseDate;
  if (dateStr) {
    try {
      const releaseTime = new Date(dateStr).getTime();
      if (!isNaN(releaseTime)) {
        const diffMs = now - releaseTime;
        // Released in the last 3 months (90 days)
        if (diffMs >= 0 && diffMs <= THREE_MONTHS_MS) {
          return item.has1080pPlus !== false;
        }
        return false;
      }
    } catch {
      // fallback
    }
  }

  // Must have 1080p+ stream and readyAt date
  if (!item.has1080pPlus || !item.readyAt) return false;

  // Release year check: older movies added to watchlist are not new releases
  if (item.year) {
    const yearMatch = String(item.year).match(/\d{4}/);
    if (yearMatch) {
      const releaseYear = parseInt(yearMatch[0], 10);
      const currentYear = new Date().getFullYear();
      if (releaseYear > 0 && releaseYear < currentYear - 1) {
        return false;
      }
    }
  }

  try {
    const ageMs = now - new Date(item.readyAt).getTime();
    // Released or available in good quality within the last 3 months (90 days)
    return ageMs >= 0 && ageMs <= THREE_MONTHS_MS;
  } catch {
    return false;
  }
}

export function isItemUnreleased(item: { has1080pPlus?: boolean; bestQuality?: string; streamCount?: number; isWatched?: boolean }): boolean {
  if (item.has1080pPlus || item.isWatched) return false;
  const rawQuality = formatQualityLabel(item.bestQuality);
  return (
    /unreleased|not released|unavailable|não lançado|indisponível/i.test(rawQuality) ||
    ((!item.streamCount || item.streamCount === 0) && !/cam/i.test(rawQuality))
  );
}
