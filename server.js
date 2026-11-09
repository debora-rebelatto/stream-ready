const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./lib/db');
const { checkMovieQuality } = require('./lib/qualityChecker');
const { searchMovies, getMeta } = require('./lib/cinemeta');
const { getManifest, handleCatalog, handleMeta } = require('./lib/stremioAddon');
const { loginStremio, getUserInfo, getStremioLibrary, installAddonToAccount } = require('./lib/stremioAuth');

const app = express();
const PORT = process.env.PORT || 7000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS', 'DELETE'],
  allowedHeaders: ['*']
}));
app.use(express.json());

// Log incoming requests for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url} from ${req.ip}`);
  next();
});

// Fallback redirect for manifest without .json
app.get('/manifest', (req, res) => {
  res.redirect('/manifest.json');
});
app.use(express.static(path.join(__dirname, 'public')));

// Helper to determine base URL
function getBaseUrl(req) {
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

// -------------------------------------------------------------
// STREMIO AUTHENTICATION & HELPER
// -------------------------------------------------------------

// Helper to get authKey strictly from header, path, body or query (NOT global DB fallback)
function getRequestAuthKey(req) {
  const headerKey = req.headers['x-stremio-auth'];
  if (headerKey) return headerKey;
  if (req.params && req.params.authKey) return req.params.authKey;
  if (req.body && req.body.authKey) return req.body.authKey;
  if (req.query && req.query.authKey) return req.query.authKey;
  return null;
}

// -------------------------------------------------------------
// STREMIO ADDON ENDPOINTS
// -------------------------------------------------------------

// Manifest (root or user-specific)
app.get(['/manifest.json', '/:authKey/manifest.json'], (req, res) => {
  const baseUrl = getBaseUrl(req);
  const authKey = req.params.authKey || getRequestAuthKey(req);
  const manifest = getManifest(baseUrl, authKey);
  res.json(manifest);
});

// Configure redirect (Stremio configure button)
app.get(['/configure', '/:authKey/configure'], (req, res) => {
  res.redirect('/');
});

// Catalog routes
// Supports: /catalog/:type/:id.json, /:authKey/catalog/:type/:id.json and extras
const catalogHandler = async (req, res) => {
  try {
    const { type, id, authKey } = req.params;
    const effectiveAuthKey = authKey || getRequestAuthKey(req) || db.getSettings().stremioAuthKey;

    // Se NÃO estiver em uma conta (sem authKey nem login no servidor), NÃO renderiza nenhuma lista!
    if (!effectiveAuthKey) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.json({ metas: [] });
    }

    let extra = {};
    if (req.params.extra) {
      const parts = req.params.extra.replace(/\.json$/, '').split('&');
      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k && v) extra[k] = decodeURIComponent(v);
      }
    }

    const cleanId = id.replace(/\.json$/, '');
    const data = await handleCatalog(type, cleanId, extra, effectiveAuthKey);
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

