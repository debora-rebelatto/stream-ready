import React from 'react';
import { useToast } from '../context/useAppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-right-5 ${
            t.type === 'success'
              ? 'bg-[#151824]/95 border-emerald-500/50 text-emerald-300'
              : t.type === 'error'
                ? 'bg-[#151824]/95 border-red-500/50 text-red-300'
                : 'bg-[#151824]/95 border-purple-500/50 text-purple-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            {t.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            ) : t.type === 'error' ? (
              <AlertCircle size={16} className="text-red-400 shrink-0" />
            ) : (
              <Info size={16} className="text-purple-400 shrink-0" />
            )}
            <span className="text-xs font-medium leading-relaxed truncate">{t.message}</span>
          </div>

          <button
            onClick={() => removeToast(t.id)}
            className="p-1 text-gray-400 hover:text-white rounded transition-colors shrink-0 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};
