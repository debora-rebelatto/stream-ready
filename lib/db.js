const fs = require('fs');
const path = require('path');
const { encryptText, decryptText } = require('./crypto');

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
  stremioAuthKey: null
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
    userId: row.user_id || '',
    type: row.type || 'movie',
    name: row.name || imdbId,
    year: row.year || '',
    poster: row.poster || '',
    addedAt: row.added_at || new Date().toISOString(),
    has1080pPlus: Boolean(row.has_1080p_plus),
    bestQuality: row.best_quality || 'Pending',
    streamCount: Number(row.stream_count || 0),
    lastChecked: row.last_checked || null
  };
}

// Converte objeto da aplicação (camelCase) para linha enxuta do Postgres (snake_case)
// Mantém o banco abaixo do limite de 500MB omitindo metadados pesados/redundantes
function itemToRow(item, userId) {
  const uid = normalizeUserId(userId) || item.userId;
  const imdbId = cleanImdbId(item.id);
  const rowPk = `${uid}:${imdbId}`;
  return {
    id: rowPk,
    user_id: uid,
    imdb_id: imdbId,
    type: item.type || 'movie',
    name: item.name || imdbId,
    year: item.year ? String(item.year) : '',
    poster: item.poster || '',
    added_at: item.addedAt || new Date().toISOString(),
    has_1080p_plus: Boolean(item.has1080pPlus),
    best_quality: item.bestQuality || 'Pending',
    stream_count: Number(item.streamCount || 0),
    last_checked: item.lastChecked || null
  };
}

function normalizeItem(item, userId) {
  const imdbId = cleanImdbId(item.id);
  return {
    id: imdbId,
    userId: normalizeUserId(userId) || item.userId || '',
    type: item.type || 'movie',
    name: item.name || imdbId,
    year: item.year || '',
    poster: item.poster || '',
    addedAt: item.addedAt || new Date().toISOString(),
    has1080pPlus: Boolean(item.has1080pPlus),
    bestQuality: item.bestQuality || 'Pending',
    streamCount: Number(item.streamCount || 0),
    lastChecked: item.lastChecked || null
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
  if (!isSupabaseConfigured() || !uid) return false;
  try {
    const rawKey = settings.stremioAuthKey;
    const encryptedKey = rawKey ? encryptText(rawKey) : null;

    const row = {
      id: uid,
      stremio_auth_key: encryptedKey,
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
          const uid = normalizeUserId(s.id);
          if (!uid) continue;
          const decryptedKey = s.stremio_auth_key ? decryptText(s.stremio_auth_key) : null;
          newUsers[uid] = {
            settings: {
              stremioAuthKey: decryptedKey
            },
            items: []
          };
          if (decryptedKey) {
            newAuthKeyMap[decryptedKey] = uid;
          }
        }
      }
    }

    if (itemsRes.ok) {
      const rows = await itemsRes.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const item = rowToItem(row);
          const uid = normalizeUserId(item.userId);
          if (!uid) continue;
          if (!newUsers[uid]) {
            newUsers[uid] = {
              settings: { ...DEFAULT_SETTINGS },
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
    if (!uid) continue;
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

async function addItem(item, userId) {
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

  await supabaseUpsertItems([newItem], uid);
  return newItem;
}

async function updateItem(id, updates, userId) {
  const uid = normalizeUserId(userId);
  if (!uid) return null;
  const bucket = ensureUserBucket(uid);
  const cleanId = cleanImdbId(id);
  const index = bucket.items.findIndex(i => i.id === cleanId);
  if (index >= 0) {
    bucket.items[index] = normalizeItem({ ...bucket.items[index], ...updates, id: cleanId }, uid);
    await supabaseUpsertItems([bucket.items[index]], uid);
    return bucket.items[index];
  }
  return null;
}

async function removeItem(id, userId) {
  const uid = normalizeUserId(userId);
  if (!uid) return false;
  const bucket = ensureUserBucket(uid);
  const cleanId = cleanImdbId(id);
  const initialLength = bucket.items.length;
  bucket.items = bucket.items.filter(i => i.id !== cleanId);
  const removed = bucket.items.length < initialLength;
  if (removed) {
    await supabaseDeleteItem(cleanId, uid);
  }
  return removed;
}

function getSettings(userId) {
  const uid = normalizeUserId(userId);
  if (!uid) return { ...DEFAULT_SETTINGS };
  const bucket = ensureUserBucket(uid);
  return {
    ...DEFAULT_SETTINGS,
    ...(bucket.settings || {}),
    // Mask sensitive auth key when returned to client
    stremioAuthKey: bucket.settings?.stremioAuthKey ? '********' : null
  };
}

async function updateSettings(newSettings, userId) {
  const uid = normalizeUserId(userId);
  if (!uid) return { ...DEFAULT_SETTINGS, ...newSettings };
  const bucket = ensureUserBucket(uid);

  const safeSettings = { ...newSettings };
  delete safeSettings.id;
  if (safeSettings.stremioAuthKey === '********' || safeSettings.stremioAuthKey === undefined) {
    delete safeSettings.stremioAuthKey;
  }

  bucket.settings = { ...DEFAULT_SETTINGS, ...bucket.settings, ...safeSettings };
  if (bucket.settings.stremioAuthKey) {
    memoryCache.authKeyMap[bucket.settings.stremioAuthKey] = uid;
  }

  await supabaseSaveSettings(bucket.settings, uid);
  return getSettings(uid);
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
