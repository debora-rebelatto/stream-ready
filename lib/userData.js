const userDataService = require('../server/services/userDataService.ts');

module.exports = {
  ...userDataService,
  encodeUserData: userDataService.encodeUserData,
  decodeUserData: userDataService.decodeUserData
};
