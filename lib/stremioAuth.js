const stremioAuthService = require('../server/services/stremioAuthService.ts');

module.exports = {
  ...stremioAuthService,
  loginStremio: stremioAuthService.loginStremio,
  getUserInfo: stremioAuthService.getUserInfo,
  installAddonToAccount: stremioAuthService.installAddonToAccount,
  getAccountWatchlist: stremioAuthService.getAccountWatchlist,
  saveAccountWatchlist: stremioAuthService.saveAccountWatchlist,
  getStremioWatchedMovies: stremioAuthService.getStremioWatchedMovies
};
