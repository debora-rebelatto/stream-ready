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
    get checkMovieQuality () {
        return checkMovieQuality;
    },
    get default () {
        return _default;
    },
    get getStreamSizeBytes () {
        return getStreamSizeBytes;
    },
    get hasCleanSource () {
        return hasCleanSource;
    },
    get isCamStream () {
        return isCamStream;
    },
    get isStreamMatchingTitle () {
        return isStreamMatchingTitle;
    },
    get parseStreams () {
        return parseStreams;
    },
    get qualityCheckerService () {
        return qualityCheckerService;
    }
});
const _cinemeta = require("./cinemeta");
function isCamStream(text) {
    // Theater video patterns (CAM, Telesync, Telecine, Screener, Workprint, HDCINE, cleanup tags)
    const camVideo = /\b(cam|camrip|cam-rip|hdcam|hd-cam|telesync|ts|hdts|hd-ts|tsrip|telecine|tc|hdtc|screener|scr|dvdscr|dvd-scr|bdscr|workprint|wp|predvd|pdvd|cinema|theater|theatre|gravacao|gravado|gravada|hdcine|hd-cine|cinemahd|hq[-._]?noads|noads[-._]?nologo|noads|nologo|mtrx)\b/i;
    // Theater / mic audio patterns (e.g. AUDIONEW, NEW AUDIO, LINE AUDIO, HQMIC, LINE DUB, MIC DUB)
    const camAudio = /\b(audionew|audio-new|audio\.new|newaudio|new-audio|new\.audio|cleanaudio|clean-audio|clean\.audio|lineaudio|line-audio|line\.audio|linesound|line-sound|hqmic|hq-mic|mic-audio|mic\.audio|line[-._ ]?dub(bed)?|mic[-._ ]?dub(bed)?)\b/i;
    // Line-dubbed / mic-dubbed audio codes (e.g. LD-AAC, MD-AAC, LD.5.1, MD5.1)
    const camLd = /\b(ld|md)[-._]?(aac|ac3|mp3|dts|ddp|dd|5\.1|2\.0)\b/i;
    // Hardcoded CAM subtitles
    const camSub = /\b(korsub|hcsub|hc-sub)\b/i;
    return camVideo.test(text) || camAudio.test(text) || camLd.test(text) || camSub.test(text);
}
function hasCleanSource(text) {
    // Official digital and physical formats
    const cleanFormat = /\b(web-dl|webdl|web\.dl|web-rip|webrip|web\.rip|bluray|blu-ray|bdrip|bd-rip|brrip|br-rip|hdtv|hdtvrip|dvdrip|dvd-rip|vodrip|voddler|remux)\b/i;
    // Official streaming platforms
    const streamingPlatform = /\b(amzn|amazon|netflix|atvp|appletv|dsnp|disney|hmax|hbomax|peacock|paramount|itunes|hulu|bcore)\b/i;
    // Multichannel digital audio patterns
    const cleanAudio = /\b(ddp5\.1|ddp5|dd5\.1|dd5|eac3|truehd|atmos|dts-hd|dts-x|flac|aac2\.0|ac3)\b/i;
    // Resolutions combined with clean encode specifications
    const cleanVideoSpec = /\b(2160p|uhd|4k|1080p|1080i|720p)\b/i.test(text) && /\b(x264|x265|h264|h265|hevc|av1|10bit|hdr|dovi|hdr10|hdr10\+)\b/i.test(text);
    return cleanFormat.test(text) || streamingPlatform.test(text) || cleanAudio.test(text) || cleanVideoSpec;
}
function isStreamMatchingTitle(streamText, movieName) {
    if (!movieName || movieName.trim().length === 0) return true;
    const cleanName = movieName.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const stopWords = new Set([
        'the',
        'a',
        'an',
        'and',
        'or',
        'of',
        'in',
        'on',
        'at',
        'to',
        'for',
        'with',
        'by',
        'from',
        'o',
        'a',
        'os',
        'as',
        'de',
        'do',
        'da',
        'em',
        'um',
        'uma',
        'e',
        'ou'
    ]);
    const words = cleanName.split(' ').filter((w)=>w.length >= 2 && !stopWords.has(w));
    if (words.length === 0) {
        const rawClean = movieName.toLowerCase().replace(/[^\w]/g, '');
        const targetClean = streamText.toLowerCase().replace(/[^\w]/g, '');
        return targetClean.includes(rawClean);
    }
    const cleanStream = streamText.toLowerCase().replace(/[^\w\s]/g, ' ');
    let matchedWords = 0;
    for (const word of words){
        if (cleanStream.includes(word)) {
            matchedWords++;
        }
    }
    const requiredMatches = words.length <= 2 ? 1 : Math.ceil(words.length * 0.4);
    return matchedWords >= requiredMatches;
}
/**
 * Helper to extract seed count from Torrentio stream title if present
 */ function getStreamSeedCount(title) {
    const match = title.match(/👤\s*(\d+)/);
    return match ? parseInt(match[1], 10) : null;
}
function getStreamSizeBytes(title) {
    const match = title.match(/💾\s*([\d.]+)\s*(GB|MB|KB)/i);
    if (!match) return null;
    const num = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === 'GB') return num * 1024 * 1024 * 1024;
    if (unit === 'MB') return num * 1024 * 1024;
    if (unit === 'KB') return num * 1024;
    return null;
}
function parseStreams(streams, movieName) {
    if (!streams || !Array.isArray(streams) || streams.length === 0) {
        return {
            has1080pPlus: false,
            isReady: false,
            isCamOnly: false,
            isUnreleased: true,
            bestQuality: 'Unreleased',
            streamCount: 0,
            cleanStreamCount: 0,
            count1080pPlus: 0,
            checkedAt: new Date().toISOString()
        };
    }
    let has4k = false;
    let has1080 = false;
    let has720 = false;
    let hasCleanOther = false;
    let hasCam = false;
    let camStreamCount = 0;
    let cleanStreamCount = 0;
    let maxCleanSeeds = null;
    for (const stream of streams){
        const streamName = stream.name || '';
        const streamTitle = stream.title || '';
        const bingeGroup = stream.behaviorHints?.bingeGroup || '';
        const filename = stream.behaviorHints?.filename || '';
        const fullText = `${streamName} ${streamTitle} ${bingeGroup} ${filename}`.toLowerCase();
        // 1. Verify stream corresponds to this movie if movieName is known
        if (movieName && !isStreamMatchingTitle(fullText, movieName)) {
            continue;
        }
        const isCam = isCamStream(fullText);
        // Reject fake / impossible file sizes (e.g. 1080p/4K WEB-DL or BluRay claiming < 1.2 GB)
        const sizeBytes = getStreamSizeBytes(streamTitle);
        const isSuspiciousSize = sizeBytes !== null && sizeBytes < 1.2 * 1024 * 1024 * 1024 && /\b(1080p|2160p|4k|uhd)\b/i.test(fullText) && /\b(web-dl|webdl|bluray|blu-ray|remux|amzn|netflix|disney)\b/i.test(fullText);
        const isClean = !isCam && !isSuspiciousSize && hasCleanSource(fullText);
        if (isCam) {
            hasCam = true;
            camStreamCount++;
            continue;
        }
        if (isClean) {
            const seeds = getStreamSeedCount(streamTitle);
            if (seeds !== null) {
                if (maxCleanSeeds === null || seeds > maxCleanSeeds) {
                    maxCleanSeeds = seeds;
                }
            }
            cleanStreamCount++;
            if (/2160p|4k\b|uhd/i.test(fullText)) {
                has4k = true;
            } else if (/1080p|fhd|1080i/i.test(fullText)) {
                has1080 = true;
            } else if (/720p|hd\b/i.test(fullText)) {
                has720 = true;
            } else {
                hasCleanOther = true;
            }
        } else {
            hasCam = true;
            camStreamCount++;
        }
    }
    // If CAM dominates and there is only 1 isolated clean stream with low seeds,
    // or CAM streams flood the release (e.g. 3+ CAM streams and clean stream has <= 10 seeds),
    // treat as unconfirmed / poisoned torrent
    const isIsolatedSuspiciousClean = cleanStreamCount === 1 && (maxCleanSeeds !== null && maxCleanSeeds <= 8 || camStreamCount >= 3 && (maxCleanSeeds === null || maxCleanSeeds <= 10));
    if (hasCam && isIsolatedSuspiciousClean) {
        cleanStreamCount = 0;
        has4k = false;
        has1080 = false;
        has720 = false;
        hasCleanOther = false;
    }
    // Movie is READY when it has at least one confirmed good quality source
    const isReady = cleanStreamCount > 0;
    let bestQuality = 'Unreleased';
    if (has4k) {
        bestQuality = '4K UHD';
    } else if (has1080) {
        bestQuality = '1080p FHD';
    } else if (has720) {
        bestQuality = '720p HD';
    } else if (hasCleanOther) {
        bestQuality = 'Digital (WEB/SD)';
    } else if (hasCam) {
        bestQuality = 'CAM / Theater Rip';
    }
    return {
        has1080pPlus: isReady,
        isReady,
        isCamOnly: !isReady && hasCam,
        bestQuality,
        streamCount: streams.length,
        cleanStreamCount,
        count1080pPlus: cleanStreamCount,
        checkedAt: new Date().toISOString()
    };
}
async function checkMovieQuality(imdbId, type = 'movie', movieName) {
    const baseUrl = (process.env.TORRENTIO_URL || 'https://torrentio.strem.fun').replace(/\/+$/, '');
    if (!movieName) {
        try {
            const meta = await (0, _cinemeta.getMeta)(type, imdbId);
            if (meta && meta.name) {
                movieName = meta.name;
            }
        } catch  {}
    }
    // Stremio stream URL format: {baseUrl}/stream/{type}/{id}.json
    const url = `${baseUrl}/stream/${type}/${imdbId}.json`;
    let timeout;
    try {
        const controller = new AbortController();
        timeout = setTimeout(()=>controller.abort(), 12000);
        const res = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StremioWatchlist/1.0',
                'Accept': 'application/json'
            }
        });
        if (!res.ok) {
            if (res.status === 404) {
                return {
                    has1080pPlus: false,
                    isReady: false,
                    isCamOnly: false,
                    isUnreleased: true,
                    bestQuality: 'Unreleased',
                    streamCount: 0,
                    cleanStreamCount: 0,
                    count1080pPlus: 0,
                    checkedAt: new Date().toISOString()
                };
            }
            throw new Error(`Torrentio responded with status ${res.status}`);
        }
        const data = await res.json();
        return parseStreams(data.streams || [], movieName);
    } catch (err) {
        console.warn(`[QualityChecker] Warning checking ${imdbId}:`, err.message);
        return {
            error: err.message,
            has1080pPlus: false,
            isReady: false,
            isCamOnly: false,
            bestQuality: 'Check Error',
            streamCount: 0,
            cleanStreamCount: 0,
            count1080pPlus: 0,
            checkedAt: new Date().toISOString()
        };
    } finally{
        if (timeout) clearTimeout(timeout);
    }
}
const qualityCheckerService = {
    isCamStream,
    hasCleanSource,
    parseStreams,
    checkMovieQuality
};
const _default = qualityCheckerService;
