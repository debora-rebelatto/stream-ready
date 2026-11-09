const { getSettings } = require('./db');

/**
 * Padrões de gravação de cinema (CAM, Telesync, Screener)
 */
function isCamStream(text) {
  return /\b(cam|camrip|hdcam|hd-cam|telesync|ts|hdts|hd-ts|screener|scr|dvdscr|telecine|tc|workprint|wp)\b/i.test(text);
}

/**
 * Analisa os streams retornados pelo provedor (ex: Torrentio)
 * para identificar se o filme já possui versão digital/decente (NÃO CAM),
 * ou se ainda está indisponível / apenas gravação de cinema (CAM/TS).
 */
function parseStreams(streams) {
  if (!streams || !Array.isArray(streams) || streams.length === 0) {
    return {
      has1080pPlus: false, // Mantém compatibilidade: true se NÃO for CAM (pronto para assistir)
      isReady: false,
      isCamOnly: false,
      bestQuality: 'Indisponível',
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

    if (isCam) {
      hasCam = true;
      continue;
    }

    // Se NÃO é CAM, encontramos uma versão limpa/digital
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
  }

  // O filme está PRONTO se tiver pelo menos uma fonte que NÃO seja CAM!
  const isReady = cleanStreamCount > 0;

  let bestQuality = 'Indisponível';
  if (has4k) {
    bestQuality = '4K UHD';
  } else if (has1080) {
    bestQuality = '1080p FHD';
  } else if (has720) {
    bestQuality = '720p HD';
  } else if (hasCleanOther) {
    bestQuality = 'Digital (WEB/SD)';
  } else if (hasCam) {
    bestQuality = 'CAM / Gravação de Cinema';
  }

  return {
    has1080pPlus: isReady, // true se NÃO for CAM
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

