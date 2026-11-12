import React from 'react';
import type { WatchlistItem } from '../types';
import { formatQualityLabel } from '../lib/utils';
import { Trash2, Star, CheckCircle, Clock, Calendar } from 'lucide-react';

interface MovieCardProps {
  item: WatchlistItem;
  onDelete: (id: string, name: string) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ item, onDelete }) => {
  const ready = item.has1080pPlus;
  const rawQuality = formatQualityLabel(item.bestQuality);
  const isUnreleased =
    !ready &&
    (/unreleased|not released|unavailable|não lançado|indisponível/i.test(rawQuality) ||
      ((!item.streamCount || item.streamCount === 0) && !/cam/i.test(rawQuality)));

  const qualityText = isUnreleased ? 'Unreleased' : rawQuality;
  const streamsText = item.streamCount > 0 ? `${item.streamCount} sources` : '0 sources';

  const handleClick = (e: React.MouseEvent) => {
    // If click is on delete button, do not navigate
    if ((e.target as HTMLElement).closest('button')) return;

    const stremioDeepLink =
      item.type === 'series'
        ? `stremio:///detail/series/${item.id}`
        : `stremio:///detail/movie/${item.id}/${item.id}`;
    window.location.href = stremioDeepLink;
  };

  return (
    <div
      onClick={handleClick}
      className="group relative flex flex-col bg-[#151824] border border-white/10 hover:border-white/25 rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer"
      title="Click to open in Stremio"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full bg-[#1e2235] overflow-hidden">
        <img
          src={
            item.poster ||
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="%231e2235"/><text x="50%" y="50%" fill="%239ca3af" text-anchor="middle">No Image</text></svg>'
          }
          alt={item.name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Status Badge */}
        <div
          className={`absolute top-2.5 left-2.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md shadow-md flex items-center gap-1 ${
            ready
              ? 'bg-emerald-500/90 text-white border border-emerald-400/40'
              : isUnreleased
              ? 'bg-blue-600/90 text-white border border-blue-400/40'
              : 'bg-amber-500/90 text-black border border-amber-300/40'
          }`}
        >
          {ready ? (
            <>
              <CheckCircle size={10} /> Good Quality
            </>
          ) : isUnreleased ? (
            <>
              <Calendar size={10} /> Unreleased
            </>
          ) : (
            <>
              <Clock size={10} /> Waiting
            </>
          )}
        </div>

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(item.id, item.name);
          }}
          className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 hover:bg-red-500 text-gray-300 hover:text-white border border-white/20 backdrop-blur-md opacity-80 group-hover:opacity-100 transition-all cursor-pointer shadow-md"
          title={`Remove ${item.name} from watchlist`}
          aria-label={`Remove ${item.name}`}
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Details */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
        <div>
          <h4 className="text-sm font-bold text-white line-clamp-2 leading-tight group-hover:text-purple-300 transition-colors">
            {item.name}
          </h4>
          <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
            <span>{item.year || ''}</span>
            {item.imdbRating && (
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Star size={11} fill="currentColor" />
                {item.imdbRating}
              </span>
            )}
          </div>
        </div>

        {/* Quality Pill */}
        <div
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-1 rounded border self-start ${
            ready
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}
        >
          <span>{qualityText}</span>
          <span className="text-gray-500">•</span>
          <span>{streamsText}</span>
        </div>
      </div>
    </div>
  );
};
