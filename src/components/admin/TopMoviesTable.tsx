import React from 'react';
import { Film, CheckCircle, Users, Clock } from 'lucide-react';
import type { TopMovieMetric } from '../../models';
import { Badge } from '../common';

interface TopMoviesTableProps {
  movies: TopMovieMetric[];
}

export const TopMoviesTable: React.FC<TopMoviesTableProps> = ({ movies }) => {
  if (!movies || movies.length === 0) {
    return (
      <div className="bg-[#151824] border border-white/5 rounded-2xl p-6 text-center text-gray-400 text-xs">
        No movie data tracked yet.
      </div>
    );
  }

  return (
    <div className="bg-[#151824] border border-white/5 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Film size={18} />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Top 10 Most Tracked Movies
            </h3>
            <p className="text-xs text-gray-400">
              Community favorites added across all user watchlists.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 text-gray-400 font-semibold uppercase text-[10px] tracking-wider">
              <th className="py-2.5 px-3">#</th>
              <th className="py-2.5 px-3">Movie</th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">Trackers</th>
              <th className="py-2.5 px-3 text-center whitespace-nowrap">Quality Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {movies.map((movie, index) => {
              const readyPercentage =
                movie.userCount > 0
                  ? Math.round((movie.readyCount / movie.userCount) * 100)
                  : 0;

              return (
                <tr key={movie.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-3 font-mono text-gray-400 font-bold">{index + 1}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-3">
                      {movie.poster ? (
                        <img
                          src={movie.poster}
                          alt={movie.name}
                          className="w-8 h-12 object-cover rounded-md shrink-0 bg-white/5"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-8 h-12 bg-white/5 rounded-md flex items-center justify-center text-gray-500 shrink-0">
                          🎬
                        </div>
                      )}
                      <div>
                        <span className="font-bold text-white text-sm block">{movie.name}</span>
                        <div className="flex items-center gap-2 mt-0.5 text-gray-400 text-[11px]">
                          {movie.year && <span>{movie.year}</span>}
                          <span>•</span>
                          <span className="font-mono">{movie.id}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 font-bold text-white">
                      <Users size={12} className="text-purple-400 shrink-0" />
                      {movie.userCount}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {movie.readyCount > 0 ? (
                      <Badge
                        variant="emerald"
                        size="xs"
                        icon={<CheckCircle size={11} className="shrink-0" />}
                      >
                        {readyPercentage}% Ready ({movie.readyCount}/{movie.userCount})
                      </Badge>
                    ) : (
                      <Badge
                        variant="amber"
                        size="xs"
                        icon={<Clock size={11} className="shrink-0" />}
                      >
                        Waiting for Release
                      </Badge>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
