import React, { useState, useEffect } from 'react';
import type { MovieCardStatus, WatchlistItem } from '../../models';
import { computeMovieStatus } from '../../utils';
import { useWatchlist } from '../../context/useAppContext';
import { Badge, type BadgeVariant } from '../common';
import { MovieCardActionButton } from './MovieCardActionButton';
import {
  Trash2,
  Star,
  CheckCircle,
  Clock,
  Calendar,
  Eye,
  Flame,
  RotateCcw,
  Folder,
  Check,
  Volume2,
} from 'lucide-react';

export interface MovieStatusBadgeConfig {
  variant: BadgeVariant;
  label: string;
  icon: React.ReactNode;
  pulse?: boolean;
  className: string;
}

export const MOVIE_STATUS_BADGE_MAP: Record<MovieCardStatus, MovieStatusBadgeConfig> = {
  watched: {
    variant: 'purple',
    label: 'Watched',
    icon: <Eye size={10} />,
    className: 'backdrop-blur-md shadow-md bg-purple-900/90 text-purple-200 border-purple-500/40',
  },
  new: {
    variant: 'gradient',
    label: 'NEW RELEASE',
    icon: <Flame size={11} className="fill-current text-yellow-200" />,
    pulse: true,
    className: 'backdrop-blur-md',
  },
  ready: {
    variant: 'emerald',
    label: 'Good Quality',
    icon: <CheckCircle size={10} />,
    className: 'backdrop-blur-md shadow-md bg-emerald-500/90 text-white border-emerald-400/40',
  },
  unreleased: {
    variant: 'blue',
    label: 'Unreleased',
    icon: <Calendar size={10} />,
    className: 'backdrop-blur-md shadow-md bg-blue-600/90 text-white border-blue-400/40',
  },
  waiting: {
    variant: 'amber',
    label: 'Waiting',
    icon: <Clock size={10} />,
    className: 'backdrop-blur-md shadow-md bg-amber-500/90 text-black border-amber-300/40',
  },
};

