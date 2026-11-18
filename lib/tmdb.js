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
    get clearTrendingCache () {
        return clearTrendingCache;
    },
    get getTrendingMovies () {
        return getTrendingMovies;
    }
});
const _qualityChecker = require("./qualityChecker");
const TMDB_GENRES = {
    28: 'Action',
    12: 'Adventure',
    16: 'Animation',
    35: 'Comedy',
    80: 'Crime',
    99: 'Documentary',
    18: 'Drama',
    10751: 'Family',
    14: 'Fantasy',
    36: 'History',
    27: 'Horror',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    878: 'Sci-Fi',
    10770: 'TV Movie',
    53: 'Thriller',
    10752: 'War',
    37: 'Western'
};
let cachedTrending = null;
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours
function clearTrendingCache() {
    cachedTrending = null;
}
async function getTrendingMovies(limit = 9) {
    const now = Date.now();
    if (cachedTrending && now - cachedTrending.timestamp < CACHE_TTL_MS) {
        return cachedTrending.data.slice(0, limit);
    }
    const apiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
    if (apiKey) {
        try {
            const mixed = await fetchMixedFromTmdb(apiKey, limit);
            if (mixed && mixed.length > 0) {
                cachedTrending = {
                    data: mixed,
                    timestamp: now
                };
                return mixed.slice(0, limit);
            }
        } catch (err) {
            console.warn('[TMDB] Error fetching curated mixed movies:', err.message);
        }
    }
    // Fallback to Cinemeta Top Movies Catalog
    try {
        const fallback = await fetchFromCinemeta(limit);
        if (fallback && fallback.length > 0) {
            return fallback;
        }
    } catch (err) {
        console.warn('[TMDB] Fallback to Cinemeta failed:', err.message);
    }
    return [];
}
/**
 * Queries TMDB for upcoming unreleased movies and recent releases (< 90 days),
 * verifies real Torrentio streams, and balances them into a 3-category mix.
 */ async function fetchMixedFromTmdb(apiKey, limit) {
    const controller = new AbortController();
    let timeout = null;
    try {
        timeout = setTimeout(()=>controller.abort(), 12000);
        if (timeout && typeof timeout.unref === 'function') {
            timeout.unref();
        }
        const now = Date.now();
        const todayStr = new Date(now).toISOString().slice(0, 10);
        const threeMonthsAgoStr = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        // 1. Fetch upcoming unreleased movies (release date >= today)
        const upcomingUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${encodeURIComponent(apiKey)}&primary_release_date.gte=${todayStr}&sort_by=popularity.desc&language=en-US`;
        // 2. Fetch recently released movies (between 3 months ago and today)
        const recentUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${encodeURIComponent(apiKey)}&primary_release_date.gte=${threeMonthsAgoStr}&primary_release_date.lte=${todayStr}&sort_by=popularity.desc&language=en-US`;
        const [upcomingRes, recentRes] = await Promise.all([
            fetch(upcomingUrl, {
                signal: controller.signal
            }).then((r)=>r.ok ? r.json() : {
                    results: []
                }).catch(()=>({
                    results: []
                })),
            fetch(recentUrl, {
                signal: controller.signal
            }).then((r)=>r.ok ? r.json() : {
                    results: []
                }).catch(()=>({
                    results: []
                }))
        ]);
        const rawUpcoming = (upcomingRes.results || []).slice(0, 10);
        const rawRecent = (recentRes.results || []).slice(0, 16);
        // Resolve IMDb IDs for raw candidates
        const resolveMovie = async (m)=>{
            try {
                const extRes = await fetch(`https://api.themoviedb.org/3/movie/${m.id}/external_ids?api_key=${encodeURIComponent(apiKey)}`, {
                    signal: controller.signal
                });
                if (!extRes.ok) return null;
                const extData = await extRes.json();
                const imdbId = extData.imdb_id;
                if (!imdbId || !/^tt\d+$/i.test(imdbId)) return null;
                const releaseDate = m.release_date || '';
                const year = releaseDate ? releaseDate.substring(0, 4) : '';
                const poster = m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : undefined;
                const banner = m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : undefined;
                const genres = (m.genre_ids || []).map((gid)=>TMDB_GENRES[gid]).filter(Boolean);
                return {
                    id: imdbId,
                    tmdbId: m.id,
                    name: m.title || m.original_title,
                    year,
                    releaseDate,
                    poster,
                    banner,
                    genres,
                    description: m.overview || '',
                    imdbRating: m.vote_average ? Number(m.vote_average).toFixed(1) : 'N/A',
                    qualityBadge: 'Coming Soon',
                    isReady: false
                };
            } catch  {
                return null;
            }
        };
        const [resolvedUpcoming, resolvedRecent] = await Promise.all([
            Promise.all(rawUpcoming.map(resolveMovie)).then((list)=>list.filter((m)=>m !== null)),
            Promise.all(rawRecent.map(resolveMovie)).then((list)=>list.filter((m)=>m !== null))
        ]);
        // Check quality of recent movies via Torrentio
        const checkedRecent = await Promise.all(resolvedRecent.map(async (movie)=>{
            try {
                const quality = await (0, _qualityChecker.checkMovieQuality)(movie.id, 'movie', movie.name, movie.year);
                const isReady = Boolean(quality.has1080pPlus || quality.isReady);
                let qualityBadge = quality.bestQuality || 'Coming Soon';
                let category = 'in_theaters';
                if (isReady && quality.bestQuality && quality.bestQuality !== 'Unreleased' && quality.bestQuality !== 'Check Error') {
                    qualityBadge = quality.bestQuality;
                    category = 'ready';
                } else if (quality.isCamOnly) {
                    qualityBadge = 'CAM Only • In Theaters';
                    category = 'in_theaters';
                } else {
                    qualityBadge = 'In Theaters • Waiting 1080p';
                    category = 'in_theaters';
                }
                return {
                    ...movie,
                    isReady,
                    qualityBadge,
                    category
                };
            } catch  {
                return {
                    ...movie,
                    isReady: false,
                    qualityBadge: 'In Theaters • Waiting 1080p',
                    category: 'in_theaters'
                };
            }
        }));
        const readyMovies = checkedRecent.filter((m)=>m.category === 'ready');
        const inTheatersMovies = checkedRecent.filter((m)=>m.category === 'in_theaters');
        const upcomingMovies = resolvedUpcoming.map((m)=>({
                ...m,
                isReady: false,
                qualityBadge: 'Coming Soon • In Theaters',
                category: 'upcoming'
            }));
        // Assemble balanced mix (aim for 2 ready, 2 in-theaters, 2 upcoming)
        const targetPerBucket = Math.max(1, Math.floor(limit / 3));
        const mixed = [];
        const readySlice = readyMovies.slice(0, targetPerBucket);
        const inTheatersSlice = inTheatersMovies.slice(0, targetPerBucket);
        const upcomingSlice = upcomingMovies.slice(0, targetPerBucket);
        for(let i = 0; i < targetPerBucket; i++){
            if (readySlice[i]) mixed.push(readySlice[i]);
            if (inTheatersSlice[i]) mixed.push(inTheatersSlice[i]);
            if (upcomingSlice[i]) mixed.push(upcomingSlice[i]);
        }
        // If total is less than limit, backfill with remaining candidates
        if (mixed.length < limit) {
            const addedIds = new Set(mixed.map((m)=>m.id));
            const remainingPool = [
                ...readyMovies.slice(targetPerBucket),
                ...inTheatersMovies.slice(targetPerBucket),
                ...upcomingMovies.slice(targetPerBucket)
            ];
            for (const candidate of remainingPool){
                if (mixed.length >= limit) break;
                if (!addedIds.has(candidate.id)) {
                    mixed.push(candidate);
                    addedIds.add(candidate.id);
                }
            }
        }
        return mixed.slice(0, limit);
    } finally{
        if (timeout) clearTimeout(timeout);
    }
}
/**
 * Fallback to Cinemeta when TMDB is unavailable, categorizing movies into the same 3 buckets.
 */ async function fetchFromCinemeta(limit) {
    const controller = new AbortController();
    let timeout = null;
    try {
        timeout = setTimeout(()=>controller.abort(), 8000);
        if (timeout && typeof timeout.unref === 'function') {
            timeout.unref();
        }
        const res = await fetch('https://v3-cinemeta.strem.io/catalog/movie/top.json', {
            signal: controller.signal
        });
        if (!res.ok) return [];
        const data = await res.json();
        const metas = (data.metas || []).slice(0, limit + 4);
        const checked = await Promise.all(metas.map(async (m)=>{
            const movie = {
                id: m.id,
                name: m.name,
                year: m.releaseInfo || m.year || '',
                poster: m.poster || '',
                banner: m.background || m.banner || '',
                genres: m.genres || [],
                description: m.description || '',
                imdbRating: m.imdbRating || 'N/A',
                qualityBadge: 'Checking...',
                isReady: false
            };
            try {
                const quality = await (0, _qualityChecker.checkMovieQuality)(movie.id, 'movie', movie.name, movie.year);
                const isReady = Boolean(quality.has1080pPlus || quality.isReady);
                let qualityBadge = quality.bestQuality || 'Coming Soon';
                let category = 'in_theaters';
                if (isReady && quality.bestQuality && quality.bestQuality !== 'Unreleased' && quality.bestQuality !== 'Check Error') {
                    qualityBadge = quality.bestQuality;
                    category = 'ready';
                } else if (quality.isCamOnly) {
                    qualityBadge = 'CAM Only • In Theaters';
                    category = 'in_theaters';
                } else if (quality.isUnreleased || quality.streamCount === 0) {
                    qualityBadge = 'Coming Soon • Unreleased';
                    category = 'upcoming';
                }
                return {
                    ...movie,
                    isReady,
                    qualityBadge,
                    category
                };
            } catch  {
                return movie;
            }
        }));
        const ready = checked.filter((m)=>m.category === 'ready');
        const inTheaters = checked.filter((m)=>m.category === 'in_theaters');
        const upcoming = checked.filter((m)=>m.category === 'upcoming');
        const result = [];
        for(let i = 0; i < Math.max(ready.length, inTheaters.length, upcoming.length); i++){
            if (ready[i] && result.length < limit) result.push(ready[i]);
            if (inTheaters[i] && result.length < limit) result.push(inTheaters[i]);
            if (upcoming[i] && result.length < limit) result.push(upcoming[i]);
        }
        return result.slice(0, limit);
    } finally{
        if (timeout) clearTimeout(timeout);
    }
}
