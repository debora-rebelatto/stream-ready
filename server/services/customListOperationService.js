const db = require('../../lib/db');
const { userRepository, watchlistRepository, customListRepository } = require('../repositories');
const { checkMovieQuality } = require('../../lib/qualityChecker');
const { getCuratedLists, addCuratedListToUser } = require('../../lib/curatedLists');
const { syncAddonUrlWithAccount } = require('../utils/requestContext');

async function getUserListsWithCounts(userId) {
  await userRepository.ensureLoaded();
  const lists = customListRepository.getCustomLists(userId);
  const userItems = watchlistRepository.getItems(userId);

  return lists.map((l) => {
    const count = userItems.filter(
      (i) => Array.isArray(i.customLists) && i.customLists.includes(l.id)
    ).length;
    return {
      ...l,
      itemsCount: count,
    };
  });
}

async function createList({ authKey, userId, name, emoji, baseUrl }) {
  await userRepository.ensureLoaded();
  if (!name || !String(name).trim()) {
    const err = new Error('List name is required');
    err.statusCode = 400;
    throw err;
  }

  const newList = await customListRepository.createCustomList(userId, { name, emoji });

  if (authKey && baseUrl) {
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
  }

  return { ...newList, itemsCount: 0 };
}

async function updateList({ authKey, userId, listId, name, emoji, baseUrl }) {
  await userRepository.ensureLoaded();
  const updated = await customListRepository.updateCustomList(userId, listId, { name, emoji });

  if (authKey && baseUrl) {
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
  }

  return updated;
}

async function deleteList({ authKey, userId, listId, baseUrl }) {
  await userRepository.ensureLoaded();
  const result = await customListRepository.deleteCustomList(userId, listId);

  if (authKey && baseUrl) {
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
  }

  const baseResult = typeof result === 'object' && result !== null ? result : { success: true };
  return {
    ...baseResult,
    stats: watchlistRepository.getStats(userId),
  };
}

async function assignItemLists({ authKey, userId, itemId, listIds, baseUrl }) {
  await userRepository.ensureLoaded();
  const updatedItem = await customListRepository.setItemCustomLists(userId, itemId, listIds);

  if (authKey && baseUrl) {
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
  }

  if (!updatedItem) return updatedItem;
  const userSettings = userRepository.getSettings(userId) || {};
  return watchlistRepository.enrichWatchlistItem(updatedItem, {
    minQuality: userSettings.minQuality || '1080p',
    minAudio: userSettings.minAudio || 'any',
  });
}

async function listCuratedCatalogs(userId) {
  await userRepository.ensureLoaded();
  const userCustomLists = userId ? customListRepository.getCustomLists(userId) : [];
  return getCuratedLists(userCustomLists);
}

async function adoptCuratedList({ authKey, userId, curatedListId, baseUrl }) {
  await userRepository.ensureLoaded();
  const result = await addCuratedListToUser(userId, curatedListId, db, checkMovieQuality);

  if (authKey && baseUrl) {
    syncAddonUrlWithAccount(authKey, baseUrl, userId).catch(() => {});
  }

  return result;
}

const customListOperationService = {
  getUserListsWithCounts,
  createList,
  updateList,
  deleteList,
  assignItemLists,
  listCuratedCatalogs,
  adoptCuratedList,
};

module.exports = { customListOperationService };
