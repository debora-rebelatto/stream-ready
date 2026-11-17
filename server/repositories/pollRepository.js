const db = require('../../lib/db');

const pollRepository = {
  savePollVote: (userId, option, customText) => db.savePollVote(userId, option, customText),
  getPollVote: (userId) => db.getPollVote(userId),
  getPollResults: () => db.getPollResults(),
};

module.exports = { pollRepository };
