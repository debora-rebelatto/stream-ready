const { getItems, getItem, getSettings } = require('./db');
const { getMeta: fetchCinemetaMeta } = require('./cinemeta');

function getManifest(hostUrl = '', authKey = '') {
  return {
    id: authKey ? `community.watchlist.tracker.${authKey.slice(0, 10)}` : 'community.watchlist.quality.tracker',
    version: '1.0.0',
    name: 'Watchlist (1080p+ Tracker)',
    description: 'Watchlist pessoal com identificação automática de filmes prontos para assistir em 1080p ou 4K.',
    logo: hostUrl ? `${hostUrl}/icon.png` : undefined,
    background: hostUrl ? `${hostUrl}/background.jpg` : undefined,
    resources: ['catalog', 'meta'],
    types: ['movie', 'series'],
    catalogs: [
      {
        type: 'movie',
        id: 'watchlist_ready',
        name: '🟢 Watchlist: Prontos (1080p+)',
        extra: [
          { name: 'skip', isRequired: false }
        ]
      },
      {
        type: 'movie',
        id: 'watchlist_all',
        name: '📋 Watchlist: Todos os Filmes',
        extra: [
          { name: 'skip', isRequired: false }
        ]
      },
      {
        type: 'movie',
        id: 'watchlist_pending',
        name: '⏳ Watchlist: Aguardando 1080p',
        extra: [
          { name: 'skip', isRequired: false }
        ]
      }
    ],
    idPrefixes: ['tt'],
    behaviorHints: {
      configurable: true,
      configurationRequired: false
    }
  };
}

function formatCatalogItem(item) {
  const ready = item.has1080pPlus;
  const statusPrefix = ready ? '🟢 [1080p+]' : '⏳ [Aguardando]';
  const statusBadge = ready ? '🟢 1080p+ Disponível' : '⏳ Aguardando 1080p';

  return {
    id: item.id,
    type: item.type || 'movie',
    name: `${statusPrefix} ${item.name}`,
    poster: item.poster || '',
    posterShape: 'regular',
    banner: item.banner || '',
    genres: [
      statusBadge,
      item.bestQuality || 'Pendente',
      ...(item.genres || []).filter(g => g !== statusBadge)
    ],
    releaseInfo: item.year ? String(item.year) : undefined,
    imdbRating: item.imdbRating ? String(item.imdbRating) : undefined,
    description: ready
      ? `✅ PRONTO PARA ASSISTIR! Qualidade detectada: ${item.bestQuality} (${item.streamCount} fontes encontradas).\n\n${item.description || ''}`
      : `⏳ AGUARDANDO QUALIDADE 1080p+. Qualidade atual: ${item.bestQuality} (${item.streamCount} fontes).\n\n${item.description || ''}`
  };
}

async function handleCatalog(type, catalogId, extra = {}, authKey = '') {
  const settings = getSettings();
  const effectiveKey = authKey || settings.stremioAuthKey;

  // Se não estiver conectado em uma conta do Stremio, não renderiza nenhuma lista
  if (!effectiveKey) {
    return { metas: [] };
  }

  const allItems = getItems();
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

async function handleMeta(type, id) {
  const watchlistItem = getItem(id);
  const cinemetaMeta = await fetchCinemetaMeta(type, id);

  if (!watchlistItem) {
    return cinemetaMeta ? { meta: cinemetaMeta } : { meta: null };
  }

  const base = cinemetaMeta || watchlistItem;
  const ready = watchlistItem.has1080pPlus;
  const statusPrefix = ready ? '🟢 [1080p+]' : '⏳ [Aguardando]';
  const statusBadge = ready ? '🟢 1080p+ Disponível' : '⏳ Aguardando 1080p';

  const enrichedMeta = {
    ...base,
    id: watchlistItem.id,
    type: watchlistItem.type || type,
    name: `${statusPrefix} ${base.name}`,
    genres: [
      statusBadge,
      watchlistItem.bestQuality || 'Pendente',
      ...(base.genres || []).filter(g => g !== statusBadge)
    ],
    description: ready
      ? `🟢 STATUS: DISPONÍVEL EM 1080p+! (${watchlistItem.bestQuality} - ${watchlistItem.streamCount} fontes)\n\n${base.description || ''}`
      : `⏳ STATUS: AGUARDANDO 1080p+ (Qualidade atual: ${watchlistItem.bestQuality})\n\n${base.description || ''}`
  };

  return { meta: enrichedMeta };
}

module.exports = {
  getManifest,
  handleCatalog,
  handleMeta
};

