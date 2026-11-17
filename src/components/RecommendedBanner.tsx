import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Clock,
  Play,
  Check,
  Plus,
  ChevronLeft,
  ChevronRight,
  Star,
} from 'lucide-react';
import { buildRecommendedList, type RecommendedMovie } from '../lib/recommendations';
import { useWatchlist, useToast } from '../context/useAppContext';
import { cinemetaService } from '../services/cinemetaService';

interface RecommendedBannerProps {
  className?: string;
  onOpenLogin?: () => void;
}

export const RecommendedBanner: React.FC<RecommendedBannerProps> = ({ className = '', onOpenLogin }) => {
  const { items: watchlistItems, globalMinQuality, addItem } = useWatchlist();
  const { showToast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Base list generated from user watchlist + curated recommendations (always guaranteed 6 items)
  const baseList = useMemo(() => {
    return buildRecommendedList(watchlistItems || [], globalMinQuality || '1080p', 6);
  }, [watchlistItems, globalMinQuality]);

  // Enriched movies state (holds banners/descriptions that might be fetched on the fly)
  const [movies, setMovies] = useState<RecommendedMovie[]>(baseList);
  const [isAddingId, setIsAddingId] = useState<string | null>(null);

  // Sync movies whenever baseList changes
  useEffect(() => {
    if (baseList && baseList.length > 0) {
      setMovies(baseList);
    }
  }, [baseList]);

  // Fetch missing banners/descriptions from Cinemeta if any item lacks them
  useEffect(() => {
    let isCancelled = false;

    const enrichMissingMetadata = async () => {
      const itemsToEnrich = baseList.filter(
        (m) => !m.description || !m.banner || m.banner.includes('no-image')
      );
      if (itemsToEnrich.length === 0) return;

      const updates: Record<string, Partial<RecommendedMovie>> = {};

      for (const item of itemsToEnrich) {
        try {
          const meta = await cinemetaService.getMeta('movie', item.id);
          if (meta && !isCancelled) {
            updates[item.id] = {
              banner: meta.banner || item.banner,
              description: meta.description || item.description,
              genres: meta.genres && meta.genres.length > 0 ? meta.genres : item.genres,
              imdbRating: meta.imdbRating || item.imdbRating,
            };
          }
        } catch {
          // ignore lookup errors
        }
      }

      if (!isCancelled && Object.keys(updates).length > 0) {
        setMovies((prev) =>
          prev.map((m) => (updates[m.id] ? { ...m, ...updates[m.id] } : m))
        );
      }
    };

    enrichMissingMetadata();

    return () => {
      isCancelled = true;
    };
  }, [baseList]);

  // Carousel auto-advance timer (every 7 seconds when not hovered)
  useEffect(() => {
    if (isHovered || movies.length <= 1) return;

    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 7000);

    return () => {
      clearInterval(timer);
    };
  }, [isHovered, movies.length]);

  // Keep index within bounds if length changes
  useEffect(() => {
    if (currentIndex >= movies.length && movies.length > 0) {
      setCurrentIndex(0);
    }
  }, [currentIndex, movies.length]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + movies.length) % movies.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % movies.length);
  };

  const currentMovie = movies[currentIndex] || movies[0];

  const handleWatchInStremio = (movieId: string) => {
    const stremioWebLink = `https://web.stremio.com/#/detail/movie/${movieId}/${movieId}`;
    window.open(stremioWebLink, '_blank', 'noopener,noreferrer');
  };

  const handleAddToWatchlist = async (e: React.MouseEvent, movieId: string, movieName: string) => {
    e.stopPropagation();
    if (!addItem) {
      if (onOpenLogin) onOpenLogin();
      return;
    }
    setIsAddingId(movieId);
    try {
      await addItem(movieId, 'recommendations');
      showToast(`🎬 "${movieName}" added to your watchlist!`, 'success');
    } catch {
      showToast(`Failed to add "${movieName}"`, 'error');
    } finally {
      setIsAddingId(null);
    }
  };

  if (!currentMovie) {
    return null;
  }

  // Clean Quality Badge text: Avoid redundant "Coming Soon" or "Unreleased" repetitions
  const getQualityText = () => {
    if (currentMovie.isReady) {
      return currentMovie.qualityBadge || 'Ready to Watch';
    }
    return 'Coming Soon';
  };

  return (
    <div
      className={`mb-8 relative rounded-2xl overflow-hidden border border-white/10 bg-[#0c0d14] shadow-2xl transition-all duration-300 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Banner Image with Cross-Fade */}
      <div className="relative w-full h-[320px] sm:h-[360px] md:h-[390px] overflow-hidden">
        {movies.map((movie, idx) => {
          const isActive = idx === currentIndex;
          const bannerUrl =
            movie.banner ||
            `https://images.metahub.space/background/medium/${movie.id}/img.jpg`;

          return (
            <div
              key={movie.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-0' : 'opacity-0 -z-10 pointer-events-none'
              }`}
            >
              <img
                src={bannerUrl}
                alt={movie.name}
                className="w-full h-full object-cover object-center filter brightness-[0.7] contrast-[1.05]"
                loading={idx === 0 ? 'eager' : 'lazy'}
                onError={(e) => {
                  const target = e.currentTarget;
                  if (movie.poster && target.src !== movie.poster) {
                    target.src = movie.poster;
                  }
                }}
              />
            </div>
          );
        })}

        {/* Cinematic Vignette & Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0d14] via-[#0c0d14]/75 sm:via-[#0c0d14]/40 to-transparent z-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0d14] via-[#0c0d14]/90 sm:via-[#0c0d14]/70 md:via-[#0c0d14]/40 to-transparent z-10" />

        {/* Top Controls: Minimal Header + Slide Switcher */}
        <div className="absolute top-4 left-4 sm:left-6 right-4 sm:right-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[11px] font-semibold text-purple-300 tracking-wider uppercase">
              <Sparkles size={12} className="text-purple-400" />
              <span>Recommended to Watch</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Slide Navigation Buttons */}
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md rounded-xl p-1 border border-white/10">
              <button
                onClick={handlePrev}
                className="p-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Previous"
                aria-label="Previous"
              >
                <ChevronLeft size={15} />
              </button>
              <span className="text-[11px] font-medium text-gray-300 px-1.5 font-mono">
                {currentIndex + 1}/{movies.length}
              </span>
              <button
                onClick={handleNext}
                className="p-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Next"
                aria-label="Next"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="absolute bottom-6 sm:bottom-8 left-4 sm:left-6 right-4 sm:right-6 z-20 max-w-2xl">
          {/* Status Badge: Single, clean, non-redundant tag */}
          <div className="flex items-center gap-2 mb-2">
            {currentMovie.isReady ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ready to Watch{currentMovie.qualityBadge && currentMovie.qualityBadge !== 'Ready to Watch' ? ` • ${currentMovie.qualityBadge}` : ''}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wide bg-amber-500/20 border border-amber-400/30 text-amber-300 backdrop-blur-md">
                <Clock size={11} className="text-amber-400" />
                <span>Coming Soon</span>
              </span>
            )}

            {currentMovie.isInWatchlist && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/20 border border-purple-500/30 text-purple-300 backdrop-blur-md">
                <Check size={11} />
                <span>In Watchlist</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-md mb-2 leading-tight">
            {currentMovie.name}
          </h2>

          {/* Minimalist Metadata Line: Year • Genres • Rating */}
          <div className="flex items-center gap-2 text-xs text-gray-300 mb-2.5 font-medium">
            {currentMovie.year && <span>{currentMovie.year}</span>}

            {currentMovie.genres && currentMovie.genres.length > 0 && (
              <>
                <span className="text-gray-500">•</span>
                <span className="text-gray-300 truncate max-w-[200px] sm:max-w-none">
                  {currentMovie.genres.slice(0, 3).join(', ')}
                </span>
              </>
            )}

            {currentMovie.imdbRating && (
              <>
                <span className="text-gray-500">•</span>
                <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  <span>{currentMovie.imdbRating}</span>
                </span>
              </>
            )}
          </div>

          {/* Brief Description */}
          {currentMovie.description && (
            <p className="text-xs sm:text-sm text-gray-300/90 leading-relaxed line-clamp-2 mb-4 drop-shadow">
              {currentMovie.description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleWatchInStremio(currentMovie.id)}
              className="inline-flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-purple-900/30 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <Play size={13} fill="currentColor" />
              <span>{currentMovie.isReady ? 'Watch in Stremio' : 'Open in Stremio'}</span>
            </button>

            {currentMovie.isInWatchlist ? (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-emerald-300 text-xs sm:text-sm font-medium backdrop-blur-md">
                <Check size={14} className="text-emerald-400" />
                <span>In Watchlist</span>
              </span>
            ) : (
              <button
                onClick={(e) => handleAddToWatchlist(e, currentMovie.id, currentMovie.name)}
                disabled={isAddingId === currentMovie.id}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-medium text-xs sm:text-sm backdrop-blur-md transition-all cursor-pointer"
              >
                {isAddingId === currentMovie.id ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Plus size={14} />
                )}
                <span>Add to Watchlist</span>
              </button>
            )}
          </div>
        </div>

        {/* Minimalist Bottom Indicator Bars (Clean, No Movie Names) */}
        <div className="absolute bottom-3 right-4 sm:right-6 z-20 flex items-center gap-1.5">
          {movies.map((movie, idx) => {
            const isSelected = idx === currentIndex;
            return (
              <button
                key={movie.id}
                onClick={() => setCurrentIndex(idx)}
                className={`relative h-1.5 rounded-full transition-all duration-300 cursor-pointer overflow-hidden ${
                  isSelected
                    ? 'w-6 sm:w-8 bg-purple-500'
                    : 'w-2 sm:w-2.5 bg-white/20 hover:bg-white/40'
                }`}
                title={`Movie ${idx + 1}`}
                aria-label={`Go to movie ${idx + 1}`}
              >
                {isSelected && !isHovered && (
                  <div
                    key={currentIndex}
                    className="absolute inset-0 bg-white/40 animate-banner-progress"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
