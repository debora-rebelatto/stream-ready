const CINEMETA_URL = 'https://v3-cinemeta.strem.io';

/**
 * Busca filmes no catálogo Cinemeta oficial do Stremio
 */
async function searchMovies(query) {
  if (!query || query.trim().length === 0) return [];
  
  const trimmed = query.trim();
  // Se for um IMDb ID direto (ex: tt1234567)
  if (/^tt\d{7,8}$/i.test(trimmed)) {
    const meta = await getMeta('movie', trimmed);
    return meta ? [meta] : [];
  }

  const url = `${CINEMETA_URL}/catalog/movie/top/search=${encodeURIComponent(trimmed)}.json`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return [];

    const data = await res.json();
    return (data.metas || []).map(item => ({
      id: item.id,
      type: item.type || 'movie',
      name: item.name,
      year: item.year || item.releaseInfo || '',
      poster: item.poster || '',
      banner: item.banner || item.background || '',
      genres: item.genres || [],
      description: item.description || '',
      imdbRating: item.imdbRating || ''
    }));
  } catch (err) {
    console.error('[Cinemeta] Erro ao buscar filmes:', err.message);
    return [];
  }
}

/**
 * Obtém detalhes completos de um filme no Cinemeta
 */
async function getMeta(type = 'movie', id) {
  const url = `${CINEMETA_URL}/meta/${type}/${id}.json`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.meta) return null;

    const m = data.meta;
    return {
      id: m.id,
      type: m.type || type,
      name: m.name,
      year: m.year || m.releaseInfo || '',
      poster: m.poster || '',
      banner: m.banner || m.background || '',
      genres: m.genres || [],
      description: m.description || '',
      imdbRating: m.imdbRating || '',
      runtime: m.runtime || '',
      director: m.director || [],
      cast: m.cast || []
    };
  } catch (err) {
    console.error(`[Cinemeta] Erro ao obter meta de ${id}:`, err.message);
    return null;
  }
}

module.exports = {
  searchMovies,
  getMeta
};

