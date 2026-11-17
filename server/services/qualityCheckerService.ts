import type { StreamItem, ParsedStreams, QualityCheckResult } from '../types';
import { getMeta } from './cinemetaService.ts';

/**
 * 1. Theater rip / camcorder video and audio patterns (CAM / TS / Screener)
 */
export function isCamStream(text: string): boolean {
  // Theater video patterns (CAM, Telesync, Telecine, Screener, Workprint, HDCINE, cleanup tags)
  const camVideo = /\b(cam|camrip|cam-rip|hdcam|hd-cam|cam-hd|telesync|ts|hdts|hd-ts|tsrip|telecine|tc|hdtc|screener|scr|dvdscr|dvd-scr|bdscr|tscr|hdtscr|hd-tscr|telescreener|workprint|wp|predvd|pdvd|cinema|theater|theatre|gravacao|gravado|gravada|hdcine|hd-cine|cinemahd|hq[-._]?noads|noads[-._]?nologo|noads|nologo|mtrx)\b/i;
  // Theater / mic audio patterns (e.g. AUDIONEW, NEW AUDIO, LINE AUDIO, HQMIC, LINE DUB, MIC DUB)
  const camAudio = /\b(audionew|audio-new|audio\.new|newaudio|new-audio|new\.audio|cleanaudio|clean-audio|clean\.audio|lineaudio|line-audio|line\.audio|linesound|line-sound|hqmic|hq-mic|mic-audio|mic\.audio|line[-._ ]?dub(bed)?|mic[-._ ]?dub(bed)?)\b/i;
  // Line-dubbed / mic-dubbed audio codes (e.g. LD-AAC, MD-AAC, LD.5.1, MD5.1)
  const camLd = /\b(ld|md)[-._]?(aac|ac3|mp3|dts|ddp|dd|5\.1|2\.0)\b/i;
  // Hardcoded CAM subtitles
  const camSub = /\b(korsub|hcsub|hc-sub)\b/i;

  return camVideo.test(text) || camAudio.test(text) || camLd.test(text) || camSub.test(text);
}

/**
 * 2. Confirmed good quality digital / physical / streaming source patterns
 */
export function hasCleanSource(text: string): boolean {
  // Official digital and physical formats
  const cleanFormat = /\b(web|web-dl|webdl|web\.dl|web-rip|webrip|web\.rip|bluray|blu-ray|bdrip|bd-rip|brrip|br-rip|hdtv|hdtvrip|dvdrip|dvd-rip|vodrip|voddler|remux)\b/i;
  // Official streaming platforms
  const streamingPlatform = /\b(amzn|amazon|netflix|nf|atvp|appletv|apple-tv|dsnp|disney|disney\+|hmax|hbomax|max|peacock|pcok|paramount|pmtp|paramount\+|itunes|hulu|bcore|braviacore)\b/i;
  // Multichannel digital audio patterns (excluding plain stereo ac3/aac/mp3 which CAMs frequently use)
  const cleanAudio = /\b(ddp5\.1|ddp5|dd5\.1|dd5|eac3|truehd|atmos|dts-hd|dts-x|flac)\b/i;
  // Official HDR specifications on UHD/4K releases
  const cleanHDR = /\b(2160p|uhd|4k)\b/i.test(text) && /\b(dovi|dv\b|hdr10\+|hdr10|dolby[-._ ]?vision)\b/i.test(text);

  return cleanFormat.test(text) || streamingPlatform.test(text) || cleanAudio.test(text) || cleanHDR;
}

/**
 * Verifies if a stream filename or title actually corresponds to the movie name.
 * Prevents completely unrelated / poisoned torrents from triggering false positive "Ready" statuses.
 */
export function isStreamMatchingTitle(streamText: string, movieName?: string): boolean {
  if (!movieName || movieName.trim().length === 0) return true;

  const cleanName = movieName.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'from',
    'o', 'a', 'os', 'as', 'de', 'do', 'da', 'em', 'um', 'uma', 'e', 'ou'
  ]);

  const words = cleanName.split(' ')
    .filter(w => w.length >= 2 && !stopWords.has(w));

  if (words.length === 0) {
    const rawClean = movieName.toLowerCase().replace(/[^\w]/g, '');
    const targetClean = streamText.toLowerCase().replace(/[^\w]/g, '');
    return targetClean.includes(rawClean);
  }

  const cleanStream = streamText.toLowerCase().replace(/[^\w\s]/g, ' ');
  let matchedWords = 0;
  for (const word of words) {
    if (cleanStream.includes(word)) {
      matchedWords++;
    }
  }

  const requiredMatches = words.length <= 2 ? 1 : Math.ceil(words.length * 0.4);
  return matchedWords >= requiredMatches;
}

/**
 * Helper to extract 4-digit release years from stream text (excluding resolution numbers like 1080p, 2160p)
 */
export function extractStreamYears(text: string): number[] {
  const matches = text.match(/\b(19\d{2}|20\d{2})\b(?![pi])/gi);
  if (!matches) return [];
  return matches.map(m => parseInt(m, 10));
}

/**
 * Verifies if a stream release year corresponds to the target movie release year.
 * Prevents old movies with the same name (or spoofed old torrents) from triggering false positive "Ready" statuses on new movies.
 */
