import { createRequire } from 'module';
const req = createRequire(import.meta.url);
const db = req('../../lib/db');
import { getMeta as fetchCinemetaMeta } from './cinemetaService.ts';
import type { AddonManifest, CatalogResponse, MetaResponse } from '../types';

export function formatQualityLabel(raw?: string | null): string {
  if (!raw) return 'Pending';
  const q = String(raw).trim();
  if (/ainda não lançado|não lançado|indisponível|unreleased/i.test(q)) return 'Unreleased';
  if (/^pendente$|^aguardando verificação$/i.test(q)) return 'Pending';
  if (/gravação de cinema/i.test(q)) return 'CAM / Theater Rip';
  if (/erro na verificação/i.test(q)) return 'Check Error';
  return q;
}

const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

export function isItemNewRelease(item: any): boolean {
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
    } catch (err) {
      console.warn('[StremioAddon] Failed to parse release date:', err);
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

export function getManifest(hostUrl: string = '', userId: string = ''): AddonManifest {
  const allCatalogs: Array<{
    type: string;
    id: string;
    name: string;
    extra?: Array<{ name: string; isRequired?: boolean }>;
  }> = [
    {
      type: 'movie',
      id: 'watchlist_ready',
      name: '🟢 Watchlist: Ready (Good Quality)',
      extra: [{ name: 'skip', isRequired: false }],
    },
    {
      type: 'movie',
      id: 'watchlist_all',
      name: '📋 Watchlist: All Movies',
      extra: [{ name: 'skip', isRequired: false }],
    },
    {
      type: 'movie',
      id: 'watchlist_pending',
      name: '⏳ Watchlist: Waiting for Quality',
      extra: [{ name: 'skip', isRequired: false }],
    },
  ];

  // Adiciona os catálogos das listas personalizadas do usuário
  if (userId) {
    try {
      const userLists = db.getCustomLists(userId);
      if (Array.isArray(userLists)) {
        for (const l of userLists) {
          allCatalogs.push({
            type: 'movie',
            id: `watchlist_custom_${l.id}`,
            name: `${l.emoji || '🎬'} Watchlist: ${l.name}`,
            extra: [{ name: 'skip', isRequired: false }],
          });
        }
      }
    } catch (err) {
      console.warn('[StremioAddon] Failed to load custom lists for manifest:', err);
    }
  }

  const isConfigured = Boolean(userId);
  const websiteUrl = hostUrl || 'https://stremiowatchlist.vercel.app';

  return {
    id: 'community.watchlist.quality.tracker',
    version: '1.4.1',
    name: 'Watchlist (Good Quality Tracker)',
    description:
      'Tracks when cinema movies release in 1080p FHD & 4K UHD. ⚠️ ACCOUNT REQUIRED: Connect your Stremio account at ' +
      websiteUrl +
      ' to manage your watchlist and enable release tracking.',
    logo: hostUrl ? `${hostUrl}/icon.png` : 'https://stremiowatchlist.vercel.app/icon.png',
    background: hostUrl
      ? `${hostUrl}/background.jpg`
      : 'https://stremiowatchlist.vercel.app/background.jpg',
    resources: ['catalog', 'meta'],
    types: ['movie'],
    catalogs: allCatalogs,
    idPrefixes: ['tt', 'guide_'],
    behaviorHints: {
      configurable: true,
      configurationRequired: !isConfigured,
    },
  };
}

// todo: check later
export function formatCatalogItem(
  item: any,
  minQuality: string = '1080p',
  minAudio: string = 'any'
) {
  const ready = db.isItemReady(item, minQuality, minAudio);
  const unreleased = db.isItemUnreleased(item);
  const isNew = isItemNewRelease(item);

  let statusPrefix = ready ? '🟢 [Ready]' : unreleased ? '📅 [Unreleased]' : '⏳ [Waiting]';
  let statusBadge = ready
    ? '🟢 Good Quality'
    : unreleased
      ? '📅 Unreleased'
      : '⏳ Waiting for Quality';

  if (ready && isNew) {
    statusPrefix = '🔥 [NEW RELEASE]';
    statusBadge = '🔥 New Release';
  } else if (item.isWatched) {
    statusPrefix = '👁️ [Watched]';
    statusBadge = '👁️ Watched';
  }

  const displayQuality = unreleased ? 'Unreleased' : formatQualityLabel(item.bestQuality);
  const audioLabel = item.hasAtmos ? 'Dolby Atmos' : item.audioFormat || '';
  const qualityWithAudio = audioLabel ? `${displayQuality} • ${audioLabel}` : displayQuality;

  let statusDescription: string;
  if (ready && isNew) {
    statusDescription = `🔥 NEW RELEASE! Available in good quality within the last 3 months!\nDetected quality: ${qualityWithAudio} (${item.streamCount} sources found).`;
  } else if (ready) {
    statusDescription = `✅ AVAILABLE IN GOOD QUALITY! Detected quality: ${qualityWithAudio} (${item.streamCount} sources found).`;
  } else if (unreleased) {
    statusDescription = `📅 NOT RELEASED YET. No sources found at the moment.`;
  } else {
    statusDescription = `⏳ WAITING FOR GOOD QUALITY RELEASE. Current quality: ${qualityWithAudio} (${item.streamCount} sources).`;
  }

  const genres = [statusBadge, displayQuality];
  if (audioLabel && ready) {
    genres.push(`🔊 ${audioLabel}`);
  }

  return {
    id: item.id,
    type: item.type || 'movie',
    name: `${statusPrefix} ${item.name}`,
    poster: item.poster || '',
    posterShape: 'regular',
    banner: item.banner || '',
    genres,
    releaseInfo: item.year ? String(item.year) : undefined,
    description: statusDescription,
  };
}

export async function handleCatalog(
  type: string,
  catalogId: string,
  extra: Record<string, any> = {},
  userId: string = ''
): Promise<CatalogResponse> {
  await db.ensureLoaded();

  // Without an authenticated user, return an informative guide item for main catalogs
  if (!userId) {
    if (catalogId === 'watchlist_ready' || catalogId === 'watchlist_all') {
      return {
        metas: [
          {
            id: 'guide_configure',
            type: 'movie',
            name: 'Scan QR Code',
            poster: 'https://stremiowatchlist.vercel.app/api/qr/poster',
            posterShape: 'regular',
            banner: 'https://stremiowatchlist.vercel.app/background.jpg',
            genres: ['Setup Required', 'Connect Stremio Account', 'Scan QR Code'],
            description:
              'ACCOUNT SETUP REQUIRED\n\nSCAN QR CODE:\nPoint your phone camera at the QR code on this poster to connect your account and start tracking movie releases.',
          },
        ],
      };
    }
    return { metas: [] };
  }

  const validCatalogs = ['watchlist_ready', 'watchlist_all', 'watchlist_pending'];
  const isCustomCatalog = catalogId.startsWith('watchlist_custom_');
  if (!validCatalogs.includes(catalogId) && !isCustomCatalog) {
    return { metas: [] };
  }

  const settings = db.getSettings(userId);
  const minQuality = settings?.minQuality || '1080p';
  const minAudio = settings?.minAudio || 'any';
  const allItems = db.getItems(userId);

  // If user has no movies added yet, show a friendly guide item
  if (allItems.length === 0 && (catalogId === 'watchlist_ready' || catalogId === 'watchlist_all')) {
    return {
      metas: [
        {
          id: 'guide_empty_watchlist',
          type: 'movie',
          name: 'Scan QR Code',
          poster: 'https://stremiowatchlist.vercel.app/api/qr/poster',
          posterShape: 'regular',
          banner: 'https://stremiowatchlist.vercel.app/background.jpg',
          genres: ['Add Movies', 'Scan QR Code'],
          description:
            'SCAN QR CODE\n\nScan the QR code on this poster with your phone camera to open the dashboard and add movies to your watchlist.',
        },
      ],
    };
  }

  let filtered = allItems;

  if (type) {
    filtered = filtered.filter((i: any) => (i.type || 'movie') === type);
  }

  if (isCustomCatalog) {
    const listId = catalogId.replace('watchlist_custom_', '');
    filtered = filtered.filter(
      (i: any) => Array.isArray(i.customLists) && i.customLists.includes(listId)
    );
  } else {
    // Esconde filmes assistidos dos catálogos ativos
    filtered = filtered.filter((i: any) => !i.isWatched);

    if (catalogId === 'watchlist_ready') {
      filtered = filtered.filter((i: any) => db.isItemReady(i, minQuality, minAudio));
    } else if (catalogId === 'watchlist_pending') {
      filtered = filtered.filter((i: any) => !db.isItemReady(i, minQuality, minAudio));
    } else if (catalogId === 'watchlist_all') {
      // Todos os não assistidos
    }
  }

  const skip = parseInt(extra.skip, 10) || 0;
  const pageItems = filtered.slice(skip, skip + 100);

  return {
    metas: pageItems.map((item: any) => formatCatalogItem(item, minQuality, minAudio)),
  };
}

export async function handleMeta(
  type: string,
  id: string,
  userId: string = ''
): Promise<MetaResponse> {
  if (id === 'guide_configure') {
    return {
      meta: {
        id: 'guide_configure',
        type: 'movie',
        name: 'Scan QR Code',
        poster: 'https://stremiowatchlist.vercel.app/api/qr/poster',
        banner: 'https://stremiowatchlist.vercel.app/background.jpg',
        genres: ['Setup Required', 'Connect Stremio Account', 'Scan QR Code'],
        description:
          'ACCOUNT SETUP REQUIRED\n\nSCAN QR CODE:\nPoint your phone camera at the QR code on this poster to connect your account and start tracking movie releases.',
      },
    };
  }

  if (id === 'guide_empty_watchlist') {
    return {
      meta: {
        id: 'guide_empty_watchlist',
        type: 'movie',
        name: 'Scan QR Code',
        poster: 'https://stremiowatchlist.vercel.app/api/qr/poster',
        banner: 'https://stremiowatchlist.vercel.app/background.jpg',
        genres: ['Add Movies', 'Scan QR Code'],
        description:
          'SCAN QR CODE\n\nScan the QR code on this poster with your phone camera to open the dashboard and add movies to your watchlist.',
      },
    };
  }

  await db.ensureLoaded();
  const watchlistItem = userId ? db.getItem(id, userId) : null;
  const cinemetaMeta = await fetchCinemetaMeta(type, id);

  if (!watchlistItem) {
    return cinemetaMeta ? { meta: cinemetaMeta } : { meta: null };
  }

  const settings = userId ? db.getSettings(userId) : { minQuality: '1080p', minAudio: 'any' };
  const minQuality = settings?.minQuality || '1080p';
  const minAudio = settings?.minAudio || 'any';

  const base = cinemetaMeta || watchlistItem;
  const ready = db.isItemReady(watchlistItem, minQuality, minAudio);
  const unreleased = db.isItemUnreleased(watchlistItem);
  const isNew = isItemNewRelease(watchlistItem);

  let statusPrefix = ready ? '🟢 [Ready]' : unreleased ? '📅 [Unreleased]' : '⏳ [Waiting]';
  let statusBadge = ready
    ? '🟢 Good Quality'
    : unreleased
      ? '📅 Unreleased'
      : '⏳ Waiting for Quality';

  if (ready && isNew) {
    statusPrefix = '🔥 [NEW RELEASE]';
    statusBadge = '🔥 New Release';
  } else if (watchlistItem.isWatched) {
    statusPrefix = '👁️ [Watched]';
    statusBadge = '👁️ Watched';
  }

  const displayQuality = unreleased ? 'Unreleased' : formatQualityLabel(watchlistItem.bestQuality);
  const audioLabel = watchlistItem.hasAtmos ? 'Dolby Atmos' : watchlistItem.audioFormat || '';
  const qualityWithAudio = audioLabel ? `${displayQuality} • ${audioLabel}` : displayQuality;

  let statusDescription: string;
  if (ready && isNew) {
    statusDescription = `🔥 NEW RELEASE! Available in good quality within the last 3 months!\nDetected quality: ${qualityWithAudio} (${watchlistItem.streamCount} sources found).`;
  } else if (ready) {
    statusDescription = `🟢 STATUS: AVAILABLE IN GOOD QUALITY! (${qualityWithAudio} - ${watchlistItem.streamCount} sources)`;
  } else if (unreleased) {
    statusDescription = `📅 STATUS: NOT RELEASED YET (No sources available at the moment)`;
  } else {
    statusDescription = `⏳ STATUS: WAITING FOR GOOD QUALITY (Current quality: ${qualityWithAudio})`;
  }

  const enrichedMeta = {
    ...base,
    id: watchlistItem.id,
    type: watchlistItem.type || type,
    name: `${statusPrefix} ${base.name}`,
    genres: [
      statusBadge,
      displayQuality,
      ...(base.genres || []).filter((g: string) => g !== statusBadge),
    ],
    description: `${statusDescription}\n\n${base.description || ''}`,
  };

  return { meta: enrichedMeta };
}

export const stremioAddonService = {
  formatQualityLabel,
  isItemNewRelease,
  getManifest,
  formatCatalogItem,
  handleCatalog,
  handleMeta,
};

export default stremioAddonService;
