const { ensureLoaded, getItems, getItem, getSettings } = require('./db');
const { getMeta: fetchCinemetaMeta } = require('./cinemeta');

function getManifest(hostUrl = '', userId = '') {
  const settings = getSettings(userId);
  const enabledCatalogs = settings.enabledCatalogs || ['watchlist_ready', 'watchlist_all', 'watchlist_pending'];

  const allCatalogs = [
    {
      type: 'movie',
      id: 'watchlist_ready',
      name: '🟢 Watchlist: Prontos (Não CAM)',
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
      name: '⏳ Watchlist: Aguardando (Apenas CAM)',
      extra: [
        { name: 'skip', isRequired: false }
      ]
    }
  ];

  const filteredCatalogs = allCatalogs.filter(cat => enabledCatalogs.includes(cat.id));

  return {
    id: 'community.watchlist.quality.tracker',
    version: '1.2.0',
    name: 'Watchlist (Anti-CAM Tracker)',
    description: 'Watchlist pessoal com identificação automática de filmes liberados para assistir sem ser gravação de cinema (CAM/TS).',
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

function formatCatalogItem(item) {
  const ready = item.has1080pPlus;
  const statusPrefix = ready ? '🟢 [Pronto]' : '⏳ [CAM]';
  const statusBadge = ready ? '🟢 Pronto (Não é CAM)' : '⏳ Apenas CAM';

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
      ? `✅ PRONTO PARA ASSISTIR (NÃO É CAM)! Qualidade detectada: ${item.bestQuality} (${item.streamCount} fontes encontradas).\n\n${item.description || ''}`
      : `⏳ AGUARDANDO VERSÃO LIMPA (SEM CAM). Qualidade atual: ${item.bestQuality} (${item.streamCount} fontes).\n\n${item.description || ''}`
  };
}

async function handleCatalog(type, catalogId, extra = {}, userId = '') {
  await ensureLoaded();

  // Sem usuário autenticado, não exibe nenhuma lista
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
  const statusPrefix = ready ? '🟢 [Pronto]' : '⏳ [CAM]';
  const statusBadge = ready ? '🟢 Pronto (Não é CAM)' : '⏳ Apenas CAM';

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
      ? `🟢 STATUS: DISPONÍVEL (NÃO É CAM)! (${watchlistItem.bestQuality} - ${watchlistItem.streamCount} fontes)\n\n${base.description || ''}`
      : `⏳ STATUS: AGUARDANDO VERSÃO LIMPA (Atualmente apenas CAM / indisponível: ${watchlistItem.bestQuality})\n\n${base.description || ''}`
  };

  return { meta: enrichedMeta };
}

module.exports = {
  getManifest,
  handleCatalog,
  handleMeta
};
