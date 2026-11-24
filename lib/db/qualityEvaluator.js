const THREE_MONTHS_MS = 90 * 24 * 60 * 60 * 1000;

function normalizeCriteria(criteriaOrMinQuality = '1080p', legacyMinAudio = 'any') {
  if (criteriaOrMinQuality && typeof criteriaOrMinQuality === 'object') {
    return {
      minQuality: criteriaOrMinQuality.minQuality === '4k' ? '4k' : '1080p',
      minAudio:
        criteriaOrMinQuality.minAudio === 'atmos' || criteriaOrMinQuality.minAudio === 'surround'
          ? criteriaOrMinQuality.minAudio
          : 'any',
    };
  }
  return {
    minQuality: criteriaOrMinQuality === '4k' ? '4k' : '1080p',
    minAudio:
      legacyMinAudio === 'atmos' || legacyMinAudio === 'surround' ? legacyMinAudio : 'any',
  };
}

function formatQualityLabel(raw) {
  if (!raw) return 'Pending';
  const q = String(raw).trim();
  if (/ainda não lançado|não lançado|indisponível|unreleased|not released/i.test(q)) {
    return 'Unreleased';
  }
  if (/^pendente$|^aguardando verificação$/i.test(q)) {
    return 'Pending';
  }
  if (/gravação de cinema/i.test(q)) {
    return 'CAM / Theater Rip';
  }
  if (/erro na verificação/i.test(q)) {
    return 'Check Error';
  }
  return q;
}

function resolveQualityTier(bestQuality, isUnreleased = false) {
  if (isUnreleased) return 'pending';
  const q = String(bestQuality || '').toLowerCase();
  if (q.includes('4k') || q.includes('2160p') || q.includes('uhd')) return '4k';
  if (q.includes('1080p') || q.includes('fhd')) return '1080p';
  if (q.includes('720p') || /\bhd\b/i.test(q)) return '720p';
  return 'pending';
}

function isSurroundAudioFormat(audioFormat, hasAtmos) {
  if (hasAtmos) return true;
  if (!audioFormat) return false;
  return /\b(atmos|truehd|dts|ddp|5\.1|7\.1|surround|flac)\b/i.test(String(audioFormat));
}

function isLosslessAudioFormat(audioFormat) {
  if (!audioFormat) return false;
  return /\b(truehd|dts[-._ ]?hd|dts[-._: ]?x|flac)\b/i.test(String(audioFormat));
}

function isItemReady(item, criteriaOrMinQuality = '1080p', legacyMinAudio = 'any') {
  if (!item) return false;
  const criteria = normalizeCriteria(criteriaOrMinQuality, legacyMinAudio);
  const target = item.minQuality || criteria.minQuality || '1080p';
  const rawQuality = String(item.bestQuality || '').toLowerCase();

  const videoReady =
    target === '4k'
      ? rawQuality.includes('4k') || rawQuality.includes('2160p') || rawQuality.includes('uhd')
      : Boolean(item.has1080pPlus);

  if (!videoReady) return false;

  const audioTarget = criteria.minAudio || 'any';
  if (audioTarget === 'atmos') {
    return Boolean(item.hasAtmos);
  }
  if (audioTarget === 'surround') {
    return Boolean(item.hasSurround || isSurroundAudioFormat(item.audioFormat, item.hasAtmos));
  }
  return true;
}

function parseTimestampMs(dateStr) {
  if (!dateStr) return null;
  try {
    const time = new Date(dateStr).getTime();
    return Number.isNaN(time) ? null : time;
  } catch {
    return null;
  }
}

function isTimestampWithinWindow(timestampMs, nowMs = Date.now(), windowMs = THREE_MONTHS_MS) {
  if (timestampMs === null) return false;
  const diffMs = nowMs - timestampMs;
  return diffMs >= 0 && diffMs <= windowMs;
}

function extractReleaseYear(year) {
  if (year === undefined || year === null) return null;
  const yearMatch = String(year).match(/\d{4}/);
  if (!yearMatch) return null;
  const parsed = parseInt(yearMatch[0], 10);
  return parsed > 0 ? parsed : null;
}

function isCatalogTitleTooOld(year, currentYear = new Date().getFullYear()) {
  const releaseYear = extractReleaseYear(year);
  if (releaseYear === null) return false;
  return releaseYear < currentYear - 1;
}

function evaluateExplicitReleaseDate(item, nowMs = Date.now()) {
  const explicitDateStr = item.released || item.releaseDate;
  const releaseTimeMs = parseTimestampMs(explicitDateStr);
  if (releaseTimeMs === null) return null;

  if (isTimestampWithinWindow(releaseTimeMs, nowMs)) {
    return item.has1080pPlus !== false;
  }
  return false;
}

