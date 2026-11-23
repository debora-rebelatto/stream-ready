const { SUPABASE_URL, isSupabaseConfigured, getSupabaseHeaders } = require('./supabaseClient');
const { findUserBucket, ensureUserBucket } = require('./memoryStore');
const { cleanImdbId } = require('./itemMapper');
const { supabaseSaveUser, supabaseUpsertItems, supabaseDeleteItem } = require('./syncStore');

function getCustomLists(userIdentifier) {
  const bucket = findUserBucket(userIdentifier);
  return bucket && Array.isArray(bucket.customLists) ? bucket.customLists : [];
}

async function createCustomList(userIdentifier, { name, emoji = '' }) {
  let bucket = findUserBucket(userIdentifier);
  if (!bucket) {
    bucket = ensureUserBucket(userIdentifier);
    if (!bucket.id) await supabaseSaveUser(bucket);
  }
  if (!bucket || !bucket.id) throw new Error('User not found');

  const listName = (name || '').trim();
  if (!listName) throw new Error('List name is required');

  const row = {
    user_id: bucket.id,
    name: listName,
    emoji: emoji ? String(emoji).trim() : '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured()) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/watchlist_custom_lists`, {
      method: 'POST',
      headers: getSupabaseHeaders({
        Prefer: 'return=representation',
      }),
      body: JSON.stringify([row]),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error creating list in Supabase: ${errText}`);
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
    updatedAt: row.updated_at,
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
  const listIndex = bucket.customLists.findIndex((l) => l.id === listId);
  if (listIndex === -1) throw new Error('List not found');

  const updatedName = name !== undefined ? name.trim() : bucket.customLists[listIndex].name;
  const updatedEmoji =
    emoji !== undefined
      ? emoji
        ? String(emoji).trim()
        : ''
      : bucket.customLists[listIndex].emoji || '';
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/watchlist_custom_lists?id=eq.${encodeURIComponent(listId)}&user_id=eq.${encodeURIComponent(bucket.id)}`,
      {
        method: 'PATCH',
        headers: getSupabaseHeaders({
          Prefer: 'return=minimal',
        }),
        body: JSON.stringify({
          name: updatedName,
          emoji: updatedEmoji,
          updated_at: now,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error updating list in Supabase: ${errText}`);
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
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/watchlist_custom_lists?id=eq.${encodeURIComponent(listId)}&user_id=eq.${encodeURIComponent(bucket.id)}`,
      {
        method: 'DELETE',
        headers: getSupabaseHeaders({
          Prefer: 'return=minimal',
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error deleting list in Supabase: ${errText}`);
    }
  }

  bucket.customLists = (bucket.customLists || []).filter((l) => l.id !== listId);

  // When a list is deleted, movies that belonged to it must be removed from the watchlist.
  // If an item also belongs to another custom list, remove listId from its customLists and keep it.
  // If an item only belonged to this list, remove it completely from the watchlist.
  const itemsInList = (bucket.items || []).filter(
    (item) => Array.isArray(item.customLists) && item.customLists.includes(listId)
  );

  const itemsToDelete = [];
  const itemsToUpdate = [];

  for (const item of itemsInList) {
    const remainingLists = (item.customLists || []).filter((id) => id !== listId);
    if (remainingLists.length === 0) {
      itemsToDelete.push(item);
    } else {
      item.customLists = remainingLists;
      itemsToUpdate.push(item);
    }
  }

  if (itemsToDelete.length > 0) {
    const deleteIds = new Set(itemsToDelete.map((i) => i.id));
    bucket.items = (bucket.items || []).filter((i) => !deleteIds.has(i.id));

    if (isSupabaseConfigured()) {
      for (const item of itemsToDelete) {
        await supabaseDeleteItem(item.id, bucket.id);
      }
    }
  }

  if (itemsToUpdate.length > 0) {
    await supabaseUpsertItems(itemsToUpdate, bucket.id);
  }

  return {
    success: true,
    deletedItemsCount: itemsToDelete.length,
    deletedItemIds: itemsToDelete.map((i) => i.id),
  };
}

async function setItemCustomLists(userIdentifier, imdbId, listIds) {
  const bucket = findUserBucket(userIdentifier);
  if (!bucket || !bucket.id) throw new Error('User not found');
  const cleanId = cleanImdbId(imdbId);
  const item = (bucket.items || []).find((i) => i.id === cleanId);
  if (!item) throw new Error('Movie not found in your watchlist');

  const validListIds = Array.isArray(listIds) ? listIds.map(String) : [];
  item.customLists = validListIds;

  await supabaseUpsertItems([item], bucket.id);
  return item;
}

module.exports = {
  getCustomLists,
  createCustomList,
  updateCustomList,
  deleteCustomList,
  setItemCustomLists,
};
