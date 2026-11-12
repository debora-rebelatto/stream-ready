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
  stremioAuthKey: null,
  stremioEmail: null
};

let memoryCache = null;
let supabaseLoaded = false;
let lastSupabaseSync = 0;
let initPromise = null;

function isSupabaseConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function normalizeUserId(userId) {
  if (!userId || typeof userId !== 'string') return null;
  return userId.trim().toLowerCase();
}

function cleanImdbId(rawId) {
  if (!rawId) return '';
  const str = String(rawId);
  return str.includes(':') ? str.split(':').pop() : str;
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
  const imdbId = row.imdb_id || cleanImdbId(row.id);
  return {
    id: imdbId,
    userId: row.user_id || 'initial_owner',
    type: row.type || 'movie',
    name: row.name || imdbId,
    year: row.year || '',
    poster: row.poster || '',
    banner: row.banner || '',
    genres: Array.isArray(row.genres) ? row.genres : [],
    description: row.description || '',
    imdbRating: row.imdb_rating || '',
    addedAt: row.added_at || new Date().toISOString(),
    has1080pPlus: Boolean(row.has_1080p_plus),
    bestQuality: row.best_quality || 'Pending',
    streamCount: Number(row.stream_count || 0),
    count1080pPlus: Number(row.count_1080p_plus || 0),
    lastChecked: row.last_checked || null,
    checkError: row.check_error || null
  };
}

// Converte objeto da aplicação (camelCase) para linha do Postgres (snake_case)
function itemToRow(item, userId) {
  const uid = normalizeUserId(userId) || item.userId || 'initial_owner';
  const imdbId = cleanImdbId(item.id);
  const rowPk = uid === 'initial_owner' ? imdbId : `${uid}:${imdbId}`;
  return {
    id: rowPk,
    user_id: uid,
    imdb_id: imdbId,
    type: item.type || 'movie',
    name: item.name || imdbId,
    year: item.year ? String(item.year) : '',
    poster: item.poster || '',
    banner: item.banner || '',
    genres: Array.isArray(item.genres) ? item.genres : [],
    description: item.description || '',
    imdb_rating: item.imdbRating ? String(item.imdbRating) : '',
    added_at: item.addedAt || new Date().toISOString(),
    has_1080p_plus: Boolean(item.has1080pPlus),
    best_quality: item.bestQuality || 'Pending',
    stream_count: Number(item.streamCount || 0),
    count_1080p_plus: Number(item.count1080pPlus || 0),
    last_checked: item.lastChecked || null,
    check_error: item.checkError || null
  };
}

function normalizeItem(item, userId) {
  const imdbId = cleanImdbId(item.id);
  return {
    id: imdbId,
    userId: normalizeUserId(userId) || item.userId || 'initial_owner',
    type: item.type || 'movie',
    name: item.name || imdbId,
    year: item.year || '',
    poster: item.poster || '',
    banner: item.banner || '',
    genres: Array.isArray(item.genres) ? item.genres : [],
    description: item.description || '',
    imdbRating: item.imdbRating || '',
    addedAt: item.addedAt || new Date().toISOString(),
    has1080pPlus: Boolean(item.has1080pPlus),
    bestQuality: item.bestQuality || 'Pending',
    streamCount: Number(item.streamCount || 0),
    count1080pPlus: Number(item.count1080pPlus || 0),
    lastChecked: item.lastChecked || null,
    checkError: item.checkError || null
  };
}

function initMemoryCache() {
  if (!memoryCache) {
    memoryCache = {
      users: {},
      authKeyMap: {}
    };
  }
  return memoryCache;
}

function ensureUserBucket(userId) {
  const cache = initMemoryCache();
  const uid = normalizeUserId(userId);
  if (!uid) return null;
  if (!cache.users[uid]) {
    cache.users[uid] = {
      settings: { ...DEFAULT_SETTINGS, stremioEmail: uid },
      items: []
    };
  }
  return cache.users[uid];
}

// -------------------------------------------------------------
// SUPABASE CLOUD OPERATIONS (PostgREST API)
// -------------------------------------------------------------

