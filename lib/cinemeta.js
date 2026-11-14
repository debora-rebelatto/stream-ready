const cinemetaService = require('../server/services/cinemetaService.ts');

module.exports = {
  ...cinemetaService,
  searchMovies: cinemetaService.searchMovies,
  getMeta: cinemetaService.getMeta
};
