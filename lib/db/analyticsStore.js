const { SUPABASE_URL, isSupabaseConfigured, getSupabaseHeaders } = require('./supabaseClient');
const { isExcludedTrackingUserId } = require('./memoryStore');

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function normalizeUuidOrNull(value) {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  return UUID_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * Records a first-party telemetry/analytics event in Supabase public.analytics_events.
 */
async function recordAnalyticsEvent(eventName, metadata = {}, userId = null) {
  if (!eventName || typeof eventName !== 'string') return false;
  if (!isSupabaseConfigured()) return false;
  if (isExcludedTrackingUserId(userId)) {
    return false;
  }
  try {
    const validUserId = normalizeUuidOrNull(userId);
    const row = {
      event_name: eventName.trim(),
      metadata: metadata && typeof metadata === 'object' ? metadata : {},
      user_id: validUserId,
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
      method: 'POST',
      headers: getSupabaseHeaders({
        Prefer: 'return=minimal',
      }),
      body: JSON.stringify([row]),
    });

    // If a user was concurrently deleted or not yet persisted, retry anonymously
    // rather than failing with a 409 / 23503 foreign key violation.
    if (!res.ok && res.status === 409 && validUserId) {
      const fallbackRes = await fetch(`${SUPABASE_URL}/rest/v1/analytics_events`, {
        method: 'POST',
        headers: getSupabaseHeaders({
          Prefer: 'return=minimal',
        }),
        body: JSON.stringify([{ ...row, user_id: null }]),
      });
      return fallbackRes.ok;
    }

    return res.ok;
  } catch (err) {
    console.error('[Analytics] Error recording event to Supabase:', err.message);
    return false;
  }
}

/**
 * Returns aggregated counts of recorded analytics events.
 */
async function getAnalyticsStats() {
  if (!isSupabaseConfigured()) return {};
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/analytics_events?select=event_name,created_at&order=created_at.desc&limit=5000`,
      {
        method: 'GET',
        headers: getSupabaseHeaders(),
      }
    );
    if (!res.ok) return {};
    const rows = await res.json();
    const counts = {};
    for (const r of rows) {
      counts[r.event_name] = (counts[r.event_name] || 0) + 1;
    }
    return {
      totalEvents: rows.length,
      eventsBreakdown: counts,
      recentEvents: rows.slice(0, 10),
    };
  } catch (err) {
    console.error('[Analytics] Error fetching stats:', err.message);
    return {};
  }
}

/**
 * Returns raw telemetry events with metadata and timestamps for admin analytics.
 */
async function getAnalyticsRawEvents(limit = 5000) {
  if (!isSupabaseConfigured()) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/analytics_events?select=event_name,metadata,user_id,created_at&order=created_at.desc&limit=${limit}`,
      {
        method: 'GET',
        headers: getSupabaseHeaders(),
      }
    );
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error('[Analytics] Error fetching raw events:', err.message);
    return [];
  }
}

module.exports = {
  recordAnalyticsEvent,
  getAnalyticsStats,
  getAnalyticsRawEvents,
};