interface MovieCardProps {
  item: WatchlistItem;
  onDelete: (id: string, name: string) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ item, onDelete }) => {
  const { markWatched, globalMinQuality, globalMinAudio, customLists, toggleItemCustomList } =
    useWatchlist();
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    if (!isListMenuOpen) return;
    const handleOutsideClick = () => setIsListMenuOpen(false);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [isListMenuOpen]);

  const {
    status,
    isWatched,
    isReady: ready,
    isNewRelease: isNew,
    qualityLabel: qualityText,
    streamsLabel: streamsText,
    hasAtmos,
    isLosslessAudio,
    audioFormat,
  } = item.computed ?? computeMovieStatus(item, globalMinQuality, globalMinAudio);
  const badgeConfig = MOVIE_STATUS_BADGE_MAP[status];
  const displayAudioLabel = hasAtmos ? 'Dolby Atmos' : audioFormat;
  const audioBadgeVariant: BadgeVariant = hasAtmos
    ? 'cyan'
    : isLosslessAudio
      ? 'purple'
      : 'neutral';

  const itemLists = customLists.filter((l) => (item.customLists || []).includes(l.id));

  const handleClick = (e: React.MouseEvent) => {
    // If click is on an interactive button or select, do not navigate
    if ((e.target as HTMLElement).closest('button, select, input, label')) return;

    // Opens directly in Stremio Web in a new tab (guaranteed to work across all browsers, mobile and desktop)
    const stremioWebLink = `https://web.stremio.com/#/detail/movie/${item.id}/${item.id}`;
    window.open(stremioWebLink, '_blank', 'noopener,noreferrer');
  };

  const handleToggleWatched = (e: React.MouseEvent) => {
    e.stopPropagation();
    markWatched(item.id, !isWatched);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex flex-col bg-[#151824] border rounded-xl hover:shadow-xl cursor-pointer ${
        isWatched
          ? 'border-white/5 opacity-75 hover:opacity-100 hover:border-purple-500/30'
          : isNew
            ? 'border-amber-500/50 hover:border-amber-400 shadow-amber-500/10'
            : 'border-white/10 hover:border-white/25'
      }`}
      title="Click to open in Stremio Web"
    >
      {/* Poster */}
      <div className="relative aspect-2/3 w-full bg-[#1e2235] overflow-hidden rounded-t-xl">
        <img
          src={
            item.poster ||
            'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="%231e2235"/><text x="50%" y="50%" fill="%239ca3af" text-anchor="middle">No Image</text></svg>'
          }
          alt={item.name}
          loading="lazy"
          className={`w-full h-full object-cover ${
            isWatched ? 'grayscale-30' : ''
          }`}
        />

        {/* Status Badge (Top-Left) */}
        <div className="absolute top-2.5 left-2.5 z-10 flex flex-col gap-1 items-start">
          <Badge
            variant={badgeConfig.variant}
            size="sm"
            uppercase
            icon={badgeConfig.icon}
            pulse={badgeConfig.pulse}
            className={badgeConfig.className}
          >
            {badgeConfig.label}
          </Badge>
        </div>

        {/* Action Buttons (Top-Right) */}
        <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-all">
          {/* Mark as Watched / Restore Button */}
          <MovieCardActionButton
            variant={isWatched ? 'purple' : 'emerald'}
            onClick={handleToggleWatched}
            title={isWatched ? 'Restore to active Watchlist' : 'Mark as Watched (Archive)'}
            aria-label={isWatched ? 'Restore movie' : 'Mark as watched'}
            icon={isWatched ? <RotateCcw size={13} /> : <Eye size={13} />}
          />

          {/* Delete Button */}
          <MovieCardActionButton
            variant="danger"
            onClick={() => onDelete(item.id, item.name)}
            title={`Remove ${item.name} from watchlist`}
            aria-label={`Remove ${item.name}`}
            icon={<Trash2 size={13} />}
          />
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
            {item.imdbRating &&
            String(item.imdbRating) !== 'N/A' &&
            String(item.imdbRating).trim() !== '' ? (
              <Badge
                variant="amber"
                size="xs"
                icon={<Star size={11} className="fill-amber-400 text-amber-400" />}
                title={`IMDb Rating: ${item.imdbRating}/10`}
              >
                {item.imdbRating}
              </Badge>
            ) : (
              <span
                className="inline-flex items-center gap-1 text-gray-500 text-[11px]"
                title="No rating yet"
              >
                <Star size={11} className="text-gray-500" />
                <span>N/A</span>
              </span>
            )}
          </div>
        </div>

        {/* Quality Info */}
        <div className="flex flex-col gap-1.5 pt-1 border-t border-white/5">
          {/* Detected Quality & Audio Pills */}
          <div className="flex items-center flex-wrap gap-1.5">
            <div
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2 py-0.5 rounded border self-start ${
                isWatched
                  ? 'bg-purple-900/20 text-purple-300 border-purple-500/30'
                  : ready
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              {isWatched ? (
                <span>Watched</span>
              ) : (
                <>
                  <span>{qualityText}</span>
                  <span className="text-gray-500">•</span>
                  <span>{streamsText}</span>
                </>
              )}
            </div>

            {!isWatched && ready && displayAudioLabel && (
              <Badge
                variant={audioBadgeVariant}
                size="xs"
                uppercase={hasAtmos}
                icon={<Volume2 size={10} />}
                title={`Detected audio: ${displayAudioLabel}`}
              >
                {displayAudioLabel}
              </Badge>
            )}
          </div>

          {/* Custom Lists Tags & Menu */}
          <div className="relative pt-1 border-t border-white/5">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1 overflow-hidden flex-wrap max-h-5 flex-1 min-w-0">
                {itemLists.length > 0 ? (
                  itemLists.map((l) => (
                    <span
                      key={l.id}
                      className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 truncate max-w-21.25"
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
