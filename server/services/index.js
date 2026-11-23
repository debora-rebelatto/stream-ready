const { addonOperationService } = require('./addonOperationService');
const { watchlistOperationService } = require('./watchlistOperationService');
const { authOperationService } = require('./authOperationService');
const { customListOperationService } = require('./customListOperationService');
const { systemOperationService } = require('./systemOperationService');
const { notificationOperationService } = require('./notificationOperationService');

module.exports = {
  addonOperationService,
  watchlistOperationService,
  authOperationService,
  customListOperationService,
  systemOperationService,
  notificationOperationService,
};
