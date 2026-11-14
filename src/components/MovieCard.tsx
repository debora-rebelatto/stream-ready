import React, { useState, useEffect } from 'react';
import type { WatchlistItem } from '../types';
import { formatQualityLabel, isItemReady, isItemNewRelease, isItemUnreleased } from '../lib/utils';
import { useWatchlist } from '../context/useAppContext';
import { Trash2, Star, CheckCircle, Clock, Calendar, Eye, EyeOff, Flame, SlidersHorizontal, RotateCcw, Folder, Check } from 'lucide-react';

interface MovieCardProps {
  item: WatchlistItem;
  onDelete: (id: string, name: string) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ item, onDelete }) => {
  const { markWatched, setItemMinQuality, globalMinQuality, customLists, toggleItemCustomList } = useWatchlist();
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);

  // Fecha menu ao clicar fora
  useEffect(() => {
    if (!isListMenuOpen) return;
    const handleOutsideClick = () => setIsListMenuOpen(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [isListMenuOpen]);

  const isWatched = Boolean(item.isWatched);
  const ready = isItemReady(item, globalMinQuality);
  const isNew = isItemNewRelease(item) && !isWatched;
  const unreleased = isItemUnreleased(item);
  const rawQuality = formatQualityLabel(item.bestQuality);
  const qualityText = unreleased ? 'Unreleased' : rawQuality;
  const streamsText = item.streamCount > 0 ? `${item.streamCount} sources` : '0 sources';

  const itemLists = customLists.filter((l) => (item.customLists || []).includes(l.id));

  const handleClick = (e: React.MouseEvent) => {
    // If click is on an interactive button or select, do not navigate
    if ((e.target as HTMLElement).closest('button, select, input, label')) return;

    const stremioDeepLink =
      item.type === 'series'
        ? `stremio:///detail/series/${item.id}`
        : `stremio:///detail/movie/${item.id}/${item.id}`;
    window.location.href = stremioDeepLink;
  };

  const handleToggleWatched = (e: React.MouseEvent) => {
    e.stopPropagation();
    markWatched(item.id, !isWatched);
  };

  const handleCycleTargetQuality = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Cycles: Default (inherits global) -> 1080p -> 4k -> Default
    let next: '1080p' | '4k' | null = null;
    if (!item.minQuality) {
      next = globalMinQuality === '1080p' ? '4k' : '1080p';
    } else if (item.minQuality === '1080p') {
      next = '4k';
    } else {
      next = null; // back to default (inherits global)
    }
    setItemMinQuality(item.id, next);
  };

  const activeTargetQuality = item.minQuality || globalMinQuality || '1080p';

  return (
    <div
      onClick={handleClick}
      className={`group relative flex flex-col bg-[#151824] border rounded-xl transition-all duration-200 hover:-translate-y-1 hover:shadow-xl cursor-pointer ${
        isWatched
          ? 'border-white/5 opacity-75 hover:opacity-100 hover:border-purple-500/30'
          : isNew
          ? 'border-amber-500/50 hover:border-amber-400 shadow-amber-500/10'
          : 'border-white/10 hover:border-white/25'
      }`}
      title="Click to open in Stremio"
    >
      {/* Poster */}
      <div className="relative aspect-[2/3] w-full bg-[#1e2235] overflow-hidden rounded-t-xl">
        <img
          src={
            item.poster ||
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="%231e2235"/><text x="50%" y="50%" fill="%239ca3af" text-anchor="middle">No Image</text></svg>'
          }
          alt={item.name}
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            isWatched ? 'grayscale-[30%]' : ''
          }`}
        />

        {/* Status Badge (Top-Left) */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
          {isWatched ? (
            <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md shadow-md flex items-center gap-1 bg-purple-900/90 text-purple-200 border border-purple-500/40">
              <Eye size={10} /> Watched
            </div>
          ) : isNew ? (
            <div className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md shadow-lg flex items-center gap-1 bg-gradient-to-r from-red-600 via-amber-500 to-yellow-400 text-white border border-amber-300 animate-pulse">
              <Flame size={11} className="fill-current text-yellow-200" /> NEW RELEASE
            </div>
          ) : ready ? (
            <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md shadow-md flex items-center gap-1 bg-emerald-500/90 text-white border border-emerald-400/40">
              <CheckCircle size={10} /> Good Quality
            </div>
          ) : unreleased ? (
            <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md shadow-md flex items-center gap-1 bg-blue-600/90 text-white border border-blue-400/40">
              <Calendar size={10} /> Unreleased
            </div>
          ) : (
            <div className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md backdrop-blur-md shadow-md flex items-center gap-1 bg-amber-500/90 text-black border border-amber-300/40">
              <Clock size={10} /> Waiting
            </div>
          )}
        </div>

        {/* Action Buttons (Top-Right) */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-all">
          {/* Mark as Watched / Restore Button */}
          <button
            onClick={handleToggleWatched}
            className={`p-1.5 rounded-full backdrop-blur-md border transition-all cursor-pointer shadow-md ${
              isWatched
                ? 'bg-purple-600/80 hover:bg-purple-500 text-white border-purple-400/40'
                : 'bg-black/60 hover:bg-emerald-600 text-gray-300 hover:text-white border-white/20'
            }`}
            title={isWatched ? 'Restore to active Watchlist' : 'Mark as Watched (Archive)'}
            aria-label={isWatched ? 'Restore movie' : 'Mark as watched'}
          >
            {isWatched ? <RotateCcw size={13} /> : <Eye size={13} />}
          </button>

          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id, item.name);
            }}
            className="p-1.5 rounded-full bg-black/60 hover:bg-red-500 text-gray-300 hover:text-white border border-white/20 backdrop-blur-md transition-all cursor-pointer shadow-md"
            title={`Remove ${item.name} from watchlist`}
            aria-label={`Remove ${item.name}`}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Details */}
      <div className="p-3.5 flex flex-col flex-1 justify-between gap-2.5">
        <div>
          <h4 className="text-sm font-bold text-white line-clamp-2 leading-tight group-hover:text-purple-300 transition-colors">
            {item.name}
          </h4>
          <div className="flex items-center justify-between text-xs text-gray-400 mt-1">
            <span className="font-semibold text-gray-300 bg-white/5 px-1.5 py-0.5 rounded text-[11px] border border-white/5">
              {item.year || 'No year'}
            </span>
            {item.imdbRating && (
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Star size={11} fill="currentColor" />
                {item.imdbRating}
              </span>
            )}
          </div>
        </div>

        {/* Quality Info & Min Quality Target Selector */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-white/5">
          {/* Detected Quality Pill */}
          <div
            className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded border self-start ${
              ready
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}
          >
            <span>{qualityText}</span>
            <span className="text-gray-500">•</span>
            <span>{streamsText}</span>
          </div>

          {/* Target Quality Override Pill */}
          <button
            type="button"
            onClick={handleCycleTargetQuality}
            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border font-medium transition-colors cursor-pointer self-start ${
              item.minQuality === '4k'
                ? 'bg-purple-900/30 text-purple-300 border-purple-500/40 hover:bg-purple-900/50'
                : item.minQuality === '1080p'
                ? 'bg-blue-900/30 text-blue-300 border-blue-500/40 hover:bg-blue-900/50'
                : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-gray-200'
            }`}
            title="Click to toggle minimum quality target (Auto / 1080p / 4K)"
          >
            <SlidersHorizontal size={9} />
            <span>Target: {item.minQuality ? item.minQuality.toUpperCase() : `Auto (${activeTargetQuality.toUpperCase()})`}</span>
          </button>

          {/* Custom Lists Tags & Menu */}
          <div className="relative pt-1 border-t border-white/5">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1 overflow-hidden flex-wrap max-h-5 flex-1 min-w-0">
                {itemLists.length > 0 ? (
                  itemLists.map((l) => (
                    <span
                      key={l.id}
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 truncate max-w-[85px]"
                      title={l.name}
                    >
                      <span>{l.emoji || '🎬'}</span>
                      <span className="truncate">{l.name}</span>
                    </span>
                  ))
                ) : (
                  <span className="text-[10px] text-gray-500">No list</span>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsListMenuOpen(!isListMenuOpen);
                }}
                className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border transition-colors shrink-0 ${
                  itemLists.length > 0
                    ? 'bg-purple-900/40 text-purple-300 border-purple-500/40 hover:bg-purple-900/60'
                    : 'bg-white/5 text-gray-400 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
                title="Organize in custom lists"
              >
                <Folder size={10} />
                <span>{itemLists.length > 0 ? `${itemLists.length}` : '+ List'}</span>
              </button>
            </div>

            {/* Dropdown Menu */}
            {isListMenuOpen && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute bottom-full mb-1.5 -left-2 -right-2 z-40 bg-[#161826]/95 border border-purple-500/30 rounded-xl p-2.5 shadow-2xl backdrop-blur-xl animate-in fade-in duration-150"
              >
                <div className="text-[11px] font-semibold text-gray-300 px-1 py-1 border-b border-white/10 mb-2 flex items-center justify-between">
                  <span className="truncate font-medium">Add to list</span>
                  <button
                    type="button"
                    onClick={() => setIsListMenuOpen(false)}
                    className="text-gray-400 hover:text-white p-0.5 rounded hover:bg-white/10 transition-colors"
                  >
                    ✕
                  </button>
                </div>

                {customLists.length === 0 ? (
                  <div className="p-2 text-center text-xs text-gray-400">
                    No lists created yet. Create a list in the top navbar!
                  </div>
                ) : (
                  <div className="max-h-44 overflow-y-auto space-y-1 custom-scrollbar">
                    {customLists.map((l) => {
                      const inList = (item.customLists || []).includes(l.id);
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => toggleItemCustomList(item.id, l.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                            inList
                              ? 'bg-purple-500/25 text-purple-200 font-semibold'
                              : 'text-gray-300 hover:bg-white/5'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 truncate">
                            <span className="text-sm shrink-0">{l.emoji || '🎬'}</span>
                            <span className="truncate">{l.name}</span>
                          </span>
                          {inList && <Check size={13} className="text-purple-400 shrink-0 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
