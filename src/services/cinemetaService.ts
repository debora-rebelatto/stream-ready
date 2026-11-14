import type { SearchMovieResult } from '../types';

const CINEMETA_URL = 'https://v3-cinemeta.strem.io';

export const cinemetaService = {
  /**
   * Search movies directly in Cinemeta official API from client
   */
  async searchMovies(query: string): Promise<SearchMovieResult[]> {
    if (!query || !query.trim()) return [];
    const trimmed = query.trim();

    // Direct IMDb ID lookup (e.g. tt1234567)
    if (/^tt\d{7,8}$/i.test(trimmed)) {
      const meta = await this.getMeta('movie', trimmed);
      return meta ? [meta] : [];
    }

    const url = `${CINEMETA_URL}/catalog/movie/top/search=${encodeURIComponent(trimmed)}.json`;

    let timeout: any;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) return [];

      const data = await res.json();
      return (data.metas || [])
        .filter((item: any) => !item.type || item.type === 'movie')
        .map((item: any) => ({
          id: item.id,
          type: 'movie',
          name: item.name,
          year: item.year || item.releaseInfo || '',
          poster: item.poster || '',
          banner: item.banner || item.background || '',
          genres: item.genres || [],
          description: item.description || '',
          imdbRating: item.imdbRating || '',
        }));
    } catch (err: any) {
      console.warn('[CinemetaService] Direct search error, falling back to proxy if needed:', err.message);
      return [];
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  },

  /**
   * Get full movie metadata from Cinemeta
   */
  async getMeta(type: string = 'movie', id: string): Promise<SearchMovieResult | null> {
    const url = `${CINEMETA_URL}/meta/${type}/${id}.json`;

    let timeout: any;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 8000);

      const res = await fetch(url, { signal: controller.signal });

      if (!res.ok) return null;

      const data = await res.json();
      if (!data.meta) return null;

      const m = data.meta;
      if (m.type && m.type !== 'movie') {
        return null;
      }
      return {
        id: m.id,
        type: 'movie',
        name: m.name,
        year: m.year || m.releaseInfo || '',
        poster: m.poster || '',
        banner: m.banner || m.background || '',
        genres: m.genres || [],
        description: m.description || '',
        imdbRating: m.imdbRating || '',
      };
    } catch {
      return null;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  },
};
