import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { Spinner } from '../common';

interface DeleteMovieModalProps {
  isOpen: boolean;
  movieName: string;
  moviePoster?: string;
  movieYear?: string | number;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  isDeleting?: boolean;
}

export const DeleteMovieModal: React.FC<DeleteMovieModalProps> = ({
  isOpen,
  movieName,
  moviePoster,
  movieYear,
  onConfirm,
  onClose,
  isDeleting = false,
}) => {
  // Handle ESC key to cancel
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={isDeleting ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div
        className="bg-[#12131e] border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Close dialog"
        >
          <X size={18} />
        </button>

        {/* Icon & Title */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
            <Trash2 size={22} />
          </div>
          <div>
            <h3 id="delete-modal-title" className="text-lg font-bold text-white tracking-tight">
              Remove from Watchlist
            </h3>
            <p className="text-xs text-gray-400">Confirm movie removal</p>
          </div>
        </div>

        {/* Movie Preview Card */}
        <div className="flex items-center gap-3.5 p-3 rounded-xl bg-white/5 border border-white/5 mb-4">
          {moviePoster ? (
            <img
              src={moviePoster}
              alt={movieName}
              className="w-12 h-16 object-cover rounded-lg shrink-0 shadow-md bg-white/5"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div className="w-12 h-16 rounded-lg bg-white/10 flex items-center justify-center text-gray-500 shrink-0">
              <AlertTriangle size={20} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-white truncate">{movieName}</h4>
            {movieYear && (
              <span className="inline-block mt-0.5 text-xs text-gray-400 bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
                {movieYear}
              </span>
            )}
          </div>
        </div>

        {/* Confirmation Message */}
        <p className="text-xs sm:text-sm text-gray-300/90 leading-relaxed mb-6">
          Are you sure you want to remove this movie? It will no longer be tracked or appear in your
          Stremio library catalogs.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Spinner size="sm" variant="white" decorative />
                <span>Removing...</span>
              </>
            ) : (
              <>
                <Trash2 size={15} />
                <span>Remove Movie</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
