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

export function isItemUnreleased(item: { has1080pPlus?: boolean; bestQuality?: string; streamCount?: number }): boolean {
  if (item.has1080pPlus) return false;
  const rawQuality = formatQualityLabel(item.bestQuality);
  return (
    /unreleased|not released|unavailable|não lançado|indisponível/i.test(rawQuality) ||
    ((!item.streamCount || item.streamCount === 0) && !/cam/i.test(rawQuality))
  );
}
