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
  stremioAuthKey: null,
  minQuality: '1080p', // '1080p' ou '4k'
  autoSyncWatched: false, // Sincronização automática em background desativada por padrão
  trackWatchlistWatched: true, // Rastrear filmes da lista assistidos após adição (ativo por padrão)
  syncPreviouslyWatched: false // Sincronizar filmes assistidos anteriormente no Stremio (desativado por padrão)
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

function isItemReady(item, globalMinQuality = '1080p') {
  if (!item) return false;
  const target = item.minQuality || globalMinQuality || '1080p';
  const rawQuality = String(item.bestQuality || '').toLowerCase();
  if (target === '4k') {
    return rawQuality.includes('4k') || rawQuality.includes('2160p') || rawQuality.includes('uhd');
  }
  return Boolean(item.has1080pPlus);
}

function isItemUnreleased(item) {
  if (!item || item.has1080pPlus || item.isWatched) return false;
  const q = String(item.bestQuality || '').toLowerCase();
  if (q.includes('unreleased') || q.includes('not released') || q.includes('unavailable') || q.includes('não lançado') || q.includes('indisponível')) return true;
  if ((!item.streamCount || item.streamCount === 0) && !q.includes('cam')) return true;
  return false;
}

// Converte linha do Postgres (snake_case) para objeto da aplicação (camelCase)
function rowToItem(row) {
  const imdbId = row.imdb_id;
  const has1080pPlus = Boolean(row.has_1080p_plus);
  return {
    id: imdbId,
    rowId: row.id,
    userId: row.user_id, // UUID único do usuário
    type: 'movie',
    name: row.name || imdbId,
    year: row.year || '',
    poster: row.poster || '',
    imdbRating: row.imdb_rating || row.imdbRating || '',
    addedAt: row.added_at || new Date().toISOString(),
    has1080pPlus,
    bestQuality: row.best_quality || 'Pending',
    streamCount: Number(row.stream_count || 0),
    lastChecked: row.last_checked || null,
    readyAt: row.ready_at || (has1080pPlus ? row.last_checked || row.added_at : null),
    isWatched: Boolean(row.is_watched),
    watchedAt: row.watched_at || null,
    minQuality: row.min_quality || null,
    customLists: Array.isArray(row.custom_lists) ? row.custom_lists : []
  };
}

// Converte objeto da aplicação para linha relacional do Postgres
function itemToRow(item, userUuid) {
  const imdbId = cleanImdbId(item.id || item.imdbId);
  const has1080pPlus = Boolean(item.has1080pPlus);
  return {
    user_id: userUuid,
    imdb_id: imdbId,
    name: item.name || imdbId,
    year: item.year ? String(item.year) : '',
    poster: item.poster || '',
    added_at: item.addedAt || new Date().toISOString(),
    has_1080p_plus: has1080pPlus,
    best_quality: item.bestQuality || 'Pending',
    stream_count: Number(item.streamCount || 0),
    last_checked: item.lastChecked || null,
    ready_at: has1080pPlus ? (item.readyAt || new Date().toISOString()) : null,
    is_watched: Boolean(item.isWatched),
    watched_at: item.watchedAt || null,
    min_quality: item.minQuality || null,
    custom_lists: Array.isArray(item.customLists) ? item.customLists : []
  };
}

