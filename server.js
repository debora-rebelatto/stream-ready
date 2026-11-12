const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./lib/db');
const { checkMovieQuality } = require('./lib/qualityChecker');
const { searchMovies, getMeta } = require('./lib/cinemeta');
const { getManifest, handleCatalog, handleMeta } = require('./lib/stremioAddon');
const { loginStremio, getUserInfo, getAccountWatchlist, saveAccountWatchlist } = require('./lib/stremioAuth');
const { encodeUserData, decodeUserData } = require('./lib/userData');

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

// Serve compiled React build if present, otherwise fallback to public/
const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');
const clientPath = fs.existsSync(distPath) ? distPath : publicPath;
app.use(express.static(clientPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    } else if (filePath.includes(path.sep + 'assets' + path.sep) || filePath.includes('/assets/')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

// Helper to determine base URL
function getBaseUrl(req) {
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

// -------------------------------------------------------------
// STREMIO AUTHENTICATION & HELPER
// -------------------------------------------------------------

// Helper to get authKey strictly from header, path, body or query (NO global fallback)
function getRequestAuthKey(req) {
  const headerKey = req.headers['x-stremio-auth'];
  if (headerKey) return headerKey;
  if (req.params && req.params.authKey) return req.params.authKey;
  if (req.body && req.body.authKey) return req.body.authKey;
  if (req.query && req.query.authKey) return req.query.authKey;
  return null;
}

// Resolve o usuário (id único UUID e email) estritamente a partir da authKey da requisição
async function getRequestUser(req) {
  const rawKey = getRequestAuthKey(req);
  if (!rawKey) return { authKey: null, userId: null, userEmail: null, user: null, userData: { authKey: '', items: [], ids: [] } };
  const userData = decodeUserData(rawKey);
  const effectiveAuthKey = userData.authKey || rawKey;
  const user = await db.resolveUser(effectiveAuthKey, getUserInfo);
  const userId = user ? user.id : null;
  const userEmail = user ? user.email : null;
  return { authKey: effectiveAuthKey, userId, userEmail, user, userData };
}

// -------------------------------------------------------------
// USER DATA PERSISTENCE HELPER
// -------------------------------------------------------------
async function syncAddonUrlWithAccount(authKey, baseUrl, userId) {
  if (!authKey || !userId) return;
  try {
    const items = db.getItems(userId);
    const manifest = getManifest(baseUrl, userId);
    await saveAccountWatchlist(authKey, baseUrl, items, manifest);
  } catch (err) {
    console.warn('[AddonSync] Aviso ao sincronizar URL do addon:', err.message);
  }
}

// -------------------------------------------------------------
// STREMIO ADDON ENDPOINTS
// -------------------------------------------------------------

// Manifest (root or user-specific)
app.get(['/manifest.json', '/:authKey/manifest.json'], async (req, res) => {
  await db.ensureLoaded();
  const baseUrl = getBaseUrl(req);
  const { userId } = await getRequestUser(req);
  const manifest = getManifest(baseUrl, userId);
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
    await db.ensureLoaded();
    const { type, id } = req.params;
    const { authKey, userId, userData } = await getRequestUser(req);

    // Se NÃO estiver autenticado com uma conta válida, retorna catálogo vazio
    if (!userId) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.json({ metas: [] });
    }

    // 1. Se o banco desse usuário estiver vazio e vieram filmes na URL, restaura para esse usuário
    if (db.getItems(userId).length === 0) {
      if (userData.items && userData.items.length > 0) {
        for (const item of userData.items) {
          if (!db.getItem(item.id, userId)) {
            db.addItem(item, userId);
          }
        }
      } else if (userData.ids && userData.ids.length > 0) {
        for (const movieId of userData.ids) {
          if (!db.getItem(movieId, userId)) {
            db.addItem({
              id: movieId,
              type: 'movie',
              name: movieId,
              has1080pPlus: false,
              bestQuality: 'Pending',
              streamCount: 0
            }, userId);
            getMeta('movie', movieId).then(meta => {
              if (meta) db.updateItem(movieId, { name: meta.name, poster: meta.poster, year: meta.year, genres: meta.genres }, userId);
            }).catch(() => {});
            checkMovieQuality(movieId, 'movie').then(q => {
              if (q) db.updateItem(movieId, { has1080pPlus: q.has1080pPlus, bestQuality: q.bestQuality, streamCount: q.streamCount }, userId);
            }).catch(() => {});
          }
        }
      } else if (authKey) {
        // 2. Se o banco do usuário estiver vazio, busca da nuvem do Stremio dessa conta específica
        const cloudItems = await getAccountWatchlist(authKey);
        if (Array.isArray(cloudItems) && cloudItems.length > 0) {
          for (const it of cloudItems) {
            if (!db.getItem(it.id, userId)) {
              db.addItem(it, userId);
            }
          }
        }
      }
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

// Meta route
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

// Login with Stremio account (or validate AuthKey)
app.post('/api/auth/login', async (req, res) => {
  try {
    await db.ensureLoaded(true);
    const { email, password, authKey } = req.body;

    if (authKey) {
      const user = await db.resolveUser(authKey, getUserInfo);
      if (!user || !user.email) {
        return res.status(401).json({ success: false, error: 'Invalid or expired authentication key (AuthKey)' });
      }

      // If this user's database list is empty, restore from their Stremio cloud account
      if (db.getItems(user.id).length === 0) {
        try {
          const cloudItems = await getAccountWatchlist(authKey);
          if (Array.isArray(cloudItems) && cloudItems.length > 0) {
            for (const it of cloudItems) {
              if (!db.getItem(it.id, user.id)) await db.addItem(it, user.id);
            }
          }
        } catch (e) {}
      }

      const baseUrl = getBaseUrl(req);
      syncAddonUrlWithAccount(authKey, baseUrl, user.id).catch(() => {});

      return res.json({ success: true, authKey, user });
    }

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const authResult = await loginStremio(email, password);
    if (!authResult.success) {
      return res.status(401).json({ success: false, error: authResult.error });
    }

    const user = await db.resolveUser(authResult.authKey, () => authResult.user);
    const userId = user ? user.id : authResult.user.email;

    // Se a lista deste usuário no banco estiver vazia, restaura da nuvem do Stremio desta conta
    if (db.getItems(userId).length === 0) {
      try {
        const cloudItems = await getAccountWatchlist(authResult.authKey);
        if (Array.isArray(cloudItems) && cloudItems.length > 0) {
          for (const it of cloudItems) {
            if (!db.getItem(it.id, userId)) await db.addItem(it, userId);
          }
        }
      } catch (e) {}
    }

    const baseUrl = getBaseUrl(req);
    syncAddonUrlWithAccount(authResult.authKey, baseUrl, userId).catch(() => {});

    res.json({ success: true, authKey: authResult.authKey, user });
  } catch (err) {
    console.error('[Auth Error]', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check current logged in user (estritamente pela chave enviada pelo cliente)
app.get('/api/auth/me', async (req, res) => {
  try {
    await db.ensureLoaded();
    const authKey = getRequestAuthKey(req);
    if (!authKey) {
      return res.status(401).json({ loggedIn: false });
    }

    const user = await db.resolveUser(authKey, getUserInfo);
    if (!user || !user.id || !user.email) {
      return res.status(401).json({ loggedIn: false, error: 'Invalid or expired Stremio session' });
    }

    const userId = user.id;

    // Se a lista deste usuário no banco estiver vazia, restaura da nuvem do Stremio desta conta
    if (db.getItems(userId).length === 0) {
      try {
        const cloudItems = await getAccountWatchlist(authKey);
        if (Array.isArray(cloudItems) && cloudItems.length > 0) {
          console.log(`[Persistence:auth/me] Restaurando ${cloudItems.length} filmes da nuvem do Stremio para ${user.email} (${userId})...`);
          for (const it of cloudItems) {
            if (!db.getItem(it.id, userId)) {
              await db.addItem(it, userId);
            }
          }
        }
      } catch (cloudErr) {
        console.warn('[Persistence:auth/me] Falha ao recuperar da nuvem:', cloudErr.message);
      }
    }

    res.json({
      loggedIn: true,
      authKey,
      user: {
        id: user.id,
        email: user.email
      },
      itemsCount: db.getItems(userId).length,
      supabaseConfigured: db.isSupabaseConfigured()
    });
  } catch (err) {
    res.status(500).json({ loggedIn: false, error: err.message });
  }
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true });
});

// 1-Click Install Addon into user's Stremio account via API
app.post('/api/auth/install-account', async (req, res) => {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!authKey || !userId) {
      return res.status(401).json({ error: 'You must be signed in with your Stremio account' });
    }

    const baseUrl = getBaseUrl(req);
    const items = db.getItems(userId);
    const manifest = getManifest(baseUrl, userId);

    const success = await saveAccountWatchlist(authKey, baseUrl, items, manifest);
    if (!success) {
      return res.status(400).json({ error: 'Failed to save addon to your official Stremio account.' });
    }

    res.json({ success: true, message: 'Addon activated on your official account! It will now appear on your Smart TV and all your devices.' });
  } catch (err) {
    console.error('[Install to Account Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------------------------------------
// REST API ENDPOINTS (FOR WEB UI - ISOLADOS POR USUÁRIO)
// -------------------------------------------------------------

// List items and stats
app.get('/api/items', async (req, res) => {
  await db.ensureLoaded();
  const { authKey, userId } = await getRequestUser(req);

  // Se não estiver conectado em uma conta na sessão atual, não renderiza nenhuma lista
  if (!authKey || !userId) {
    return res.json({
      items: [],
      stats: { total: 0, ready: 0, pending: 0 },
      requireAuth: true
    });
  }

  // Se o banco deste usuário estiver vazio, busca da nuvem do Stremio desta conta
  if (db.getItems(userId).length === 0) {
    try {
      const cloudItems = await getAccountWatchlist(authKey);
      if (Array.isArray(cloudItems) && cloudItems.length > 0) {
        console.log(`[Persistence:api/items] Restaurando ${cloudItems.length} filmes da nuvem para ${userId}...`);
        for (const it of cloudItems) {
          if (!db.getItem(it.id, userId)) {
            db.addItem(it, userId);
          }
        }
      }
    } catch (e) {
      console.warn('[Persistence:api/items] Erro ao recuperar da nuvem:', e.message);
    }
  }

  const { filter, tab } = req.query;
  const effectiveFilter = tab || filter;
  let items = db.getItems(userId);
  const userSettings = db.getSettings(userId);
  const globalMinQuality = userSettings.minQuality || '1080p';

  if (effectiveFilter === 'watched') {
    items = items.filter(i => Boolean(i.isWatched));
  } else if (effectiveFilter === 'ready') {
    items = items.filter(i => !i.isWatched && db.isItemReady(i, globalMinQuality));
  } else if (effectiveFilter === 'pending') {
    items = items.filter(i => !i.isWatched && !db.isItemReady(i, globalMinQuality) && !db.isItemUnreleased(i));
  } else if (effectiveFilter === 'unreleased') {
    items = items.filter(i => !i.isWatched && db.isItemUnreleased(i));
  } else if (effectiveFilter === 'unwatched') {
    items = items.filter(i => !i.isWatched);
  }

  res.json({
    items,
    stats: db.getStats(userId),
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
    const { authKey, userId } = await getRequestUser(req);
    if (!authKey || !userId) {
      return res.status(401).json({ error: 'Please sign in with your Stremio account to add movies.' });
    }

    let { id, type = 'movie' } = req.body;
    if (!id) return res.status(400).json({ error: 'Movie ID is required (e.g. tt1234567)' });

    // Handle full IMDb URLs (e.g. https://www.imdb.com/title/tt1234567/)
    const imdbMatch = id.match(/tt\d{7,8}/i);
    if (imdbMatch) {
      id = imdbMatch[0];
    }

    // Check if already in this user's DB
    const existing = db.getItem(id, userId);
    if (existing) {
      return res.json({ success: true, item: existing, message: 'Item is already in your watchlist' });
    }

    // Fetch Cinemeta metadata
    const meta = await getMeta(type, id);
    if (!meta) {
      return res.status(404).json({ error: `Could not find metadata for ${id}` });
    }

    // Immediately check stream quality
    const quality = await checkMovieQuality(id, type);

    const saved = await db.addItem({
      id: meta.id,
      type: meta.type || type,
      name: meta.name,
      year: meta.year,
      poster: meta.poster,
      has1080pPlus: quality.has1080pPlus,
      bestQuality: quality.bestQuality,
      streamCount: quality.streamCount,
      lastChecked: quality.checkedAt
    }, userId);

    console.log(`[Watchlist:${userId}] Adicionado: ${saved.name} (${saved.id}) -> Qualidade: ${saved.bestQuality}`);

    // Atualiza automaticamente o URL codificado permanente na conta do Stremio
    const baseUrl = getBaseUrl(req);
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});

    res.json({ success: true, item: saved });
  } catch (err) {
    console.error('[Add Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// Re-check single item quality
app.post('/api/check/:id', async (req, res) => {
  try {
    const { userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const item = db.getItem(id, userId);
    if (!item) return res.status(404).json({ error: 'Item not found in watchlist' });

    const quality = await checkMovieQuality(id, item.type || 'movie');
    const wasReady = item.has1080pPlus;

    const updated = await db.updateItem(id, {
      has1080pPlus: quality.has1080pPlus,
      bestQuality: quality.bestQuality,
      streamCount: quality.streamCount,
      lastChecked: quality.checkedAt
    }, userId);

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
    const { userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { forceAll } = req.body;
    let items = db.getItems(userId);
    if (!forceAll) {
      items = items.filter(i => !i.has1080pPlus);
    }

    let newlyReady = 0;
    const results = [];

    for (const item of items) {
      const quality = await checkMovieQuality(item.id, item.type || 'movie');
      const wasReady = item.has1080pPlus;

      const updated = await db.updateItem(item.id, {
        has1080pPlus: quality.has1080pPlus,
        bestQuality: quality.bestQuality,
        streamCount: quality.streamCount,
        lastChecked: quality.checkedAt
      }, userId);

      if (!wasReady && quality.has1080pPlus) {
        newlyReady++;
      }
      results.push(updated);

      await new Promise(r => setTimeout(r, 600));
    }

    res.json({
      success: true,
      checkedCount: items.length,
      newlyReady,
      stats: db.getStats(userId)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete item
app.delete('/api/items/:id', async (req, res) => {
  const { authKey, userId } = await getRequestUser(req);
  if (!authKey || !userId) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const removed = await db.removeItem(id, userId);

  const baseUrl = getBaseUrl(req);
  syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});

  res.json({ success: removed, stats: db.getStats(userId) });
});

// Set watched status for item
app.post('/api/items/:id/watched', async (req, res) => {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!authKey || !userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { watched } = req.body;
    const updated = await db.setWatched(id, watched !== false, userId);
    if (!updated) return res.status(404).json({ error: 'Item not found in watchlist' });

    const baseUrl = getBaseUrl(req);
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});

    res.json({ success: true, item: updated, stats: db.getStats(userId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Set item-specific minimum quality target ('1080p' | '4k' | null)
app.post('/api/items/:id/min-quality', async (req, res) => {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!authKey || !userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { minQuality } = req.body;
    const updated = await db.updateItem(id, { minQuality: minQuality || null }, userId);
    if (!updated) return res.status(404).json({ error: 'Item not found in watchlist' });

    const baseUrl = getBaseUrl(req);
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});

    res.json({ success: true, item: updated, stats: db.getStats(userId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Batch sync items
app.post('/api/items/sync-batch', async (req, res) => {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!authKey || !userId) return res.status(401).json({ error: 'Unauthorized' });

    const { items: clientItems } = req.body;
    if (!Array.isArray(clientItems) || clientItems.length === 0) {
      return res.json({ success: true, count: 0, items: db.getItems(userId), stats: db.getStats(userId) });
    }

    let added = 0;
    for (const item of clientItems) {
      if (!item || !item.id) continue;
      if (!db.getItem(item.id, userId)) {
        db.addItem(item, userId);
        added++;
        if (!item.bestQuality || item.bestQuality === 'Pending' || item.bestQuality === 'Pendente' || item.bestQuality === 'Checking...' || item.bestQuality === 'Verificando...') {
          checkMovieQuality(item.id, item.type || 'movie').then(q => {
            if (q) db.updateItem(item.id, { has1080pPlus: q.has1080pPlus, bestQuality: q.bestQuality, streamCount: q.streamCount }, userId);
          }).catch(() => {});
        }
      }
    }

    if (added > 0) {
      const baseUrl = getBaseUrl(req);
      syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
    }

    res.json({ success: true, added, items: db.getItems(userId), stats: db.getStats(userId) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Settings
app.get('/api/settings', async (req, res) => {
  const { userId } = await getRequestUser(req);
  res.json(db.getSettings(userId));
});

app.post('/api/settings', async (req, res) => {
  try {
    const { authKey, userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const updated = db.updateSettings(req.body, userId);

    if (authKey) {
      const baseUrl = getBaseUrl(req);
      syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
    }

    res.json({ success: true, settings: updated });
  } catch (err) {
    console.error('[Settings Save Error]', err);
    res.status(500).json({ error: err.message });
  }
});

// System info / Cloud URLs helper
app.get('/api/info', async (req, res) => {
  await db.ensureLoaded();
  const host = req.get('host') || `localhost:${PORT}`;
  const baseUrl = getBaseUrl(req);
  const { authKey, userId } = await getRequestUser(req);
  const items = userId ? db.getItems(userId) : [];
  const encoded = authKey ? encodeUserData(authKey, items) : '';

  const manifestUrl = authKey ? `${baseUrl}/${encoded}/manifest.json` : `${baseUrl}/manifest.json`;
  const stremioInstallUrl = authKey ? `stremio://${host}/${encoded}/manifest.json` : `stremio://${host}/manifest.json`;
  const webStremioInstallUrl = `https://web.stremio.com/#/addons?addon=${encodeURIComponent(manifestUrl)}`;

  res.json({
    baseUrl,
    manifestUrl,
    stremioInstallUrl,
    webStremioInstallUrl,
    supabaseConfigured: db.isSupabaseConfigured(),
    port: PORT
  });
});

// Export database (for logged in user)
app.get('/api/export', async (req, res) => {
  const { userId } = await getRequestUser(req);
  const items = userId ? db.getItems(userId) : [];
  res.setHeader('Content-Disposition', 'attachment; filename="stremio-watchlist.json"');
  res.setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(items, null, 2));
});

// Import database (for logged in user)
app.post('/api/import', async (req, res) => {
  try {
    const { userId } = await getRequestUser(req);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid items array' });
    }
    let addedCount = 0;
    for (const item of items) {
      if (item && item.id && item.name) {
        db.addItem(item, userId);
        addedCount++;
      }
    }
    res.json({ success: true, addedCount, stats: db.getStats(userId) });
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
    await db.ensureLoaded();
    const allPending = db.getAllUsersItems().filter(entry => !entry.item.has1080pPlus);
    if (allPending.length > 0) {
      console.log(`[AutoChecker] Checking ${allPending.length} items waiting for good quality...`);
      for (const { userId, item } of allPending) {
        const quality = await checkMovieQuality(item.id, item.type || 'movie');
        if (quality.has1080pPlus) {
          console.log(`🎉 [NEW:${userId}] "${item.name}" is now available in ${quality.bestQuality}!`);
        }
        db.updateItem(item.id, {
          has1080pPlus: quality.has1080pPlus,
          bestQuality: quality.bestQuality,
          streamCount: quality.streamCount,
          count1080pPlus: quality.count1080pPlus,
          lastChecked: quality.checkedAt,
          checkError: quality.error || null
        }, userId);
        await new Promise(r => setTimeout(r, 800));
      }
    }
  } catch (err) {
    console.error('[AutoChecker Error]', err.message);
  } finally {
    backgroundCheckRunning = false;
  }
}

setInterval(runBackgroundCheck, 30 * 60 * 1000);

// SPA fallback for frontend client routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/assets') || req.path.includes('.')) {
    return res.status(404).send('Not found');
  }
  const indexPath = path.join(clientPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(indexPath);
  }
  res.status(404).send('Not found');
});

// Start server
app.listen(PORT, '0.0.0.0', async () => {
  await db.ensureLoaded(true);
  console.log(`=======================================================`);
  console.log(`🚀 STREMIO WATCHLIST (GOOD QUALITY TRACKER) RUNNING`);
  console.log(`👉 Port: ${PORT}`);
  console.log(`👉 Web Dashboard: http://localhost:${PORT}`);
  console.log(`👉 Addon Manifest: http://localhost:${PORT}/manifest.json`);
  console.log(`👉 Client Source: ${fs.existsSync(distPath) ? '⚛️ REACT BUILD (dist)' : '📁 STATIC (public)'}`);
  console.log(`👉 Database: ${db.isSupabaseConfigured() ? '🟢 SUPABASE CLOUD ACTIVE (MULTI-USER)' : '🟡 LOCAL JSON'}`);
  console.log(`=======================================================`);
});
