const cryptoService = require('../server/services/cryptoService.ts');

module.exports = {
  ...cryptoService,
  encryptText: cryptoService.encryptText,
  decryptText: cryptoService.decryptText
};
