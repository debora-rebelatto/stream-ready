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
        has1080pPlus: true
      },
      {
        id: 'tt0816692',
        name: 'Interstellar',
        poster: 'https://image.tmdb.org/t/p/w500/interstellar.jpg',
        year: '2014',
        bestQuality: '4K UHD',
        has1080pPlus: true
      }
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
      has1080pPlus: true
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
