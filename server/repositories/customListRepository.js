const db = require('../../lib/db');

const customListRepository = {
  getCustomLists: (userId) => db.getCustomLists(userId),
  createCustomList: (userId, listData) => db.createCustomList(userId, listData),
  updateCustomList: (userId, listId, patch) => db.updateCustomList(userId, listId, patch),
  deleteCustomList: (userId, listId) => db.deleteCustomList(userId, listId),
  setItemCustomLists: (userId, itemId, listIds) =>
    db.setItemCustomLists(userId, itemId, listIds),
};

module.exports = { customListRepository };
