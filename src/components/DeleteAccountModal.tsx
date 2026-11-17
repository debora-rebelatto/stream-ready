import React, { useState, useEffect } from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface DeleteAccountModalProps {
  isOpen: boolean;
  userEmail?: string;
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  isDeleting?: boolean;
}

export const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  isOpen,
  userEmail,
  onConfirm,
  onClose,
  isDeleting = false,
}) => {
  const [confirmText, setConfirmText] = useState('');

  // Reset confirmation input when opening/closing
  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

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

  const isConfirmed = confirmText.trim().toUpperCase() === 'DELETE';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isConfirmed && !isDeleting) {
      onConfirm();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={isDeleting ? undefined : onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-account-modal-title"
    >
      <div
        className="bg-[#12131e] border border-red-500/25 rounded-2xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle Ambient Red Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-red-600/15 rounded-full blur-3xl pointer-events-none" />

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
          <div className="w-12 h-12 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0 shadow-inner">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3
              id="delete-account-modal-title"
              className="text-lg font-bold text-white tracking-tight"
            >
              Permanently Delete Account
            </h3>
            <p className="text-xs text-red-400/90 font-medium">Irreversible database wipe</p>
          </div>
        </div>

        {/* Warning Body */}
        <div className="space-y-3 mb-5">
          <div className="p-3.5 rounded-xl bg-red-950/25 border border-red-500/20 text-xs text-gray-300 leading-relaxed">
            <p className="font-semibold text-red-300 mb-1.5">
              ⚠️ Warning: This action cannot be undone.
            </p>
            <p className="text-gray-400 text-[11.5px] mb-2">
              All data associated with your account will be completely bulldozed from the database:
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-300">
              <li>Your entire watchlist & tracking status</li>
              <li>All your custom movie lists</li>
              <li>Watched history & synchronization settings</li>
              <li>User credentials and authentication keys</li>
            </ul>
          </div>

          {userEmail && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 border border-white/5 text-xs">
              <span className="text-gray-400 text-[11px]">Target account:</span>
              <span className="text-gray-200 font-semibold truncate max-w-55" title={userEmail}>
                {userEmail}
              </span>
            </div>
          )}
        </div>

        {/* Confirmation Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="confirm-delete-input"
              className="block text-xs font-medium text-gray-300 mb-1.5"
            >
              Type <span className="font-bold text-red-400">DELETE</span> to confirm:
            </label>
            <input
              id="confirm-delete-input"
              type="text"
              autoFocus
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={isDeleting}
              placeholder="DELETE"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#191b29] border border-white/10 text-white placeholder-gray-500 text-xs focus:outline-hidden focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isConfirmed || isDeleting}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-bold transition-all shadow-lg shadow-red-900/30 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              {isDeleting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>Permanently Delete</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
