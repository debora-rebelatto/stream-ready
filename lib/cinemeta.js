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
    get cinemetaService () {
        return cinemetaService;
    },
    get default () {
        return _default;
    },
    get getMeta () {
        return getMeta;
    },
    get searchMovies () {
        return searchMovies;
    }
});
const CINEMETA_URL = 'https://v3-cinemeta.strem.io';
async function searchMovies(query) {
    if (!query || query.trim().length === 0) return [];
    const trimmed = query.trim();
    // Se for um IMDb ID direto (ex: tt1234567)
    if (/^tt\d{7,8}$/i.test(trimmed)) {
        const meta = await getMeta('movie', trimmed);
        return meta ? [
            meta
        ] : [];
    }
    const url = `${CINEMETA_URL}/catalog/movie/top/search=${encodeURIComponent(trimmed)}.json`;
    let timeout;
    try {
        const controller = new AbortController();
        timeout = setTimeout(()=>controller.abort(), 8000);
        if (timeout && typeof timeout.unref === 'function') {
            timeout.unref();
        }
        if (timeout && typeof timeout.unref === 'function') {
            timeout.unref();
        }
        const res = await fetch(url, {
            signal: controller.signal
        });
        if (!res.ok) return [];
        const data = await res.json();
        return (data.metas || []).filter((item)=>!item.type || item.type === 'movie').map((item)=>({
                id: item.id,
                type: 'movie',
                name: item.name,
                year: item.year || item.releaseInfo || '',
                poster: item.poster || '',
                banner: item.banner || item.background || '',
                genres: item.genres || [],
                description: item.description || '',
                imdbRating: item.imdbRating || ''
            }));
    } catch (err) {
        console.error('[Cinemeta] Erro ao buscar filmes:', err.message);
        return [];
    } finally{
        if (timeout) clearTimeout(timeout);
    }
}
async function getMeta(type = 'movie', id) {
    const url = `${CINEMETA_URL}/meta/${type}/${id}.json`;
    let timeout;
    try {
        const controller = new AbortController();
        timeout = setTimeout(()=>controller.abort(), 8000);
        if (timeout && typeof timeout.unref === 'function') {
            timeout.unref();
        }
        const res = await fetch(url, {
            signal: controller.signal
        });
        if (!res.ok) return null;
        const data = await res.json();
        if (!data.meta) return null;
        const m = data.meta;
        if (m.type && m.type !== 'movie') {
            return null;
        }
        return {
            id: m.id,
            type: 'movie',
            name: m.name,
            year: m.year || m.releaseInfo || '',
            poster: m.poster || '',
            banner: m.banner || m.background || '',
            genres: m.genres || [],
            description: m.description || '',
            imdbRating: m.imdbRating || '',
            runtime: m.runtime || '',
            director: m.director || [],
            cast: m.cast || []
        };
    } catch (err) {
        console.error(`[Cinemeta] Erro ao obter meta de ${id}:`, err.message);
        return null;
    } finally{
        if (timeout) clearTimeout(timeout);
    }
}
const cinemetaService = {
    searchMovies,
    getMeta
};
const _default = cinemetaService;
