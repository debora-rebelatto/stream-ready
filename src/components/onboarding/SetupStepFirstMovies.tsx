import React from 'react';
import { Search, X, Plus, Check, Film, Sparkles } from 'lucide-react';
import { useSearchController } from '../../controllers';
import { CURATED_RECOMMENDED_MOVIES } from '../../utils';
import type { WatchlistItem } from '../../models';
import { Button } from '../common';

export interface SetupStepFirstMoviesProps {
  items: WatchlistItem[];
  addingMovieId: string | null;
  isBatchAdding: boolean;
  onQuickAddMovie: (movieId: string, movieName: string) => void;
  onBatchAddStarterMovies: (movies: Array<{ id: string; name: string }>) => void;
}

const STARTER_MOVIES = CURATED_RECOMMENDED_MOVIES.slice(0, 3);

export const SetupStepFirstMovies: React.FC<SetupStepFirstMoviesProps> = ({
  items,
  addingMovieId,
  isBatchAdding,
  onQuickAddMovie,
  onBatchAddStarterMovies,
}) => {
  const { query, setQuery, results, isLoading, isOpen, wrapperRef, handleAdd, handleKeyDown } =
    useSearchController();

  const existingIds = new Set(items.map((item) => item.id));
  const allStartersAdded = STARTER_MOVIES.every((movie) => existingIds.has(movie.id));
  const hasMovies = items.length > 0;

  return (
    <div className="space-y-6">
      <div
        className={`p-3.5 rounded-xl border text-sm font-semibold flex items-center gap-2 ${
          hasMovies
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
            : 'bg-white/5 border-white/10 text-gray-300'
        }`}
      >
        <Film size={16} className="shrink-0" />
        {hasMovies
          ? `${items.length} ${items.length === 1 ? 'movie' : 'movies'} in your watchlist — your Stremio catalogs are ready!`
          : '0 movies in your watchlist yet — search below or pick from starter hits.'}
      </div>

      <div className="relative" ref={wrapperRef}>
        <div className="flex items-center bg-[#151824] border border-white/10 rounded-2xl px-4 py-1.5 focus-within:border-purple-500 focus-within:ring-2 focus-within:ring-purple-500/30 transition-all">
          <Search size={17} className="text-gray-400 mr-3 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search any movie by title (e.g. Dune, Oppenheimer) or paste IMDb ID..."
            className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none py-2"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery('')}
              className="p-1 text-gray-400 hover:text-white rounded-full cursor-pointer"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#151824] border border-white/10 rounded-xl shadow-2xl z-10 max-h-80 overflow-y-auto divide-y divide-white/5">
            {isLoading && <p className="p-4 text-center text-xs text-gray-400">Searching movies...</p>}
            {!isLoading && results.length === 0 && (
              <p className="p-4 text-center text-xs text-gray-400">
                No movies found. Try another title or an IMDb ID.
              </p>
            )}
            {!isLoading &&
              results.slice(0, 6).map((movie) => {
                const isAdded = existingIds.has(movie.id);
                return (
                  <div key={movie.id} className="flex items-center gap-3 p-3">
                    <img
                      src={movie.poster || ''}
                      alt={movie.name}
                      className="w-9 h-12 object-cover rounded bg-[#2a2e45] shrink-0"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{movie.name}</p>
                      <p className="text-xs text-gray-400">
                        {movie.year || 'N/A'} • {movie.id}
                      </p>
                    </div>
                    <Button
                      variant={isAdded ? 'outline' : 'solid'}
                      size="sm"
                      disabled={isAdded}
                      onClick={() => handleAdd(movie.id)}
                      icon={isAdded ? <Check size={12} /> : <Plus size={12} />}
                    >
                      {isAdded ? 'In Watchlist' : 'Add'}
                    </Button>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
            Popular Starter Hits
          </h3>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onBatchAddStarterMovies(STARTER_MOVIES)}
            disabled={isBatchAdding || allStartersAdded || Boolean(addingMovieId)}
            isLoading={isBatchAdding}
            icon={<Sparkles size={13} />}
          >
            {allStartersAdded ? 'All 3 Added' : isBatchAdding ? 'Adding...' : 'Add All 3 Hits'}
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STARTER_MOVIES.map((movie) => {
            const isAdded = existingIds.has(movie.id);
            return (
              <div
                key={movie.id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-white/3 border border-white/5"
              >
                <img
                  src={movie.poster}
                  alt={movie.name}
                  loading="lazy"
                  className="w-12 h-16 object-cover rounded-lg shrink-0 bg-gray-900"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-white truncate">{movie.name}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5 truncate">
                    {movie.year} • <span className="text-emerald-400">{movie.qualityBadge || 'Ready'}</span>
                  </p>
                  <Button
                    variant={isAdded ? 'outline' : 'indigo'}
                    size="xs"
                    className="mt-2"
                    disabled={isAdded || isBatchAdding || Boolean(addingMovieId)}
                    isLoading={addingMovieId === movie.id}
                    onClick={() => onQuickAddMovie(movie.id, movie.name)}
                    icon={isAdded ? <Check size={11} /> : <Plus size={11} />}
                  >
                    {isAdded ? 'Added' : 'Add'}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