function normalizeItem(item, userUuid) {
  const imdbId = cleanImdbId(item.id);
  const has1080pPlus = Boolean(item.has1080pPlus);
  const readyAt = has1080pPlus ? (item.readyAt || new Date().toISOString()) : null;
  return {
    id: imdbId,
    userId: userUuid || item.userId || '',
    type: 'movie',
    name: item.name || imdbId,
    year: item.year || '',
    poster: item.poster || '',
    imdbRating: item.imdbRating ? String(item.imdbRating) : (item.imdb_rating ? String(item.imdb_rating) : ''),
    addedAt: item.addedAt || new Date().toISOString(),
    has1080pPlus,
    bestQuality: item.bestQuality || 'Pending',
    streamCount: Number(item.streamCount || 0),
    lastChecked: item.lastChecked || null,
    readyAt,
    isWatched: Boolean(item.isWatched),
    watchedAt: item.watchedAt || null,
    minQuality: item.minQuality || null,
    customLists: Array.isArray(item.customLists) ? item.customLists : (Array.isArray(item.custom_lists) ? item.custom_lists : [])
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
    items: [],
    customLists: []
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
      min_quality: bucket.settings?.minQuality || '1080p',
      auto_sync_watched: Boolean(bucket.settings?.autoSyncWatched),
      track_watchlist_watched: bucket.settings?.trackWatchlistWatched !== false,
      sync_previously_watched: Boolean(bucket.settings?.syncPreviouslyWatched),
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
    const [itemsRes, usersRes, listsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/watchlist_items?select=*&order=added_at.desc`, {
        headers: getSupabaseHeaders()
      }),
      fetch(`${SUPABASE_URL}/rest/v1/watchlist_users?select=*`, {
        headers: getSupabaseHeaders()
      }),
      fetch(`${SUPABASE_URL}/rest/v1/watchlist_custom_lists?select=*&order=created_at.asc`, {
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
              stremioAuthKey: decryptedKey,
              minQuality: u.min_quality || '1080p',
              autoSyncWatched: Boolean(u.auto_sync_watched),
              trackWatchlistWatched: u.track_watchlist_watched !== false,
              syncPreviouslyWatched: Boolean(u.sync_previously_watched)
            },
            items: [],
            customLists: []
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

    if (listsRes && listsRes.ok) {
      const lRows = await listsRes.json();
      if (Array.isArray(lRows)) {
        for (const l of lRows) {
          const userUuid = l.user_id;
          const bucket = newUsersById[userUuid];
          if (bucket) {
            bucket.customLists.push({
              id: l.id,
              userId: l.user_id,
              name: l.name,
              emoji: l.emoji || '🎬',
              createdAt: l.created_at,
              updatedAt: l.updated_at
            });
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
          const bucket = newUsersById[userUuid];
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
async function resolveUser(identifier, getUserInfoFn) {
  if (!identifier || typeof identifier !== 'string') return null;
  await ensureLoaded();

  // 1. Check if identifier is already a userId (UUID) or email
  const directBucket = findUserBucket(identifier);
  if (directBucket && directBucket.id) {
    return { id: directBucket.id, email: directBucket.email };
  }

  // 2. Check if authKey is in cache map
  const cachedBucket = memoryCache.authKeyMap[identifier];
  if (cachedBucket && cachedBucket.id) {
    return { id: cachedBucket.id, email: cachedBucket.email };
  }

  // 3. If it's a Stremio authKey, resolve via Stremio API
  if (typeof getUserInfoFn === 'function') {
    const stremioUser = await getUserInfoFn(identifier);
    if (stremioUser && stremioUser.email) {
      const email = normalizeKey(stremioUser.email);
      let bucket = memoryCache.usersByEmail[email];
      if (!bucket) {
        bucket = ensureUserBucket(email);
      }
      bucket.settings.stremioAuthKey = identifier;
      await supabaseSaveUser(bucket);
      memoryCache.authKeyMap[identifier] = bucket;
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

function getAllUsers() {
  const cache = initMemoryCache();
  const users = [];
  const processed = new Set();
  for (const bucket of Object.values(cache.usersById)) {
    if (!bucket || !bucket.id || processed.has(bucket.id)) continue;
    processed.add(bucket.id);
    users.push({
      id: bucket.id,
      email: bucket.email,
      authKey: bucket.settings?.stremioAuthKey || null,
      settings: bucket.settings || {}
    });
  }
  return users;
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

async function setWatched(id, isWatched, userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket || !bucket.id) return null;
  const cleanId = cleanImdbId(id);
  const index = bucket.items.findIndex(i => i.id === cleanId);
  if (index >= 0) {
    const item = bucket.items[index];
    item.isWatched = Boolean(isWatched);
    item.watchedAt = isWatched ? new Date().toISOString() : null;
    await supabaseUpsertItems([item], bucket.id);
    return item;
  }
  return null;
}

function getSettings(userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket) return { ...DEFAULT_SETTINGS };
  return {
    ...DEFAULT_SETTINGS,
    ...(bucket.settings || {}),
    stremioAuthKey: bucket.settings?.stremioAuthKey ? '********' : null,
    minQuality: bucket.settings?.minQuality || '1080p',
    autoSyncWatched: Boolean(bucket.settings?.autoSyncWatched)
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
  if (safeSettings.autoSyncWatched !== undefined) {
    safeSettings.autoSyncWatched = Boolean(safeSettings.autoSyncWatched);
  }

  bucket.settings = { ...DEFAULT_SETTINGS, ...bucket.settings, ...safeSettings };
  if (bucket.settings.stremioAuthKey) {
    memoryCache.authKeyMap[bucket.settings.stremioAuthKey] = bucket;
  }

  await supabaseSaveUser(bucket);
  return getSettings(bucket.id || userIdentifier);
}

function getStats(userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  const items = bucket ? bucket.items : [];
  const minQuality = bucket?.settings?.minQuality || '1080p';

  const unwatched = items.filter(i => !i.isWatched);
  const watched = items.filter(i => i.isWatched).length;

  const ready = unwatched.filter(i => isItemReady(i, minQuality)).length;
  const unreleased = unwatched.filter(i => !isItemReady(i, minQuality) && isItemUnreleased(i)).length;
  const pending = unwatched.filter(i => !isItemReady(i, minQuality) && !isItemUnreleased(i)).length;

  return {
    total: unwatched.length,
    ready,
    pending,
    unreleased,
    watched
  };
}

async function syncWatchedWithStremio(authKey, userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket || !bucket.id || !authKey) {
    return { count: 0, newlyMarked: 0, newlyAdded: 0, totalWatched: 0, stats: getStats(userIdentifier) };
  }

  const { getStremioWatchedMovies } = require('./stremioAuth');
  const watchedFromStremio = await getStremioWatchedMovies(authKey);
  if (!Array.isArray(watchedFromStremio) || watchedFromStremio.length === 0) {
    return {
      count: 0,
      newlyMarked: 0,
      newlyAdded: 0,
      totalWatched: bucket.items.filter(i => i.isWatched).length,
      stats: getStats(bucket.id)
    };
  }

  const itemsToUpsert = [];
  let newlyMarked = 0;
  let newlyAdded = 0;
  const { getMeta } = require('./cinemeta');

  for (const watchedItem of watchedFromStremio) {
    const cleanId = cleanImdbId(watchedItem.id);
    const existingIndex = bucket.items.findIndex(i => i.id === cleanId);

    // Se o item do Stremio vier sem ano, busca da Cinemeta
    if ((!watchedItem.year || String(watchedItem.year).trim() === '') && cleanId) {
      try {
        const meta = await getMeta(watchedItem.type || 'movie', cleanId);
        if (meta && meta.year) {
          watchedItem.year = String(meta.year);
          if (meta.name && (!watchedItem.name || watchedItem.name === cleanId)) {
            watchedItem.name = meta.name;
          }
          if (meta.poster && !watchedItem.poster) {
            watchedItem.poster = meta.poster;
          }
          if (meta.imdbRating) {
            watchedItem.imdbRating = String(meta.imdbRating);
          }
        }
      } catch (e) {}
    }

    if (existingIndex >= 0) {
      const existing = bucket.items[existingIndex];
      let changed = false;
      if (!existing.isWatched) {
        existing.isWatched = true;
        existing.watchedAt = watchedItem.watchedAt || new Date().toISOString();
        changed = true;
        newlyMarked++;
      }
      if (!existing.year && watchedItem.year) {
        existing.year = watchedItem.year;
        changed = true;
      }
      if (!existing.imdbRating && watchedItem.imdbRating) {
        existing.imdbRating = watchedItem.imdbRating;
        changed = true;
      }
      if (changed) {
        itemsToUpsert.push(existing);
      }
    } else {
      const newItem = normalizeItem(
        {
          ...watchedItem,
          id: cleanId,
          isWatched: true
        },
        bucket.id
      );
      bucket.items.push(newItem);
      itemsToUpsert.push(newItem);
      newlyAdded++;
    }
  }

  if (itemsToUpsert.length > 0) {
    await supabaseUpsertItems(itemsToUpsert, bucket.id);
  }

  return {
    count: itemsToUpsert.length,
    newlyMarked,
    newlyAdded,
    totalWatched: bucket.items.filter(i => i.isWatched).length,
    stats: getStats(bucket.id)
  };
}

// -------------------------------------------------------------
// CUSTOM LISTS (LISTAS PERSONALIZADAS POR USUÁRIO)
// -------------------------------------------------------------

function getCustomLists(userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  return bucket && Array.isArray(bucket.customLists) ? bucket.customLists : [];
}

async function createCustomList(userIdentifier, { name, emoji = '🎬' }) {
  let bucket = findUserBucket(userIdentifier);
  if (!bucket) {
    bucket = ensureUserBucket(userIdentifier);
    if (!bucket.id) await supabaseSaveUser(bucket);
  }
  if (!bucket || !bucket.id) throw new Error('User not found');

  const listName = (name || '').trim();
  if (!listName) throw new Error('Nome da lista é obrigatório');

  const row = {
    user_id: bucket.id,
    name: listName,
    emoji: emoji || '🎬',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (isSupabaseConfigured()) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/watchlist_custom_lists`, {
      method: 'POST',
      headers: getSupabaseHeaders({
        Prefer: 'return=representation'
      }),
      body: JSON.stringify([row])
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro ao criar lista no Supabase: ${errText}`);
    }

    const saved = await res.json();
    if (Array.isArray(saved) && saved[0] && saved[0].id) {
      row.id = saved[0].id;
    }
  } else {
    row.id = 'list_' + Date.now();
  }

  const listObj = {
    id: row.id,
    userId: bucket.id,
    name: row.name,
    emoji: row.emoji,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (!Array.isArray(bucket.customLists)) {
    bucket.customLists = [];
  }
  bucket.customLists.push(listObj);
  return listObj;
}

async function updateCustomList(userIdentifier, listId, { name, emoji }) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket || !bucket.id) throw new Error('User not found');

  if (!Array.isArray(bucket.customLists)) bucket.customLists = [];
  const listIndex = bucket.customLists.findIndex(l => l.id === listId);
  if (listIndex === -1) throw new Error('Lista não encontrada');

  const updatedName = name !== undefined ? name.trim() : bucket.customLists[listIndex].name;
  const updatedEmoji = emoji !== undefined ? emoji : bucket.customLists[listIndex].emoji;
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/watchlist_custom_lists?id=eq.${encodeURIComponent(listId)}&user_id=eq.${encodeURIComponent(bucket.id)}`, {
      method: 'PATCH',
      headers: getSupabaseHeaders(),
      body: JSON.stringify({
        name: updatedName,
        emoji: updatedEmoji,
        updated_at: now
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro ao atualizar lista no Supabase: ${errText}`);
    }
  }

  bucket.customLists[listIndex].name = updatedName;
  bucket.customLists[listIndex].emoji = updatedEmoji;
  bucket.customLists[listIndex].updatedAt = now;
  return bucket.customLists[listIndex];
}

async function deleteCustomList(userIdentifier, listId) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket || !bucket.id) throw new Error('User not found');

  if (isSupabaseConfigured()) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/watchlist_custom_lists?id=eq.${encodeURIComponent(listId)}&user_id=eq.${encodeURIComponent(bucket.id)}`, {
      method: 'DELETE',
      headers: getSupabaseHeaders()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Erro ao deletar lista no Supabase: ${errText}`);
    }
  }

  bucket.customLists = (bucket.customLists || []).filter(l => l.id !== listId);

  // Remove listId de todos os filmes que a continham
  const affectedItems = [];
  for (const item of bucket.items || []) {
    if (Array.isArray(item.customLists) && item.customLists.includes(listId)) {
      item.customLists = item.customLists.filter(id => id !== listId);
      affectedItems.push(item);
    }
  }
  if (affectedItems.length > 0) {
    await supabaseUpsertItems(affectedItems, bucket.id);
  }

  return true;
}

async function setItemCustomLists(userIdentifier, imdbId, listIds) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket || !bucket.id) throw new Error('User not found');
  const cleanId = cleanImdbId(imdbId);
  const item = (bucket.items || []).find(i => i.id === cleanId);
  if (!item) throw new Error('Filme não encontrado na sua watchlist');

  const validListIds = Array.isArray(listIds) ? listIds.map(String) : [];
  item.customLists = validListIds;

  await supabaseUpsertItems([item], bucket.id);
  return item;
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
  getAllUsers,
  getAllUsersItems,
  getItem,
  addItem,
  updateItem,
  removeItem,
  setWatched,
  syncWatchedWithStremio,
  getCustomLists,
  createCustomList,
  updateCustomList,
  deleteCustomList,
  setItemCustomLists,
  getSettings,
  updateSettings,
  getStats,
  isItemReady,
  isItemUnreleased
};
