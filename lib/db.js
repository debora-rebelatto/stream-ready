const fs = require('fs');
const path = require('path');

// Carrega arquivo .env local automaticamente (sem depender de pacotes externos)
const ENV_FILE = path.join(__dirname, '..', '.env');
if (fs.existsSync(ENV_FILE)) {
  try {
    const envLines = fs.readFileSync(ENV_FILE, 'utf-8').split(/\r?\n/);
    for (const line of envLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch (e) {}
}

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'watchlist.json');
const BACKUP_FILE = path.join(DATA_DIR, 'backup_privado_watchlist.json');

// Configuração do Supabase via variáveis de ambiente
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

const DEFAULT_SETTINGS = {
  autoCheckIntervalMinutes: 30,
  torrentioUrl: 'https://torrentio.strem.fun',
  enabledCatalogs: ['watchlist_ready', 'watchlist_all', 'watchlist_pending'],
  stremioAuthKey: process.env.STREMIO_AUTH_KEY || null,
  stremioEmail: process.env.STREMIO_EMAIL || null
};

let memoryCache = null;
let supabaseLoaded = false;
let lastSupabaseSync = 0;
let initPromise = null;

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function getSupabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra
  };
}

// Converte linha do Postgres (snake_case) para objeto da aplicação (camelCase)
function rowToItem(row) {
  return {
    id: row.id,
    type: row.type || 'movie',
    name: row.name || row.id,
    year: row.year || '',
    poster: row.poster || '',
    banner: row.banner || '',
    genres: Array.isArray(row.genres) ? row.genres : [],
    description: row.description || '',
    imdbRating: row.imdb_rating || '',
    addedAt: row.added_at || new Date().toISOString(),
    has1080pPlus: Boolean(row.has_1080p_plus),
    bestQuality: row.best_quality || 'Pendente',
    streamCount: Number(row.stream_count || 0),
    count1080pPlus: Number(row.count_1080p_plus || 0),
    lastChecked: row.last_checked || null,
    checkError: row.check_error || null
  };
}

// Converte objeto da aplicação (camelCase) para linha do Postgres (snake_case)
function itemToRow(item) {
  return {
    id: item.id,
    type: item.type || 'movie',
    name: item.name || item.id,
    year: item.year ? String(item.year) : '',
    poster: item.poster || '',
    banner: item.banner || '',
    genres: Array.isArray(item.genres) ? item.genres : [],
    description: item.description || '',
    imdb_rating: item.imdbRating ? String(item.imdbRating) : '',
    added_at: item.addedAt || new Date().toISOString(),
    has_1080p_plus: Boolean(item.has1080pPlus),
    best_quality: item.bestQuality || 'Pendente',
    stream_count: Number(item.streamCount || 0),
    count_1080p_plus: Number(item.count1080pPlus || 0),
    last_checked: item.lastChecked || null,
    check_error: item.checkError || null
  };
}

function normalizeItem(item) {
  return {
    id: item.id,
    type: item.type || 'movie',
    name: item.name || item.id,
    year: item.year || '',
    poster: item.poster || '',
    banner: item.banner || '',
    genres: Array.isArray(item.genres) ? item.genres : [],
    description: item.description || '',
    imdbRating: item.imdbRating || '',
    addedAt: item.addedAt || new Date().toISOString(),
    has1080pPlus: Boolean(item.has1080pPlus),
    bestQuality: item.bestQuality || 'Pendente',
    streamCount: Number(item.streamCount || 0),
    count1080pPlus: Number(item.count1080pPlus || 0),
    lastChecked: item.lastChecked || null,
    checkError: item.checkError || null
  };
}

