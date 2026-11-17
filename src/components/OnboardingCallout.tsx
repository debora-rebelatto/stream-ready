import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, X, Film, ChevronRight, Tv, Compass, QrCode, Search } from 'lucide-react';
import { CURATED_RECOMMENDED_MOVIES } from '../lib/recommendations';
import { useWatchlist, useToast } from '../context/useAppContext';
import { trackEvent } from '../lib/analytics';
import { Button } from './Button';

export const ONBOARDING_DISMISS_KEY = 'stremio_onboarding_dismissed';
const COOLDOWN_DAYS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface OnboardingCalloutProps {
  onScrollToRecommendations?: () => void;
  onFocusSearch?: () => void;
  onOpenQrModal?: () => void;
}

export const OnboardingCallout: React.FC<OnboardingCalloutProps> = ({
  onScrollToRecommendations,
  onFocusSearch,
  onOpenQrModal,
}) => {
  const { items: watchlistItems, addItem } = useWatchlist();
  const { showToast } = useToast();

  const [isDismissed, setIsDismissed] = useState<boolean>(() => {
    try {
      const dismissedUntil = localStorage.getItem(ONBOARDING_DISMISS_KEY);
      if (dismissedUntil) {
        const expiry = parseInt(dismissedUntil, 10);
        if (!isNaN(expiry) && Date.now() < expiry) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  });

  const [isBatchAdding, setIsBatchAdding] = useState(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  // Selected top 3 starter movies (popular, diverse, with confirmed quality streams)
  const starterMovies = React.useMemo(() => {
    return CURATED_RECOMMENDED_MOVIES.slice(0, 3);
  }, []);

  // Track impression once when rendered to an empty-watchlist user
  useEffect(() => {
    if (watchlistItems.length === 0 && !isDismissed) {
      trackEvent('onboarding_viewed', { watchlistCount: 0 });
    }
  }, [watchlistItems.length, isDismissed]);

  // Don't render if user already has movies in their watchlist or dismissed the callout
  if (watchlistItems.length > 0 || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    trackEvent('onboarding_dismissed', { reason: 'user_closed' });
    try {
      const expiry = Date.now() + COOLDOWN_DAYS_MS;
      localStorage.setItem(ONBOARDING_DISMISS_KEY, String(expiry));
    } catch {}
  };

  const handleAddSingle = async (movieId: string, movieName: string) => {
    if (addingId || isBatchAdding) return;
    setAddingId(movieId);
    try {
      await addItem(movieId, 'recommendations');
      trackEvent('onboarding_quick_add_clicked', {
        movieIds: [movieId],
        source: 'onboarding_callout_single',
      });
      showToast(`🎬 "${movieName}" added to your watchlist!`, 'success');
    } catch {
      showToast(`Failed to add "${movieName}"`, 'error');
    } finally {
      setAddingId(null);
    }
  };

  const handleBatchAddTopPicks = async () => {
    if (isBatchAdding || starterMovies.length === 0) return;
    setIsBatchAdding(true);

    const idsToAdd = starterMovies.map((m) => m.id);
    let addedCount = 0;

    try {
      for (let i = 0; i < starterMovies.length; i++) {
        const movie = starterMovies[i];
        setBatchProgress({ current: i + 1, total: starterMovies.length });
        try {
          await addItem(movie.id, 'recommendations');
          addedCount++;
        } catch {
          // Continue adding remaining items even if one fails
        }
      }

      trackEvent('onboarding_quick_add_clicked', {
        movieIds: idsToAdd,
        source: 'onboarding_callout_batch',
      });

      if (addedCount > 0) {
        showToast(
          `🎉 ${addedCount} movies added! Check your Stremio home screen or catalog.`,
          'success'
        );
      }
    } finally {
      setIsBatchAdding(false);
      setBatchProgress(null);
    }
  };

  const handleExploreClick = () => {
    if (onScrollToRecommendations) {
      onScrollToRecommendations();
    } else {
      const el = document.getElementById('recommended-banner');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <section
      aria-label="Welcome and quick start guide"
      className="mb-8 rounded-2xl relative overflow-hidden border border-purple-500/30 bg-gradient-to-br from-[#1b1535] via-[#121424] to-[#0c0d15] shadow-2xl transition-all"
    >
      {/* Decorative ambient background glow */}
      <div className="absolute -top-24 -right-24 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="p-4 sm:p-6 relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-300 shrink-0 mt-0.5 shadow-inner">
              <Sparkles size={20} className="animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Quick Start Guide
                </span>
                <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                  <Tv size={12} />
                  Stremio Catalog Setup
                </span>
              </div>

              <h2 className="text-base sm:text-xl font-black text-white tracking-tight">
                Activate your Stremio Watchlist in 1 Click 🎬
              </h2>

              <p className="text-xs sm:text-sm text-gray-300 mt-1 max-w-2xl leading-relaxed">
                Stremio cannot add movies directly from your TV or player screen. Add your first titles
                here on the web dashboard to populate your good-quality tracker catalog in Stremio!
              </p>
            </div>
          </div>

          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
            title="Dismiss guide"
            aria-label="Dismiss onboarding guide"
          >
            <X size={16} />
          </button>
        </div>

        {/* Quick-Add Recommended Movies Grid */}
        <div className="mt-5 pt-4 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3.5">
            <div className="text-xs font-semibold text-gray-300 flex items-center gap-1.5">
              <Film size={14} className="text-purple-400" />
              <span>Recommended Starter Hits:</span>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="primary"
                onClick={handleBatchAddTopPicks}
                disabled={isBatchAdding}
                icon={<Sparkles size={14} />}
              >
                {isBatchAdding && batchProgress
                  ? `Adding (${batchProgress.current}/${batchProgress.total})...`
                  : 'Add Top 3 Hits'}
              </Button>

              <Button
                variant="indigo"
                onClick={handleExploreClick}
                icon={<Compass size={13} />}
              >
                <span>Browse All</span>
                <ChevronRight size={13} className="inline ml-1" />
              </Button>

              {onFocusSearch && (
                <Button
                  variant="outline"
                  onClick={onFocusSearch}
                  icon={<Search size={13} className="text-purple-400" />}
                  title="Search movies to add"
                >
                  Search
                </Button>
              )}

              {onOpenQrModal && (
                <Button
                  variant="outline"
                  onClick={onOpenQrModal}
                  icon={<QrCode size={13} className="text-purple-400" />}
                  title="Scan QR Code to open on mobile"
                >
                  Mobile QR
                </Button>
              )}
            </div>
          </div>

          {/* 3 Starter Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {starterMovies.map((movie) => {
              const isAddingThis = addingId === movie.id;

              return (
                <div
                  key={movie.id}
                  className="group relative flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 hover:border-purple-500/30 transition-all"
                >
                  <img
                    src={movie.poster}
                    alt={movie.name}
                    className="w-12 h-16 object-cover rounded-lg shrink-0 shadow-md bg-gray-900"
                    loading="lazy"
                  />

                  <div className="flex-1 min-w-0 pr-1">
                    <h3 className="text-xs font-bold text-white truncate group-hover:text-purple-200 transition-colors">
                      {movie.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-0.5">
                      <span>{movie.year}</span>
                      <span>•</span>
                      <span className="text-emerald-400 font-medium truncate">
                        {movie.qualityBadge || 'Ready'}
                      </span>
                    </div>

                    <div className="mt-2">
                      <button
                        onClick={() => handleAddSingle(movie.id, movie.name)}
                        disabled={isAddingThis || isBatchAdding}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 hover:border-transparent transition-all cursor-pointer disabled:opacity-50"
                      >
                        {isAddingThis ? (
                          <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Plus size={11} />
                        )}
                        <span>{isAddingThis ? 'Adding...' : 'Add Movie'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