// Meta route
const metaHandler = async (req, res) => {
  try {
    const { type, id } = req.params;
    const cleanId = id.replace(/\.json$/, '');
    const data = await handleMeta(type, cleanId);
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

// Login with Stremio account (or validate AuthKey)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, authKey } = req.body;

    if (authKey) {
      const user = await getUserInfo(authKey);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Chave de autenticação (AuthKey) inválida ou expirada' });
      }
      db.updateSettings({ stremioAuthKey: authKey, stremioEmail: user.email });
      return res.json({ success: true, authKey, user });
    }

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'E-mail e senha são obrigatórios' });
    }

    const authResult = await loginStremio(email, password);
    if (!authResult.success) {
      return res.status(401).json({ success: false, error: authResult.error });
    }

    db.updateSettings({ stremioAuthKey: authResult.authKey, stremioEmail: authResult.user.email });
    res.json(authResult);
  } catch (err) {
    console.error('[Auth Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check current logged in user
app.get('/api/auth/me', async (req, res) => {
  try {
    const authKey = getRequestAuthKey(req) || db.getSettings().stremioAuthKey;
    if (!authKey) {
      return res.json({ loggedIn: false });
    }

    const user = await getUserInfo(authKey);
    if (!user) {
      return res.json({ loggedIn: false });
    }

    res.json({ loggedIn: true, authKey, user });
  } catch (err) {
    res.json({ loggedIn: false });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  db.updateSettings({ stremioAuthKey: null, stremioEmail: null });
  res.json({ success: true });
});

// Sync items from official Stremio Library into Watchlist
app.post('/api/auth/sync-library', async (req, res) => {
  try {
    const authKey = getRequestAuthKey(req);
    if (!authKey) {
      return res.status(401).json({ error: 'Você precisa estar autenticado com sua conta do Stremio' });
    }

    const libraryResult = await getStremioLibrary(authKey);
    if (!libraryResult.success) {
      return res.status(400).json({ error: libraryResult.error });
    }

    const libraryItems = libraryResult.items;
    let addedCount = 0;
    let existingCount = 0;

    for (const libItem of libraryItems) {
      const existing = db.getItem(libItem.id);
      if (existing) {
        existingCount++;
        continue;
      }

      // Fetch Cinemeta metadata
      const meta = await getMeta(libItem.type || 'movie', libItem.id);
      const quality = await checkMovieQuality(libItem.id, libItem.type || 'movie');

      db.addItem({
        id: libItem.id,
        type: libItem.type || 'movie',
        name: meta?.name || libItem.name,
        year: meta?.year || libItem.year,
        poster: meta?.poster || libItem.poster,
        banner: meta?.banner || '',
        genres: meta?.genres || [],
        description: meta?.description || '',
        imdbRating: meta?.imdbRating || '',
        has1080pPlus: quality.has1080pPlus,
        bestQuality: quality.bestQuality,
        streamCount: quality.streamCount,
        count1080pPlus: quality.count1080pPlus,
        lastChecked: quality.checkedAt,
        checkError: quality.error || null
      });

      addedCount++;
      // Brief pause to be gentle with Torrentio API
      await new Promise(r => setTimeout(r, 400));
    }

    res.json({
      success: true,
      totalInLibrary: libraryItems.length,
      addedCount,
      existingCount,
      stats: db.getStats()
    });
  } catch (err) {
    console.error('[Library Sync Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// 1-Click Install Addon into user's Stremio account via API
app.post('/api/auth/install-account', async (req, res) => {
  try {
    const authKey = getRequestAuthKey(req) || db.getSettings().stremioAuthKey;
    if (!authKey) {
      return res.status(401).json({ error: 'Você precisa estar autenticado com sua conta do Stremio' });
    }

    const baseUrl = getBaseUrl(req);
    const manifestUrl = `${baseUrl}/manifest.json`;

    const result = await installAddonToAccount(authKey, manifestUrl);
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    res.json({ success: true, message: 'Addon instalado na sua conta do Stremio com sucesso! Ele já aparecerá na sua Smart TV e em todos os seus aparelhos.' });
  } catch (err) {
    console.error('[Install to Account Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// REST API ENDPOINTS (FOR WEB UI)
// -------------------------------------------------------------

// List items and stats
app.get('/api/items', (req, res) => {
  const authKey = getRequestAuthKey(req) || db.getSettings().stremioAuthKey;
  
  // Se não estiver conectado em uma conta, não renderiza nenhuma lista
  if (!authKey) {
    return res.json({
      items: [],
      stats: { total: 0, ready: 0, pending: 0 },
      requireAuth: true
    });
  }

  const { filter } = req.query;
  let items = db.getItems();

  if (filter === 'ready') {
    items = items.filter(i => i.has1080pPlus);
  } else if (filter === 'pending') {
    items = items.filter(i => !i.has1080pPlus);
  }

  res.json({
    items,
    stats: db.getStats(),
    requireAuth: false
  });
});

// Search movies via Cinemeta
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) return res.json([]);
    const results = await searchMovies(query);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add movie to watchlist
app.post('/api/items', async (req, res) => {
  try {
    let { id, type = 'movie' } = req.body;
    if (!id) return res.status(400).json({ error: 'ID do filme é obrigatório (ex: tt1234567)' });

    // Handle full IMDb URLs (e.g. https://www.imdb.com/title/tt1234567/)
    const imdbMatch = id.match(/tt\d{7,8}/i);
    if (imdbMatch) {
      id = imdbMatch[0];
    }

    // Check if already in DB
    const existing = db.getItem(id);
    if (existing) {
      return res.json({ success: true, item: existing, message: 'Item já estava na watchlist' });
    }

    // Fetch Cinemeta metadata
    const meta = await getMeta(type, id);
    if (!meta) {
      return res.status(404).json({ error: `Não foi possível encontrar metadados para ${id}` });
    }

    // Immediately check stream quality
    const quality = await checkMovieQuality(id, type);

    const saved = db.addItem({
      id: meta.id,
      type: meta.type || type,
      name: meta.name,
      year: meta.year,
      poster: meta.poster,
      banner: meta.banner,
      genres: meta.genres,
      description: meta.description,
      imdbRating: meta.imdbRating,
      has1080pPlus: quality.has1080pPlus,
      bestQuality: quality.bestQuality,
      streamCount: quality.streamCount,
      count1080pPlus: quality.count1080pPlus,
      lastChecked: quality.checkedAt,
      checkError: quality.error || null
    });

    console.log(`[Watchlist] Adicionado: ${saved.name} (${saved.id}) -> Qualidade: ${saved.bestQuality} (1080p+: ${saved.has1080pPlus})`);

    res.json({ success: true, item: saved });
  } catch (err) {
    console.error('[Add Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Re-check single item quality
app.post('/api/check/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = db.getItem(id);
    if (!item) return res.status(404).json({ error: 'Item não encontrado na watchlist' });

    const quality = await checkMovieQuality(id, item.type || 'movie');
    const wasReady = item.has1080pPlus;

    const updated = db.updateItem(id, {
      has1080pPlus: quality.has1080pPlus,
      bestQuality: quality.bestQuality,
      streamCount: quality.streamCount,
      count1080pPlus: quality.count1080pPlus,
      lastChecked: quality.checkedAt,
      checkError: quality.error || null
    });

    res.json({
      success: true,
      item: updated,
      becameReady: !wasReady && quality.has1080pPlus
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Re-check all pending items (or force all)
app.post('/api/check-all', async (req, res) => {
  try {
    const { forceAll } = req.body;
    let items = db.getItems();
    if (!forceAll) {
      items = items.filter(i => !i.has1080pPlus);
    }

    let newlyReady = 0;
    const results = [];

    for (const item of items) {
      const quality = await checkMovieQuality(item.id, item.type || 'movie');
      const wasReady = item.has1080pPlus;

      const updated = db.updateItem(item.id, {
        has1080pPlus: quality.has1080pPlus,
        bestQuality: quality.bestQuality,
        streamCount: quality.streamCount,
        count1080pPlus: quality.count1080pPlus,
        lastChecked: quality.checkedAt,
        checkError: quality.error || null
      });

      if (!wasReady && quality.has1080pPlus) {
        newlyReady++;
      }
      results.push(updated);

      // Brief pause between requests to be gentle to Torrentio
      await new Promise(r => setTimeout(r, 600));
    }

    res.json({
      success: true,
      checkedCount: items.length,
      newlyReady,
      stats: db.getStats()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete item
app.delete('/api/items/:id', (req, res) => {
  const { id } = req.params;
  const removed = db.removeItem(id);
  res.json({ success: removed, stats: db.getStats() });
});

// Settings
app.get('/api/settings', (req, res) => {
  res.json(db.getSettings());
});

app.post('/api/settings', async (req, res) => {
  try {
    const updated = db.updateSettings(req.body);

    // Se o usuário estiver autenticado com conta do Stremio, sincronizar addon atualizado na conta
    const authKey = getRequestAuthKey(req) || updated.stremioAuthKey;
    if (authKey) {
      try {
        const baseUrl = getBaseUrl(req);
        const manifestUrl = `${baseUrl}/manifest.json`;
        await installAddonToAccount(authKey, manifestUrl);
        console.log('[Settings] Addon sincronizado na conta do Stremio com sucesso após alteração');
      } catch (syncErr) {
        console.warn('[Settings] Aviso ao sincronizar com conta Stremio:', syncErr.message);
      }
    }

    res.json({ success: true, settings: updated });
  } catch (err) {
    console.error('[Settings Save Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// System info / Cloud URLs helper
app.get('/api/info', (req, res) => {
  const host = req.get('host') || `localhost:${PORT}`;
  const baseUrl = getBaseUrl(req);
  const manifestUrl = `${baseUrl}/manifest.json`;
  const stremioInstallUrl = `stremio://${host}/manifest.json`;
  const webStremioInstallUrl = `https://web.stremio.com/#/addons?addon=${encodeURIComponent(manifestUrl)}`;

  res.json({
    baseUrl,
    manifestUrl,
    stremioInstallUrl,
    webStremioInstallUrl,
    port: PORT
  });
});

// Export database
app.get('/api/export', (req, res) => {
  const items = db.getItems();
  res.setHeader('Content-Disposition', 'attachment; filename="stremio-watchlist.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(items, null, 2));
});

// Import database
app.post('/api/import', (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Array de itens inválido' });
    }
    let addedCount = 0;
    for (const item of items) {
      if (item && item.id && item.name) {
        db.addItem(item);
        addedCount++;
      }
    }
    res.json({ success: true, addedCount, stats: db.getStats() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// BACKGROUND CHECKER WORKER
// -------------------------------------------------------------
let backgroundCheckRunning = false;

async function runBackgroundCheck() {
  if (backgroundCheckRunning) return;
  backgroundCheckRunning = true;

  try {
    const items = db.getItems().filter(i => !i.has1080pPlus);
    if (items.length > 0) {
      console.log(`[AutoChecker] Verificando ${items.length} itens aguardando 1080p...`);
      for (const item of items) {
        const quality = await checkMovieQuality(item.id, item.type || 'movie');
        if (quality.has1080pPlus) {
          console.log(`🎉 [NOVIDADE] O filme "${item.name}" agora está disponível em ${quality.bestQuality}!`);
        }
        db.updateItem(item.id, {
          has1080pPlus: quality.has1080pPlus,
          bestQuality: quality.bestQuality,
          streamCount: quality.streamCount,
          count1080pPlus: quality.count1080pPlus,
          lastChecked: quality.checkedAt,
          checkError: quality.error || null
        });
        await new Promise(r => setTimeout(r, 800));
      }
    }
  } catch (err) {
    console.error('[AutoChecker Error]', err.message);
  } finally {
    backgroundCheckRunning = false;
  }
}

// Start recurring check
const settings = db.getSettings();
const intervalMs = Math.max(5, settings.autoCheckIntervalMinutes || 30) * 60 * 1000;
setInterval(runBackgroundCheck, intervalMs);

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 STREMIO WATCHLIST (1080p+ TRACKER) RODANDO`);
  console.log(`👉 Porta: ${PORT}`);
  console.log(`👉 Painel Web: http://localhost:${PORT}`);
  console.log(`👉 Addon Manifest: http://localhost:${PORT}/manifest.json`);
  console.log(`=======================================================`);
});

