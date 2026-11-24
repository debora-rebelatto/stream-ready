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
    get balanceMovieBuckets () {
        return balanceMovieBuckets;
    },
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
const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours for TMDB
const FALLBACK_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes for Cinemeta fallback
/**
 * Curated upcoming unreleased movies used as a last-resort backfill when
 * upstream catalogs (e.g. Cinemeta top) return only already-released titles.
 */ const CURATED_UPCOMING_FALLBACK = [
    {
        id: 'tt21357150',
        name: 'Avengers: Doomsday',
        year: '2026',
        releaseDate: '2026-12-18',
        poster: 'https://images.metahub.space/poster/medium/tt21357150/img.jpg',
        banner: 'https://images.metahub.space/background/medium/tt21357150/img.jpg',
        genres: [
            'Action',
            'Adventure',
            'Sci-Fi'
        ],
        imdbRating: 'Upcoming',
        qualityBadge: 'Coming Soon • Dec 2026',
        isReady: false,
        category: 'upcoming',
        description: 'Earth’s Mightiest Heroes reunite to face Doctor Doom in a multiversal threat that will reshape the Marvel Cinematic Universe.'
    },
    {
        id: 'tt31378509',
        name: 'Dune: Part Three',
        year: '2026',
        releaseDate: '2026-12-18',
        poster: 'https://images.metahub.space/poster/medium/tt31378509/img.jpg',
        banner: 'https://images.metahub.space/background/medium/tt31378509/img.jpg',
        genres: [
            'Sci-Fi',
            'Adventure',
            'Drama'
        ],
        imdbRating: 'Upcoming',
        qualityBadge: 'Coming Soon • Dec 2026',
        isReady: false,
        category: 'upcoming',
        description: 'Paul Atreides confronts the devastating consequences of his jihad across the known universe in Denis Villeneuve’s conclusion to the Dune trilogy.'
    },
    {
        id: 'tt34384661',
        name: 'Godzilla Minus Zero',
        year: '2026',
        releaseDate: '2026-12-31',
        poster: 'https://images.metahub.space/poster/medium/tt34384661/img.jpg',
        banner: 'https://images.metahub.space/background/medium/tt34384661/img.jpg',
        genres: [
            'Action',
            'Adventure',
            'Drama'
        ],
        imdbRating: 'Upcoming',
        qualityBadge: 'Coming Soon • Unreleased',
        isReady: false,
        category: 'upcoming',
        description: "Direct continuation of Takashi Yamazaki's Godzilla saga, following postwar Japan as a cataclysmic atomic menace reemerges from the ocean depths."
    }
];
function clearTrendingCache() {
    cachedTrending = null;
}
function formatUpcomingBadge(releaseDate) {
    if (!releaseDate) return 'Coming Soon • Unreleased';
    const parsed = new Date(`${releaseDate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return 'Coming Soon • Unreleased';
    const month = parsed.toLocaleString('en-US', {
        month: 'short',
        timeZone: 'UTC'
    });
    const year = parsed.getUTCFullYear();
    return `Coming Soon • ${month} ${year}`;
}
function getActiveUpcomingFallback(nowMs = Date.now()) {
    const todayStr = new Date(nowMs).toISOString().slice(0, 10);
    return CURATED_UPCOMING_FALLBACK.filter((movie)=>!movie.releaseDate || movie.releaseDate >= todayStr);
}
function balanceMovieBuckets(readyMovies, inTheatersMovies, upcomingMovies, limit) {
    const targetPerBucket = Math.max(1, Math.floor(limit / 3));
    const mixed = [];
    const addedIds = new Set();
    const pushUnique = (movie)=>{
        if (!movie || !movie.id || addedIds.has(movie.id) || mixed.length >= limit) {
            return false;
        }
        mixed.push(movie);
        addedIds.add(movie.id);
        return true;
    };
    const uniqueReady = readyMovies.filter((m, idx, arr)=>arr.findIndex((x)=>x.id === m.id) === idx);
    const uniqueInTheaters = inTheatersMovies.filter((m, idx, arr)=>arr.findIndex((x)=>x.id === m.id) === idx);
    const uniqueUpcoming = upcomingMovies.filter((m, idx, arr)=>arr.findIndex((x)=>x.id === m.id) === idx);
    for(let i = 0; i < targetPerBucket; i++){
        pushUnique(uniqueReady[i]);
        pushUnique(uniqueInTheaters[i]);
        pushUnique(uniqueUpcoming[i]);
    }
    // Backfill any remaining slots while preferring upcoming & in-theaters first
    // so unreleased options are never crowded out when one bucket was short.
    if (mixed.length < limit) {
        const remainingPool = [
            ...uniqueUpcoming.slice(targetPerBucket),
            ...uniqueInTheaters.slice(targetPerBucket),
            ...uniqueReady.slice(targetPerBucket)
        ];
        for (const candidate of remainingPool){
            if (mixed.length >= limit) break;
            pushUnique(candidate);
        }
    }
    return mixed.slice(0, limit);
}
async function getTrendingMovies(limit = 9) {
    const now = Date.now();
    if (cachedTrending && now - cachedTrending.timestamp < cachedTrending.ttlMs) {
        return cachedTrending.data.slice(0, limit);
    }
    const apiKey = process.env.TMDB_API_KEY || process.env.VITE_TMDB_API_KEY;
    if (apiKey) {
        try {
            const mixed = await fetchMixedFromTmdb(apiKey, limit);
            if (mixed && mixed.length > 0) {
                cachedTrending = {
                    data: mixed,
                    timestamp: now,
                    ttlMs: CACHE_TTL_MS
                };
                return mixed.slice(0, limit);
            }
        } catch (err) {
            console.warn('[TMDB] Error fetching curated mixed movies:', err.message);
        }
    }
    // Fallback to Cinemeta Catalogs (Current Year + Top Popular)
    try {
        const fallback = await fetchFromCinemeta(limit);
        if (fallback && fallback.length > 0) {
            cachedTrending = {
                data: fallback,
                timestamp: now,
                ttlMs: FALLBACK_CACHE_TTL_MS
            };
            return fallback.slice(0, limit);
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
        const tomorrowStr = new Date(now + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const threeMonthsAgoStr = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        // 1. Fetch upcoming unreleased movies (release date >= tomorrow to avoid overlap with today)
        const upcomingUrl = `https://api.themoviedb.org/3/discover/movie?api_key=${encodeURIComponent(apiKey)}&primary_release_date.gte=${tomorrowStr}&sort_by=popularity.desc&language=en-US`;
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
        const preferWithBackdrop = (items)=>[
                ...items
            ].sort((a, b)=>Number(Boolean(b.backdrop_path)) - Number(Boolean(a.backdrop_path)));
        const rawUpcoming = preferWithBackdrop(upcomingRes.results || []).slice(0, 8);
        const rawRecent = preferWithBackdrop(recentRes.results || []).slice(0, 12);
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
                qualityBadge: formatUpcomingBadge(m.releaseDate),
                category: 'upcoming'
            }));
        // If TMDB returned zero movies (e.g. network error or invalid key), let caller fall back
        if (readyMovies.length === 0 && inTheatersMovies.length === 0 && upcomingMovies.length === 0) {
            return [];
        }
        // Ensure upcoming bucket is populated when requesting a multi-item carousel (limit >= 3)
        const targetPerBucket = Math.max(1, Math.floor(limit / 3));
        if (limit >= 3 && upcomingMovies.length < targetPerBucket) {
            const existingIds = new Set([
                ...readyMovies.map((m)=>m.id),
                ...inTheatersMovies.map((m)=>m.id),
                ...upcomingMovies.map((m)=>m.id)
            ]);
            for (const fallbackMovie of getActiveUpcomingFallback(now)){
                if (upcomingMovies.length >= targetPerBucket) break;
                if (!existingIds.has(fallbackMovie.id)) {
                    upcomingMovies.push(fallbackMovie);
                    existingIds.add(fallbackMovie.id);
                }
            }
        }
        return balanceMovieBuckets(readyMovies, inTheatersMovies, upcomingMovies, limit);
    } finally{
        if (timeout) clearTimeout(timeout);
    }
}
/**
 * Fallback to Cinemeta when TMDB is unavailable.
 * Fetches both the Popular catalog and the current-year New catalog so the hero
 * stays balanced across Ready (1080p/4K), In Theaters (CAM), and Upcoming (Unreleased).
 */ async function fetchFromCinemeta(limit) {
    const controller = new AbortController();
    let timeout = null;
    try {
        timeout = setTimeout(()=>controller.abort(), 10000);
        if (timeout && typeof timeout.unref === 'function') {
            timeout.unref();
        }
        const currentYear = new Date().getUTCFullYear();
        const topUrl = 'https://v3-cinemeta.strem.io/catalog/movie/top.json';
        const yearUrl = `https://v3-cinemeta.strem.io/catalog/movie/year/genre=${currentYear}.json`;
        const safeFetchCatalog = async (url)=>{
            try {
                const res = await fetch(url, {
                    signal: controller.signal
                });
                if (!res || !res.ok) return {
                    metas: []
                };
                return await res.json();
            } catch  {
                return {
                    metas: []
                };
            }
        };
        const [topData, yearData] = await Promise.all([
            safeFetchCatalog(topUrl),
            safeFetchCatalog(yearUrl)
        ]);
        const yearMetas = (yearData?.metas || []).filter((m)=>{
            const parsedYear = parseInt(String(m.releaseInfo || m.year || ''), 10);
            return !Number.isNaN(parsedYear) && parsedYear >= currentYear;
        });
        const topMetas = topData?.metas || [];
        // Combine current-year movies (contains unreleased & in-theaters titles) with popular hits
        const combinedMetas = [];
        const seenMetaIds = new Set();
        const addMetas = (list, maxCount)=>{
            let added = 0;
            for (const m of list){
                if (added >= maxCount) break;
                if (!m?.id || seenMetaIds.has(m.id)) continue;
                seenMetaIds.add(m.id);
                combinedMetas.push(m);
                added++;
            }
        };
        const yearQuota = limit >= 3 ? Math.max(8, limit) : limit;
        const topQuota = limit >= 3 ? Math.max(6, Math.ceil(limit / 2)) : limit;
        addMetas(yearMetas, yearQuota);
        addMetas(topMetas, topQuota);
        if (combinedMetas.length === 0) {
            return [];
        }
        const checked = await Promise.all(combinedMetas.map(async (m)=>{
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
                } else if (quality.isUnreleased || quality.bestQuality === 'Unreleased' || quality.streamCount === 0) {
                    qualityBadge = 'Coming Soon • Unreleased';
                    category = 'upcoming';
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
                return movie;
            }
        }));
        const ready = checked.filter((m)=>m.category === 'ready');
        const inTheaters = checked.filter((m)=>m.category === 'in_theaters');
        const upcoming = checked.filter((m)=>m.category === 'upcoming');
        // Guarantee unreleased upcoming movies in multi-item hero carousels
        const targetPerBucket = Math.max(1, Math.floor(limit / 3));
        if (limit >= 3 && upcoming.length < targetPerBucket) {
            const existingIds = new Set(checked.map((m)=>m.id));
            for (const fallbackMovie of getActiveUpcomingFallback()){
                if (upcoming.length >= targetPerBucket) break;
                if (!existingIds.has(fallbackMovie.id)) {
                    upcoming.push(fallbackMovie);
                    existingIds.add(fallbackMovie.id);
                }
            }
        }
        return balanceMovieBuckets(ready, inTheaters, upcoming, limit);
    } finally{
        if (timeout) clearTimeout(timeout);
    }
}