function evaluateReadyTimestampRelease(item, nowMs = Date.now()) {
  if (!item.has1080pPlus || !item.readyAt) return false;
  if (isCatalogTitleTooOld(item.year)) return false;

  const readyTimeMs = parseTimestampMs(item.readyAt);
  return isTimestampWithinWindow(readyTimeMs, nowMs);
}

function isItemNewRelease(item, nowMs = Date.now()) {
  if (!item) return false;

  const explicitResult = evaluateExplicitReleaseDate(item, nowMs);
  if (explicitResult !== null) {
    return explicitResult;
  }

  return evaluateReadyTimestampRelease(item, nowMs);
}

function isItemUnreleased(item) {
  if (!item || item.has1080pPlus || item.isWatched) return false;
  const rawQuality = formatQualityLabel(item.bestQuality);
  return (
    /unreleased|not released|unavailable|não lançado|indisponível/i.test(rawQuality) ||
    ((!item.streamCount || item.streamCount === 0) && !/cam|check error/i.test(rawQuality))
  );
}

function resolveMovieStatus({ isWatched, isNew, ready, unreleased }) {
  if (isWatched) return 'watched';
  if (isNew) return 'new';
  if (ready) return 'ready';
  if (unreleased) return 'unreleased';
  return 'waiting';
}

function computeMovieStatus(item, criteriaOrMinQuality = '1080p', legacyMinAudio = 'any') {
  const criteria = normalizeCriteria(criteriaOrMinQuality, legacyMinAudio);
  const isWatched = Boolean(item?.isWatched);
  const isReady = isItemReady(item, criteria);
  const isNewRelease = isItemNewRelease(item) && !isWatched;
  const isUnreleased = isItemUnreleased(item);
  const status = resolveMovieStatus({
    isWatched,
    isNew: isNewRelease,
    ready: isReady,
    unreleased: isUnreleased,
  });
  const rawQuality = formatQualityLabel(item?.bestQuality);
  const qualityLabel = isUnreleased ? 'Unreleased' : rawQuality;
  const qualityTier = resolveQualityTier(item?.bestQuality, isUnreleased);
  const streamCount = Number(item?.streamCount || 0);
  const streamsLabel = streamCount > 0 ? `${streamCount} sources` : '0 sources';
  const activeTargetQuality = item?.minQuality || criteria.minQuality || '1080p';
  const hasAtmos = Boolean(item?.hasAtmos);
  const audioFormat = item?.audioFormat || (hasAtmos ? 'Dolby Atmos' : '');
  const hasSurround = Boolean(item?.hasSurround || isSurroundAudioFormat(audioFormat, hasAtmos));
  const isLosslessAudio = Boolean(item?.isLosslessAudio || isLosslessAudioFormat(audioFormat));

  return {
    status,
    isWatched,
    isReady,
    isNewRelease,
    isUnreleased,
    qualityTier,
    qualityLabel,
    streamsLabel,
    hasAtmos,
    hasSurround,
    isLosslessAudio,
    audioFormat,
    activeTargetQuality,
    activeTargetAudio: criteria.minAudio,
  };
}

function enrichWatchlistItem(item, criteriaOrMinQuality = '1080p', legacyMinAudio = 'any') {
  if (!item) return item;
  return {
    ...item,
    computed: computeMovieStatus(item, criteriaOrMinQuality, legacyMinAudio),
  };
}

function computeWatchlistStats(items = [], criteriaOrMinQuality = '1080p', legacyMinAudio = 'any') {
  const criteria = normalizeCriteria(criteriaOrMinQuality, legacyMinAudio);
  let ready = 0;
  let pending = 0;
  let unreleased = 0;
  let watched = 0;

  for (const item of items) {
    const computed = computeMovieStatus(item, criteria);
    if (computed.isWatched) {
      watched++;
    } else if (computed.isReady) {
      ready++;
    } else if (computed.isUnreleased) {
      unreleased++;
    } else {
      pending++;
    }
  }

  return {
    total: items.length,
    ready,
    pending,
    unreleased,
    watched,
  };
}

module.exports = {
  THREE_MONTHS_MS,
  normalizeCriteria,
  formatQualityLabel,
  resolveQualityTier,
  isSurroundAudioFormat,
  isLosslessAudioFormat,
  parseTimestampMs,
  isTimestampWithinWindow,
  extractReleaseYear,
  isCatalogTitleTooOld,
  evaluateExplicitReleaseDate,
  evaluateReadyTimestampRelease,
  isItemReady,
  isItemNewRelease,
  isItemUnreleased,
  resolveMovieStatus,
  computeMovieStatus,
  enrichWatchlistItem,
  computeWatchlistStats,
};
