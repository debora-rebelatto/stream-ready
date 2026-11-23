import React from 'react';
import { useToast } from '../../context/useAppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:bottom-6 sm:right-6 z-50 flex flex-col items-center sm:items-end gap-2 sm:gap-2.5 sm:max-w-sm sm:w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between gap-2 sm:gap-3 px-3 py-2 sm:p-3.5 rounded-lg sm:rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-3 sm:slide-in-from-right-5 w-auto max-w-[calc(100vw-1.5rem)] sm:w-full ${
            t.type === 'success'
              ? 'bg-[#151824]/95 border-emerald-500/50 text-emerald-300'
              : t.type === 'error'
                ? 'bg-[#151824]/95 border-red-500/50 text-red-300'
                : 'bg-[#151824]/95 border-purple-500/50 text-purple-200'
          }`}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            {t.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
            ) : t.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 shrink-0" />
            ) : (
              <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400 shrink-0" />
            )}
            <span className="text-[11px] sm:text-xs font-medium leading-snug line-clamp-2">
              {t.message}
            </span>
          </div>

          <button
            type="button"
            onClick={() => removeToast(t.id)}
            aria-label="Dismiss notification"
            className="p-0.5 sm:p-1 text-gray-400 hover:text-white rounded transition-colors shrink-0 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
