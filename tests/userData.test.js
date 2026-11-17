const zlib = require('zlib');
const { encodeUserData, decodeUserData } = require('../lib/userData');

describe('UserData Module', () => {
  test('deve codificar e decodificar authKey e itens corretamente', () => {
    const authKey = 'stremio_user_auth_key_12345';
    const items = [
      {
        id: 'tt1375666',
        name: 'Inception',
        poster: 'https://image.tmdb.org/t/p/w500/inception.jpg',
        year: '2010',
        bestQuality: '1080p FHD',
        has1080pPlus: true,
      },
      {
        id: 'tt0816692',
        name: 'Interstellar',
        poster: 'https://image.tmdb.org/t/p/w500/interstellar.jpg',
        year: '2014',
        bestQuality: '4K UHD',
        has1080pPlus: true,
      },
    ];

    const encoded = encodeUserData(authKey, items);
    expect(encoded).toBeDefined();
    expect(typeof encoded).toBe('string');
    expect(encoded.startsWith('z_')).toBe(true);

    const decoded = decodeUserData(encoded);
    expect(decoded.authKey).toBe(authKey);
    expect(decoded.items).toHaveLength(2);
    expect(decoded.ids).toEqual(['tt1375666', 'tt0816692']);

    expect(decoded.items[0]).toMatchObject({
      id: 'tt1375666',
      name: 'Inception',
      poster: 'https://image.tmdb.org/t/p/w500/inception.jpg',
      year: '2010',
      bestQuality: '1080p FHD',
      has1080pPlus: true,
    });
  });

  test('deve lidar com lista vazia de itens', () => {
    const authKey = 'auth_key_only';
    const encoded = encodeUserData(authKey, []);
    const decoded = decodeUserData(encoded);

    expect(decoded.authKey).toBe(authKey);
    expect(decoded.items).toEqual([]);
    expect(decoded.ids).toEqual([]);
  });

  test('deve codificar e decodificar lista de strings de IDs', () => {
    const authKey = 'key_abc';
    const ids = ['tt1234567', 'tt7654321'];
    const encoded = encodeUserData(authKey, ids);
    const decoded = decodeUserData(encoded);

    expect(decoded.authKey).toBe(authKey);
    expect(decoded.ids).toEqual(ids);
    expect(decoded.items).toHaveLength(2);
    expect(decoded.items[0].id).toBe('tt1234567');
  });

  test('deve decodificar formato legado uncompressed base64url', () => {
    const legacyPayload = {
      authKey: 'legacy_key',
      items: [
        {
          id: 'tt9999999',
          name: 'Legacy Film',
          year: '2020',
          bestQuality: '1080p FHD',
          has1080pPlus: true,
        },
      ],
      ids: ['tt9999999'],
    };
    const legacyParam = Buffer.from(JSON.stringify(legacyPayload)).toString('base64url');

    const decoded = decodeUserData(legacyParam);
    expect(decoded.authKey).toBe('legacy_key');
    expect(decoded.items).toHaveLength(1);
    expect(decoded.items[0].id).toBe('tt9999999');
    expect(decoded.ids).toEqual(['tt9999999']);
  });

  test('deve decodificar formato legado alternativo usando chaves compactas (k e v)', () => {
    const legacyPayload = {
      k: 'key_kv',
      v: [{ i: 'tt1111111', n: 'Movie KV', y: '2021', q: '4K UHD', r: 1, s: 5 }],
    };
    const legacyParam = Buffer.from(JSON.stringify(legacyPayload)).toString('base64url');

    const decoded = decodeUserData(legacyParam);
    expect(decoded.authKey).toBe('key_kv');
    expect(decoded.items).toHaveLength(1);
    expect(decoded.items[0].id).toBe('tt1111111');
    expect(decoded.items[0].has1080pPlus).toBe(true);
    expect(decoded.ids).toEqual(['tt1111111']);
  });

  test('deve cair no fallback de encodeUserData quando deflateRawSync lançar erro', () => {
    const spy = jest.spyOn(zlib, 'deflateRawSync').mockImplementationOnce(() => {
      throw new Error('Falha simulada no zlib');
    });

    const items = [{ id: 'tt1234567' }, 'tt7654321'];
    const fallbackEncoded = encodeUserData('fallback_key', items);
    expect(fallbackEncoded.startsWith('z_')).toBe(false);

    const decoded = decodeUserData(fallbackEncoded);
    expect(decoded.authKey).toBe('fallback_key');
    expect(decoded.ids).toEqual(['tt1234567', 'tt7654321']);

    spy.mockRestore();
  });

  test('deve retornar objeto vazio quando parâmetro for nulo ou indefinido', () => {
    expect(decodeUserData(null)).toEqual({ authKey: '', items: [], ids: [] });
    expect(decodeUserData('')).toEqual({ authKey: '', items: [], ids: [] });
    expect(decodeUserData(undefined)).toEqual({ authKey: '', items: [], ids: [] });
  });

  test('deve lidar com fallback quando o valor não for comprimido nem json', () => {
    const plainString = 'plain_auth_key';
    const result = decodeUserData(plainString);
    expect(result.authKey).toBe(plainString);
    expect(result.items).toEqual([]);
    expect(result.ids).toEqual([]);
  });
});
