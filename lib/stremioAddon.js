Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, { configurable: true, 
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get default () {
        return _default;
    },
    get formatCatalogItem () {
        return formatCatalogItem;
    },
    get formatQualityLabel () {
        return formatQualityLabel;
    },
    get getManifest () {
        return getManifest;
    },
    get handleCatalog () {
        return handleCatalog;
    },
    get handleMeta () {
        return handleMeta;
    },
    get isItemNewRelease () {
        return isItemNewRelease;
    },
    get stremioAddonService () {
        return stremioAddonService;
    }
});
const _cinemeta = require("./cinemeta");
const db = require('./db');
function formatQualityLabel(raw) {
    if (!raw) return 'Pending';
    const q = String(raw).trim();
    if (/ainda não lançado|não lançado|indisponível|unreleased/i.test(q)) return 'Unreleased';
    if (/^pendente$|^aguardando verificação$/i.test(q)) return 'Pending';
    if (/gravação de cinema/i.test(q)) return 'CAM / Theater Rip';
    if (/erro na verificação/i.test(q)) return 'Check Error';
    return q;
}
const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;
function isItemNewRelease(item) {
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
        } catch  {
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
    } catch  {
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
                {
                    name: 'skip',
                    isRequired: false
                }
            ]
        },
        {
            type: 'movie',
            id: 'watchlist_all',
            name: '📋 Watchlist: All Movies',
            extra: [
                {
                    name: 'skip',
                    isRequired: false
                }
            ]
        },
        {
            type: 'movie',
            id: 'watchlist_pending',
            name: '⏳ Watchlist: Waiting for Quality',
            extra: [
                {
                    name: 'skip',
                    isRequired: false
                }
            ]
        },
        {
            type: 'movie',
            id: 'watchlist_watched',
            name: '👁️ Watchlist: Watched History',
            extra: [
                {
                    name: 'skip',
                    isRequired: false
                }
            ]
        }
    ];
    // Adiciona os catálogos das listas personalizadas do usuário
    if (userId) {
        try {
            const userLists = db.getCustomLists(userId);
            if (Array.isArray(userLists)) {
                for (const l of userLists){
                    allCatalogs.push({
                        type: 'movie',
                        id: `watchlist_custom_${l.id}`,
                        name: `${l.emoji || '🎬'} Watchlist: ${l.name}`,
                        extra: [
                            {
                                name: 'skip',
                                isRequired: false
                            }
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
        resources: [
            'catalog',
            'meta'
        ],
        types: [
            'movie'
        ],
        catalogs: allCatalogs,
        idPrefixes: [
            'tt',
            'guide_'
        ],
        behaviorHints: {
            configurable: true,
            configurationRequired: !isConfigured
        }
    };
}
function formatCatalogItem(item, minQuality = '1080p') {
    const ready = db.isItemReady(item, minQuality);
    const unreleased = db.isItemUnreleased(item);
    const isNew = isItemNewRelease(item);
    let statusPrefix = ready ? '🟢 [Ready]' : unreleased ? '📅 [Unreleased]' : '⏳ [Waiting]';
    let statusBadge = ready ? '🟢 Good Quality' : unreleased ? '📅 Unreleased' : '⏳ Waiting for Quality';
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
        statusDescription = `🔥 NEW RELEASE! Available in good quality within the last 3 months!\nDetected quality: ${displayQuality} (${item.streamCount} sources found).`;
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
                        genres: [
                            '⚠️ Notice',
                            'Setup Required'
                        ],
                        description: 'To manage your Watchlist and track good quality releases, connect your account and add movies on the website:\n\n🌐 https://stremiowatchlist.vercel.app/\n\n1. Open the website in your browser\n2. Connect your Stremio account\n3. Search and add any movies you want to track!'
                    }
                ]
            };
        }
        return {
            metas: []
        };
    }
    const validCatalogs = [
        'watchlist_ready',
        'watchlist_all',
        'watchlist_pending',
        'watchlist_watched'
    ];
    const isCustomCatalog = catalogId.startsWith('watchlist_custom_');
    if (!validCatalogs.includes(catalogId) && !isCustomCatalog) {
        return {
            metas: []
        };
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
                    genres: [
                        'ℹ️ Tip',
                        'Add on Website'
                    ],
                    description: 'Your watchlist is empty! Movies must be added through the website:\n\n🌐 https://stremiowatchlist.vercel.app/\n\nSearch and add any movie on the website. The addon will monitor releases 24/7 and notify you in Stremio when good quality (1080p / 4K) arrives!'
                }
            ]
        };
    }
    let filtered = allItems;
    if (type) {
        filtered = filtered.filter((i)=>(i.type || 'movie') === type);
    }
    if (isCustomCatalog) {
        const listId = catalogId.replace('watchlist_custom_', '');
        filtered = filtered.filter((i)=>Array.isArray(i.customLists) && i.customLists.includes(listId));
    } else if (catalogId === 'watchlist_watched') {
        filtered = filtered.filter((i)=>Boolean(i.isWatched));
    } else {
        // Esconde filmes assistidos dos catálogos ativos
        filtered = filtered.filter((i)=>!i.isWatched);
        if (catalogId === 'watchlist_ready') {
            filtered = filtered.filter((i)=>db.isItemReady(i, minQuality));
        } else if (catalogId === 'watchlist_pending') {
            filtered = filtered.filter((i)=>!db.isItemReady(i, minQuality));
        } else if (catalogId === 'watchlist_all') {
        // Todos os não assistidos
        }
    }
    const skip = parseInt(extra.skip, 10) || 0;
    const pageItems = filtered.slice(skip, skip + 100);
    return {
        metas: pageItems.map((item)=>formatCatalogItem(item, minQuality))
    };
}
async function handleMeta(type, id, userId = '') {
    if (id === 'guide_configure') {
        return {
            meta: {
                id: 'guide_configure',
                type: 'movie',
                name: '👉 Setup Required: Visit stremiowatchlist.vercel.app',
                poster: 'https://stremiowatchlist.vercel.app/icon.png',
                banner: 'https://stremiowatchlist.vercel.app/background.jpg',
                genres: [
                    '⚠️ Notice',
                    'Setup Required'
                ],
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
                genres: [
                    'ℹ️ Tip',
                    'Add on Website'
                ],
                description: 'Your watchlist currently has no movies added.\n\n⚠️ Movies must be added directly through the website:\n🌐 https://stremiowatchlist.vercel.app/\n\nOpen the website, search for any movie and click "+ Add to Watchlist". The addon will monitor quality automatically and notify you once it releases in 1080p or 4K!'
            }
        };
    }
    await db.ensureLoaded();
    const watchlistItem = userId ? db.getItem(id, userId) : null;
    const cinemetaMeta = await (0, _cinemeta.getMeta)(type, id);
    if (!watchlistItem) {
        return cinemetaMeta ? {
            meta: cinemetaMeta
        } : {
            meta: null
        };
    }
    const settings = userId ? db.getSettings(userId) : {
        minQuality: '1080p'
    };
    const minQuality = settings?.minQuality || '1080p';
    const base = cinemetaMeta || watchlistItem;
    const ready = db.isItemReady(watchlistItem, minQuality);
    const unreleased = db.isItemUnreleased(watchlistItem);
    const isNew = isItemNewRelease(watchlistItem);
    let statusPrefix = ready ? '🟢 [Ready]' : unreleased ? '📅 [Unreleased]' : '⏳ [Waiting]';
    let statusBadge = ready ? '🟢 Good Quality' : unreleased ? '📅 Unreleased' : '⏳ Waiting for Quality';
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
        statusDescription = `🔥 NEW RELEASE! Available in good quality within the last 3 months!\nDetected quality: ${displayQuality} (${watchlistItem.streamCount} sources found).`;
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
            ...(base.genres || []).filter((g)=>g !== statusBadge)
        ],
        description: `${statusDescription}\n\n${base.description || ''}`
    };
    return {
        meta: enrichedMeta
    };
}
const stremioAddonService = {
    formatQualityLabel,
    isItemNewRelease,
    getManifest,
    formatCatalogItem,
    handleCatalog,
    handleMeta
};
const _default = stremioAddonService;
