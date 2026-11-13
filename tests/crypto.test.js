const { encryptText, decryptText } = require('../lib/crypto');

describe('Crypto Module', () => {
  test('deve criptografar e descriptografar texto com sucesso', () => {
    const originalText = 'minha_chave_secreta_stremio_123';
    const encrypted = encryptText(originalText);

    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe('string');
    expect(encrypted.startsWith('enc:')).toBe(true);

    const decrypted = decryptText(encrypted);
    expect(decrypted).toBe(originalText);
  });

  test('deve retornar o próprio texto se já estiver criptografado', () => {
    const original = 'enc:iv_hex:tag_hex:cipher_hex';
    const encrypted = encryptText(original);
    expect(encrypted).toBe(original);
  });

  test('deve retornar texto puro como fallback na descriptografia se não tiver prefixo enc:', () => {
    const plain = 'texto_sem_criptografia';
    const result = decryptText(plain);
    expect(result).toBe(plain);
  });

  test('deve lidar corretamente com valores nulos ou vazios', () => {
    expect(encryptText(null)).toBeNull();
    expect(encryptText('')).toBeNull();
    expect(encryptText(undefined)).toBeNull();

    expect(decryptText(null)).toBeNull();
    expect(decryptText('')).toBeNull();
    expect(decryptText(undefined)).toBeNull();
  });

  test('deve retornar null ao tentar descriptografar dados corrompidos', () => {
    const invalidCipher = 'enc:invalido:dados:incompletos';
    const result = decryptText(invalidCipher);
    expect(result).toBeNull();
  });
});
