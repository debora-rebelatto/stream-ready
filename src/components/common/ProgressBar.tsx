import React from 'react';

export type ProgressBarVariant = 'purple' | 'emerald' | 'amber' | 'blue' | 'rose' | 'gradient';
export type ProgressBarSize = 'xs' | 'sm' | 'md';

export interface ProgressBarProps {
  value: number;
  max?: number;
  label?: React.ReactNode;
  valueLabel?: React.ReactNode;
  showPercentage?: boolean;
  variant?: ProgressBarVariant;
  size?: ProgressBarSize;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  label,
  valueLabel,
  showPercentage = false,
  variant = 'purple',
  size = 'sm',
  className = '',
}) => {
  const safeMax = max <= 0 ? 100 : max;
  const percentage = Math.min(100, Math.max(0, Math.round((value / safeMax) * 100)));

  const sizeClasses: Record<ProgressBarSize, string> = {
    xs: 'h-1.5',
    sm: 'h-2',
    md: 'h-3',
  };

  const fillClasses: Record<ProgressBarVariant, string> = {
    purple: 'bg-purple-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    blue: 'bg-blue-500',
    rose: 'bg-rose-500',
    gradient: 'bg-gradient-to-r from-purple-600 via-indigo-500 to-emerald-400',
  };

  return (
    <div className={`w-full ${className}`.trim()}>
      {(label || valueLabel || showPercentage) && (
        <div className="flex items-center justify-between text-xs mb-1.5">
          {label && <span className="font-medium text-gray-300">{label}</span>}
          <span className="text-gray-400 font-semibold">
            {valueLabel ?? (showPercentage ? `${percentage}%` : null)}
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        className={`w-full bg-white/10 rounded-full overflow-hidden ${sizeClasses[size]}`}
      >
        <div
          style={{ width: `${percentage}%` }}
          className={`h-full rounded-full transition-all duration-300 ${fillClasses[variant]}`}
        />
      </div>
    </div>
  );
};
