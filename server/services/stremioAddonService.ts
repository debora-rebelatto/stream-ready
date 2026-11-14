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

export function isItemNewRelease(item: any): boolean {
  if (!item || !item.readyAt || !item.has1080pPlus) return false;
  try {
    const ageMs = Date.now() - new Date(item.readyAt).getTime();
    return ageMs >= 0 && ageMs <= 48 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function getManifest(hostUrl: string = '', userId: string = ''): AddonManifest {
  const allCatalogs: Array<{ type: string; id: string; name: string; extra?: Array<{ name: string; isRequired?: boolean }> }> = [
    {
      type: 'movie',
      id: 'watchlist_ready',
      name: '🟢 Watchlist: Ready (Good Quality)',
      extra: [
        { name: 'skip', isRequired: false }
      ]
    },
    {
      type: 'movie',
      id: 'watchlist_all',
      name: '📋 Watchlist: All Movies',
      extra: [
        { name: 'skip', isRequired: false }
      ]
    },
    {
      type: 'movie',
      id: 'watchlist_pending',
      name: '⏳ Watchlist: Waiting for Quality',
      extra: [
        { name: 'skip', isRequired: false }
      ]
    },
    {
      type: 'movie',
      id: 'watchlist_watched',
      name: '👁️ Watchlist: Watched History',
      extra: [
        { name: 'skip', isRequired: false }
      ]
    }
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
            extra: [
              { name: 'skip', isRequired: false }
            ]
          });
        }
      }
    } catch (e) {}
  }

  const isConfigured = Boolean(userId);
  const websiteUrl = hostUrl || 'https://stremiowatchlist.vercel.app';

  return {
    id: 'community.watchlist.quality.tracker',
    version: '1.4.1',
    name: 'Watchlist (Good Quality Tracker)',
    description: 'Tracks when your movies release in good quality (HD, 1080p, 4K). ⚠️ IMPORTANT: Add movies to your watchlist via the website: ' + websiteUrl,
    logo: hostUrl ? `${hostUrl}/icon.png` : 'https://stremiowatchlist.vercel.app/icon.png',
    background: hostUrl ? `${hostUrl}/background.jpg` : 'https://stremiowatchlist.vercel.app/background.jpg',
    resources: ['catalog', 'meta'],
    types: ['movie'],
    catalogs: allCatalogs,
    idPrefixes: ['tt', 'guide_'],
    behaviorHints: {
      configurable: true,
      configurationRequired: !isConfigured
    }
  };
}

