const { getSettings } = require('./db');

/**
 * 1. Theater rip / camcorder video and audio patterns (CAM / TS / Screener)
 */
function isCamStream(text) {
  // Theater video patterns (CAM, Telesync, Telecine, Screener, Workprint)
  const camVideo = /\b(cam|camrip|cam-rip|hdcam|hd-cam|telesync|ts|hdts|hd-ts|tsrip|telecine|tc|hdtc|screener|scr|dvdscr|dvd-scr|bdscr|workprint|wp|predvd|pdvd)\b/i;
  // Theater / mic audio patterns (e.g. AUDIONEW, NEW AUDIO, LINE AUDIO, HQMIC)
  const camAudio = /\b(audionew|audio-new|audio\.new|newaudio|new-audio|new\.audio|cleanaudio|clean-audio|clean\.audio|lineaudio|line-audio|line\.audio|linesound|line-sound|hqmic|hq-mic|mic-audio|mic\.audio)\b/i;
  // Hardcoded CAM subtitles
  const camSub = /\b(korsub|hcsub|hc-sub)\b/i;

  return camVideo.test(text) || camAudio.test(text) || camSub.test(text);
}

/**
 * 2. Confirmed good quality digital / physical / streaming source patterns
 */
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

/**
 * Analyzes streams returned by the provider (e.g. Torrentio)
 * to identify whether the movie already has a confirmed good quality release.
 */
function parseStreams(streams) {
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
  let cleanStreamCount = 0;

  for (const stream of streams) {
    const streamName = stream.name || '';
    const streamTitle = stream.title || '';
    const bingeGroup = stream.behaviorHints?.bingeGroup || '';
    const filename = stream.behaviorHints?.filename || '';

    const fullText = `${streamName} ${streamTitle} ${bingeGroup} ${filename}`.toLowerCase();

    const isCam = isCamStream(fullText);
    const isClean = !isCam && hasCleanSource(fullText);

    if (isCam) {
      hasCam = true;
      continue;
    }

    if (isClean) {
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
    }
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

/**
 * Queries Torrentio to check streams for a movie by IMDb ID.
 */
async function checkMovieQuality(imdbId, type = 'movie') {
  const baseUrl = (process.env.TORRENTIO_URL || 'https://torrentio.strem.fun').replace(/\/+$/, '');
  
  // Stremio stream URL format: {baseUrl}/stream/{type}/{id}.json
  const url = `${baseUrl}/stream/${type}/${imdbId}.json`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) StremioWatchlist/1.0',
        'Accept': 'application/json'
      }
    });

    clearTimeout(timeout);

    if (!res.ok) {
      if (res.status === 404) {
        return {
          has1080pPlus: false,
          isUnreleased: true,
          bestQuality: 'Unreleased',
          streamCount: 0,
          count1080pPlus: 0,
          checkedAt: new Date().toISOString()
        };
      }
      throw new Error(`Torrentio responded with status ${res.status}`);
    }

    const data = await res.json();
    return parseStreams(data.streams || []);
  } catch (err) {
    console.warn(`[QualityChecker] Warning checking ${imdbId}:`, err.message);
    return {
      error: err.message,
      has1080pPlus: false,
      bestQuality: 'Check Error',
      streamCount: 0,
      count1080pPlus: 0,
      checkedAt: new Date().toISOString()
    };
  }
}

module.exports = {
  checkMovieQuality,
  parseStreams
};
