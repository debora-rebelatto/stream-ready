import React from 'react';
import { Trophy, Users, Plus, Check, RefreshCw } from 'lucide-react';
import type { TopMovieMetric } from '../../models';
import { Badge, QualityStatusBadge } from '../common';

export interface TopThreeMoviesCardProps {
  movies: TopMovieMetric[];
  className?: string;
  onAddMovie?: (movie: TopMovieMetric) => Promise<void> | void;
  userMovieIds?: Set<string>;
  isAddingId?: string | null;
  isAdmin?: boolean;
}

const PODIUM_CONFIG = [
  {
    rank: 1,
    label: '#1 Most Added',
    medal: '🥇',
    borderColor: 'border-amber-500/40 hover:border-amber-400/60',
    bgGradient: 'from-amber-500/10 via-[#151824] to-[#151824]',
    badgeVariant: 'amber' as const,
  },
  {
    rank: 2,
    label: '#2 Runner-up',
    medal: '🥈',
    borderColor: 'border-slate-400/30 hover:border-slate-300/50',
    bgGradient: 'from-slate-400/10 via-[#151824] to-[#151824]',
    badgeVariant: 'neutral' as const,
  },
  {
    rank: 3,
    label: '#3 Third Place',
    medal: '🥉',
    borderColor: 'border-amber-700/30 hover:border-amber-600/50',
    bgGradient: 'from-amber-800/10 via-[#151824] to-[#151824]',
    badgeVariant: 'rose' as const,
  },
];

export const TopThreeMoviesCard: React.FC<TopThreeMoviesCardProps> = ({
  movies,
  className = '',
  onAddMovie,
  userMovieIds,
  isAddingId,
  isAdmin = false,
}) => {
  const topThree = (movies || []).slice(0, 3);

  if (topThree.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
          <Trophy size={16} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight">
            Top 3 Most Added to Watchlist
          </h3>
          <p className="text-[11px] text-gray-400">
            Highest community demand across all registered user watchlists.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {topThree.map((movie, index) => {
          const config = PODIUM_CONFIG[index] || PODIUM_CONFIG[2];
          const isAdded = Boolean(userMovieIds && userMovieIds.has(movie.id));
          const isAdding = isAddingId === movie.id;
          const genresLabel = Array.isArray(movie.genres) ? movie.genres.slice(0, 2).join(', ') : '';

          return (
            <div
              key={movie.id}
              className={`group relative bg-gradient-to-b ${config.bgGradient} border ${config.borderColor} rounded-2xl p-3.5 flex flex-col justify-between gap-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5`}
            >
              {/* Card Header: Rank & Medal */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm select-none" title={config.label}>
                  {config.medal}
                </span>
                <Badge variant={config.badgeVariant} size="xs" uppercase>
                  {config.label}
                </Badge>
              </div>

              {/* Poster & Movie Details */}
              <div className="flex items-start gap-3">
                {movie.poster ? (
                  <img
                    src={movie.poster}
                    alt={movie.name}
                    className="w-14 h-20 object-cover rounded-lg shrink-0 bg-black/40 border border-white/10 shadow-md group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-14 h-20 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-xl shrink-0">
                    🎬
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h4
                    className="font-bold text-white text-xs sm:text-sm line-clamp-1 leading-snug group-hover:text-purple-300 transition-colors"
                    title={movie.name}
                  >
                    {movie.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-gray-400">
                    {movie.year && <span>{movie.year}</span>}
                    {genresLabel && (
                      <>
                        {movie.year && <span>•</span>}
                        <span className="truncate">{genresLabel}</span>
                      </>
                    )}
                  </div>

                  {movie.description && (
                    <p
                      className="mt-1 text-[11px] text-gray-400 line-clamp-2 leading-relaxed"
                      title={movie.description}
                    >
                      {movie.description}
                    </p>
                  )}

                  {isAdmin && (
                    <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-white">
                      <Users size={12} className="text-purple-400 shrink-0" />
                      <span>{movie.userCount} {movie.userCount === 1 ? 'user' : 'users'}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Footer & Action */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2 text-[11px]">
                <div className="whitespace-nowrap shrink-0">
                  <QualityStatusBadge
                    isReady={movie.readyCount > 0}
                    format="short"
                  />
                </div>

                {onAddMovie && (
                  <div>
                    {isAdded ? (
                      <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-0.5">
                        <Check size={12} /> Added
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isAdding}
                        onClick={() => onAddMovie(movie)}
                        className="px-2 py-0.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 text-purple-200 border border-purple-500/30 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50"
                        title="Add to your watchlist"
                      >
                        {isAdding ? (
                          <RefreshCw size={10} className="animate-spin text-purple-300" />
                        ) : (
                          <Plus size={11} className="text-purple-300" />
                        )}
                        <span>Add</span>
                      </button>
                    )}
                  </div>
                )}

                {!onAddMovie && isAdmin && (
                  <span className="text-[10px] text-gray-400">
                    {movie.readyCount}/{movie.userCount} ready
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
