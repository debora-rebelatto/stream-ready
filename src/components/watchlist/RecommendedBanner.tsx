import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, Clock, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import {
  buildRecommendedList,
  fetchTrendingMovies,
  type RecommendedMovie,
} from '../../utils';
import { useWatchlist, useToast } from '../../context/useAppContext';
import { cinemetaService } from '../../services';
import { WatchInStremioButton } from './WatchInStremioButton';
import { WatchlistActionButton } from './WatchlistActionButton';

interface RecommendedBannerProps {
  className?: string;
  onOpenLogin?: () => void;
}

export const RecommendedBanner: React.FC<RecommendedBannerProps> = ({
  className = '',
  onOpenLogin,
}) => {
  const { items: watchlistItems, globalMinQuality, addItem } = useWatchlist();
  const { showToast } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [liveTrending, setLiveTrending] = useState<RecommendedMovie[]>([]);

  // Fetch live trending movies from TMDB on mount (3 ready, 3 in theaters, 3 upcoming)
  useEffect(() => {
    let isCancelled = false;
    fetchTrendingMovies(9)
      .then((trending) => {
        if (!isCancelled && trending && trending.length > 0) {
          setLiveTrending(trending);
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, []);

  // Base list generated from user watchlist + trending/curated recommendations (9 items)
  const baseList = useMemo(() => {
    return buildRecommendedList(watchlistItems || [], globalMinQuality || '1080p', 9, liveTrending);
  }, [watchlistItems, globalMinQuality, liveTrending]);

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
        } catch (err) {
          console.warn('[RecommendedBanner] Metadata enrichment skipped:', err);
        }
      }

      if (!isCancelled && Object.keys(updates).length > 0) {
        setMovies((prev) => prev.map((m) => (updates[m.id] ? { ...m, ...updates[m.id] } : m)));
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

  return (
    <div
      id="recommended-banner"
      className={`mb-8 relative rounded-2xl overflow-hidden border border-white/10 bg-[#0c0d14] shadow-2xl transition-all duration-300 ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Background Banner Image with Cross-Fade */}
      <div className="relative w-full h-72 sm:h-88 md:h-96 overflow-hidden">
        {movies.map((movie, idx) => {
          const isActive = idx === currentIndex;
          const bannerUrl =
            movie.banner || `https://images.metahub.space/background/medium/${movie.id}/img.jpg`;

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
                className="w-full h-full object-cover object-center filter brightness-[0.95] contrast-[1.05]"
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
        {/* Vertical bottom gradient: keeps text and buttons legible while leaving upper artwork clearly visible */}
        <div className="absolute inset-0 bg-linear-to-t from-[#0c0d14] from-5% via-[#0c0d14]/50 via-45% to-transparent to-85% z-10 pointer-events-none" />

        {/* Subtle horizontal gradient: protects left-aligned text while keeping center and right hero artwork vibrant */}
        <div className="absolute inset-0 bg-linear-to-r from-[#0c0d14]/65 via-[#0c0d14]/20 via-50% to-transparent sm:from-[#0c0d14]/80 sm:via-[#0c0d14]/30 sm:to-transparent z-10 pointer-events-none" />

        {/* Top Controls: Minimal Header + Slide Switcher */}
        <div className="absolute top-3 sm:top-4 left-3.5 sm:left-6 right-3.5 sm:right-6 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-[10px] sm:text-[11px] font-semibold text-purple-300 tracking-wider uppercase">
              <Sparkles size={11} className="text-purple-400" />
              <span className="hidden xs:inline">Recommended</span>
              <span className="xs:hidden">Featured</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Slide Navigation Buttons */}
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-md rounded-xl p-0.5 sm:p-1 border border-white/10">
              <button
                onClick={handlePrev}
                className="p-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Previous"
                aria-label="Previous"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-[10px] sm:text-[11px] font-medium text-gray-300 px-1 font-mono">
                {currentIndex + 1}/{movies.length}
              </span>
              <button
                onClick={handleNext}
                className="p-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Next"
                aria-label="Next"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="absolute bottom-4 sm:bottom-8 left-3.5 sm:left-6 right-3.5 sm:right-6 z-20 max-w-2xl">
          {/* Status Badge: Single, clean, non-redundant tag */}
          <div className="flex items-center gap-2 mb-1.5 sm:mb-2">
            {currentMovie.isReady ? (
              <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold uppercase tracking-wide bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 backdrop-blur-md">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {currentMovie.qualityBadge && currentMovie.qualityBadge !== 'Ready to Watch'
                    ? currentMovie.qualityBadge
                    : 'Ready to Watch'}
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold uppercase tracking-wide bg-amber-500/20 border border-amber-400/30 text-amber-300 backdrop-blur-md">
                <Clock size={11} className="text-amber-400" />
                <span>{currentMovie.qualityBadge || 'Coming Soon'}</span>
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight drop-shadow-lg mb-1 sm:mb-2 leading-tight line-clamp-1 sm:line-clamp-2">
            {currentMovie.name}
          </h2>

          {/* Minimalist Metadata Line: Year • Genres (desktop) • Rating */}
          <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-200 mb-2 sm:mb-2.5 font-medium drop-shadow">
            {currentMovie.year && <span>{currentMovie.year}</span>}

            {currentMovie.genres && currentMovie.genres.length > 0 && (
              <>
                <span className="hidden sm:inline text-gray-500">•</span>
                <span className="hidden sm:inline text-gray-300 truncate max-w-50 sm:max-w-none">
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

          {/* Brief Description: Hidden on mobile to keep hero clean and focused */}
          {currentMovie.description && (
            <p className="hidden sm:block text-xs sm:text-sm text-gray-300/90 leading-relaxed line-clamp-2 mb-4 drop-shadow">
              {currentMovie.description}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <WatchInStremioButton
              movieId={currentMovie.id}
              isReady={currentMovie.isReady}
              onClick={() => handleWatchInStremio(currentMovie.id)}
            />

            <WatchlistActionButton
              movieId={currentMovie.id}
              movieName={currentMovie.name}
              isInWatchlist={currentMovie.isInWatchlist}
              isLoading={isAddingId === currentMovie.id}
              onAdd={(e) => handleAddToWatchlist(e, currentMovie.id, currentMovie.name)}
              onOpenLogin={onOpenLogin}
            />
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