export function formatCatalogItem(item: any, minQuality: string = '1080p') {
  const ready = db.isItemReady(item, minQuality);
  const unreleased = db.isItemUnreleased(item);
  const isNew = isItemNewRelease(item);

  let statusPrefix = ready ? '🟢 [Ready]' : (unreleased ? '📅 [Unreleased]' : '⏳ [Waiting]');
  let statusBadge = ready ? '🟢 Good Quality' : (unreleased ? '📅 Unreleased' : '⏳ Waiting for Quality');

  if (ready && isNew) {
    statusPrefix = '🔥 [NEW RELEASE]';
    statusBadge = '🔥 New Release';
  } else if (item.isWatched) {
    statusPrefix = '👁️ [Watched]';
    statusBadge = '👁️ Watched';
  }

  const displayQuality = unreleased ? 'Unreleased' : formatQualityLabel(item.bestQuality);

  let statusDescription: string;
  if (ready && isNew) {
    statusDescription = `🔥 NEW RELEASE! Available in good quality within the last 48 hours!\nDetected quality: ${displayQuality} (${item.streamCount} sources found).`;
  } else if (ready) {
    statusDescription = `✅ AVAILABLE IN GOOD QUALITY! Detected quality: ${displayQuality} (${item.streamCount} sources found).`;
  } else if (unreleased) {
    statusDescription = `📅 NOT RELEASED YET. No sources found at the moment.`;
  } else {
    statusDescription = `⏳ WAITING FOR GOOD QUALITY RELEASE. Current quality: ${displayQuality} (${item.streamCount} sources).`;
  }

  return {
    id: item.id,
    type: item.type || 'movie',
    name: `${statusPrefix} ${item.name}`,
    poster: item.poster || '',
    posterShape: 'regular',
    banner: item.banner || '',
    genres: [
      statusBadge,
      displayQuality
    ],
    releaseInfo: item.year ? String(item.year) : undefined,
    description: statusDescription
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
            name: '👉 Setup Required: Visit stremiowatchlist.vercel.app',
            poster: 'https://stremiowatchlist.vercel.app/icon.png',
            posterShape: 'regular',
            banner: 'https://stremiowatchlist.vercel.app/background.jpg',
            genres: ['⚠️ Notice', 'Setup Required'],
            description: 'To manage your Watchlist and track good quality releases, connect your account and add movies on the website:\n\n🌐 https://stremiowatchlist.vercel.app/\n\n1. Open the website in your browser\n2. Connect your Stremio account\n3. Search and add any movies you want to track!'
          }
        ]
      };
    }
    return { metas: [] };
  }

  const validCatalogs = ['watchlist_ready', 'watchlist_all', 'watchlist_pending', 'watchlist_watched'];
  const isCustomCatalog = catalogId.startsWith('watchlist_custom_');
  if (!validCatalogs.includes(catalogId) && !isCustomCatalog) {
    return { metas: [] };
  }

  const settings = db.getSettings(userId);
  const minQuality = settings?.minQuality || '1080p';
  const allItems = db.getItems(userId);

  // If user has no movies added yet, show a friendly guide item
  if (allItems.length === 0 && (catalogId === 'watchlist_ready' || catalogId === 'watchlist_all')) {
    return {
      metas: [
        {
          id: 'guide_empty_watchlist',
          type: 'movie',
          name: '👉 Empty Watchlist: Add movies via stremiowatchlist.vercel.app',
          poster: 'https://stremiowatchlist.vercel.app/icon.png',
          posterShape: 'regular',
          banner: 'https://stremiowatchlist.vercel.app/background.jpg',
          genres: ['ℹ️ Tip', 'Add on Website'],
          description: 'Your watchlist is empty! Movies must be added through the website:\n\n🌐 https://stremiowatchlist.vercel.app/\n\nSearch and add any movie on the website. The addon will monitor releases 24/7 and notify you in Stremio when good quality (1080p / 4K) arrives!'
        }
      ]
    };
  }

  let filtered = allItems;

  if (type) {
    filtered = filtered.filter((i: any) => (i.type || 'movie') === type);
  }

  if (isCustomCatalog) {
    const listId = catalogId.replace('watchlist_custom_', '');
    filtered = filtered.filter((i: any) => Array.isArray(i.customLists) && i.customLists.includes(listId));
  } else if (catalogId === 'watchlist_watched') {
    filtered = filtered.filter((i: any) => Boolean(i.isWatched));
  } else {
    // Esconde filmes assistidos dos catálogos ativos
    filtered = filtered.filter((i: any) => !i.isWatched);

    if (catalogId === 'watchlist_ready') {
      filtered = filtered.filter((i: any) => db.isItemReady(i, minQuality));
    } else if (catalogId === 'watchlist_pending') {
      filtered = filtered.filter((i: any) => !db.isItemReady(i, minQuality));
    } else if (catalogId === 'watchlist_all') {
      // Todos os não assistidos
    }
  }

  const skip = parseInt(extra.skip, 10) || 0;
  const pageItems = filtered.slice(skip, skip + 100);

  return {
    metas: pageItems.map((item: any) => formatCatalogItem(item, minQuality))
  };
}

