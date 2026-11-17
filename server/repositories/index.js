const { userRepository } = require('./userRepository');
const { watchlistRepository } = require('./watchlistRepository');
const { customListRepository } = require('./customListRepository');
const { pollRepository } = require('./pollRepository');
const { analyticsRepository } = require('./analyticsRepository');

module.exports = {
  userRepository,
  watchlistRepository,
  customListRepository,
  pollRepository,
  analyticsRepository,
};
