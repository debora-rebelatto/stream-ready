const { ensureLoaded, getItems, getItem, getSettings } = require('./db');
const { getMeta: fetchCinemetaMeta } = require('./cinemeta');

function formatQualityLabel(raw) {
  if (!raw) return 'Pending';
  const q = String(raw).trim();
  if (/ainda não lançado|não lançado|indisponível|unreleased/i.test(q)) return 'Unreleased';
  if (/^pendente$|^aguardando verificação$/i.test(q)) return 'Pending';
  if (/gravação de cinema/i.test(q)) return 'CAM / Theater Rip';
  if (/erro na verificação/i.test(q)) return 'Check Error';
  return q;
}

function getManifest(hostUrl = '', userId = '') {
  const settings = getSettings(userId);
  const enabledCatalogs = settings.enabledCatalogs || ['watchlist_ready', 'watchlist_all', 'watchlist_pending'];

  const allCatalogs = [
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
    }
  ];

  const filteredCatalogs = allCatalogs.filter(cat => enabledCatalogs.includes(cat.id));

  return {
    id: 'community.watchlist.quality.tracker',
    version: '1.3.0',
    name: 'Watchlist (Good Quality Tracker)',
    description: 'Personal watchlist that automatically tracks when movies become available in good quality (HD, Full HD, 4K).',
    logo: hostUrl ? `${hostUrl}/icon.png` : undefined,
    background: hostUrl ? `${hostUrl}/background.jpg` : undefined,
    resources: ['catalog', 'meta'],
    types: ['movie', 'series'],
    catalogs: filteredCatalogs.length > 0 ? filteredCatalogs : allCatalogs,
    idPrefixes: ['tt'],
    behaviorHints: {
      configurable: true,
      configurationRequired: false
    }
  };
}

function isItemUnreleased(item) {
  if (item.has1080pPlus) return false;
  const q = (item.bestQuality || '').toLowerCase();
  if (q.includes('unreleased') || q.includes('not released') || q.includes('unavailable') || q.includes('não lançado') || q.includes('indisponível')) return true;
  if ((!item.streamCount || item.streamCount === 0) && !q.includes('cam')) return true;
  return false;
}

function formatCatalogItem(item) {
  const ready = item.has1080pPlus;
  const unreleased = isItemUnreleased(item);
  const statusPrefix = ready ? '🟢 [Ready]' : (unreleased ? '📅 [Unreleased]' : '⏳ [Waiting]');
  const statusBadge = ready ? '🟢 Good Quality' : (unreleased ? '📅 Unreleased' : '⏳ Waiting for Quality');
  const displayQuality = unreleased ? 'Unreleased' : formatQualityLabel(item.bestQuality);

  let statusDescription;
  if (ready) {
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
      displayQuality,
      ...(item.genres || []).filter(g => g !== statusBadge)
    ],
    releaseInfo: item.year ? String(item.year) : undefined,
    imdbRating: item.imdbRating ? String(item.imdbRating) : undefined,
    description: `${statusDescription}\n\n${item.description || ''}`
  };
}

async function handleCatalog(type, catalogId, extra = {}, userId = '') {
  await ensureLoaded();

  // Without an authenticated user, return empty catalog
  if (!userId) {
    return { metas: [] };
  }

  const settings = getSettings(userId);
  const enabledCatalogs = settings.enabledCatalogs || ['watchlist_ready', 'watchlist_all', 'watchlist_pending'];
  if (!enabledCatalogs.includes(catalogId)) {
    return { metas: [] };
  }

  const allItems = getItems(userId);
  let filtered = allItems;

  if (type) {
    filtered = filtered.filter(i => (i.type || 'movie') === type);
  }

  if (catalogId === 'watchlist_ready') {
    filtered = filtered.filter(i => i.has1080pPlus);
  } else if (catalogId === 'watchlist_pending') {
    filtered = filtered.filter(i => !i.has1080pPlus);
  } else if (catalogId === 'watchlist_all') {
    // Keep all
  }

  const skip = parseInt(extra.skip, 10) || 0;
  const pageItems = filtered.slice(skip, skip + 100);

  return {
    metas: pageItems.map(formatCatalogItem)
  };
}

async function handleMeta(type, id, userId = '') {
  await ensureLoaded();
  const watchlistItem = userId ? getItem(id, userId) : null;
  const cinemetaMeta = await fetchCinemetaMeta(type, id);

  if (!watchlistItem) {
    return cinemetaMeta ? { meta: cinemetaMeta } : { meta: null };
  }

  const base = cinemetaMeta || watchlistItem;
  const ready = watchlistItem.has1080pPlus;
  const unreleased = isItemUnreleased(watchlistItem);
  const statusPrefix = ready ? '🟢 [Ready]' : (unreleased ? '📅 [Unreleased]' : '⏳ [Waiting]');
  const statusBadge = ready ? '🟢 Good Quality' : (unreleased ? '📅 Unreleased' : '⏳ Waiting for Quality');
  const displayQuality = unreleased ? 'Unreleased' : formatQualityLabel(watchlistItem.bestQuality);

  let statusDescription;
  if (ready) {
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
      ...(base.genres || []).filter(g => g !== statusBadge)
    ],
    description: `${statusDescription}\n\n${base.description || ''}`
  };

  return { meta: enrichedMeta };
}

module.exports = {
  getManifest,
  handleCatalog,
  handleMeta
};
