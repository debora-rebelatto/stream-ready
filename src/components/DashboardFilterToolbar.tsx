import React from 'react';
import { RotateCw, Eye, Search, X } from 'lucide-react';
import type { WatchlistStats } from '../models';
import type { WatchlistTab, WatchlistSortOption } from '../utils';
import { Button } from './Button';
import { Badge } from './Badge';

interface DashboardFilterToolbarProps {
  listTopRef: React.RefObject<HTMLDivElement | null>;
  currentTab: WatchlistTab;
  stats: WatchlistStats;
  onTabChange: (tab: WatchlistTab) => void;
  isCheckingAll: boolean;
  onRecheckAll: () => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedQuality: string;
  setSelectedQuality: (q: string) => void;
  includeWatchedInAll: boolean;
  setIncludeWatchedInAll: (v: boolean) => void;
  sortBy: WatchlistSortOption;
  onSortChange: (sort: WatchlistSortOption) => void;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  totalCount: number;
}

export const DashboardFilterToolbar: React.FC<DashboardFilterToolbarProps> = ({
  listTopRef,
  currentTab,
  stats,
  onTabChange,
  isCheckingAll,
  onRecheckAll,
  searchQuery,
  setSearchQuery,
  selectedQuality,
  setSelectedQuality,
  includeWatchedInAll,
  setIncludeWatchedInAll,
  sortBy,
  onSortChange,
  hasActiveFilters,
  onClearFilters,
  totalCount,
}) => {
  return (
    <>
      <div
        ref={listTopRef}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4"
      >
        <div className="flex items-center gap-1 bg-[#151824] p-1 rounded-xl border border-white/5 overflow-x-auto">
          <Button
            variant="tab"
            tabTheme="blue"
            active={currentTab === 'all'}
            onClick={() => onTabChange('all')}
          >
            📋 All ({stats.total})
          </Button>
          <Button
            variant="tab"
            tabTheme="emerald"
            active={currentTab === 'ready'}
            onClick={() => onTabChange('ready')}
          >
            🟢 Ready ({stats.ready})
          </Button>
          <Button
            variant="tab"
            tabTheme="amber"
            active={currentTab === 'pending'}
            onClick={() => onTabChange('pending')}
          >
            ⏳ Waiting ({stats.pending})
          </Button>
          <Button
            variant="tab"
            tabTheme="rose"
            active={currentTab === 'unreleased'}
            onClick={() => onTabChange('unreleased')}
          >
            📅 Unreleased ({stats.unreleased})
          </Button>
          <Button
            variant="tab"
            tabTheme="purple"
            active={currentTab === 'watched'}
            onClick={() => onTabChange('watched')}
          >
            👁️ Watched ({stats.watched})
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={onRecheckAll}
            disabled={isCheckingAll}
            isLoading={isCheckingAll}
            icon={<RotateCw size={13} />}
            title="Check Torrentio sources for all movies right now"
          >
            Check All Now
          </Button>
        </div>
      </div>

      <div className="bg-[#151824] border border-white/5 rounded-2xl p-3 sm:p-4 mb-6 shadow-sm">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1 min-w-50">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by title or year in your list..."
              className="w-full bg-[#1e2235] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/60 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {currentTab !== 'watched' && (
              <div className="relative">
                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(e.target.value)}
                  className="bg-[#1e2235] border border-white/10 rounded-xl px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500/60 cursor-pointer hover:border-white/20 transition-colors"
                >
                  <option value="all">🎯 All Qualities</option>
                  <option value="4k">✨ 4K / 2160p</option>
                  <option value="1080p">💎 1080p Full HD</option>
                  <option value="720p">📺 720p HD</option>
                  <option value="pending">⏳ Waiting / Pending</option>
                </select>
              </div>
            )}

            {currentTab === 'all' && (
              <Button
                type="button"
                variant="outline"
                className={`rounded-xl px-3 py-2 font-semibold ${
                  includeWatchedInAll
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 hover:bg-purple-600/30'
                    : 'bg-[#1e2235] text-gray-400 border-white/10 hover:text-gray-200'
                }`}
                onClick={() => setIncludeWatchedInAll(!includeWatchedInAll)}
                icon={
                  <Eye
                    size={13}
                    className={includeWatchedInAll ? 'text-purple-400' : 'text-gray-400'}
                  />
                }
                title={
                  includeWatchedInAll
                    ? 'Hide watched movies in All view'
                    : 'Include watched movies in All view'
                }
              >
                {includeWatchedInAll ? 'With Watched' : 'Hide Watched'}
              </Button>
            )}

            <div className="relative flex items-center">
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value as WatchlistSortOption)}
                className="bg-[#1e2235] border border-white/10 rounded-xl px-3 py-2 text-xs text-purple-300 font-medium focus:outline-none focus:border-purple-500/60 cursor-pointer hover:border-white/20 transition-colors"
              >
                <option value="added_desc">↕️ Added: Newest First</option>
                <option value="added_asc">↕️ Added: Oldest First</option>
                <option value="rating_desc">⭐ Rating: Highest First</option>
                <option value="rating_asc">⭐ Rating: Lowest First</option>
                <option value="year_desc">📅 Year: Newest First</option>
                <option value="year_asc">📅 Year: Oldest First</option>
                <option value="title_asc">🔤 Title: A → Z</option>
                <option value="title_desc">🔤 Title: Z → A</option>
                <option value="streams_desc">📡 Most Sources Available</option>
              </select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="danger"
                className="rounded-xl px-2.5 py-2 font-semibold"
                onClick={onClearFilters}
                icon={<X size={12} />}
                title="Reset all filters"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-gray-400 pt-2.5 mt-2.5 border-t border-white/5">
          <span>
            Showing <strong className="text-white">{totalCount}</strong>{' '}
            {totalCount === 1 ? 'title' : 'titles'}
            {hasActiveFilters && ' (filtered)'}
          </span>
          {hasActiveFilters && (
            <Badge variant="purple" size="xs">
              Filters applied
            </Badge>
          )}
        </div>
      </div>
    </>
  );
};
