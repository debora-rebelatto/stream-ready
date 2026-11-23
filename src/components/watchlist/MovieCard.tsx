import React, { useState, useCallback } from 'react';
import type { MovieCardStatus, WatchlistItem } from '../../models';
import { getMovieComputedStatus } from '../../utils';
import { useWatchlist } from '../../context/useAppContext';
import { Badge, type BadgeVariant } from '../common';
import { MovieCardActionButton } from './MovieCardActionButton';
import { MovieCardSpecsOverlay } from './MovieCardSpecsOverlay';
import { MovieCardListMenu } from './MovieCardListMenu';
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
    className: 'backdrop-blur-md shadow-sm bg-purple-950/85 text-purple-200 border-purple-400/35',
  },
  new: {
    variant: 'gradient',
    label: 'NEW',
    icon: <Flame size={10} className="fill-current text-yellow-200" />,
    className: 'backdrop-blur-md shadow-sm border-amber-300/60',
  },
  ready: {
    variant: 'emerald',
    label: 'Ready',
    icon: <CheckCircle size={10} />,
    className: 'backdrop-blur-md shadow-sm bg-emerald-600/85 text-white border-emerald-300/35',
  },
  unreleased: {
    variant: 'blue',
    label: 'Soon',
    icon: <Calendar size={10} />,
    className: 'backdrop-blur-md shadow-sm bg-blue-600/85 text-white border-blue-300/35',
  },
  waiting: {
    variant: 'amber',
    label: 'Waiting',
    icon: <Clock size={10} />,
    className: 'backdrop-blur-md shadow-sm bg-amber-500/90 text-black border-amber-200/40',
  },
};

const FALLBACK_POSTER =
  'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450"><rect width="100%" height="100%" fill="%231e2235"/><text x="50%" y="50%" fill="%239ca3af" text-anchor="middle">No Image</text></svg>';

