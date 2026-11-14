import { encryptText, decryptText, cryptoService } from '../../server/services/cryptoService.ts';

describe('Backend CryptoService (server/services/cryptoService.ts)', () => {
  test('deve retornar null se valor for nulo ou indefinido', () => {
    expect(encryptText(null)).toBeNull();
    expect(encryptText(undefined)).toBeNull();
    expect(encryptText('')).toBeNull();
    expect(decryptText(null)).toBeNull();
    expect(decryptText(undefined)).toBeNull();
    expect(decryptText('')).toBeNull();
  });

  test('deve criptografar e descriptografar texto com sucesso', () => {
    const original = 'minha-senha-secreta-123456';
    const encrypted = encryptText(original);

    expect(encrypted).not.toBeNull();
    expect(encrypted).toMatch(/^enc:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
    expect(encrypted).not.toEqual(original);

    const decrypted = decryptText(encrypted);
    expect(decrypted).toBe(original);
  });

  test('não deve re-criptografar texto que já possui o prefixo enc:', () => {
    const original = 'enc:1234567890ab:cdef01234567890a:abcdef';
    const res = encryptText(original);
    expect(res).toBe(original);
  });

  test('deve retornar texto em texto puro inalterado se não tiver prefixo enc: (retrocompatibilidade)', () => {
    const plainText = 'stremio_legacy_auth_token_999';
    expect(decryptText(plainText)).toBe(plainText);
  });

  test('deve retornar null para texto cifrado adulterado ou inválido', () => {
    const invalidCipher = 'enc:invalid:payload';
    expect(decryptText(invalidCipher)).toBeNull();
  });

  test('objeto cryptoService deve exportar as funções', () => {
    expect(typeof cryptoService.encryptText).toBe('function');
    expect(typeof cryptoService.decryptText).toBe('function');
  });
});

