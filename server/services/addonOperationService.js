const QRCode = require('qrcode');
const { userRepository, watchlistRepository, analyticsRepository } = require('../repositories');
const { checkMovieQuality } = require('../../lib/qualityChecker');
const { getMeta } = require('../../lib/cinemeta');
const { getManifest, handleCatalog, handleMeta } = require('../../lib/stremioAddon');
const { getAccountWatchlist } = require('../../lib/stremioAuth');
const { triggerUserOnDemandSync } = require('../utils/requestContext');

function parseCatalogExtra(extraParam) {
  const extra = {};
  if (!extraParam) return extra;

  const parts = String(extraParam).replace(/\.json$/, '').split('&');
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k && v) {
      extra[k] = decodeURIComponent(v);
    }
  }
  return extra;
}

async function hydrateUserWatchlistIfEmpty({ userId, userData, authKey }) {
  if (!userId || watchlistRepository.getItems(userId).length > 0) {
    return;
  }

  if (userData && Array.isArray(userData.items) && userData.items.length > 0) {
    for (const item of userData.items) {
      if (!watchlistRepository.getItem(item.id, userId)) {
        watchlistRepository.addItem(item, userId);
      }
    }
    return;
  }

  if (userData && Array.isArray(userData.ids) && userData.ids.length > 0) {
    for (const movieId of userData.ids) {
      if (!watchlistRepository.getItem(movieId, userId)) {
        watchlistRepository.addItem(
          {
            id: movieId,
            type: 'movie',
            name: movieId,
            has1080pPlus: false,
            bestQuality: 'Pending',
            streamCount: 0,
          },
          userId
        );
        getMeta('movie', movieId)
          .then((meta) => {
            if (meta) {
              watchlistRepository.updateItem(
                movieId,
                {
                  name: meta.name,
                  poster: meta.poster,
                  year: meta.year,
                  genres: meta.genres,
                },
                userId
              );
            }
          })
          .catch(() => {});
        checkMovieQuality(movieId, 'movie')
          .then((q) => {
            if (q) {
              watchlistRepository.updateItem(
                movieId,
                {
                  has1080pPlus: q.has1080pPlus,
                  bestQuality: q.bestQuality,
                  streamCount: q.streamCount,
                },
                userId
              );
            }
          })
          .catch(() => {});
      }
    }
    return;
  }

  if (authKey) {
    const cloudItems = await getAccountWatchlist(authKey);
    if (Array.isArray(cloudItems) && cloudItems.length > 0) {
      for (const it of cloudItems) {
        if (!watchlistRepository.getItem(it.id, userId)) {
          watchlistRepository.addItem(it, userId);
        }
      }
    }
  }
}

async function getAddonManifest({ baseUrl, userId }) {
  await userRepository.ensureLoaded();
  return getManifest(baseUrl, userId);
}

async function getCatalog({ type, id, extraParam, authKey, userId, userData }) {
  await userRepository.ensureLoaded();
  const cleanId = String(id || '').replace(/\.json$/, '');
  const extra = parseCatalogExtra(extraParam);

  if (!userId) {
    return handleCatalog(type, cleanId, extra, '');
  }

  triggerUserOnDemandSync(authKey, userId);
  await hydrateUserWatchlistIfEmpty({ userId, userData, authKey });

  return handleCatalog(type, cleanId, extra, userId);
}

async function getMetaItem({ type, id, userId }) {
  const cleanId = String(id || '').replace(/\.json$/, '');
  return handleMeta(type, cleanId, userId);
}

