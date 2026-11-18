import React from 'react';
import { useSearchController } from '../../controllers';
import { Search, X, Plus, Check } from 'lucide-react';

export const SearchSection: React.FC = () => {
  const {
    items,
    query,
    setQuery,
    results,
    isLoading,
    isOpen,
    wrapperRef,
    handleAdd,
    handleKeyDown,
  } = useSearchController();

  return (
    <div className="relative max-w-3xl mx-auto mb-8" ref={wrapperRef}>
      <div className="relative flex items-center bg-[#151824] border border-white/10 rounded-2xl px-4 py-1.5 focus-within:border-[#7b42f6] focus-within:ring-2 focus-within:ring-[#7b42f6]/30 shadow-md transition-all">
        <Search size={18} className="text-gray-400 mr-3 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search movie by title (e.g. Gladiator II, Dune, Oppenheimer) or paste IMDb ID/URL..."
          className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none py-2"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="p-1 text-gray-400 hover:text-white rounded-full transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#151824] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-40 max-h-96 overflow-y-auto divide-y divide-white/5">
          {isLoading && (
            <div className="p-4 text-center text-xs text-gray-400">Searching movies...</div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="p-4 text-center text-xs text-gray-400">
              No movies found. Try another title or an IMDb ID (e.g. tt1234567).
            </div>
          )}

          {!isLoading &&
            results.slice(0, 10).map((movie) => {
              const isAlreadyAdded = items.some((i) => i.id === movie.id);
              return (
                <div
                  key={movie.id}
                  className="flex items-center gap-3 p-3 hover:bg-[#1f2438] transition-colors"
                >
                  <img
                    src={movie.poster || ''}
                    alt={movie.name}
                    className="w-10 h-14 object-cover rounded bg-[#2a2e45] shrink-0"
                    onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                  />
                  <div className="flex-1 min-w-0">
                    <h5 className="text-sm font-semibold text-white truncate">{movie.name}</h5>
                    <p className="text-xs text-gray-400">
                      {movie.year || 'N/A'} • IMDb: {movie.id}
                    </p>
                  </div>
                  <button
                    disabled={isAlreadyAdded}
                    onClick={() => handleAdd(movie.id)}
                    className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isAlreadyAdded
                        ? 'bg-white/5 text-gray-400 cursor-not-allowed border border-white/5'
                        : 'bg-[#7b42f6] hover:bg-[#6a34e0] text-white shadow-sm cursor-pointer'
                    }`}
                  >
                    {isAlreadyAdded ? (
                      <>
                        <Check size={12} /> In Watchlist
                      </>
                    ) : (
                      <>
                        <Plus size={12} /> Add
                      </>
                    )}
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
