const zlib = require('zlib');

/**
 * Codifica de forma ultracompacta o authKey e os filmes na URL
 */
function encodeUserData(authKey, itemsOrIds) {
  try {
    let compactItems = [];
    if (Array.isArray(itemsOrIds)) {
      compactItems = itemsOrIds.map(item => {
        if (!item) return null;
        if (typeof item === 'string') return { i: item, r: 0 };
        return {
          i: item.id,
          n: item.name || '',
          p: item.poster || '',
          y: item.year || '',
          q: item.bestQuality || 'Pending',
          r: item.has1080pPlus ? 1 : 0,
          s: item.streamCount || 0
        };
      }).filter(Boolean);
    }
    const payload = {
      k: authKey || '',
      v: compactItems
    };
    const jsonStr = JSON.stringify(payload);
    const compressed = zlib.deflateRawSync(Buffer.from(jsonStr, 'utf-8'));
    return 'z_' + compressed.toString('base64url');
  } catch (err) {
    const payload = {
      authKey: authKey || '',
      ids: Array.isArray(itemsOrIds) ? itemsOrIds.map(i => (typeof i === 'string' ? i : i?.id)).filter(Boolean) : []
    };
    return Buffer.from(JSON.stringify(payload)).toString('base64url');
  }
}

/**
 * Decodifica o parâmetro da URL restaurando os filmes e status
 */
function decodeUserData(param) {
  if (!param) return { authKey: '', items: [], ids: [] };
  try {
    if (param.startsWith('z_')) {
      const raw = Buffer.from(param.slice(2), 'base64url');
      const decompressed = zlib.inflateRawSync(raw).toString('utf-8');
      const parsed = JSON.parse(decompressed);
      const items = (parsed.v || []).map(v => ({
        id: v.i,
        name: v.n || v.i,
        poster: v.p || '',
        year: v.y || '',
        bestQuality: v.q || 'Pending',
        has1080pPlus: v.r === 1,
        streamCount: v.s || 0,
        type: 'movie'
      }));
      return {
        authKey: parsed.k || '',
        items,
        ids: items.map(i => i.id)
      };
    }
    const raw = Buffer.from(param, 'base64url').toString('utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      const items = (parsed.items || parsed.v || []).map(item => ({
        id: item.id || item.i,
        name: item.name || item.n || item.id,
        poster: item.poster || item.p || '',
        year: item.year || item.y || '',
        bestQuality: item.bestQuality || item.q || 'Pending',
        has1080pPlus: !!(item.has1080pPlus || item.r),
        streamCount: item.streamCount || item.s || 0,
        type: 'movie'
      }));
      const ids = Array.isArray(parsed.ids) ? parsed.ids : items.map(i => i.id);
      return {
        authKey: parsed.authKey || parsed.k || '',
        items,
        ids
      };
    }
  } catch (e) {}
  return { authKey: param, items: [], ids: [] };
}

module.exports = {
  encodeUserData,
  decodeUserData
};
