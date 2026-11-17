const QRCode = require('qrcode');
const { userRepository, watchlistRepository, analyticsRepository } = require('../repositories');
const { checkMovieQuality } = require('../../lib/qualityChecker');
const { getMeta } = require('../../lib/cinemeta');
const { getManifest, handleCatalog, handleMeta } = require('../../lib/stremioAddon');
const { getAccountWatchlist } = require('../../lib/stremioAuth');
const {
  getBaseUrl,
  getRequestUser,
  triggerUserOnDemandSync,
} = require('../utils/requestContext');

function registerAddonRoutes(app) {
  app.get('/manifest', (req, res) => {
    res.redirect('/manifest.json');
  });

  app.get(['/manifest.json', '/:authKey/manifest.json'], async (req, res) => {
    await userRepository.ensureLoaded();
    const baseUrl = getBaseUrl(req);
    const { userId } = await getRequestUser(req);
    const manifest = getManifest(baseUrl, userId);
    res.json(manifest);
  });

  app.get(['/configure', '/:authKey/configure'], (req, res) => {
    res.redirect('/?source=stremio_configure');
  });

  const catalogHandler = async (req, res) => {
    try {
      await userRepository.ensureLoaded();
      const { type, id } = req.params;
      const cleanId = id.replace(/\.json$/, '');
      const { authKey, userId, userData } = await getRequestUser(req);

      const extra = {};
      if (req.params.extra) {
        const parts = req.params.extra.replace(/\.json$/, '').split('&');
        for (const part of parts) {
          const [k, v] = part.split('=');
          if (k && v) extra[k] = decodeURIComponent(v);
        }
      }

      if (!userId) {
        const data = await handleCatalog(type, cleanId, extra, '');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        return res.json(data);
      }

      triggerUserOnDemandSync(authKey, userId);

      if (watchlistRepository.getItems(userId).length === 0) {
        if (userData.items && userData.items.length > 0) {
          for (const item of userData.items) {
            if (!watchlistRepository.getItem(item.id, userId)) {
              watchlistRepository.addItem(item, userId);
            }
          }
        } else if (userData.ids && userData.ids.length > 0) {
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
        } else if (authKey) {
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

      const data = await handleCatalog(type, cleanId, extra, userId);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(data);
    } catch (err) {
      console.error('[Catalog Error]', err);
      res.status(500).json({ metas: [] });
    }
  };

  app.get('/catalog/:type/:id.json', catalogHandler);
  app.get('/catalog/:type/:id/:extra.json', catalogHandler);
  app.get('/catalog/:type/:id', catalogHandler);
  app.get('/:authKey/catalog/:type/:id.json', catalogHandler);
  app.get('/:authKey/catalog/:type/:id/:extra.json', catalogHandler);
  app.get('/:authKey/catalog/:type/:id', catalogHandler);

  const metaHandler = async (req, res) => {
    try {
      const { type, id } = req.params;
      const { userId } = await getRequestUser(req);
      const cleanId = id.replace(/\.json$/, '');
      const data = await handleMeta(type, cleanId, userId);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.json(data);
    } catch (err) {
      console.error('[Meta Error]', err);
      res.status(500).json({ meta: null });
    }
  };

  app.get('/meta/:type/:id.json', metaHandler);
  app.get('/meta/:type/:id', metaHandler);
  app.get('/:authKey/meta/:type/:id.json', metaHandler);
  app.get('/:authKey/meta/:type/:id', metaHandler);

  app.get('/api/qr', async (req, res) => {
    try {
      const text = req.query.url || req.query.text || getBaseUrl(req);
      const format = req.query.format || 'png';
      const size = Math.min(Math.max(parseInt(req.query.size, 10) || 320, 100), 1000);

      if (format === 'svg') {
        const svg = await QRCode.toString(text, {
          type: 'svg',
          margin: 2,
          color: { dark: '#ffffff', light: '#0c0d14' },
        });
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        return res.send(svg);
      }

      const buffer = await QRCode.toBuffer(text, {
        type: 'png',
        width: size,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(buffer);
    } catch (err) {
      console.error('[QR Error]', err);
      res.status(500).send('Error generating QR code');
    }
  });

  app.get('/r/qr', async (req, res) => {
    try {
      const context = req.query.context || 'stremio_tv';
      const userAgent = req.get('user-agent') || 'unknown';
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';

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

      const baseUrl = getBaseUrl(req);
      const target = `${baseUrl}/?source=stremio_tv_qr&context=${encodeURIComponent(context)}`;
      return res.redirect(302, target);
    } catch (err) {
      console.error('[QR Redirect Error]', err);
      return res.redirect(302, '/');
    }
  });

  app.get('/api/qr/poster', async (req, res) => {
    try {
      const baseUrl = getBaseUrl(req);
      const context = req.query.context || 'stremio_tv';
      const targetUrl = req.query.url || `${baseUrl}/r/qr?context=${encodeURIComponent(context)}`;

      const qrDataUrl = await QRCode.toDataURL(targetUrl, {
        width: 280,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      });

      const cleanDisplayUrl = baseUrl.replace(/^https?:\/\//, '');

      const svg = `<svg width="500" height="750" viewBox="0 0 500 750" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1b1338"/>
      <stop offset="50%" stop-color="#0e101f"/>
      <stop offset="100%" stop-color="#080911"/>
    </linearGradient>
  </defs>
  <rect width="500" height="750" fill="url(#bgGrad)" rx="24"/>
  <rect x="14" y="14" width="472" height="722" fill="none" stroke="#7c3aed" stroke-width="2" stroke-opacity="0.4" rx="16"/>
  <text x="250" y="80" font-family="Arial, sans-serif" font-size="24" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="2">STREMIO WATCHLIST</text>
  <text x="250" y="115" font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#c4b5fd" text-anchor="middle">Good Quality Tracker • 1080p &amp; 4K</text>
  <rect x="100" y="165" width="300" height="300" fill="#ffffff" rx="20"/>
  <image href="${qrDataUrl}" x="110" y="175" width="280" height="280"/>
  <text x="250" y="525" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">📱 Scan with Phone Camera</text>
  <text x="250" y="560" font-family="Arial, sans-serif" font-size="14" fill="#9ca3af" text-anchor="middle">to open web app &amp; add movies</text>
  <text x="250" y="640" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="#34d399" text-anchor="middle">${cleanDisplayUrl}</text>
</svg>`;

      res.setHeader('Content-Type', 'image/svg+xml');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      return res.send(svg);
    } catch (err) {
      console.error('[QR Poster Error]', err);
      res.status(500).send('Error generating QR poster');
    }
  });
}

module.exports = { registerAddonRoutes };
