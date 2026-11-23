import React from 'react';
import {
  Sparkles,
  Search,
  X,
  Film,
  Clock,
  Eye,
  Calendar,
  List,
  type LucideIcon,
} from 'lucide-react';
import type { WatchlistItem } from '../../models';
import type { WatchlistTab } from '../../utils';
import { MovieCard } from './MovieCard';
import { Pagination, Button, EmptyState, LoadingState } from '../common';

const TAB_EMPTY_CONFIG: Record<WatchlistTab, { Icon: LucideIcon; title: string }> = {
  all: { Icon: List, title: 'Your watchlist is empty' },
  ready: { Icon: Film, title: 'No movies ready in good quality yet' },
  pending: { Icon: Clock, title: 'No movies waiting for good quality!' },
  unreleased: { Icon: Calendar, title: 'No unreleased movies found!' },
  watched: { Icon: Eye, title: 'No movies in your watched history' },
};

interface WatchlistGridProps {
  isLoading: boolean;
  itemsCount: number;
  sortedCount: number;
  paginatedItems: WatchlistItem[];
  currentTab: WatchlistTab;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onDeleteRequest: (id: string, name: string) => void;
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (perPage: number) => void;
}

export const WatchlistGrid: React.FC<WatchlistGridProps> = ({
  isLoading,
  itemsCount,
  sortedCount,
  paginatedItems,
  currentTab,
  hasActiveFilters,
  onClearFilters,
  onDeleteRequest,
  currentPage,
  totalPages,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  if (isLoading) {
    return <LoadingState title="Loading your watchlist..." />;
  }

  if (sortedCount === 0) {
    const tabConfig = TAB_EMPTY_CONFIG[currentTab] ?? TAB_EMPTY_CONFIG.all;
    const EmptyIcon = hasActiveFilters ? Search : tabConfig.Icon;
    const emptyTitle = hasActiveFilters
      ? 'No titles found with active filters'
      : tabConfig.title;

    const emptyDescription = hasActiveFilters
      ? 'Try searching for another title or clearing the selected filters.'
      : currentTab === 'watched'
        ? 'Click the eye icon on any movie card to mark it as watched and archive it.'
        : itemsCount === 0
          ? 'Use the recommendations or search bar above to start tracking movies.'
          : 'Switch tabs or add more items to monitor.';

    return (
      <EmptyState
        icon={<EmptyIcon className="w-8 h-8" />}
        title={emptyTitle}
        description={emptyDescription}
        actions={
          <>
            {itemsCount === 0 && !hasActiveFilters && (
              <>
                <Button
                  variant="primary"
                  className="font-bold shadow-lg shadow-purple-900/30"
                  onClick={() => {
                    const el = document.getElementById('recommended-banner');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  icon={<Sparkles size={14} />}
                >
                  Explore Recommendations
                </Button>
                <Button
                  variant="outline"
                  className="hover:text-white"
                  onClick={() => {
                    window.scrollTo({ top: 350, behavior: 'smooth' });
                    const searchInput = document.querySelector(
                      'input[type="text"]'
                    ) as HTMLInputElement;
                    if (searchInput) searchInput.focus();
                  }}
                  icon={<Search size={14} />}
                >
                  Search Movies
                </Button>
              </>
            )}
            {hasActiveFilters && (
              <Button
                variant="solid"
                className="font-semibold px-3.5"
                onClick={onClearFilters}
                icon={<X size={12} />}
              >
                Clear all filters
              </Button>
            )}
          </>
        }
      />
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
        {paginatedItems.map((item) => (
          <MovieCard key={item.id} item={item} onDelete={onDeleteRequest} />
        ))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedCount}
        itemsPerPage={itemsPerPage}
        onPageChange={onPageChange}
        onItemsPerPageChange={onItemsPerPageChange}
      />
    </>
  );
};

