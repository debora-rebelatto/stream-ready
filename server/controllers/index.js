const { registerAddonRoutes } = require('./addonController');
const { registerAuthRoutes } = require('./authController');
const { registerWatchlistRoutes } = require('./watchlistController');
const { registerCustomListRoutes } = require('./customListController');
const { registerSystemRoutes } = require('./systemController');
const { registerAdminRoutes } = require('./adminController');
const { registerNotificationRoutes } = require('./notificationController');

function registerControllers(app, port) {
  registerSystemRoutes(app, port);
  registerAddonRoutes(app);
  registerAuthRoutes(app);
  registerWatchlistRoutes(app);
  registerCustomListRoutes(app);
  registerAdminRoutes(app);
  registerNotificationRoutes(app);
}

module.exports = {
  registerControllers,
  registerAddonRoutes,
  registerAuthRoutes,
  registerWatchlistRoutes,
  registerCustomListRoutes,
  registerSystemRoutes,
  registerAdminRoutes,
  registerNotificationRoutes,
};