async function generateQrCode({ text, format = 'png', size = 320 }) {
  const clampedSize = Math.min(Math.max(parseInt(size, 10) || 320, 100), 1000);

  if (format === 'svg') {
    const svg = await QRCode.toString(text, {
      type: 'svg',
      margin: 2,
      color: { dark: '#ffffff', light: '#0c0d14' },
    });
    return {
      contentType: 'image/svg+xml',
      payload: svg,
    };
  }

  const buffer = await QRCode.toBuffer(text, {
    type: 'png',
    width: clampedSize,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
  return {
    contentType: 'image/png',
    payload: buffer,
  };
}

function recordQrScanAndGetRedirectUrl({ baseUrl, context = 'stremio_tv', userAgent = 'unknown', ip = 'unknown' }) {
  console.log(
    `[QR Code Scan] User scanned QR code from Stremio TV - Context: ${context}, IP: ${ip}, User-Agent: ${userAgent}`
  );

  analyticsRepository
    .recordAnalyticsEvent('qr_code_scanned', {
      source: 'stremio_tv_qr',
      context,
      ip,
      userAgent,
    })
    .catch((err) => {
      console.warn('[QR Analytics Warning] Failed to log QR event:', err.message);
    });

  return `${baseUrl}/?source=stremio_tv_qr&context=${encodeURIComponent(context)}`;
}

async function generateQrPosterSvg({ baseUrl, context = 'stremio_tv', customUrl }) {
  const targetUrl = customUrl || `${baseUrl}/r/qr?context=${encodeURIComponent(context)}`;

  const qrDataUrl = await QRCode.toDataURL(targetUrl, {
    width: 340,
    margin: 1,
    color: { dark: '#000000', light: '#ffffff' },
  });

  const cleanDisplayUrl = String(baseUrl || '').replace(/^https?:\/\//, '');

  return `<svg width="500" height="750" viewBox="0 0 500 750" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1e1338"/>
      <stop offset="50%" stop-color="#0e1122"/>
      <stop offset="100%" stop-color="#070913"/>
    </linearGradient>
    <linearGradient id="btnGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>

  <!-- Background Card -->
  <rect width="500" height="750" fill="url(#bgGrad)" rx="24"/>
  <rect x="10" y="10" width="480" height="730" fill="none" stroke="#7c3aed" stroke-width="2.5" stroke-opacity="0.5" rx="20"/>

  <!-- Top Badge: Brand -->
  <rect x="40" y="28" width="420" height="52" rx="14" fill="#7c3aed" fill-opacity="0.25" stroke="#8b5cf6" stroke-width="2"/>
  <text x="250" y="63" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="25" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">STREMIO WATCHLIST</text>

  <!-- Subtitle -->
  <text x="250" y="112" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="17" font-weight="700" fill="#c4b5fd" text-anchor="middle" letter-spacing="0.5">Good Quality Tracker • 1080p &amp; 4K</text>

  <!-- Large QR Code Card Container -->
  <rect x="65" y="132" width="370" height="370" fill="#ffffff" rx="24" stroke="#a78bfa" stroke-width="4"/>
  <image href="${qrDataUrl}" x="80" y="147" width="340" height="340"/>

  <!-- Primary Action Callout: Scan with Phone -->
  <rect x="35" y="522" width="430" height="76" rx="18" fill="url(#btnGrad)"/>
  <text x="250" y="556" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle">📱 SCAN WITH PHONE CAMERA</text>
  <text x="250" y="584" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="16" font-weight="700" fill="#ede9fe" text-anchor="middle">Open web app to search &amp; add movies</text>

  <!-- High-Contrast Direct Website Pill -->
  <rect x="35" y="614" width="430" height="62" rx="16" fill="#0f172a" stroke="#10b981" stroke-width="2.5"/>
  <text x="250" y="653" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="22" font-weight="900" fill="#34d399" text-anchor="middle" letter-spacing="0.5">${cleanDisplayUrl}</text>

  <!-- Footer Tip -->
  <text x="250" y="708" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="15" font-weight="700" fill="#94a3b8" text-anchor="middle">Empty Watchlist • Connect &amp; Track Releases</text>
</svg>`;
}

const addonOperationService = {
  parseCatalogExtra,
  hydrateUserWatchlistIfEmpty,
  getAddonManifest,
  getCatalog,
  getMetaItem,
  generateQrCode,
  recordQrScanAndGetRedirectUrl,
  generateQrPosterSvg,
};

module.exports = { addonOperationService };
