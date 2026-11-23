import React from 'react';
import { Film } from 'lucide-react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  compact?: boolean;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = <Film className="w-8 h-8" />,
  title,
  description,
  actions,
  compact = false,
  className = '',
}) => {
  return (
    <div
      className={`${
        compact ? 'py-10 px-4' : 'py-16 sm:py-20 px-4'
      } text-center rounded-2xl border border-white/5 bg-white/1 flex flex-col items-center justify-center ${className}`.trim()}
    >
      {icon && (
        <div className="text-3xl sm:text-4xl mb-3 select-none flex items-center justify-center text-purple-400">
          {icon}
        </div>
      )}
      <h4 className="text-sm sm:text-base font-bold text-white mb-1">{title}</h4>
      {description && (
        <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed mb-4">{description}</p>
      )}
      {actions && (
        <div className="mt-1 flex items-center justify-center gap-3 flex-wrap">{actions}</div>
      )}
    </div>
  );
};