interface MovieCardProps {
  item: WatchlistItem;
  onDelete: (id: string, name: string) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ item, onDelete }) => {
  const { markWatched, customLists, toggleItemCustomList } = useWatchlist();
  const [isListMenuOpen, setIsListMenuOpen] = useState(false);

  const closeListMenu = useCallback(() => setIsListMenuOpen(false), []);

  const computed = getMovieComputedStatus(item);
  const { status, isWatched, isReady, isUnreleased } = computed;
  const badgeConfig = MOVIE_STATUS_BADGE_MAP[status];

  const itemCustomListIds = item.customLists || [];
  const itemLists = customLists.filter((list) => itemCustomListIds.includes(list.id));

  const hasValidRating =
    Boolean(item.imdbRating) &&
    String(item.imdbRating) !== 'N/A' &&
    String(item.imdbRating).trim() !== '';

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, select, input, label, [role="dialog"]')) {
      return;
    }
    const stremioWebLink = `https://web.stremio.com/#/detail/movie/${item.id}/${item.id}`;
    window.open(stremioWebLink, '_blank', 'noopener,noreferrer');
  };

  const handleToggleWatched = (e: React.MouseEvent) => {
    e.stopPropagation();
    markWatched(item.id, !isWatched);
  };

  const handleToggleListMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsListMenuOpen((prev) => !prev);
  };

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col bg-[#131622] border rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl hover:shadow-black/50 cursor-pointer ${
        isWatched
          ? 'border-white/5 opacity-75 hover:opacity-100 hover:border-purple-500/30'
          : 'border-white/8 hover:border-white/20'
      }`}
      title="Click to open in Stremio Web"
    >
      {/* Poster Container */}
      <div className="relative aspect-2/3 w-full bg-[#1e2235] overflow-hidden rounded-t-xl">
        <img
          src={item.poster || FALLBACK_POSTER}
          alt={item.name}
          loading="lazy"
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03] ${
            isWatched ? 'grayscale-30' : ''
          }`}
        />

        {/* Compact Status Pill (Top-Left) */}
        <div className="absolute top-2 left-2 z-10">
          <Badge
            variant={badgeConfig.variant}
            size="xs"
            uppercase
            icon={badgeConfig.icon}
            pulse={badgeConfig.pulse}
            className={badgeConfig.className}
          >
            {badgeConfig.label}
          </Badge>
        </div>

        {/* Hover Action Rail (Top-Right) */}
        <div
          className={`absolute top-2 right-2 z-20 flex items-center gap-1 transition-opacity duration-150 ${
            isListMenuOpen
              ? 'opacity-100'
              : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100'
          }`}
        >
          <MovieCardActionButton
            variant={isWatched ? 'purple' : 'emerald'}
            onClick={handleToggleWatched}
            title={isWatched ? 'Restore to active Watchlist' : 'Mark as Watched (Archive)'}
            aria-label={isWatched ? 'Restore movie' : 'Mark as watched'}
            icon={isWatched ? <RotateCcw size={12} /> : <Eye size={12} />}
          />

          <MovieCardActionButton
            variant={itemLists.length > 0 ? 'purple' : 'neutral'}
            onClick={handleToggleListMenu}
            title={
              itemLists.length > 0
                ? `In ${itemLists.length} list${itemLists.length > 1 ? 's' : ''}: ${itemLists.map((l) => l.name).join(', ')}`
                : 'Add to custom list'
            }
            aria-label="Organize in custom lists"
            icon={<Folder size={12} />}
          />

          <MovieCardActionButton
            variant="danger"
            onClick={() => onDelete(item.id, item.name)}
            title={`Remove ${item.name} from watchlist`}
            aria-label={`Remove ${item.name}`}
            icon={<Trash2 size={12} />}
          />
        </div>

        {/* Bottom Scrim: Compact Resolution + Audio + Hover Source Count */}
        <MovieCardSpecsOverlay
          isWatched={isWatched}
          isReady={isReady}
          isUnreleased={isUnreleased}
          qualityLabel={computed.qualityLabel}
          streamsLabel={computed.streamsLabel}
          streamCount={item.streamCount}
          hasAtmos={computed.hasAtmos}
          isLosslessAudio={computed.isLosslessAudio}
          audioFormat={computed.audioFormat}
        />
      </div>

      {/* Custom Lists Popover */}
      <MovieCardListMenu
        isOpen={isListMenuOpen}
        customLists={customLists}
        itemCustomListIds={itemCustomListIds}
        onToggleList={(listId) => toggleItemCustomList(item.id, listId)}
        onClose={closeListMenu}
      />

      {/* Minimal 2-Line Footer */}
      <div className="px-3 pt-2.5 pb-3 flex flex-col gap-1">
        <h4
          className="text-[13px] font-semibold text-gray-100 truncate leading-snug group-hover:text-purple-300 transition-colors"
          title={item.name}
        >
          {item.name}
        </h4>

        <div className="flex items-center justify-between gap-2 text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5 min-w-0 truncate">
            <span>{item.year || 'TBA'}</span>
            {hasValidRating && (
              <>
                <span className="text-gray-600">·</span>
                <span
                  className="inline-flex items-center gap-0.5 text-gray-300 font-medium"
                  title={`IMDb Rating: ${item.imdbRating}/10`}
                >
                  <Star size={10} className="fill-amber-400 text-amber-400 shrink-0" />
                  <span>{item.imdbRating}</span>
                </span>
              </>
            )}
          </div>

          {itemLists.length > 0 && (
            <button
              type="button"
              onClick={handleToggleListMenu}
              className="inline-flex items-center gap-0.5 text-[11px] text-purple-300/90 hover:text-purple-200 transition-colors shrink-0 cursor-pointer"
              title={`Lists: ${itemLists.map((l) => l.name).join(', ')}`}
              aria-label={`Manage lists for ${item.name}`}
            >
              <span>{itemLists[0].emoji || '🎬'}</span>
              {itemLists.length > 1 && (
                <span className="text-[10px] font-medium text-purple-300/80">
                  +{itemLists.length - 1}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
