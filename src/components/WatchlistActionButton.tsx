import React, { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useWatchlist, useToast } from '../context/useAppContext';

export interface WatchlistActionButtonProps {
  movieId: string;
  movieName?: string;
  isInWatchlist?: boolean;
  isLoading?: boolean;
  onAdd?: (e: React.MouseEvent) => Promise<void> | void;
  className?: string;
  onOpenLogin?: () => void;
}

export const WatchlistActionButton: React.FC<WatchlistActionButtonProps> = ({
  movieId,
  movieName,
  isInWatchlist = false,
  isLoading: externalLoading,
  onAdd,
  className = '',
  onOpenLogin,
}) => {
  const { addItem } = useWatchlist();
  const { showToast } = useToast();
  const [internalLoading, setInternalLoading] = useState(false);

  const isLoading = externalLoading ?? internalLoading;

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onAdd) {
      await onAdd(e);
      return;
    }

    if (!addItem) {
      if (onOpenLogin) onOpenLogin();
      return;
    }

    setInternalLoading(true);
    try {
      await addItem(movieId, 'recommendations');
      showToast(`🎬 "${movieName || 'Movie'}" added to your watchlist!`, 'success');
    } catch {
      showToast(`Failed to add "${movieName || 'movie'}"`, 'error');
    } finally {
      setInternalLoading(false);
    }
  };

  if (isInWatchlist) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl bg-white/5 border border-white/10 text-emerald-300 text-xs sm:text-sm font-medium backdrop-blur-md ${className}`}
      >
        <Check size={13} className="text-emerald-400" />
        <span className="hidden sm:inline">In Watchlist</span>
        <span className="sm:hidden">Saved</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleAdd}
      disabled={isLoading}
      className={`inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-xs sm:text-sm backdrop-blur-md transition-all cursor-pointer disabled:opacity-50 ${className}`}
      title="Add to Watchlist"
      aria-label="Add to Watchlist"
    >
      {isLoading ? (
        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <Plus size={14} />
      )}
      <span className="hidden sm:inline">Add to Watchlist</span>
      <span className="sm:hidden">Add</span>
    </button>
  );
};
