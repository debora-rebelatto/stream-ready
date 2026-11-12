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

function normalizeKey(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().toLowerCase();
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
  const imdbId = row.imdb_id;
  return {
    id: imdbId,
    rowId: row.id,
    userId: row.user_id, // UUID único do usuário
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

// Converte objeto da aplicação para linha relacional do Postgres
// Vincula estritamente via foreign key user_id (UUID do usuário) e imdb_id
function itemToRow(item, userUuid) {
  const imdbId = cleanImdbId(item.id || item.imdbId);
  return {
    user_id: userUuid,
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

function normalizeItem(item, userUuid) {
  const imdbId = cleanImdbId(item.id);
  return {
    id: imdbId,
    userId: userUuid || item.userId || '',
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
      usersById: {},    // uuid -> userBucket
      usersByEmail: {}, // email -> userBucket
      users: {},        // key (uuid ou email) -> userBucket
      authKeyMap: {}    // authKey -> userBucket
    };
  }
  return memoryCache;
}

function findUserBucket(identifier) {
  if (!identifier) return null;
  const cache = initMemoryCache();
  const key = normalizeKey(String(identifier));
  return cache.usersById[key] || cache.usersByEmail[key] || cache.users[key] || null;
}

function ensureUserBucket(identifier, emailFallback = '') {
  const cache = initMemoryCache();
  let bucket = findUserBucket(identifier);
  if (bucket) return bucket;

  const key = normalizeKey(String(identifier));
  const isEmail = key.includes('@');
  const email = isEmail ? key : normalizeKey(emailFallback);
  const id = !isEmail && key ? key : null;

  bucket = {
    id: id,
    email: email,
    settings: { ...DEFAULT_SETTINGS },
    items: []
  };

  if (id) {
    cache.usersById[id] = bucket;
    cache.users[id] = bucket;
  }
  if (email) {
    cache.usersByEmail[email] = bucket;
    cache.users[email] = bucket;
  }

  return bucket;
}

// -------------------------------------------------------------
// SUPABASE CLOUD OPERATIONS (PostgREST API)
// -------------------------------------------------------------

async function supabaseSaveUser(bucket) {
  if (!isSupabaseConfigured() || !bucket || !bucket.email) return false;
  try {
    const rawKey = bucket.settings?.stremioAuthKey;
    const encryptedKey = rawKey ? encryptText(rawKey) : null;

    const row = {
      email: bucket.email,
      stremio_auth_key: encryptedKey,
      updated_at: new Date().toISOString()
    };
    if (bucket.id) {
      row.id = bucket.id;
    }

    const res = await fetch(`${SUPABASE_URL}/rest/v1/watchlist_users?on_conflict=email`, {
      method: 'POST',
      headers: getSupabaseHeaders({
        Prefer: 'resolution=merge-duplicates,return=representation'
      }),
      body: JSON.stringify([row])
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Status ${res.status}: ${errText}`);
    }

    const savedRows = await res.json();
    if (Array.isArray(savedRows) && savedRows[0] && savedRows[0].id) {
      const assignedId = savedRows[0].id;
      bucket.id = assignedId;
      const cache = initMemoryCache();
      cache.usersById[assignedId] = bucket;
      cache.users[assignedId] = bucket;
    }
    return true;
  } catch (err) {
    console.error('[Supabase] Erro ao salvar usuário no banco:', err.message);
    return false;
  }
}

async function supabaseUpsertItems(items, userIdentifier) {
  let bucket = findUserBucket(userIdentifier);
  if (!isSupabaseConfigured() || !bucket || !bucket.id || !Array.isArray(items) || items.length === 0) {
    return false;
  }
  try {
    const rows = items.map(item => itemToRow(item, bucket.id));
    const res = await fetch(`${SUPABASE_URL}/rest/v1/watchlist_items?on_conflict=user_id,imdb_id`, {
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

async function supabaseDeleteItem(imdbId, userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  const cleanId = cleanImdbId(imdbId);
  if (!isSupabaseConfigured() || !bucket || !bucket.id || !cleanId) return false;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/watchlist_items?user_id=eq.${encodeURIComponent(bucket.id)}&imdb_id=eq.${encodeURIComponent(cleanId)}`,
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

/**
 * Sincroniza usuários e itens do Supabase para o cache em memória.
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
    const [itemsRes, usersRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/watchlist_items?select=*&order=added_at.desc`, {
        headers: getSupabaseHeaders()
      }),
      fetch(`${SUPABASE_URL}/rest/v1/watchlist_users?select=*`, {
        headers: getSupabaseHeaders()
      })
    ]);

    const newUsersById = {};
    const newUsersByEmail = {};
    const newUsers = {};
    const newAuthKeyMap = {};

    if (usersRes.ok) {
      const uRows = await usersRes.json();
      if (Array.isArray(uRows)) {
        for (const u of uRows) {
          const userUuid = u.id;
          const email = normalizeKey(u.email);
          if (!userUuid || !email) continue;
          const decryptedKey = u.stremio_auth_key ? decryptText(u.stremio_auth_key) : null;
          const bucket = {
            id: userUuid,
            email: email,
            settings: {
              stremioAuthKey: decryptedKey
            },
            items: []
          };
          newUsersById[userUuid] = bucket;
          newUsersByEmail[email] = bucket;
          newUsers[userUuid] = bucket;
          newUsers[email] = bucket;
          if (decryptedKey) {
            newAuthKeyMap[decryptedKey] = bucket;
          }
        }
      }
    }

    if (itemsRes.ok) {
      const rows = await itemsRes.json();
      if (Array.isArray(rows)) {
        for (const row of rows) {
          const item = rowToItem(row);
          const userUuid = row.user_id;
          let bucket = newUsersById[userUuid];
          if (!bucket && row.user_email) {
            bucket = newUsersByEmail[normalizeKey(row.user_email)];
          }
          if (bucket) {
            if (!bucket.items.some(i => i.id === item.id)) {
              bucket.items.push(item);
            }
          }
        }
      }
    }

    memoryCache.usersById = newUsersById;
    memoryCache.usersByEmail = newUsersByEmail;
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
 * Resolve uma authKey para o objeto do usuário { id: UUID, email: string }.
 * Cria o usuário com UUID único no banco se ainda não estiver cadastrado.
 */
async function resolveUser(authKey, getUserInfoFn) {
  if (!authKey || typeof authKey !== 'string') return null;
  await ensureLoaded();

  const cachedBucket = memoryCache.authKeyMap[authKey];
  if (cachedBucket && cachedBucket.id) {
    return { id: cachedBucket.id, email: cachedBucket.email };
  }

  if (typeof getUserInfoFn === 'function') {
    const stremioUser = await getUserInfoFn(authKey);
    if (stremioUser && stremioUser.email) {
      const email = normalizeKey(stremioUser.email);
      let bucket = memoryCache.usersByEmail[email];
      if (!bucket) {
        bucket = ensureUserBucket(email);
      }
      bucket.settings.stremioAuthKey = authKey;
      await supabaseSaveUser(bucket);
      memoryCache.authKeyMap[authKey] = bucket;
      return { id: bucket.id, email: bucket.email };
    }
  }
  return null;
}

// -------------------------------------------------------------
// CRUD METHODS (ISOLADOS POR USUÁRIO VIA ID ÚNICO)
// -------------------------------------------------------------

function getItems(userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  return bucket ? bucket.items : [];
}

function getAllUsersItems() {
  const cache = initMemoryCache();
  const result = [];
  const processedUids = new Set();
  for (const bucket of Object.values(cache.usersById)) {
    if (!bucket || !bucket.id || processedUids.has(bucket.id)) continue;
    processedUids.add(bucket.id);
    for (const item of bucket.items || []) {
      result.push({ userId: bucket.id, userEmail: bucket.email, item });
    }
  }
  return result;
}

function getItem(id, userIdentifier) {
  const cleanId = cleanImdbId(id);
  const items = getItems(userIdentifier);
  return items.find(item => item.id === cleanId);
}

async function addItem(item, userIdentifier) {
  let bucket = findUserBucket(userIdentifier);
  if (!bucket) {
    bucket = ensureUserBucket(userIdentifier);
    if (!bucket.id) {
      await supabaseSaveUser(bucket);
    }
  }
  if (!bucket || !bucket.id) return null;

  const cleanId = cleanImdbId(item.id);
  const existingIndex = bucket.items.findIndex(i => i.id === cleanId);
  const newItem = normalizeItem(
    {
      ...(existingIndex >= 0 ? bucket.items[existingIndex] : {}),
      ...item,
      id: cleanId
    },
    bucket.id
  );

  if (existingIndex >= 0) {
    bucket.items[existingIndex] = newItem;
  } else {
    bucket.items.unshift(newItem);
  }

  await supabaseUpsertItems([newItem], bucket.id);
  return newItem;
}

async function updateItem(id, updates, userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket || !bucket.id) return null;
  const cleanId = cleanImdbId(id);
  const index = bucket.items.findIndex(i => i.id === cleanId);
  if (index >= 0) {
    bucket.items[index] = normalizeItem({ ...bucket.items[index], ...updates, id: cleanId }, bucket.id);
    await supabaseUpsertItems([bucket.items[index]], bucket.id);
    return bucket.items[index];
  }
  return null;
}

async function removeItem(id, userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket || !bucket.id) return false;
  const cleanId = cleanImdbId(id);
  const initialLength = bucket.items.length;
  bucket.items = bucket.items.filter(i => i.id !== cleanId);
  const removed = bucket.items.length < initialLength;
  if (removed) {
    await supabaseDeleteItem(cleanId, bucket.id);
  }
  return removed;
}

function getSettings(userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket) return { ...DEFAULT_SETTINGS };
  return {
    ...DEFAULT_SETTINGS,
    ...(bucket.settings || {}),
    stremioAuthKey: bucket.settings?.stremioAuthKey ? '********' : null
  };
}

async function updateSettings(newSettings, userIdentifier) {
  let bucket = findUserBucket(userIdentifier);
  if (!bucket) {
    bucket = ensureUserBucket(userIdentifier);
  }

  const safeSettings = { ...newSettings };
  delete safeSettings.id;
  if (safeSettings.stremioAuthKey === '********' || safeSettings.stremioAuthKey === undefined) {
    delete safeSettings.stremioAuthKey;
  }

  bucket.settings = { ...DEFAULT_SETTINGS, ...bucket.settings, ...safeSettings };
  if (bucket.settings.stremioAuthKey) {
    memoryCache.authKeyMap[bucket.settings.stremioAuthKey] = bucket;
  }

  await supabaseSaveUser(bucket);
  return getSettings(bucket.id || userIdentifier);
}

function getStats(userIdentifier) {
  const items = getItems(userIdentifier);
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
  resolveUser,
  resolveUserId: async (authKey, getUserInfoFn) => {
    const u = await resolveUser(authKey, getUserInfoFn);
    return u ? u.id : null;
  },
  findUser: findUserBucket,
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
