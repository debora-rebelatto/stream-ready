const qualityCheckerService = require('../server/services/qualityCheckerService.ts');

module.exports = {
  ...qualityCheckerService,
  checkMovieQuality: qualityCheckerService.checkMovieQuality,
  parseStreams: qualityCheckerService.parseStreams,
  isCamStream: qualityCheckerService.isCamStream,
  hasCleanSource: qualityCheckerService.hasCleanSource
};
