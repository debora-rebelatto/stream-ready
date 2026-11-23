const fs = require('fs');
const path = require('path');

// Auto-load local .env file (skipped during Jest test runs)
const IS_TEST_ENV = process.env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);
const ENV_FILE = path.join(__dirname, '..', '..', '.env');

if (!IS_TEST_ENV && fs.existsSync(ENV_FILE)) {
  try {
    const envLines = fs.readFileSync(ENV_FILE, 'utf-8').split(/\r?\n/);
    for (const line of envLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed
          .slice(eqIdx + 1)
          .trim()
          .replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  } catch (err) {
    console.warn('[DB] Failed to load local .env:', err.message);
  }
}

// Supabase configuration from environment variables
const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  '';

const DB_CACHE_TTL_MS = parseInt(process.env.DB_CACHE_TTL_MS || '180000', 10);

function isSupabaseConfigured() {
  if (IS_TEST_ENV) return false;
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

function getSupabaseHeaders(extra = {}) {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  };
}

/**
 * Fetches all paginated rows from a Supabase PostgREST table path when row count exceeds 1000.
 */
async function fetchAllSupabaseRows(tablePath) {
  const pageSize = 1000;
  let offset = 0;
  const allRows = [];
  while (true) {
    const sep = tablePath.includes('?') ? '&' : '?';
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${tablePath}${sep}limit=${pageSize}&offset=${offset}`,
      {
        headers: getSupabaseHeaders(),
      }
    );
    if (!res.ok) {
      if (offset === 0) return null;
      break;
    }
    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    allRows.push(...rows);
    if (rows.length < pageSize) break;
    offset += pageSize;
  }
  return allRows;
}

module.exports = {
  IS_TEST_ENV,
  SUPABASE_URL,
  SUPABASE_KEY,
  DB_CACHE_TTL_MS,
  isSupabaseConfigured,
  getSupabaseHeaders,
  fetchAllSupabaseRows,
};
