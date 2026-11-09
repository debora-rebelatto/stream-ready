const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');
const db = require('./lib/db');
const { checkMovieQuality } = require('./lib/qualityChecker');
const { searchMovies, getMeta } = require('./lib/cinemeta');
const { getManifest, handleCatalog, handleMeta } = require('./lib/stremioAddon');

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

// Helper to find the best local LAN IP address
function getPrimaryLocalIp() {
  const interfaces = os.networkInterfaces();
  let bestIp = null;
  for (const [name, addrs] of Object.entries(interfaces)) {
    if (/virtual|vmware|vbox|loopback/i.test(name)) continue;
    for (const net of addrs) {
      if (net.family === 'IPv4' && !net.internal) {
        if (/^192\.168\.(?!56\.)|^10\.|^172\.(1[6-9]|2\d|3[01])\./.test(net.address)) {
          return net.address;
        }
        if (!bestIp) bestIp = net.address;
      }
    }
  }
  return bestIp || 'localhost';
}

// Helper to determine base URL
function getBaseUrl(req) {
  const host = req.get('host') || `localhost:${PORT}`;
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  return `${protocol}://${host}`;
}

// -------------------------------------------------------------
// STREMIO ADDON ENDPOINTS
// -------------------------------------------------------------

// Manifest
app.get('/manifest.json', (req, res) => {
  const manifest = getManifest(getBaseUrl(req));
  res.json(manifest);
});

// Configure redirect (Stremio configure button)
app.get('/configure', (req, res) => {
  res.redirect('/');
});

// Catalog routes
// Supports: /catalog/:type/:id.json and /catalog/:type/:id/:extra.json
const catalogHandler = async (req, res) => {
  try {
    const { type, id } = req.params;
    let extra = {};

    // Extra parameters can be in req.params.extra (e.g. "skip=100")
    if (req.params.extra) {
      const parts = req.params.extra.replace(/\.json$/, '').split('&');
      for (const part of parts) {
        const [k, v] = part.split('=');
        if (k && v) extra[k] = decodeURIComponent(v);
      }
    }

    const cleanId = id.replace(/\.json$/, '');
    const data = await handleCatalog(type, cleanId, extra);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.json(data);
  } catch (err) {
    console.error('[Catalog Error]', err);
    res.status(500).json({ metas: [] });
  }
};

app.get('/catalog/:type/:id.json', catalogHandler);
app.get('/catalog/:type/:id/:extra.json', catalogHandler);

// Meta route
app.get('/meta/:type/:id.json', async (req, res) => {
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
});

// -------------------------------------------------------------
// REST API ENDPOINTS (FOR WEB UI)
// -------------------------------------------------------------

// List items and stats
app.get('/api/items', (req, res) => {
  const { filter } = req.query;
  let items = db.getItems();

  if (filter === 'ready') {
    items = items.filter(i => i.has1080pPlus);
  } else if (filter === 'pending') {
    items = items.filter(i => !i.has1080pPlus);
  }

  res.json({
    items,
    stats: db.getStats()
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

app.post('/api/settings', (req, res) => {
  const updated = db.updateSettings(req.body);
  res.json({ success: true, settings: updated });
});

// System info / Local URLs helper
app.get('/api/info', (req, res) => {
  const baseUrl = getBaseUrl(req);
  const lanIp = getPrimaryLocalIp();
  const lanBaseUrl = `http://${lanIp}:${PORT}`;

  res.json({
    baseUrl,
    lanIp,
    lanBaseUrl,
    manifestUrl: `${baseUrl}/manifest.json`,
    lanManifestUrl: `${lanBaseUrl}/manifest.json`,
    stremioInstallUrl: `stremio://${req.get('host') || `localhost:${PORT}`}/manifest.json`,
    lanStremioInstallUrl: `stremio://${lanIp}:${PORT}/manifest.json`,
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
  const lanIp = getPrimaryLocalIp();
  console.log(`=======================================================`);
  console.log(`🚀 STREMIO WATCHLIST (1080p+ TRACKER) RODANDO`);
  console.log(`💻 No PC (Painel Web):  http://localhost:${PORT}`);
  console.log(`📺 Na TV (Rede Local):  http://${lanIp}:${PORT}/manifest.json`);
  console.log(`📱 No Celular (Painel): http://${lanIp}:${PORT}`);
  console.log(`🔗 Link Direto Stremio: stremio://${lanIp}:${PORT}/manifest.json`);
  console.log(`=======================================================`);
});

