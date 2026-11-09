const { getSettings } = require('./db');

/**
 * Analisa os streams retornados pelo provedor (ex: Torrentio)
 * para identificar resoluções disponíveis (4K, 1080p, 720p, CAM).
 */
function parseStreams(streams) {
  if (!streams || !Array.isArray(streams) || streams.length === 0) {
    return {
      has1080pPlus: false,
      bestQuality: 'Indisponível',
      streamCount: 0,
      count1080pPlus: 0,
      checkedAt: new Date().toISOString()
    };
  }

  let has4k = false;
  let has1080 = false;
  let has720 = false;
  let hasCam = false;
  let count1080pPlus = 0;

  for (const stream of streams) {
    const streamName = stream.name || '';
    const streamTitle = stream.title || '';
    const bingeGroup = stream.behaviorHints?.bingeGroup || '';
    const filename = stream.behaviorHints?.filename || '';

    const fullText = `${streamName} ${streamTitle} ${bingeGroup} ${filename}`.toLowerCase();

    // Check for 4K / 2160p
    const is4k = /2160p|4k\b|uhd/i.test(fullText);
    // Check for 1080p / FHD
    const is1080 = /1080p|fhd|1080i/i.test(fullText);
    // Check for 720p / HD
    const is720 = /720p|hd\b/i.test(fullText);
    // Check for CAM / Telesync
    const isCam = /\b(cam|camrip|hdcam|telesync|ts|hdts|screener|scr)\b/i.test(fullText);

    if (is4k) {
      has4k = true;
      count1080pPlus++;
    } else if (is1080) {
      has1080p = true;
      count1080pPlus++;
    } else if (is720) {
      has720p = true;
    } else if (isCam) {
      hasCam = true;
    }
  }

  const has1080pPlus = has4k || has1080;
  let bestQuality = 'Indisponível';
  if (has4k) {
    bestQuality = '4K UHD';
  } else if (has1080) {
    bestQuality = '1080p FHD';
  } else if (has720) {
    bestQuality = '720p HD';
  } else if (hasCam) {
    bestQuality = 'CAM / TS';
  } else if (streams.length > 0) {
    bestQuality = 'Outra (SD)';
  }

  return {
    has1080pPlus,
    bestQuality,
    streamCount: streams.length,
    count1080pPlus,
    checkedAt: new Date().toISOString()
  };
}

/**
 * Consulta o Torrentio para verificar streams de um filme por IMDb ID.
 */
async function checkMovieQuality(imdbId, type = 'movie') {
  const settings = getSettings();
  let baseUrl = (settings.torrentioUrl || 'https://torrentio.strem.fun').replace(/\/+$/, '');
  
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
          bestQuality: 'Indisponível',
          streamCount: 0,
          count1080pPlus: 0,
          checkedAt: new Date().toISOString()
        };
      }
      throw new Error(`Torrentio respondeu com status ${res.status}`);
    }

    const data = await res.json();
    return parseStreams(data.streams || []);
  } catch (err) {
    console.warn(`[QualityChecker] Aviso ao verificar ${imdbId}:`, err.message);
    return {
      error: err.message,
      has1080pPlus: false,
      bestQuality: 'Erro na verificação',
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

