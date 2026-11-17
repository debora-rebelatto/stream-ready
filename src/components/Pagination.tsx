import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
}) => {
  if (totalPages <= 1 && totalItems <= itemsPerPage) {
    return null;
  }

  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
      {/* Items Count & Selector */}
      <div className="flex items-center gap-3 text-xs text-gray-400 order-2 sm:order-1">
        <span>
          Showing <strong className="text-white font-semibold">{startItem}–{endItem}</strong> of{' '}
          <strong className="text-white font-semibold">{totalItems}</strong> movies
        </span>

        {onItemsPerPageChange && (
          <div className="flex items-center gap-1.5 ml-2 border-l border-white/10 pl-3">
            <span className="text-[11px] text-gray-500">Per page:</span>
            <select
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="bg-[#1f2438] text-gray-200 border border-white/10 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-purple-500 cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={40}>40</option>
              <option value={60}>60</option>
            </select>
          </div>
        )}
      </div>

      {/* Pagination Navigation Controls */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
          title="First page"
          className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer touch-manipulation min-w-8.5 min-h-8.5 flex items-center justify-center"
        >
          <ChevronsLeft size={16} />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          title="Previous page"
          className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer touch-manipulation min-w-8.5 min-h-8.5 flex items-center justify-center"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Mobile Page Indicator (visible on very small screens) */}
        <div className="sm:hidden px-3 py-1 text-xs font-medium text-gray-300 bg-white/5 rounded-lg border border-white/5">
          {currentPage} / {totalPages}
        </div>

        {/* Desktop Page Numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-2 py-1 text-xs text-gray-500 select-none"
                >
                  …
                </span>
              );
            }

            const pageNum = p as number;
            const isActive = pageNum === currentPage;

            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-8.5 min-h-8.5 px-2 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer touch-manipulation ${
                  isActive
                    ? 'bg-[#7b42f6] text-white shadow-md shadow-purple-500/20 border border-purple-400/30 font-bold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          title="Next page"
          className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer touch-manipulation min-w-8.5 min-h-8.5 flex items-center justify-center"
        >
          <ChevronRight size={16} />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Last page"
          title="Last page"
          className="p-1.5 sm:p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 active:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer touch-manipulation min-w-8.5 min-h-8.5 flex items-center justify-center"
        >
          <ChevronsRight size={16} />
        </button>
      </div>
    </div>
  );
};