// Inicializa o arquivo local de fallback (sempre vazio por padrão, sem seeds automáticas)
function initLocalFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      settings: { ...DEFAULT_SETTINGS },
      items: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readDb() {
  if (memoryCache && Array.isArray(memoryCache.items)) {
    return memoryCache;
  }
  try {
    initLocalFiles();
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);

    memoryCache = {
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
      items: Array.isArray(parsed.items) ? parsed.items.map(normalizeItem) : []
    };
    return memoryCache;
  } catch (err) {
    console.error('[DB] Erro ao ler arquivo local:', err.message);
    memoryCache = {
      settings: { ...DEFAULT_SETTINGS },
      items: []
    };
    return memoryCache;
  }
}

function saveLocalDb(data) {
  memoryCache = data;
  try {
    initLocalFiles();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[DB] Aviso ao salvar cache em disco local:', err.message);
  }
}

// -------------------------------------------------------------
// SUPABASE CLOUD OPERATIONS (PostgREST API)
// -------------------------------------------------------------

async function supabaseUpsertItems(items) {
  if (!isSupabaseConfigured() || !Array.isArray(items) || items.length === 0) return false;
  try {
    const rows = items.map(itemToRow);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/watchlist_items?on_conflict=id`, {
      method: 'POST',
      headers: getSupabaseHeaders({
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify(rows)
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Status ${res.status}: ${errText}`);
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Erro ao salvar item(ns):', err.message);
    return false;
  }
}

async function supabaseDeleteItem(id) {
  if (!isSupabaseConfigured() || !id) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/watchlist_items?id=eq.${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders()
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Status ${res.status}: ${errText}`);
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Erro ao remover item:', err.message);
    return false;
  }
}

async function supabaseSaveSettings(settings) {
  if (!isSupabaseConfigured() || !settings) return false;
  try {
    const row = {
      id: 'default',
      auto_check_interval_minutes: Number(settings.autoCheckIntervalMinutes || 30),
      torrentio_url: settings.torrentioUrl || 'https://torrentio.strem.fun',
      enabled_catalogs: Array.isArray(settings.enabledCatalogs)
        ? settings.enabledCatalogs
        : ['watchlist_ready', 'watchlist_all', 'watchlist_pending'],
      stremio_auth_key: settings.stremioAuthKey || null,
      stremio_email: settings.stremioEmail || null,
      updated_at: new Date().toISOString()
    };

    const res = await fetch(`${SUPABASE_URL}/rest/v1/watchlist_settings?on_conflict=id`, {
      method: 'POST',
      headers: getSupabaseHeaders({
        Prefer: 'resolution=merge-duplicates,return=minimal'
      }),
      body: JSON.stringify([row])
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Status ${res.status}: ${errText}`);
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Erro ao salvar configurações:', err.message);
    return false;
  }
}

/**
 * Sincroniza dados do Supabase para a memória do servidor.
 * Se o Supabase estiver vazio na primeira execução e houver itens locais/backup, faz o seed automático.
 */
