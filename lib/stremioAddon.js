const stremioAddonService = require('../server/services/stremioAddonService.ts');

module.exports = {
  ...stremioAddonService,
  getManifest: stremioAddonService.getManifest,
  handleCatalog: stremioAddonService.handleCatalog,
  handleMeta: stremioAddonService.handleMeta
};
