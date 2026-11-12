const { ensureLoaded, getItems, getItem, getSettings, isItemReady, isItemUnreleased } = require('./db');
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

function isItemNewRelease(item) {
  if (!item || !item.readyAt || !item.has1080pPlus) return false;
  try {
    const ageMs = Date.now() - new Date(item.readyAt).getTime();
    return ageMs >= 0 && ageMs <= 48 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function getManifest(hostUrl = '', userId = '') {
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

  return {
    id: 'community.watchlist.quality.tracker',
    version: '1.4.0',
    name: 'Watchlist (Good Quality Tracker)',
    description: 'Personal watchlist that automatically tracks when movies become available in good quality (HD, Full HD, 4K).',
    logo: hostUrl ? `${hostUrl}/icon.png` : undefined,
    background: hostUrl ? `${hostUrl}/background.jpg` : undefined,
    resources: ['catalog', 'meta'],
    types: ['movie', 'series'],
    catalogs: allCatalogs,
    idPrefixes: ['tt'],
    behaviorHints: {
      configurable: true,
      configurationRequired: false
    }
  };
}

function formatCatalogItem(item, minQuality = '1080p') {
  const ready = isItemReady(item, minQuality);
  const unreleased = isItemUnreleased(item);
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

  let statusDescription;
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

async function handleCatalog(type, catalogId, extra = {}, userId = '') {
  await ensureLoaded();

  // Without an authenticated user, return empty catalog
  if (!userId) {
    return { metas: [] };
  }

  const validCatalogs = ['watchlist_ready', 'watchlist_all', 'watchlist_pending', 'watchlist_watched'];
  if (!validCatalogs.includes(catalogId)) {
    return { metas: [] };
  }

  const settings = getSettings(userId);
  const minQuality = settings.minQuality || '1080p';
  const allItems = getItems(userId);

  let filtered = allItems;

  if (type) {
    filtered = filtered.filter(i => (i.type || 'movie') === type);
  }

  if (catalogId === 'watchlist_watched') {
    filtered = filtered.filter(i => Boolean(i.isWatched));
  } else {
    // Esconde filmes assistidos dos catálogos ativos
    filtered = filtered.filter(i => !i.isWatched);

    if (catalogId === 'watchlist_ready') {
      filtered = filtered.filter(i => isItemReady(i, minQuality));
    } else if (catalogId === 'watchlist_pending') {
      filtered = filtered.filter(i => !isItemReady(i, minQuality));
    } else if (catalogId === 'watchlist_all') {
      // Todos os não assistidos
    }
  }

  const skip = parseInt(extra.skip, 10) || 0;
  const pageItems = filtered.slice(skip, skip + 100);

  return {
    metas: pageItems.map(item => formatCatalogItem(item, minQuality))
  };
}

async function handleMeta(type, id, userId = '') {
  await ensureLoaded();
  const watchlistItem = userId ? getItem(id, userId) : null;
  const cinemetaMeta = await fetchCinemetaMeta(type, id);

  if (!watchlistItem) {
    return cinemetaMeta ? { meta: cinemetaMeta } : { meta: null };
  }

  const settings = userId ? getSettings(userId) : { minQuality: '1080p' };
  const minQuality = settings.minQuality || '1080p';

  const base = cinemetaMeta || watchlistItem;
  const ready = isItemReady(watchlistItem, minQuality);
  const unreleased = isItemUnreleased(watchlistItem);
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

  let statusDescription;
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