async function syncFromSupabase(force = false) {
  readDb(); // Garante que memoryCache existe
  if (!isSupabaseConfigured()) {
    return memoryCache;
  }

  const now = Date.now();
  if (!force && supabaseLoaded && now - lastSupabaseSync < 30000) {
    return memoryCache;
  }

  try {
    const [itemsRes, settingsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/watchlist_items?select=*&order=added_at.desc`, {
        headers: getSupabaseHeaders()
      }),
      fetch(`${SUPABASE_URL}/rest/v1/watchlist_settings?id=eq.default&select=*`, {
        headers: getSupabaseHeaders()
      })
    ]);

    if (itemsRes.ok) {
      const rows = await itemsRes.json();
      if (Array.isArray(rows) && rows.length > 0) {
        memoryCache.items = rows.map(rowToItem);
      } else if (memoryCache.items.length > 0) {
        // Banco Supabase está vazio, mas temos itens locais (ex: backup_privado_watchlist.json) -> envia para o Supabase!
        console.log(`[Supabase] Semeando ${memoryCache.items.length} filme(s) locais para o Supabase...`);
        await supabaseUpsertItems(memoryCache.items);
      }
    } else {
      const errText = await itemsRes.text();
      console.warn(`[Supabase] Aviso ao buscar watchlist_items (${itemsRes.status}): ${errText}`);
    }

    if (settingsRes.ok) {
      const sRows = await settingsRes.json();
      if (Array.isArray(sRows) && sRows.length > 0) {
        const s = sRows[0];
        memoryCache.settings = {
          ...DEFAULT_SETTINGS,
          ...memoryCache.settings,
          autoCheckIntervalMinutes: s.auto_check_interval_minutes ?? 30,
          torrentioUrl: s.torrentio_url || 'https://torrentio.strem.fun',
          enabledCatalogs: Array.isArray(s.enabled_catalogs)
            ? s.enabled_catalogs
            : ['watchlist_ready', 'watchlist_all', 'watchlist_pending'],
          stremioAuthKey: s.stremio_auth_key || memoryCache.settings.stremioAuthKey || process.env.STREMIO_AUTH_KEY || null,
          stremioEmail: s.stremio_email || memoryCache.settings.stremioEmail || process.env.STREMIO_EMAIL || null
        };
      } else {
        await supabaseSaveSettings(memoryCache.settings);
      }
    }

    saveLocalDb(memoryCache);
    supabaseLoaded = true;
    lastSupabaseSync = Date.now();
    return memoryCache;
  } catch (err) {
    console.error('[Supabase] Falha de conexão ao sincronizar:', err.message);
    return memoryCache;
  }
}

async function ensureLoaded(force = false) {
  if (!isSupabaseConfigured()) {
    return readDb();
  }
  if (!initPromise || force || Date.now() - lastSupabaseSync > 60000) {
    initPromise = syncFromSupabase(force).finally(() => {
      initPromise = null;
    });
  }
  return initPromise;
}

// -------------------------------------------------------------
// CRUD METHODS
// -------------------------------------------------------------

function getItems() {
  const db = readDb();
  return db.items || [];
}

function getItem(id) {
  const items = getItems();
  return items.find(item => item.id === id);
}

function addItem(item) {
  const db = readDb();
  const existingIndex = db.items.findIndex(i => i.id === item.id);
  const newItem = normalizeItem({
    ...(existingIndex >= 0 ? db.items[existingIndex] : {}),
    ...item
  });

  if (existingIndex >= 0) {
    db.items[existingIndex] = newItem;
  } else {
    db.items.unshift(newItem);
  }

  saveLocalDb(db);
  supabaseUpsertItems([newItem]).catch(() => {});
  return newItem;
}

function updateItem(id, updates) {
  const db = readDb();
  const index = db.items.findIndex(i => i.id === id);
  if (index >= 0) {
    db.items[index] = normalizeItem({ ...db.items[index], ...updates });
    saveLocalDb(db);
    supabaseUpsertItems([db.items[index]]).catch(() => {});
    return db.items[index];
  }
  return null;
}

function removeItem(id) {
  const db = readDb();
  const initialLength = db.items.length;
  db.items = db.items.filter(i => i.id !== id);
  const removed = db.items.length < initialLength;
  if (removed) {
    saveLocalDb(db);
    supabaseDeleteItem(id).catch(() => {});
  }
  return removed;
}

function getSettings() {
  const db = readDb();
  return {
    ...DEFAULT_SETTINGS,
    ...(db.settings || {})
  };
}

function updateSettings(newSettings) {
  const db = readDb();
  db.settings = { ...DEFAULT_SETTINGS, ...db.settings, ...newSettings };
  saveLocalDb(db);
  supabaseSaveSettings(db.settings).catch(() => {});
  return db.settings;
}

function getStats() {
  const items = getItems();
  const ready = items.filter(i => i.has1080pPlus).length;
  const pending = items.length - ready;
  return {
    total: items.length,
    ready,
    pending
  };
}

module.exports = {
  isSupabaseConfigured,
  ensureLoaded,
  syncFromSupabase,
  getItems,
  getItem,
  addItem,
  updateItem,
  removeItem,
  getSettings,
  updateSettings,
  getStats
};