export function isStreamMatchingYear(streamText: string, movieYear?: string | number): boolean {
  if (!movieYear) return true;
  const targetYear = parseInt(String(movieYear).match(/\d{4}/)?.[0] || '0', 10);
  if (!targetYear || targetYear < 1900) return true;

  const streamYears = extractStreamYears(streamText);
  if (streamYears.length === 0) return true; // No year specified in stream name

  // Check if at least one year in the stream title is within +/- 1 year of the movie release year
  return streamYears.some(y => Math.abs(y - targetYear) <= 1);
}

/**
 * Helper to extract seed count from Torrentio stream title if present
 */
function getStreamSeedCount(title: string): number | null {
  const match = title.match(/👤\s*(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Helper to extract file size in bytes from Torrentio stream title if present (e.g. "💾 1.61 GB", "💾 700 MB")
 */
export function getStreamSizeBytes(title: string): number | null {
  const match = title.match(/💾\s*([\d.]+)\s*(GB|MB|KB)/i);
  if (!match) return null;
  const num = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  if (unit === 'GB') return num * 1024 * 1024 * 1024;
  if (unit === 'MB') return num * 1024 * 1024;
  if (unit === 'KB') return num * 1024;
  return null;
}

/**
 * Analyzes streams returned by the provider (e.g. Torrentio)
 * to identify whether the movie already has a confirmed good quality release.
 */
export function parseStreams(
  streams: StreamItem[],
  movieName?: string,
  movieYear?: string | number
): ParsedStreams {
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
  let maxCleanSeeds: number | null = null;

  for (const stream of streams) {
    const streamName = stream.name || '';
    const streamTitle = stream.title || '';
    const bingeGroup = stream.behaviorHints?.bingeGroup || '';
    const filename = stream.behaviorHints?.filename || '';

    const fullText = `${streamName} ${streamTitle} ${bingeGroup} ${filename}`.toLowerCase();

    // 1. Verify stream corresponds to this movie if movieName is known
    if (movieName && !isStreamMatchingTitle(fullText, movieName)) {
      continue;
    }

    // 2. Verify stream release year matches target movie year if movieYear is known
    if (movieYear && !isStreamMatchingYear(fullText, movieYear)) {
      continue;
    }

    const isCam = isCamStream(fullText);

    // Reject fake / impossible file sizes (e.g. 4K claiming < 2.5 GB, or 1080p claiming < 750 MB)
    const sizeBytes = getStreamSizeBytes(streamTitle);
    const isSuspicious4k = sizeBytes !== null && sizeBytes < 2.5 * 1024 * 1024 * 1024 &&
      /\b(2160p|4k|uhd)\b/i.test(fullText);
    const isSuspicious1080p = sizeBytes !== null && sizeBytes < 750 * 1024 * 1024 &&
      /\b(1080p|fhd)\b/i.test(fullText);
    const isSuspiciousSize = isSuspicious4k || isSuspicious1080p;

    const seeds = getStreamSeedCount(streamTitle);
    const isDeadStream = seeds !== null && seeds === 0;

    const isClean = !isCam && !isSuspiciousSize && !isDeadStream && hasCleanSource(fullText);

    if (isCam) {
      hasCam = true;
      camStreamCount++;
      continue;
    }

    if (isClean) {
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

  // If CAM dominates and there are only 1-2 clean streams with low seeds,
  // or CAM streams flood the release (e.g. 3+ CAM streams and clean stream has <= 15 seeds),
  // treat as unconfirmed / poisoned torrent
  const isIsolatedSuspiciousClean = (
    (cleanStreamCount <= 2 && maxCleanSeeds !== null && maxCleanSeeds <= 8) ||
    (camStreamCount >= 3 && cleanStreamCount <= 2 && (maxCleanSeeds === null || maxCleanSeeds <= 15))
  );

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

/**
 * Queries Torrentio to check streams for a movie by IMDb ID.
 */
export async function checkMovieQuality(
  imdbId: string,
  type: string = 'movie',
  movieName?: string,
  movieYear?: string | number
): Promise<QualityCheckResult> {
  const baseUrl = (process.env.TORRENTIO_URL || 'https://torrentio.strem.fun').replace(/\/+$/, '');
  
  if (!movieName || !movieYear) {
    try {
      const meta = await getMeta(type, imdbId);
      if (meta) {
        if (!movieName && meta.name) {
          movieName = meta.name;
        }
        if (!movieYear && meta.year) {
          movieYear = meta.year;
        }
      }
    } catch {}
  }

  // Stremio stream URL format: {baseUrl}/stream/{type}/{id}.json
  const url = `${baseUrl}/stream/${type}/${imdbId}.json`;

  let timeout: NodeJS.Timeout | undefined;
  try {
    const controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), 12000);

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

    const data: any = await res.json();
    return parseStreams(data.streams || [], movieName, movieYear);
  } catch (err: any) {
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
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export const qualityCheckerService = {
  isCamStream,
  hasCleanSource,
  isStreamMatchingTitle,
  isStreamMatchingYear,
  extractStreamYears,
  parseStreams,
  checkMovieQuality
};

export default qualityCheckerService;

