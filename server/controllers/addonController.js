const { addonOperationService } = require('../services');
const { getBaseUrl, getRequestUser } = require('../utils/requestContext');

function redirectToManifest(req, res) {
  res.redirect('/manifest.json');
}

async function getManifestHandler(req, res) {
  try {
    const baseUrl = getBaseUrl(req);
    const { userId } = await getRequestUser(req);
    const manifest = await addonOperationService.getAddonManifest({ baseUrl, userId });
    res.json(manifest);
  } catch (err) {
    console.error('[Manifest Error]', err);
    res.status(500).json({ error: err.message });
  }
}

function redirectToConfigure(req, res) {
  res.redirect('/?source=stremio_configure');
}

async function getCatalogHandler(req, res) {
  try {
    const { type, id, extra } = req.params;
    const { authKey, userId, userData } = await getRequestUser(req);
    const data = await addonOperationService.getCatalog({
      type,
      id,
      extraParam: extra,
      authKey,
      userId,
      userData,
    });
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json(data);
  } catch (err) {
    console.error('[Catalog Error]', err);
    return res.status(500).json({ metas: [] });
  }
}

async function getMetaHandler(req, res) {
  try {
    const { type, id } = req.params;
    const { userId } = await getRequestUser(req);
    const data = await addonOperationService.getMetaItem({ type, id, userId });
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.json(data);
  } catch (err) {
    console.error('[Meta Error]', err);
    return res.status(500).json({ meta: null });
  }
}

async function generateQrHandler(req, res) {
  try {
    const text = req.query.url || req.query.text || getBaseUrl(req);
    const format = req.query.format || 'png';
    const size = req.query.size;

    const { contentType, payload } = await addonOperationService.generateQrCode({
      text,
      format,
      size,
    });
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(payload);
  } catch (err) {
    console.error('[QR Error]', err);
    return res.status(500).send('Error generating QR code');
  }
}

async function redirectQrScanHandler(req, res) {
  try {
    const context = req.query.context || 'stremio_tv';
    const userAgent = req.get('user-agent') || 'unknown';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const baseUrl = getBaseUrl(req);

    const target = addonOperationService.recordQrScanAndGetRedirectUrl({
      baseUrl,
      context,
      userAgent,
      ip,
    });
    return res.redirect(302, target);
  } catch (err) {
    console.error('[QR Redirect Error]', err);
    return res.redirect(302, '/');
  }
}

async function generateQrPosterHandler(req, res) {
  try {
    const baseUrl = getBaseUrl(req);
    const context = req.query.context || 'stremio_tv';
    const svg = await addonOperationService.generateQrPosterSvg({
      baseUrl,
      context,
      customUrl: req.query.url,
    });
    res.setHeader('Content-Type', 'image/svg+xml');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.send(svg);
  } catch (err) {
    console.error('[QR Poster Error]', err);
    return res.status(500).send('Error generating QR poster');
  }
}

function registerAddonRoutes(app) {
  app.get('/manifest', redirectToManifest);
  app.get(['/manifest.json', '/:authKey/manifest.json'], getManifestHandler);
  app.get(['/configure', '/:authKey/configure'], redirectToConfigure);

  app.get('/catalog/:type/:id.json', getCatalogHandler);
  app.get('/catalog/:type/:id/:extra.json', getCatalogHandler);
  app.get('/catalog/:type/:id', getCatalogHandler);
  app.get('/:authKey/catalog/:type/:id.json', getCatalogHandler);
  app.get('/:authKey/catalog/:type/:id/:extra.json', getCatalogHandler);
  app.get('/:authKey/catalog/:type/:id', getCatalogHandler);

  app.get('/meta/:type/:id.json', getMetaHandler);
  app.get('/meta/:type/:id', getMetaHandler);
  app.get('/:authKey/meta/:type/:id.json', getMetaHandler);
  app.get('/:authKey/meta/:type/:id', getMetaHandler);

  app.get('/api/qr', generateQrHandler);
  app.get('/r/qr', redirectQrScanHandler);
  app.get('/api/qr/poster', generateQrPosterHandler);
}

module.exports = { registerAddonRoutes };
