import React from 'react';
import { RotateCw, Eye, Search, X } from 'lucide-react';
import type { WatchlistStats } from '../../models';
import type { DashboardFilterState, WatchlistTab, WatchlistSortOption } from '../../utils';
import { Button, Badge, Input, Select } from '../common';

interface DashboardFilterToolbarProps {
  listTopRef: React.RefObject<HTMLDivElement | null>;
  currentTab: WatchlistTab;
  stats: WatchlistStats;
  onTabChange: (tab: WatchlistTab) => void;
  isCheckingAll: boolean;
  onRecheckAll: () => void;
  filters: DashboardFilterState;
  onFilterChange: <K extends keyof DashboardFilterState>(
    key: K,
    value: DashboardFilterState[K]
  ) => void;
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
  filters,
  onFilterChange,
  hasActiveFilters,
  onClearFilters,
  totalCount,
}) => {
  const { searchQuery, selectedQuality, selectedAudio, includeWatchedInAll, sortBy } = filters;
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
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => onFilterChange('searchQuery', e.target.value)}
            onClear={() => onFilterChange('searchQuery', '')}
            leftIcon={<Search size={14} />}
            placeholder="Filter by title or year..."
            containerClassName="flex-1 min-w-0"
            className="text-xs"
          />

          <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap shrink-0">
            {currentTab !== 'watched' && (
              <Select
                value={selectedQuality}
                onChange={(e) => onFilterChange('selectedQuality', e.target.value)}
                className="max-w-[140px] truncate"
                options={[
                  { value: 'all', label: 'All Qualities' },
                  { value: '4k', label: '4K / 2160p' },
                  { value: '1080p', label: '1080p Full HD' },
                  { value: '720p', label: '720p HD' },
                  { value: 'pending', label: 'Waiting / Pending' },
                ]}
              />
            )}

            {currentTab !== 'watched' && (
              <Select
                value={selectedAudio}
                onChange={(e) => onFilterChange('selectedAudio', e.target.value)}
                className="max-w-[135px] truncate"
                options={[
                  { value: 'all', label: 'All Audio' },
                  { value: 'atmos', label: 'Dolby Atmos' },
                  { value: 'lossless', label: 'Lossless (TrueHD / DTS-HD)' },
                  { value: 'surround', label: 'Surround 5.1+' },
                ]}
              />
            )}

            {currentTab === 'all' && (
              <Button
                type="button"
                variant="outline"
                className={`rounded-xl px-3 py-2 font-semibold whitespace-nowrap shrink-0 ${
                  includeWatchedInAll
                    ? 'bg-purple-600/20 text-purple-300 border-purple-500/40 hover:bg-purple-600/30'
                    : 'bg-[#1e2235] text-gray-400 border-white/10 hover:text-gray-200'
                }`}
                onClick={() => onFilterChange('includeWatchedInAll', !includeWatchedInAll)}
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

            <Select
              value={sortBy}
              onChange={(e) => onFilterChange('sortBy', e.target.value as WatchlistSortOption)}
              className="text-purple-300 font-medium max-w-[190px] truncate"
              options={[
                { value: 'added_desc', label: '↕️ Added: Newest First' },
                { value: 'added_asc', label: '↕️ Added: Oldest First' },
                { value: 'rating_desc', label: '⭐ Rating: Highest First' },
                { value: 'rating_asc', label: '⭐ Rating: Lowest First' },
                { value: 'year_desc', label: '📅 Year: Newest First' },
                { value: 'year_asc', label: '📅 Year: Oldest First' },
                { value: 'title_asc', label: '🔤 Title: A → Z' },
                { value: 'title_desc', label: '🔤 Title: Z → A' },
                { value: 'streams_desc', label: '📡 Most Sources Available' },
              ]}
            />

            {hasActiveFilters && (
              <Button
                variant="danger"
                className="rounded-xl px-2.5 py-2 font-semibold whitespace-nowrap shrink-0"
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