async function supabaseUpsertItems(items, userId) {
  const uid = normalizeUserId(userId);
  if (!isSupabaseConfigured() || !uid || !Array.isArray(items) || items.length === 0) return false;
  try {
    const rows = items.map(item => itemToRow(item, uid));
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

async function supabaseDeleteItem(imdbId, userId) {
  const uid = normalizeUserId(userId);
  const cleanId = cleanImdbId(imdbId);
  if (!isSupabaseConfigured() || !uid || !cleanId) return false;
  try {
    const compositeId = `${uid}:${cleanId}`;
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/watchlist_items?or=(id.eq.${encodeURIComponent(compositeId)},and(user_id.eq.${encodeURIComponent(uid)},imdb_id.eq.${encodeURIComponent(cleanId)}))`,
      {
        method: 'DELETE',
        headers: getSupabaseHeaders()
      }
    );
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

async function supabaseSaveSettings(settings, userId) {
  const uid = normalizeUserId(userId || settings?.stremioEmail);
  if (!isSupabaseConfigured() || !uid || !settings) return false;
  try {
    const row = {
      id: uid,
      auto_check_interval_minutes: Number(settings.autoCheckIntervalMinutes || 30),
      torrentio_url: settings.torrentioUrl || 'https://torrentio.strem.fun',
      enabled_catalogs: Array.isArray(settings.enabledCatalogs)
        ? settings.enabledCatalogs
        : ['watchlist_ready', 'watchlist_all', 'watchlist_pending'],
      stremio_auth_key: settings.stremioAuthKey || null,
      stremio_email: uid,
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
 * Se os 13 filmes iniciais ainda estiverem sob 'initial_owner' e o usuário da conta principal logar,
 * transfere a posse desses filmes exclusivamente para a conta principal.
 */
async function claimInitialOwnerIfNeeded(userId) {
  const uid = normalizeUserId(userId);
  if (!uid || uid === 'initial_owner' || uid === 'debyr.dbr@gmail.com') return;

  const cache = initMemoryCache();
  const initialBucket = cache.users['initial_owner'];
  const userBucket = ensureUserBucket(uid);

  if (initialBucket && initialBucket.items.length > 0 && userBucket.items.length === 0) {
    console.log(`[Supabase] Associando ${initialBucket.items.length} filme(s) da conta inicial para ${uid}...`);
    const claimedItems = initialBucket.items.map(it => normalizeItem(it, uid));
    userBucket.items = claimedItems;
    delete cache.users['initial_owner'];

    if (isSupabaseConfigured()) {
      await supabaseUpsertItems(claimedItems, uid);
      // Remove os registros antigos com id sem prefixo ('initial_owner')
      await fetch(`${SUPABASE_URL}/rest/v1/watchlist_items?user_id=eq.initial_owner`, {
        method: 'DELETE',
        headers: getSupabaseHeaders()
      }).catch(() => {});
    }
  }
}

/**
 * Sincroniza todos os itens e configurações por usuário do Supabase para a memória.
 */
async function syncFromSupabase(force = false) {
  initMemoryCache();
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
      fetch(`${SUPABASE_URL}/rest/v1/watchlist_settings?select=*`, {
        headers: getSupabaseHeaders()
      })
    ]);

    const newUsers = {};
    const newAuthKeyMap = { ...memoryCache.authKeyMap };

    if (settingsRes.ok) {
      const sRows = await settingsRes.json();
      if (Array.isArray(sRows)) {
        for (const s of sRows) {
          const uid = normalizeUserId(s.stremio_email || (s.id !== 'default' ? s.id : null));
          if (!uid) continue;
          newUsers[uid] = {
            settings: {
              ...DEFAULT_SETTINGS,
              autoCheckIntervalMinutes: s.auto_check_interval_minutes ?? 30,
              torrentioUrl: s.torrentio_url || 'https://torrentio.strem.fun',
              enabledCatalogs: Array.isArray(s.enabled_catalogs)
                ? s.enabled_catalogs
                : ['watchlist_ready', 'watchlist_all', 'watchlist_pending'],
              stremioAuthKey: s.stremio_auth_key || null,
              stremioEmail: uid
            },
            items: []
          };
          if (s.stremio_auth_key) {
            newAuthKeyMap[s.stremio_auth_key] = uid;
          }
        }
      }
    }

    if (itemsRes.ok) {
      const rows = await itemsRes.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const item = rowToItem(row);
          const uid = normalizeUserId(item.userId) || 'initial_owner';
          if (!newUsers[uid]) {
            newUsers[uid] = {
              settings: { ...DEFAULT_SETTINGS, stremioEmail: uid },
              items: []
            };
          }
          // Evita duplicatas de mesmo imdb_id para o mesmo usuário
          if (!newUsers[uid].items.some(i => i.id === item.id)) {
            newUsers[uid].items.push(item);
          }
        }
      }
    }

    memoryCache.users = newUsers;
    memoryCache.authKeyMap = newAuthKeyMap;
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
    return initMemoryCache();
  }
  if (!initPromise || force || Date.now() - lastSupabaseSync > 30000) {
    initPromise = syncFromSupabase(force).finally(() => {
      initPromise = null;
    });
  }
  return initPromise;
}

/**
 * Resolve uma authKey do Stremio para o userId (e-mail em minúsculas) correspondente.
 */
async function resolveUserId(authKey, getUserInfoFn) {
  if (!authKey || typeof authKey !== 'string') return null;
  await ensureLoaded();

  const cachedUid = memoryCache.authKeyMap[authKey];
  if (cachedUid) {
    await claimInitialOwnerIfNeeded(cachedUid);
    return cachedUid;
  }

  if (typeof getUserInfoFn === 'function') {
    const user = await getUserInfoFn(authKey);
    if (user && user.email) {
      const uid = normalizeUserId(user.email);
      memoryCache.authKeyMap[authKey] = uid;
      const bucket = ensureUserBucket(uid);
      bucket.settings.stremioAuthKey = authKey;
      bucket.settings.stremioEmail = uid;
      await claimInitialOwnerIfNeeded(uid);
      supabaseSaveSettings(bucket.settings, uid).catch(() => {});
      return uid;
    }
  }
  return null;
}

// -------------------------------------------------------------
// CRUD METHODS (ISOLADOS POR USUÁRIO)
// -------------------------------------------------------------

function getItems(userId) {
  const uid = normalizeUserId(userId);
  if (!uid) return [];
  const bucket = ensureUserBucket(uid);
  return bucket ? bucket.items : [];
}

function getAllUsersItems() {
  const cache = initMemoryCache();
  const result = [];
  for (const [uid, bucket] of Object.entries(cache.users)) {
    if (uid === 'initial_owner') continue;
    for (const item of bucket.items || []) {
      result.push({ userId: uid, item });
    }
  }
  return result;
}

function getItem(id, userId) {
  const cleanId = cleanImdbId(id);
  const items = getItems(userId);
  return items.find(item => item.id === cleanId);
}

function addItem(item, userId) {
  const uid = normalizeUserId(userId || item?.userId);
  if (!uid) return null;
  const bucket = ensureUserBucket(uid);
  const cleanId = cleanImdbId(item.id);
  const existingIndex = bucket.items.findIndex(i => i.id === cleanId);
  const newItem = normalizeItem(
    {
      ...(existingIndex >= 0 ? bucket.items[existingIndex] : {}),
      ...item,
      id: cleanId
    },
    uid
  );

  if (existingIndex >= 0) {
    bucket.items[existingIndex] = newItem;
  } else {
    bucket.items.unshift(newItem);
  }

  supabaseUpsertItems([newItem], uid).catch(() => {});
  return newItem;
}

function updateItem(id, updates, userId) {
  const uid = normalizeUserId(userId);
  if (!uid) return null;
  const bucket = ensureUserBucket(uid);
  const cleanId = cleanImdbId(id);
  const index = bucket.items.findIndex(i => i.id === cleanId);
  if (index >= 0) {
    bucket.items[index] = normalizeItem({ ...bucket.items[index], ...updates, id: cleanId }, uid);
    supabaseUpsertItems([bucket.items[index]], uid).catch(() => {});
    return bucket.items[index];
  }
  return null;
}

function removeItem(id, userId) {
  const uid = normalizeUserId(userId);
  if (!uid) return false;
  const bucket = ensureUserBucket(uid);
  const cleanId = cleanImdbId(id);
  const initialLength = bucket.items.length;
  bucket.items = bucket.items.filter(i => i.id !== cleanId);
  const removed = bucket.items.length < initialLength;
  if (removed) {
    supabaseDeleteItem(cleanId, uid).catch(() => {});
  }
  return removed;
}

function getSettings(userId) {
  const uid = normalizeUserId(userId);
  if (!uid) return { ...DEFAULT_SETTINGS };
  const bucket = ensureUserBucket(uid);
  return {
    ...DEFAULT_SETTINGS,
    ...(bucket.settings || {})
  };
}

function updateSettings(newSettings, userId) {
  const uid = normalizeUserId(userId || newSettings?.stremioEmail);
  if (!uid) return { ...DEFAULT_SETTINGS, ...newSettings };
  const bucket = ensureUserBucket(uid);
  bucket.settings = { ...DEFAULT_SETTINGS, ...bucket.settings, ...newSettings, stremioEmail: uid };
  if (bucket.settings.stremioAuthKey) {
    memoryCache.authKeyMap[bucket.settings.stremioAuthKey] = uid;
  }
  supabaseSaveSettings(bucket.settings, uid).catch(() => {});
  return bucket.settings;
}

function getStats(userId) {
  const items = getItems(userId);
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
  resolveUserId,
  claimInitialOwnerIfNeeded,
  getItems,
  getAllUsersItems,
  getItem,
  addItem,
  updateItem,
  removeItem,
  getSettings,
  updateSettings,
  getStats
};
