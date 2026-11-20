import React, { useState, useEffect, useRef } from 'react';
import { useWatchlist, useToast } from '../context/useAppContext';
import { watchlistService, cinemetaService } from '../services';
import { trackEvent } from '../utils';
import type { SearchMovieResult } from '../models';

export function useSearchController() {
  const { items, addItem } = useWatchlist();
  const { showToast } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchMovieResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await watchlistService.searchMovies(query);
        const moviesOnly = (data || []).filter((m) => !m.type || m.type === 'movie');
        trackEvent('search_query_performed', { resultsCount: moviesOnly.length });
        setResults(moviesOnly);
        setIsOpen(true);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAdd = async (id: string) => {
    setIsOpen(false);
    setQuery('');
    try {
      const meta = await cinemetaService.getMeta('movie', id);
      if (meta && meta.type && meta.type !== 'movie') {
        showToast('Only movies are supported. Series cannot be added.', 'error');
        return;
      }
    } catch (err) {
      console.warn('[Search] Metadata check skipped:', err);
    }
    await addItem(id, 'search');
  };

  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      const imdbMatch = query.match(/tt\d{7,8}/i);
      if (imdbMatch) {
        await handleAdd(imdbMatch[0]);
      } else if (results.length > 0) {
        await handleAdd(results[0].id);
      }
    }
  };

  return {
    items,
    query,
    setQuery,
    results,
    isLoading,
    isOpen,
    wrapperRef,
    handleAdd,
    handleKeyDown,
  };
}
