import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, Sparkles, X } from 'lucide-react';

export type AlertVariant = 'info' | 'success' | 'warning' | 'danger' | 'purple';

export interface AlertProps {
  variant?: AlertVariant;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  onDismiss?: () => void;
  className?: string;
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  icon,
  action,
  onDismiss,
  className = '',
  children,
}) => {
  const variantClasses: Record<AlertVariant, string> = {
    info: 'bg-blue-500/10 border-blue-500/25 text-blue-200',
    success: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-200',
    warning: 'bg-amber-500/10 border-amber-500/25 text-amber-200',
    danger: 'bg-rose-500/10 border-rose-500/30 text-rose-200',
    purple: 'bg-purple-500/10 border-purple-500/25 text-purple-200',
  };

  const defaultIcons: Record<AlertVariant, React.ReactNode> = {
    info: <Info size={16} className="text-blue-400 shrink-0" />,
    success: <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />,
    warning: <AlertTriangle size={16} className="text-amber-400 shrink-0" />,
    danger: <AlertCircle size={16} className="text-rose-400 shrink-0" />,
    purple: <Sparkles size={16} className="text-purple-400 shrink-0" />,
  };

  return (
    <div
      role="alert"
      className={`p-3.5 sm:p-4 rounded-xl border text-xs leading-relaxed flex items-start justify-between gap-3 ${variantClasses[variant]} ${className}`.trim()}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <div className="mt-0.5 shrink-0">{icon ?? defaultIcons[variant]}</div>
        <div className="min-w-0 flex-1">
          {title && <strong className="block text-white font-semibold mb-0.5">{title}</strong>}
          <div className="text-xs leading-relaxed">{children}</div>
        </div>
      </div>

      {(action || onDismiss) && (
        <div className="flex items-center gap-2 shrink-0">
          {action}
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              aria-label="Dismiss alert"
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
