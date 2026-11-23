const {
  SUPABASE_URL,
  isSupabaseConfigured,
  getSupabaseHeaders,
  fetchAllSupabaseRows,
} = require('./supabaseClient');

/**
 * Saves the user's vote in the roadmap feature poll.
 */
async function savePollVote(userId, option, customText = '') {
  if (!userId || !option) {
    return { success: false, error: 'User ID and selected option are required' };
  }
  if (!isSupabaseConfigured()) return { success: false, error: 'Database not configured' };
  try {
    const row = {
      user_id: userId,
      selected_option: String(option).trim(),
      custom_text: String(customText || '')
        .trim()
        .slice(0, 500),
    };
    const res = await fetch(`${SUPABASE_URL}/rest/v1/poll_votes?on_conflict=user_id`, {
      method: 'POST',
      headers: getSupabaseHeaders({
        Prefer: 'resolution=merge-duplicates,return=representation',
      }),
      body: JSON.stringify([row]),
    });
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, error: errText };
    }
    const saved = await res.json();
    return { success: true, vote: saved[0] };
  } catch (err) {
    console.error('[Poll] Error saving vote:', err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Returns the user's existing poll vote if present.
 */
async function getPollVote(userId) {
  if (!userId || !isSupabaseConfigured()) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/poll_votes?select=id,user_id,selected_option,custom_text,created_at&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
      {
        method: 'GET',
        headers: getSupabaseHeaders(),
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error('[Poll] Error getting vote:', err.message);
    return null;
  }
}

/**
 * Returns aggregated roadmap poll results.
 */
async function getPollResults() {
  const emptyRes = {
    totalVotes: 0,
    breakdown: {},
    votes: {},
    feedbackList: [],
    customFeedback: [],
  };
  if (!isSupabaseConfigured()) return emptyRes;
  try {
    const rows = await fetchAllSupabaseRows(
      'poll_votes?select=selected_option,custom_text,created_at&order=created_at.desc'
    );
    if (!Array.isArray(rows)) return emptyRes;

    const breakdown = {};
    const feedbackList = [];
    for (const r of rows) {
      if (!r || !r.selected_option) continue;
      const opt = String(r.selected_option).trim();
      breakdown[opt] = (breakdown[opt] || 0) + 1;

      if (r.custom_text && String(r.custom_text).trim()) {
        const textVal = String(r.custom_text).trim();
        feedbackList.push({
          option: opt,
          text: textVal,
          customText: textVal,
          createdAt: r.created_at,
        });
      }
    }
    return {
      totalVotes: rows.length,
      breakdown,
      votes: breakdown,
      feedbackList: feedbackList.slice(0, 100),
      customFeedback: feedbackList.slice(0, 100),
    };
  } catch (err) {
    console.error('[Poll] Error getting poll results:', err.message);
    return emptyRes;
  }
}

module.exports = {
  savePollVote,
  getPollVote,
  getPollResults,
};
