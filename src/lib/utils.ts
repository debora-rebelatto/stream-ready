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
  const rawQuality = (item.bestQuality || '').toLowerCase();

  if (target === '4k') {
    return rawQuality.includes('4k') || rawQuality.includes('2160p') || rawQuality.includes('uhd');
  }

  return Boolean(item.has1080pPlus);
}

export function isItemNewRelease(item: { readyAt?: string | null; has1080pPlus?: boolean }): boolean {
  if (!item || !item.readyAt || !item.has1080pPlus) return false;
  try {
    const ageMs = Date.now() - new Date(item.readyAt).getTime();
    // Dentro das últimas 48 horas
    return ageMs >= 0 && ageMs <= 48 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function isItemUnreleased(item: { has1080pPlus?: boolean; bestQuality?: string; streamCount?: number }): boolean {
  if (item.has1080pPlus) return false;
  const rawQuality = formatQualityLabel(item.bestQuality);
  return (
    /unreleased|not released|unavailable|não lançado|indisponível/i.test(rawQuality) ||
    ((!item.streamCount || item.streamCount === 0) && !/cam/i.test(rawQuality))
  );
}
