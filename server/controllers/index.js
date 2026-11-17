const { registerAddonRoutes } = require('./addonController');
const { registerAuthRoutes } = require('./authController');
const { registerWatchlistRoutes } = require('./watchlistController');
const { registerCustomListRoutes } = require('./customListController');
const { registerSystemRoutes } = require('./systemController');

function registerControllers(app, port) {
  registerSystemRoutes(app, port);
  registerAddonRoutes(app);
  registerAuthRoutes(app);
  registerWatchlistRoutes(app);
  registerCustomListRoutes(app);
}

module.exports = {
  registerControllers,
  registerAddonRoutes,
  registerAuthRoutes,
  registerWatchlistRoutes,
  registerCustomListRoutes,
  registerSystemRoutes,
};
