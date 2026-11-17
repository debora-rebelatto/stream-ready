import {
  encodeUserData,
  decodeUserData,
  userDataService,
} from '../../server/services/userDataService.ts';

describe('Backend UserDataService (server/services/userDataService.ts)', () => {
  const mockItems = [
    {
      id: 'tt1375666',
      name: 'Inception',
      poster: 'https://image.tmdb.org/t/p/w500/edv5CZvWj09upOsy2Y6IwDhK8bt.jpg',
      year: '2010',
      bestQuality: '1080p FHD',
      has1080pPlus: true,
    },
    {
      id: 'tt0816692',
      name: 'Interstellar',
      poster: 'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
      year: '2014',
      bestQuality: '4K UHD',
      has1080pPlus: true,
    },
  ];

  test('deve codificar e decodificar dados do usuário com formato compactado z_', () => {
    const authKey = 'test_auth_key_123';
    const encoded = encodeUserData(authKey, mockItems);

    expect(encoded).toMatch(/^z_/);

    const decoded = decodeUserData(encoded);
    expect(decoded.authKey).toBe(authKey);
    expect(decoded.items).toHaveLength(2);
    expect(decoded.ids).toEqual(['tt1375666', 'tt0816692']);
    expect(decoded.items[0].name).toBe('Inception');
    expect(decoded.items[0].has1080pPlus).toBe(true);
    expect(decoded.items[1].bestQuality).toBe('4K UHD');
  });

  test('deve codificar e decodificar com lista de IDs em string', () => {
    const ids = ['tt1234567', 'tt7654321'];
    const encoded = encodeUserData('key_abc', ids);

    const decoded = decodeUserData(encoded);
    expect(decoded.authKey).toBe('key_abc');
    expect(decoded.ids).toEqual(ids);
  });

  test('deve decodificar formato legado base64url sem z_', () => {
    const legacyPayload = {
      authKey: 'legacy_key',
      ids: ['tt9999999'],
      items: [{ id: 'tt9999999', name: 'Legacy Movie', has1080pPlus: true }],
    };
    const base64Param = Buffer.from(JSON.stringify(legacyPayload)).toString('base64url');

    const decoded = decodeUserData(base64Param);
    expect(decoded.authKey).toBe('legacy_key');
    expect(decoded.ids).toContain('tt9999999');
    expect(decoded.items[0].name).toBe('Legacy Movie');
  });

  test('deve lidar com parâmetro vazio ou inválido graciosamente', () => {
    expect(decodeUserData('')).toEqual({ authKey: '', items: [], ids: [] });

    const rawParam = 'not_a_valid_json_or_z';
    const decoded = decodeUserData(rawParam);
    expect(decoded.authKey).toBe(rawParam);
    expect(decoded.items).toEqual([]);
  });

  test('objeto userDataService deve exportar as funções', () => {
    expect(typeof userDataService.encodeUserData).toBe('function');
    expect(typeof userDataService.decodeUserData).toBe('function');
  });
});