export async function handleMeta(type: string, id: string, userId: string = ''): Promise<MetaResponse> {
  if (id === 'guide_configure') {
    return {
      meta: {
        id: 'guide_configure',
        type: 'movie',
        name: '👉 Setup Required: Visit stremiowatchlist.vercel.app',
        poster: 'https://stremiowatchlist.vercel.app/icon.png',
        banner: 'https://stremiowatchlist.vercel.app/background.jpg',
        genres: ['⚠️ Notice', 'Setup Required'],
        description: 'To use your Watchlist and track releases in good quality:\n\n1. Open the website in your browser: https://stremiowatchlist.vercel.app/\n2. Connect your Stremio account\n3. Search and add movies using the search bar!\n\nOnce added on the website, they will automatically appear here in Stremio!'
      }
    };
  }

  if (id === 'guide_empty_watchlist') {
    return {
      meta: {
        id: 'guide_empty_watchlist',
        type: 'movie',
        name: '👉 Empty Watchlist: Add movies via stremiowatchlist.vercel.app',
        poster: 'https://stremiowatchlist.vercel.app/icon.png',
        banner: 'https://stremiowatchlist.vercel.app/background.jpg',
        genres: ['ℹ️ Tip', 'Add on Website'],
        description: 'Your watchlist currently has no movies added.\n\n⚠️ Movies must be added directly through the website:\n🌐 https://stremiowatchlist.vercel.app/\n\nOpen the website, search for any movie and click "+ Add to Watchlist". The addon will monitor quality automatically and notify you once it releases in 1080p or 4K!'
      }
    };
  }

  await db.ensureLoaded();
  const watchlistItem = userId ? db.getItem(id, userId) : null;
  const cinemetaMeta = await fetchCinemetaMeta(type, id);

  if (!watchlistItem) {
    return cinemetaMeta ? { meta: cinemetaMeta } : { meta: null };
  }

  const settings = userId ? db.getSettings(userId) : { minQuality: '1080p' };
  const minQuality = settings?.minQuality || '1080p';

  const base = cinemetaMeta || watchlistItem;
  const ready = db.isItemReady(watchlistItem, minQuality);
  const unreleased = db.isItemUnreleased(watchlistItem);
  const isNew = isItemNewRelease(watchlistItem);

  let statusPrefix = ready ? '🟢 [Ready]' : (unreleased ? '📅 [Unreleased]' : '⏳ [Waiting]');
  let statusBadge = ready ? '🟢 Good Quality' : (unreleased ? '📅 Unreleased' : '⏳ Waiting for Quality');

  if (ready && isNew) {
    statusPrefix = '🔥 [NEW RELEASE]';
    statusBadge = '🔥 New Release';
  } else if (watchlistItem.isWatched) {
    statusPrefix = '👁️ [Watched]';
    statusBadge = '👁️ Watched';
  }

  const displayQuality = unreleased ? 'Unreleased' : formatQualityLabel(watchlistItem.bestQuality);

  let statusDescription: string;
  if (ready && isNew) {
    statusDescription = `🔥 NEW RELEASE! Available in good quality within the last 48 hours!\nDetected quality: ${displayQuality} (${watchlistItem.streamCount} sources found).`;
  } else if (ready) {
    statusDescription = `🟢 STATUS: AVAILABLE IN GOOD QUALITY! (${displayQuality} - ${watchlistItem.streamCount} sources)`;
  } else if (unreleased) {
    statusDescription = `📅 STATUS: NOT RELEASED YET (No sources available at the moment)`;
  } else {
    statusDescription = `⏳ STATUS: WAITING FOR GOOD QUALITY (Current quality: ${displayQuality})`;
  }

  const enrichedMeta = {
    ...base,
    id: watchlistItem.id,
    type: watchlistItem.type || type,
    name: `${statusPrefix} ${base.name}`,
    genres: [
      statusBadge,
      displayQuality,
      ...((base.genres || []).filter((g: string) => g !== statusBadge))
    ],
    description: `${statusDescription}\n\n${base.description || ''}`
  };

  return { meta: enrichedMeta };
}

export const stremioAddonService = {
  formatQualityLabel,
  isItemNewRelease,
  getManifest,
  formatCatalogItem,
  handleCatalog,
  handleMeta
};

export default stremioAddonService;
